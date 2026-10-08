// Options script for QuickTranslate

document.addEventListener('DOMContentLoaded', async () => {
  const targetLangSelect = document.getElementById('target-lang');
  const triggerModeInputs = document.querySelectorAll('input[name="triggerMode"]');
  const autoSpeakCheck = document.getElementById('auto-speak');
  const showDictionaryCheck = document.getElementById('show-dictionary');
  const themeSelect = document.getElementById('theme-select');
  const excludedDomainsText = document.getElementById('excluded-domains');
  const saveBtn = document.getElementById('save-btn');
  const saveStatus = document.getElementById('save-status');
  const exportHistoryBtn = document.getElementById('export-history-btn');
  const clearAllHistoryBtn = document.getElementById('clear-all-history-btn');

  // Populate Languages
  const langs = window.SUPPORTED_LANGUAGES || [];
  langs.forEach(lang => {
    const opt = document.createElement('option');
    opt.value = lang.code;
    opt.textContent = `${lang.name} - ${lang.native} (${lang.code})`;
    targetLangSelect.appendChild(opt);
  });

  // Load Settings
  const settings = await chrome.storage.sync.get(null);
  targetLangSelect.value = settings.targetLang || 'en';
  autoSpeakCheck.checked = settings.autoSpeak || false;
  showDictionaryCheck.checked = settings.showDictionary !== false;
  themeSelect.value = settings.theme || 'auto';
  applyTheme(settings.theme || 'auto');

  const currentTriggerMode = settings.triggerMode || 'instant';
  triggerModeInputs.forEach(input => {
    input.checked = input.value === currentTriggerMode;
  });

  if (Array.isArray(settings.excludedDomains)) {
    excludedDomainsText.value = settings.excludedDomains.join('\n');
  }

  themeSelect.addEventListener('change', () => {
    applyTheme(themeSelect.value);
  });

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

  // Save Settings
  saveBtn.addEventListener('click', async () => {
    let selectedMode = 'instant';
    triggerModeInputs.forEach(input => {
      if (input.checked) selectedMode = input.value;
    });

    const domains = excludedDomainsText.value
      .split('\n')
      .map(d => d.trim().toLowerCase())
      .filter(Boolean);

    const toSave = {
      targetLang: targetLangSelect.value,
      triggerMode: selectedMode,
      autoSpeak: autoSpeakCheck.checked,
      showDictionary: showDictionaryCheck.checked,
      theme: themeSelect.value,
      excludedDomains: domains
    };

    await chrome.storage.sync.set(toSave);

    saveStatus.textContent = 'Settings saved successfully!';
    setTimeout(() => {
      saveStatus.textContent = '';
    }, 2500);
  });

  // Export History
  exportHistoryBtn.addEventListener('click', async () => {
    const data = await chrome.storage.local.get('translationHistory');
    const history = data.translationHistory || [];
    const blob = new Blob([JSON.stringify(history, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quicktranslate-history-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Clear History
  clearAllHistoryBtn.addEventListener('click', async () => {
    if (confirm('Are you sure you want to delete all translation history?')) {
      await chrome.storage.local.set({ translationHistory: [] });
      alert('History cleared successfully.');
    }
  });
});
