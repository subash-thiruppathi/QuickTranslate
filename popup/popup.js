// Popup Script for QuickTranslate

document.addEventListener('DOMContentLoaded', async () => {
  // Elements
  const tabs = document.querySelectorAll('.nav-tab');
  const tabContents = document.querySelectorAll('.tab-content');
  const currentTargetBadge = document.getElementById('current-target-badge');

  // Translate tab elements
  const sourceLangSelect = document.getElementById('source-lang-select');
  const targetLangSelect = document.getElementById('target-lang-select');
  const swapLangBtn = document.getElementById('swap-lang-btn');
  const sourceText = document.getElementById('source-text');
  const charCount = document.getElementById('char-count');
  const clearTextBtn = document.getElementById('clear-text-btn');
  const outputPlaceholder = document.getElementById('output-placeholder');
  const outputContent = document.getElementById('output-content');
  const translatedText = document.getElementById('translated-text');
  const outputTransliteration = document.getElementById('output-transliteration');
  const detectedInfo = document.getElementById('detected-info');
  const popupSpeakBtn = document.getElementById('popup-speak-btn');
  const popupCopyBtn = document.getElementById('popup-copy-btn');

  // History tab elements
  const historyList = document.getElementById('history-list');
  const clearHistoryBtn = document.getElementById('clear-history-btn');

  // Settings tab elements
  const settingDefaultLang = document.getElementById('setting-default-lang');
  const settingAutoSpeak = document.getElementById('setting-auto-speak');
  const settingShowDictionary = document.getElementById('setting-show-dictionary');
  const settingTheme = document.getElementById('setting-theme');
  const triggerModeInputs = document.querySelectorAll('input[name="triggerMode"]');

  let currentSettings = {};
  let currentTranslationResult = null;
  let translateDebounceTimer = null;

  // Initialize Language Selectors
  populateLanguageDropdowns();

  // Load Settings
  const stored = await chrome.storage.sync.get(null);
  currentSettings = {
    targetLang: stored.targetLang || 'en',
    triggerMode: stored.triggerMode || 'instant',
    autoSpeak: stored.autoSpeak || false,
    showDictionary: stored.showDictionary !== false,
    theme: stored.theme || 'auto'
  };

  applySettingsToUI();
  applyTheme(currentSettings.theme);

  // Tab switching
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.getAttribute('data-tab');
      tabs.forEach(t => t.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      tab.classList.add('active');
      const targetContent = document.getElementById(`tab-${tabName}`);
      if (targetContent) targetContent.classList.add('active');

      if (tabName === 'history') {
        loadHistory();
      }
    });
  });

  // Populate Dropdowns
  function populateLanguageDropdowns() {
    const langs = window.SUPPORTED_LANGUAGES || [];

    // Populate source lang select
    langs.forEach(lang => {
      const opt = document.createElement('option');
      opt.value = lang.code;
      opt.textContent = `${lang.name} (${lang.native})`;
      sourceLangSelect.appendChild(opt);
    });

    // Populate target lang selects
    langs.forEach(lang => {
      const opt1 = document.createElement('option');
      opt1.value = lang.code;
      opt1.textContent = `${lang.name} (${lang.native})`;
      targetLangSelect.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = lang.code;
      opt2.textContent = `${lang.name} (${lang.native})`;
      settingDefaultLang.appendChild(opt2);
    });
  }

  // Apply loaded settings to UI
  function applySettingsToUI() {
    targetLangSelect.value = currentSettings.targetLang;
    settingDefaultLang.value = currentSettings.targetLang;
    currentTargetBadge.textContent = currentSettings.targetLang.toUpperCase();

    settingAutoSpeak.checked = currentSettings.autoSpeak;
    settingShowDictionary.checked = currentSettings.showDictionary;
    settingTheme.value = currentSettings.theme;

    triggerModeInputs.forEach(input => {
      input.checked = input.value === currentSettings.triggerMode;
    });
  }

  function applyTheme(theme) {
    document.documentElement.classList.remove('theme-auto', 'theme-light', 'theme-dark');
    if (theme === 'dark') {
      document.documentElement.classList.add('theme-dark');
    } else if (theme === 'light') {
      document.documentElement.classList.add('theme-light');
    } else {
      document.documentElement.classList.add('theme-auto');
    }
  }

  // Target Language Change
  targetLangSelect.addEventListener('change', () => {
    const val = targetLangSelect.value;
    currentSettings.targetLang = val;
    settingDefaultLang.value = val;
    currentTargetBadge.textContent = val.toUpperCase();
    chrome.storage.sync.set({ targetLang: val });
    triggerTranslation();
  });

  sourceLangSelect.addEventListener('change', () => {
    triggerTranslation();
  });

  // Swap Languages
  swapLangBtn.addEventListener('click', () => {
    if (sourceLangSelect.value === 'auto') {
      if (currentTranslationResult && currentTranslationResult.detectedSource) {
        sourceLangSelect.value = currentTranslationResult.detectedSource;
      } else {
        return;
      }
    }
    const temp = sourceLangSelect.value;
    sourceLangSelect.value = targetLangSelect.value;
    targetLangSelect.value = temp;

    // Swap texts if output exists
    if (currentTranslationResult) {
      sourceText.value = currentTranslationResult.translatedText;
    }

    currentSettings.targetLang = targetLangSelect.value;
    settingDefaultLang.value = targetLangSelect.value;
    currentTargetBadge.textContent = targetLangSelect.value.toUpperCase();
    chrome.storage.sync.set({ targetLang: targetLangSelect.value });

    triggerTranslation();
  });

  // Source text typing & debouncing
  sourceText.addEventListener('input', () => {
    const text = sourceText.value;
    charCount.textContent = `${text.length} / 3000`;
    clearTextBtn.style.display = text.length > 0 ? 'inline' : 'none';

    clearTimeout(translateDebounceTimer);
    if (!text.trim()) {
      outputPlaceholder.style.display = 'block';
      outputContent.style.display = 'none';
      currentTranslationResult = null;
      return;
    }

    translateDebounceTimer = setTimeout(triggerTranslation, 300);
  });

  clearTextBtn.addEventListener('click', () => {
    sourceText.value = '';
    charCount.textContent = '0 / 3000';
    clearTextBtn.style.display = 'none';
    outputPlaceholder.style.display = 'block';
    outputContent.style.display = 'none';
    currentTranslationResult = null;
  });

  // Trigger translation via runtime messaging to background
  function triggerTranslation() {
    const text = sourceText.value.trim();
    if (!text) return;

    outputPlaceholder.textContent = 'Translating...';
    outputPlaceholder.style.display = 'block';
    outputContent.style.display = 'none';

    chrome.runtime.sendMessage(
      {
        action: 'translate',
        text: text,
        targetLang: targetLangSelect.value,
        sourceLang: sourceLangSelect.value
      },
      (res) => {
        if (!res || !res.success) {
          outputPlaceholder.textContent = `Error: ${res?.error || 'Failed to translate'}`;
          return;
        }

        currentTranslationResult = res;
        outputPlaceholder.style.display = 'none';
        outputContent.style.display = 'flex';

        translatedText.textContent = res.translatedText;
        outputTransliteration.textContent = res.transliteration || '';
        detectedInfo.textContent = `Detected: ${(res.detectedSource || 'auto').toUpperCase()}`;

        if (currentSettings.autoSpeak) {
          speak(res.translatedText, res.targetLang);
        }
      }
    );
  }

  // Copy button
  popupCopyBtn.addEventListener('click', () => {
    if (!currentTranslationResult) return;
    navigator.clipboard.writeText(currentTranslationResult.translatedText).then(() => {
      const origHtml = popupCopyBtn.innerHTML;
      popupCopyBtn.innerHTML = `✓`;
      setTimeout(() => {
        popupCopyBtn.innerHTML = origHtml;
      }, 1500);
    });
  });

  // Speak button
  popupSpeakBtn.addEventListener('click', () => {
    if (!currentTranslationResult) return;
    speak(currentTranslationResult.translatedText, currentTranslationResult.targetLang);
  });

  function speak(text, lang) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  }

  // Load and Render History
  async function loadHistory() {
    const data = await chrome.storage.local.get('translationHistory');
    const items = data.translationHistory || [];

    if (items.length === 0) {
      historyList.innerHTML = `<div class="empty-state">No translation history yet.<br>Select text on any webpage to see it here!</div>`;
      return;
    }

    historyList.innerHTML = '';
    items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';

      const timeStr = new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      el.innerHTML = `
        <div class="history-item-top">
          <span class="history-lang-badge">${(item.detectedSource || '?').toUpperCase()} → ${item.targetLang.toUpperCase()}</span>
          <span>${timeStr}</span>
        </div>
        <div class="history-source">${escapeHtml(item.originalText)}</div>
        <div class="history-translated">${escapeHtml(item.translatedText)}</div>
        <div class="history-item-actions">
          <button class="action-link copy-item-btn">Copy</button>
        </div>
      `;

      el.querySelector('.copy-item-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(item.translatedText).then(() => {
          const btn = el.querySelector('.copy-item-btn');
          btn.textContent = 'Copied!';
          setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
        });
      });

      historyList.appendChild(el);
    });
  }

  // Clear History
  clearHistoryBtn.addEventListener('click', () => {
    if (confirm('Are you sure you want to clear your translation history?')) {
      chrome.runtime.sendMessage({ action: 'clearHistory' }, () => {
        loadHistory();
      });
    }
  });

  // Settings Handlers
  settingDefaultLang.addEventListener('change', () => {
    const val = settingDefaultLang.value;
    currentSettings.targetLang = val;
    targetLangSelect.value = val;
    currentTargetBadge.textContent = val.toUpperCase();
    chrome.storage.sync.set({ targetLang: val });
  });

  triggerModeInputs.forEach(input => {
    input.addEventListener('change', () => {
      currentSettings.triggerMode = input.value;
      chrome.storage.sync.set({ triggerMode: input.value });
    });
  });

  settingAutoSpeak.addEventListener('change', () => {
    currentSettings.autoSpeak = settingAutoSpeak.checked;
    chrome.storage.sync.set({ autoSpeak: settingAutoSpeak.checked });
  });

  settingShowDictionary.addEventListener('change', () => {
    currentSettings.showDictionary = settingShowDictionary.checked;
    chrome.storage.sync.set({ showDictionary: settingShowDictionary.checked });
  });

  settingTheme.addEventListener('change', () => {
    currentSettings.theme = settingTheme.value;
    chrome.storage.sync.set({ theme: settingTheme.value });
    applyTheme(settingTheme.value);
  });

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
});
