// Content Script for Instant Selection Translation

(function () {
  // Prevent duplicate script execution
  if (window.__INSTANT_TRANSLATE_LOADED__) return;
  window.__INSTANT_TRANSLATE_LOADED__ = true;

  // Active state
  let currentSettings = {
    targetLang: 'en',
    triggerMode: 'instant', // 'instant' | 'icon' | 'modifier'
    modifierKey: 'Alt',
    autoSpeak: false,
    theme: 'auto',
    showDictionary: true,
    excludedDomains: []
  };

  let activePopup = null;
  let activeIcon = null;
  let currentSelectionText = '';
  let shadowRoot = null;
  let hostElement = null;

  // Load settings and listen for updates
  chrome.storage.sync.get(null, (items) => {
    if (items) {
      currentSettings = { ...currentSettings, ...items };
    }
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync') {
      for (const [key, change] of Object.entries(changes)) {
        currentSettings[key] = change.newValue;
      }
    }
  });

  // Ensure Shadow DOM Host exists
  function getShadowRoot() {
    if (!hostElement) {
      hostElement = document.createElement('instant-translate-container');
      hostElement.id = 'it-host-container';
      hostElement.style.all = 'initial';
      hostElement.style.position = 'absolute';
      hostElement.style.top = '0';
      hostElement.style.left = '0';
      hostElement.style.zIndex = '2147483647';
      document.documentElement.appendChild(hostElement);
      shadowRoot = hostElement.attachShadow({ mode: 'open' });
      injectShadowStyles();
    }
    return shadowRoot;
  }

  // Inject CSS inside Shadow DOM to guarantee zero style leakage
  function injectShadowStyles() {
    const style = document.createElement('style');
    style.textContent = `
      :host {
        --it-primary: #3b82f6;
        --it-primary-hover: #2563eb;
        --it-bg: #ffffff;
        --it-bg-secondary: #f8fafc;
        --it-text: #0f172a;
        --it-text-muted: #64748b;
        --it-border: #e2e8f0;
        --it-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.12), 0 8px 10px -6px rgba(0, 0, 0, 0.08);
        --it-radius: 12px;
        --it-font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }

      @media (prefers-color-scheme: dark) {
        :host(.theme-auto) {
          --it-primary: #3b82f6;
          --it-primary-hover: #60a5fa;
          --it-bg: #1e293b;
          --it-bg-secondary: #0f172a;
          --it-text: #f8fafc;
          --it-text-muted: #94a3b8;
          --it-border: #334155;
          --it-shadow: 0 12px 30px -5px rgba(0, 0, 0, 0.4);
        }
      }

      :host(.theme-dark) {
        --it-primary: #3b82f6;
        --it-primary-hover: #60a5fa;
        --it-bg: #1e293b;
        --it-bg-secondary: #0f172a;
        --it-text: #f8fafc;
        --it-text-muted: #94a3b8;
        --it-border: #334155;
        --it-shadow: 0 12px 30px -5px rgba(0, 0, 0, 0.4);
      }

      * {
        box-sizing: border-box;
        margin: 0;
        padding: 0;
        font-family: var(--it-font);
      }

      /* Quick Icon Button */
      .it-trigger-icon {
        position: absolute;
        width: 30px;
        height: 30px;
        background: var(--it-primary);
        color: white;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 4px 12px rgba(59, 130, 246, 0.35);
        cursor: pointer;
        z-index: 2147483647;
        transition: transform 0.15s ease, background 0.15s ease;
        animation: it-pop 0.15s ease-out;
      }
      .it-trigger-icon:hover {
        transform: scale(1.12);
        background: var(--it-primary-hover);
      }
      .it-trigger-icon svg {
        width: 17px;
        height: 17px;
        fill: currentColor;
      }

      /* Card Container */
      .it-card {
        position: absolute;
        width: 340px;
        max-width: calc(100vw - 24px);
        background: var(--it-bg);
        color: var(--it-text);
        border: 1px solid var(--it-border);
        border-radius: var(--it-radius);
        box-shadow: var(--it-shadow);
        z-index: 2147483647;
        overflow: hidden;
        animation: it-fade-scale 0.18s cubic-bezier(0.16, 1, 0.3, 1);
        display: flex;
        flex-direction: column;
      }

      @keyframes it-fade-scale {
        from {
          opacity: 0;
          transform: translateY(4px) scale(0.97);
        }
        to {
          opacity: 1;
          transform: translateY(0) scale(1);
        }
      }

      @keyframes it-pop {
        from {
          opacity: 0;
          transform: scale(0.6);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      /* Header */
      .it-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        background: var(--it-bg-secondary);
        border-bottom: 1px solid var(--it-border);
        gap: 6px;
        cursor: grab;
        user-select: none;
      }

      .it-drag-handle {
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--it-text-muted);
        padding: 2px 2px;
        border-radius: 4px;
        cursor: grab;
        transition: color 0.15s ease, background 0.15s ease;
      }
      .it-drag-handle:hover {
        color: var(--it-text);
        background: var(--it-border);
      }
      .it-drag-handle svg {
        width: 14px;
        height: 14px;
        fill: currentColor;
      }

      .it-card.it-dragging {
        cursor: grabbing !important;
        box-shadow: 0 18px 38px -4px rgba(0, 0, 0, 0.28), 0 10px 16px -6px rgba(0, 0, 0, 0.18);
        transform: scale(1.015);
        transition: box-shadow 0.15s ease, transform 0.15s ease;
      }
      .it-card.it-dragging .it-header,
      .it-card.it-dragging .it-drag-handle {
        cursor: grabbing !important;
      }

      .it-lang-controls {
        display: flex;
        align-items: center;
        gap: 6px;
        flex: 1;
      }

      .it-source-badge {
        font-size: 11px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        color: var(--it-text-muted);
        background: var(--it-bg);
        border: 1px solid var(--it-border);
        padding: 2px 6px;
        border-radius: 6px;
        white-space: nowrap;
      }

      .it-arrow-icon {
        color: var(--it-text-muted);
        font-size: 11px;
      }

      .it-target-select {
        background: var(--it-bg);
        color: var(--it-text);
        border: 1px solid var(--it-border);
        border-radius: 6px;
        padding: 3px 6px;
        font-size: 12px;
        font-weight: 500;
        cursor: pointer;
        outline: none;
        max-width: 130px;
      }
      .it-target-select:focus {
        border-color: var(--it-primary);
      }

      .it-header-btn {
        background: none;
        border: none;
        color: var(--it-text-muted);
        cursor: pointer;
        padding: 4px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.15s ease;
      }
      .it-header-btn:hover {
        background: var(--it-border);
        color: var(--it-text);
      }
      .it-header-btn svg {
        width: 14px;
        height: 14px;
        stroke: currentColor;
      }

      /* Content Area */
      .it-body {
        padding: 12px;
        max-height: 240px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      /* Skeleton Loader */
      .it-skeleton-line {
        height: 14px;
        background: linear-gradient(90deg, var(--it-border) 25%, var(--it-bg-secondary) 50%, var(--it-border) 75%);
        background-size: 200% 100%;
        animation: it-shimmer 1.4s infinite;
        border-radius: 4px;
        margin-bottom: 6px;
      }
      .it-skeleton-line:last-child {
        width: 60%;
        margin-bottom: 0;
      }

      @keyframes it-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }

      .it-translation-text {
        font-size: 14px;
        line-height: 1.5;
        color: var(--it-text);
        font-weight: 450;
        word-break: break-word;
        white-space: pre-wrap;
      }

      .it-transliteration {
        font-size: 12px;
        color: var(--it-text-muted);
        font-style: italic;
      }

      /* Dictionary / Synonyms */
      .it-dictionary {
        margin-top: 6px;
        padding-top: 8px;
        border-top: 1px dashed var(--it-border);
        font-size: 12px;
      }
      .it-pos-group {
        margin-bottom: 6px;
      }
      .it-pos-title {
        font-weight: 600;
        color: var(--it-primary);
        font-size: 11px;
        text-transform: uppercase;
        margin-bottom: 2px;
      }
      .it-synonyms-list {
        display: flex;
        flex-wrap: wrap;
        gap: 4px;
      }
      .it-synonym-tag {
        background: var(--it-bg-secondary);
        border: 1px solid var(--it-border);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 11px;
        color: var(--it-text);
      }

      /* Footer Actions */
      .it-footer {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 8px 12px;
        border-top: 1px solid var(--it-border);
        background: var(--it-bg-secondary);
      }

      .it-footer-actions {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .it-action-btn {
        background: var(--it-bg);
        border: 1px solid var(--it-border);
        color: var(--it-text);
        padding: 4px 8px;
        border-radius: 6px;
        font-size: 12px;
        display: flex;
        align-items: center;
        gap: 4px;
        cursor: pointer;
        transition: all 0.15s ease;
      }
      .it-action-btn:hover {
        border-color: var(--it-primary);
        color: var(--it-primary);
      }
      .it-action-btn svg {
        width: 13px;
        height: 13px;
        stroke: currentColor;
        fill: none;
      }
      .it-action-btn.copied {
        background: #10b981;
        border-color: #10b981;
        color: white;
      }

      .it-original-toggle {
        font-size: 11px;
        color: var(--it-text-muted);
        cursor: pointer;
        text-decoration: underline;
      }
      .it-original-box {
        font-size: 12px;
        color: var(--it-text-muted);
        background: var(--it-bg-secondary);
        padding: 6px;
        border-radius: 6px;
        margin-top: 4px;
        border-left: 2px solid var(--it-border);
      }
    `;
    shadowRoot.appendChild(style);
  }

  // Update theme class on shadow host
  function applyTheme() {
    if (!hostElement) return;
    hostElement.classList.remove('theme-auto', 'theme-light', 'theme-dark');
    if (currentSettings.theme === 'dark') {
      hostElement.classList.add('theme-dark');
    } else if (currentSettings.theme === 'light') {
      hostElement.classList.add('theme-light');
    } else {
      hostElement.classList.add('theme-auto');
    }
  }

  // Check if current site is excluded
  function isSiteExcluded() {
    const host = window.location.hostname;
    return (currentSettings.excludedDomains || []).some(domain => host.includes(domain));
  }

  // Remove existing UI
  function cleanup() {
    if (activePopup) {
      activePopup.remove();
      activePopup = null;
    }
    if (activeIcon) {
      activeIcon.remove();
      activeIcon = null;
    }
  }

  // Selection handler
  document.addEventListener('mouseup', handleSelectionEvent);
  document.addEventListener('keyup', (e) => {
    if (e.key === 'Shift' || e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      handleSelectionEvent(e);
    }
    if (e.key === 'Escape') {
      cleanup();
    }
  });

  // Click outside listener
  document.addEventListener('mousedown', (e) => {
    if (!hostElement) return;
    // Check if click was inside shadow root
    const path = e.composedPath();
    if (path.includes(hostElement)) {
      return; // Click inside translation popup
    }
    cleanup();
  });

  function handleSelectionEvent(e) {
    if (isSiteExcluded()) return;

    // Check if event occurred inside our own extension
    const path = e.composedPath ? e.composedPath() : [];
    if (hostElement && path.includes(hostElement)) {
      return;
    }

    // Small timeout to allow selection range to finalize
    setTimeout(() => {
      let text = '';
      let rect = null;

      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        text = selection.toString().trim();
        if (selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          rect = range.getBoundingClientRect();
        }
      }

      // Fallback for text selection inside <textarea> or <input>
      if (!text && document.activeElement) {
        const active = document.activeElement;
        if (
          (active.tagName === 'TEXTAREA' || (active.tagName === 'INPUT' && active.type === 'text' || active.type === 'search')) &&
          typeof active.selectionStart === 'number' &&
          active.selectionStart !== active.selectionEnd
        ) {
          text = active.value.substring(active.selectionStart, active.selectionEnd).trim();
          rect = active.getBoundingClientRect();
        }
      }

      if (!text || text.length > 3000) {
        return;
      }

      // Check modifier key mode
      if (currentSettings.triggerMode === 'modifier') {
        const requiredMod = currentSettings.modifierKey || 'Alt';
        const isModPressed =
          (requiredMod === 'Alt' && e.altKey) ||
          (requiredMod === 'Control' && e.ctrlKey) ||
          (requiredMod === 'Shift' && e.shiftKey);

        if (!isModPressed) return;
      }

      if (!rect || (rect.width === 0 && rect.height === 0)) return;

      currentSelectionText = text;

      if (currentSettings.triggerMode === 'icon') {
        showTriggerIcon(rect, text);
      } else {
        // Instant mode (default)
        showTranslationCard(rect, text, currentSettings.targetLang);
      }
    }, 15);
  }

  // Show Quick Icon
  function showTriggerIcon(rect, text) {
    cleanup();
    const root = getShadowRoot();
    applyTheme();

    const icon = document.createElement('div');
    icon.className = 'it-trigger-icon';
    icon.title = 'Translate with QuickTranslate';
    icon.innerHTML = `
      <svg viewBox="0 0 24 24">
        <path d="M12.87 15.07l-2.54-2.51.03-.03c1.74-1.94 2.98-4.17 3.71-6.53H17V4h-7V2H8v2H1v1.99h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
      </svg>
    `;

    // Position icon slightly above or to the right of the selection
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let posX = rect.right + scrollX + 4;
    let posY = rect.top + scrollY - 14;

    icon.style.left = `${posX}px`;
    icon.style.top = `${posY}px`;

    icon.addEventListener('click', (ev) => {
      ev.stopPropagation();
      cleanup();
      showTranslationCard(rect, text, currentSettings.targetLang);
    });

    root.appendChild(icon);
    activeIcon = icon;
  }

  // Show Main Translation Tooltip Card
  function showTranslationCard(rect, text, targetLang) {
    cleanup();
    const root = getShadowRoot();
    applyTheme();

    const card = document.createElement('div');
    card.className = 'it-card';

    // Build Card Shell
    card.innerHTML = `
      <div class="it-header" id="it-card-header">
        <div class="it-drag-handle" title="Drag to move card">
          <svg viewBox="0 0 24 24">
            <circle cx="8" cy="6" r="1.5"/>
            <circle cx="16" cy="6" r="1.5"/>
            <circle cx="8" cy="12" r="1.5"/>
            <circle cx="16" cy="12" r="1.5"/>
            <circle cx="8" cy="18" r="1.5"/>
            <circle cx="16" cy="18" r="1.5"/>
          </svg>
        </div>
        <div class="it-lang-controls">
          <span class="it-source-badge" id="it-source-badge">DETECTING...</span>
          <span class="it-arrow-icon">→</span>
          <select class="it-target-select" id="it-target-select">
            ${buildLanguageOptions(targetLang)}
          </select>
        </div>
        <button class="it-header-btn" id="it-close-btn" title="Close">
          <svg viewBox="0 0 24 24" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>

      <div class="it-body" id="it-body">
        <div class="it-skeleton-line"></div>
        <div class="it-skeleton-line"></div>
      </div>

      <div class="it-footer">
        <div class="it-footer-actions">
          <button class="it-action-btn" id="it-copy-btn" title="Copy translation">
            <svg viewBox="0 0 24 24" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            <span id="it-copy-text">Copy</span>
          </button>
          <button class="it-action-btn" id="it-speak-btn" title="Listen to translation">
            <svg viewBox="0 0 24 24" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
            <span>Listen</span>
          </button>
        </div>
        <span class="it-original-toggle" id="it-original-toggle">Show original</span>
      </div>
    `;

    root.appendChild(card);
    activePopup = card;

    // Position Card smartly relative to selection & viewport
    positionCard(card, rect);

    // Make the Card Draggable
    makeCardDraggable(card);

    // Bind Controls
    const closeBtn = card.querySelector('#it-close-btn');
    closeBtn.addEventListener('click', cleanup);

    const targetSelect = card.querySelector('#it-target-select');
    targetSelect.addEventListener('change', (e) => {
      const newTarget = e.target.value;
      // Also update default targetLang in sync storage
      chrome.storage.sync.set({ targetLang: newTarget });
      currentSettings.targetLang = newTarget;
      // Re-translate with new target
      executeTranslate(card, text, newTarget);
    });

    // Execute translation
    executeTranslate(card, text, targetLang);
  }

  // Calculate coordinates to clamp inside screen
  function positionCard(card, rect) {
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;
    const cardWidth = 340;
    const estimatedHeight = 180;
    const margin = 10;

    let left = rect.left + scrollX + (rect.width / 2) - (cardWidth / 2);
    // Boundary check X
    const minLeft = scrollX + margin;
    const maxLeft = scrollX + window.innerWidth - cardWidth - margin;
    left = Math.max(minLeft, Math.min(left, maxLeft));

    // Place above by default
    let top = rect.top + scrollY - estimatedHeight - margin;

    // If clipping at top of viewport, position below the selection
    if (rect.top - estimatedHeight < margin) {
      top = rect.bottom + scrollY + margin;
    }

    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  }

  // Enable dragging on the card header & drag handle
  function makeCardDraggable(card) {
    const header = card.querySelector('#it-card-header') || card.querySelector('.it-header');
    if (!header) return;

    let isDragging = false;
    let startMouseX = 0;
    let startMouseY = 0;
    let startCardX = 0;
    let startCardY = 0;

    const onMouseDown = (e) => {
      // Don't initiate drag if clicking buttons, select dropdowns, or controls
      const target = e.target;
      if (
        target.closest('#it-target-select') ||
        target.closest('#it-close-btn') ||
        target.tagName === 'SELECT' ||
        target.tagName === 'BUTTON'
      ) {
        return;
      }

      isDragging = true;
      startMouseX = e.clientX;
      startMouseY = e.clientY;

      const currentLeft = parseFloat(card.style.left) || 0;
      const currentTop = parseFloat(card.style.top) || 0;
      startCardX = currentLeft;
      startCardY = currentTop;

      card.classList.add('it-dragging');
      document.body.style.userSelect = 'none';

      // Prevent unwanted text highlight during drag
      e.preventDefault();
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;

      const deltaX = e.clientX - startMouseX;
      const deltaY = e.clientY - startMouseY;

      let nextX = startCardX + deltaX;
      let nextY = startCardY + deltaY;

      // Keep within viewport boundaries so card doesn't get lost
      const scrollX = window.scrollX || window.pageXOffset;
      const scrollY = window.scrollY || window.pageYOffset;
      const margin = 8;
      const minX = scrollX + margin;
      const maxX = scrollX + window.innerWidth - card.offsetWidth - margin;
      const minY = scrollY + margin;
      const maxY = scrollY + window.innerHeight - 40;

      nextX = Math.max(minX, Math.min(nextX, maxX));
      nextY = Math.max(minY, Math.min(nextY, maxY));

      card.style.left = `${nextX}px`;
      card.style.top = `${nextY}px`;
    };

    const onMouseUp = () => {
      if (isDragging) {
        isDragging = false;
        card.classList.remove('it-dragging');
        document.body.style.userSelect = '';
      }
    };

    header.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);

    // Clean up global listeners when card is removed
    const origRemove = card.remove.bind(card);
    card.remove = function () {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      origRemove();
    };
  }

  // Execute Translation via background script
  function executeTranslate(card, text, targetLang) {
    const body = card.querySelector('#it-body');
    const sourceBadge = card.querySelector('#it-source-badge');

    // Show loading skeleton
    body.innerHTML = `
      <div class="it-skeleton-line"></div>
      <div class="it-skeleton-line"></div>
    `;
    sourceBadge.textContent = 'TRANSLATING...';

    chrome.runtime.sendMessage(
      {
        action: 'translate',
        text: text,
        targetLang: targetLang,
        sourceLang: 'auto'
      },
      (response) => {
        if (!response || !response.success) {
          body.innerHTML = `<div style="color: #ef4444; font-size: 13px;">Translation failed: ${response?.error || 'Network error'}</div>`;
          sourceBadge.textContent = 'ERROR';
          return;
        }

        renderTranslationResult(card, response, text);
      }
    );
  }

  // Render successful translation result
  function renderTranslationResult(card, data, originalText) {
    const body = card.querySelector('#it-body');
    const sourceBadge = card.querySelector('#it-source-badge');
    const copyBtn = card.querySelector('#it-copy-btn');
    const copyText = card.querySelector('#it-copy-text');
    const speakBtn = card.querySelector('#it-speak-btn');
    const origToggle = card.querySelector('#it-original-toggle');

    // Update source badge
    sourceBadge.textContent = (data.detectedSource || 'auto').toUpperCase();
    sourceBadge.title = `Source language: ${data.detectedSource}`;

    // Fill Body
    let html = `<div class="it-translation-text">${escapeHtml(data.translatedText)}</div>`;

    if (data.transliteration) {
      html += `<div class="it-transliteration">${escapeHtml(data.transliteration)}</div>`;
    }

    // Dictionary details if available
    if (currentSettings.showDictionary && data.dictionary && data.dictionary.length > 0) {
      html += `<div class="it-dictionary">`;
      data.dictionary.slice(0, 2).forEach(dict => {
        html += `
          <div class="it-pos-group">
            <div class="it-pos-title">${dict.partOfSpeech || 'Word'}</div>
            <div class="it-synonyms-list">
              ${(dict.terms || []).slice(0, 5).map(t => `<span class="it-synonym-tag">${escapeHtml(t)}</span>`).join('')}
            </div>
          </div>
        `;
      });
      html += `</div>`;
    }

    body.innerHTML = html;

    // Copy action
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(data.translatedText).then(() => {
        copyBtn.classList.add('copied');
        copyText.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.classList.remove('copied');
          copyText.textContent = 'Copy';
        }, 1800);
      });
    };

    // Text to Speech
    speakBtn.onclick = () => {
      speakText(data.translatedText, data.targetLang);
    };

    // Auto-speak if enabled
    if (currentSettings.autoSpeak) {
      speakText(data.translatedText, data.targetLang);
    }

    // Original toggle
    let originalVisible = false;
    origToggle.onclick = () => {
      originalVisible = !originalVisible;
      let origBox = body.querySelector('.it-original-box');
      if (originalVisible) {
        origToggle.textContent = 'Hide original';
        if (!origBox) {
          origBox = document.createElement('div');
          origBox.className = 'it-original-box';
          origBox.textContent = originalText;
          body.appendChild(origBox);
        }
        origBox.style.display = 'block';
      } else {
        origToggle.textContent = 'Show original';
        if (origBox) origBox.style.display = 'none';
      }
    };
  }

  // Text-to-Speech via Web Speech API
  function speakText(text, lang) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // Stop prior speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang || 'en';
    utterance.rate = 0.95;
    window.speechSynthesis.speak(utterance);
  }

  // Helper: Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Build Language Options dropdown
  function buildLanguageOptions(selectedCode) {
    const popularCodes = ['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh-CN', 'ja', 'ko', 'hi', 'ta', 'ar'];
    const langs = window.SUPPORTED_LANGUAGES || [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'zh-CN', name: 'Chinese' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'hi', name: 'Hindi' },
      { code: 'ta', name: 'Tamil' },
      { code: 'ar', name: 'Arabic' }
    ];

    let html = '';
    langs.forEach(lang => {
      const isSelected = lang.code.toLowerCase() === (selectedCode || 'en').toLowerCase();
      html += `<option value="${lang.code}" ${isSelected ? 'selected' : ''}>${lang.name}</option>`;
    });
    return html;
  }

  // Listen for context menu trigger from background script
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === 'trigger-context-translate' && request.text) {
      const selection = window.getSelection();
      let rect = null;
      if (selection && !selection.isCollapsed) {
        rect = selection.getRangeAt(0).getBoundingClientRect();
      } else {
        // Fallback to center of screen if selection rect is unavailable
        rect = {
          left: window.innerWidth / 2 - 100,
          right: window.innerWidth / 2 + 100,
          top: window.innerHeight / 3,
          bottom: window.innerHeight / 3 + 20,
          width: 200,
          height: 20
        };
      }
      showTranslationCard(rect, request.text, currentSettings.targetLang);
    }
  });
})();
