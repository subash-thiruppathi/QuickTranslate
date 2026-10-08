# Contributing to QuickTranslate

Thank you for your interest in contributing to QuickTranslate! We welcome community contributions from developers and polyglots around the world.

---

## 🌟 How You Can Help

- **Suggest Features & Report Bugs**: Open an [Issue](https://github.com) describing the bug or feature idea.
- **Language Support & Corrections**: Suggest improvements or additions to language lists.
- **UI & UX Improvements**: Enhance responsiveness, animations, accessibility, and themes.
- **Documentation**: Improve guides, translations, and shortcuts.

---

## 🛠️ Local Development Setup

1. **Clone the repository**:
   ```bash
   git clone https://github.com/YOUR_USERNAME/quicktranslate.git
   cd quicktranslate
   ```

2. **Load into Google Chrome**:
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** in the top right.
   - Click **Load unpacked** and select the cloned repository folder.

3. **Make your changes**:
   - `content/content.js`: Floating card UI, selection listener, dragging behavior.
   - `background/background.js`: Translation API communication, caching, context menu.
   - `popup/`: Extension toolbar popup.
   - `options/`: Settings & preferences dashboard.

4. **Test your changes**:
   - Open `demo.html` in your browser to verify text selection, translation, audio pronunciation, and dragging.

---

## 📋 Pull Request Guidelines

1. Fork the repo and create a branch for your feature (`git checkout -b feature/awesome-feature`).
2. Keep code clean and well-commented.
3. Test across multiple websites to ensure the Shadow DOM handles different layouts.
4. Submit your pull request with a brief explanation and screenshots if applicable.
