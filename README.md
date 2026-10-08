<p align="center">
  <img src="icons/icon128.png" alt="QuickTranslate Logo" width="80" height="80">
</p>

<h1 align="center">QuickTranslate</h1>

<p align="center">
  <strong>Fast, private, and lightweight Chrome extension that translates text instantly when you select it.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT"></a>
  <img src="https://img.shields.io/badge/Manifest-V3-success.svg" alt="Manifest V3">
  <img src="https://img.shields.io/badge/Languages-100%2B-orange.svg" alt="100+ Languages">
  <img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="PRs Welcome">
</p>

---

## ✨ Features

- **⚡ Instant Selection Translation**: Highlight any word, sentence, or paragraph on any website and the translated result appears immediately near your cursor.
- **🖐️ Fully Draggable**: Move the floating translation card anywhere on your screen by dragging the header or grip handle (⋮⋮).
- **🛡️ 100% Shadow DOM Isolation**: Renders inside an isolated Shadow Root so host website styles (CSS resets, colors, fonts) never interfere with the translation card.
- **🌐 100+ Supported Languages**: English, Spanish, French, German, Tamil, Hindi, Japanese, Chinese, Arabic, Portuguese, Russian, and 90+ more.
- **🔄 On-the-Fly Language Switcher**: Switch the target language or swap source/target directly inside the floating card.
- **📋 One-Click Copy**: Copy translated text with instant visual checkmark feedback.
- **🔊 Text-to-Speech (Pronunciation)**: Listen to native audio pronunciation for both original and translated text.
- **📖 Dictionary & Synonyms**: Displays word parts of speech, synonyms, and definitions for single words.
- **🎨 Dark & Light Modes**: Automatically synchronizes with system settings or can be manually selected.
- **🔒 Privacy First**: Zero tracking, zero analytics, zero data harvesting. Runs locally on Manifest V3.

---

## 🚀 Quick Start (Local Installation)

1. Clone this repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/quicktranslate.git
   ```
2. Open Google Chrome and go to `chrome://extensions/`.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select the cloned directory.
5. Highlight any text on any webpage to see it in action! 🎉

---

## 📂 Project Architecture

```
instant-translate-extension/
├── manifest.json            # Manifest V3 configuration & permissions
├── background/
│   └── background.js        # Background service worker (GTX translation API, caching, context menu)
├── content/
│   └── content.js           # Selection listener, Shadow DOM UI, draggable logic, TTS
├── popup/
│   ├── popup.html           # Extension toolbar popup interface
│   ├── popup.css            # Light & dark theme styling
│   └── popup.js             # Manual translator, history viewer & quick settings
├── options/
│   ├── options.html         # Preferences & domain blocklist page
│   ├── options.css          # Options page styling
│   └── options.js           # Settings persistence & history export
├── welcome/
│   └── welcome.html         # Onboarding tutorial page shown upon install
├── utils/
│   └── languages.js         # Supported languages list & utility helpers
├── icons/                   # Extension icons (16px, 32px, 48px, 128px, SVG)
├── demo.html                # Multi-language demo test page
├── privacy.html             # Public privacy policy document
├── CONTRIBUTING.md          # Guide for open-source contributors
└── LICENSE                  # MIT License
```

---

## ⌨️ Shortcuts

- **`Alt + Shift + T`**: Open the QuickTranslate popup tool.
- **`Escape`**: Dismiss the active floating translation card.

---

## 🤝 Contributing

Contributions are welcome! Please check out [CONTRIBUTING.md](CONTRIBUTING.md) to get started.

If you find QuickTranslate useful, please consider giving it a ⭐ on GitHub!

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.
