// Background Service Worker for Instant Translate

// In-memory cache for fast repeated translations
const translationCache = new Map();
const MAX_CACHE_SIZE = 100;

// Initialize default settings on extension installation
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome/welcome.html') });
  }

  const browserLang = (chrome.i18n.getUILanguage() || 'en').split('-')[0];
  const defaults = {
    targetLang: browserLang === 'en' ? 'es' : browserLang, // default to user language or Spanish if browser is English
    triggerMode: 'instant', // 'instant' | 'icon' | 'modifier'
    modifierKey: 'Alt',     // 'Alt' | 'Control' | 'Shift'
    autoSpeak: false,
    theme: 'auto',          // 'auto' | 'light' | 'dark'
    showDictionary: true,
    historyEnabled: true,
    excludedDomains: []
  };

  const stored = await chrome.storage.sync.get(Object.keys(defaults));
  const toSet = {};
  for (const [key, val] of Object.entries(defaults)) {
    if (stored[key] === undefined) {
      toSet[key] = val;
    }
  }
  if (Object.keys(toSet).length > 0) {
    await chrome.storage.sync.set(toSet);
  }

  // Create context menu for quick selection translation
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'translate-selection',
      title: 'Translate "%s"',
      contexts: ['selection']
    });
  });
});

// Handle Context Menu click
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'translate-selection' && tab?.id && info.selectionText) {
    chrome.tabs.sendMessage(tab.id, {
      action: 'trigger-context-translate',
      text: info.selectionText
    }).catch(err => {
      console.warn('Could not send message to tab (tab may be protected or refreshed):', err);
    });
  }
});

// Translation API helper
async function fetchTranslation(text, targetLang, sourceLang = 'auto') {
  const trimmed = text.trim();
  if (!trimmed) {
    throw new Error('No text to translate');
  }

  const cacheKey = `${sourceLang}->${targetLang}:${trimmed}`;
  if (translationCache.has(cacheKey)) {
    return translationCache.get(cacheKey);
  }

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${encodeURIComponent(sourceLang)}&tl=${encodeURIComponent(targetLang)}&dt=t&dt=bd&dt=rm&q=${encodeURIComponent(trimmed)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Translation API error: HTTP ${response.status}`);
  }

  const data = await response.json();

  // Parse translated text chunks
  let translatedText = '';
  if (Array.isArray(data[0])) {
    translatedText = data[0].map(chunk => chunk[0]).filter(Boolean).join('');
  }

  // Detected source language
  const detectedSource = data[2] || sourceLang;

  // Transliteration / Phonetic reading if available
  let transliteration = null;
  if (Array.isArray(data[0])) {
    const lastChunk = data[0][data[0].length - 1];
    if (lastChunk && lastChunk[3]) {
      transliteration = lastChunk[3];
    } else if (lastChunk && lastChunk[2]) {
      transliteration = lastChunk[2];
    }
  }

  // Parse dictionary definitions & synonyms if available
  const dictionary = [];
  if (Array.isArray(data[1])) {
    for (const dictItem of data[1]) {
      const pos = dictItem[0]; // Part of speech (noun, verb, adjective, etc.)
      const terms = dictItem[1] || []; // Main translated words
      const details = (dictItem[2] || []).map(d => ({
        word: d[0],
        reverseTranslations: d[1] || []
      }));
      dictionary.push({
        partOfSpeech: pos,
        terms,
        details
      });
    }
  }

  const result = {
    originalText: trimmed,
    translatedText,
    detectedSource,
    targetLang,
    transliteration,
    dictionary
  };

  // Cache result
  if (translationCache.size >= MAX_CACHE_SIZE) {
    const firstKey = translationCache.keys().next().value;
    translationCache.delete(firstKey);
  }
  translationCache.set(cacheKey, result);

  // Save to history (asynchronously)
  saveToHistory(result).catch(console.error);

  return result;
}

// Save to recent translation history
async function saveToHistory(item) {
  try {
    const settings = await chrome.storage.sync.get('historyEnabled');
    if (settings.historyEnabled === false) return;

    const data = await chrome.storage.local.get('translationHistory');
    const history = data.translationHistory || [];

    // Avoid duplicate immediate entry
    const filtered = history.filter(h => h.originalText !== item.originalText || h.targetLang !== item.targetLang);

    filtered.unshift({
      id: Date.now().toString(36) + Math.random().toString(36).substr(2, 5),
      originalText: item.originalText.slice(0, 500),
      translatedText: item.translatedText.slice(0, 500),
      detectedSource: item.detectedSource,
      targetLang: item.targetLang,
      timestamp: Date.now()
    });

    // Keep up to 60 items
    if (filtered.length > 60) {
      filtered.length = 60;
    }

    await chrome.storage.local.set({ translationHistory: filtered });
  } catch (e) {
    console.warn('Failed saving history:', e);
  }
}

// Handle messages from content script & popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'translate') {
    fetchTranslation(request.text, request.targetLang, request.sourceLang || 'auto')
      .then(result => sendResponse({ success: true, ...result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep message channel open for async response
  }

  if (request.action === 'getSettings') {
    chrome.storage.sync.get(null).then(settings => {
      sendResponse({ success: true, settings });
    });
    return true;
  }

  if (request.action === 'clearHistory') {
    chrome.storage.local.set({ translationHistory: [] }).then(() => {
      sendResponse({ success: true });
    });
    return true;
  }
});
