# Chrome Web Store Submission Kit

Use the exact information below when submitting **QuickTranslate** to the [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole).

---

## 📦 Package File
- **ZIP File**: `quicktranslate-v1.0.0.zip` (located in your project root)
- Ready for direct drag-and-drop upload.

---

## 1. Product Details

### Item Name (Title)
```text
QuickTranslate: Instant Text Selection Translator
```

### Summary (Short Description - Max 132 characters)
```text
Instantly translate any selected text into your preferred language with native pronunciation, dictionary definitions, and copy.
```
*(Length: 126 characters — within the 132-character limit)*

---

### Detailed Description (Paste into Store Description box)

```text
QuickTranslate is a fast, lightweight, and private browser extension that instantly translates text the moment you highlight it on any webpage. 

Say goodbye to copying text and opening Google Translate in another tab. Simply select a word, phrase, or paragraph, and QuickTranslate immediately displays the translation in a sleek, draggable floating card right beside your cursor.

✨ KEY FEATURES:

⚡ Instant Selection Translation: Highlight any text on any website to translate immediately without interrupting your reading flow.
🖐️ Fully Draggable Card: Easily click and drag the translation box anywhere on your screen.
🌐 100+ Languages Supported: Seamlessly translate between English, Spanish, French, German, Japanese, Chinese, Hindi, Tamil, Arabic, Portuguese, and over 90 more languages.
🔊 Native Audio Pronunciation: Listen to the accurate pronunciation of translated phrases powered by built-in speech synthesis.
📋 1-Click Clipboard Copy: Quickly copy the translation with instant visual confirmation.
📖 Dictionary & Synonyms: View word definitions, parts of speech, and alternate meanings for single words.
🎨 Modern Light & Dark Themes: Automatically synchronizes with your system preferences or browser theme.
🛡️ Zero Website Conflicts: Built using isolated Shadow DOM architecture so host website styles never break your translation card.
🔒 Privacy-Focused: No tracking, no browsing history logging, and zero collection of personal information.

⚙️ 3 CUSTOMIZABLE TRIGGER MODES:
1. Instant Tooltip (Default): Card appears immediately when text is highlighted.
2. Floating Icon Badge: A subtle translation bubble appears next to your selection—click to open.
3. Modifier Key: Only triggers when holding the Alt / Option key while highlighting.

🚀 HOW TO USE:
1. Highlight any word or sentence on any webpage.
2. The QuickTranslate card appears instantly with the translation and audio option.
3. Drag the card header if you want to reposition it.
4. Click the extension icon in your toolbar to switch default languages or view recent translation history.

QuickTranslate is completely free, privacy-first, and built with modern Manifest V3 technology.
```

---

## 2. Category & Language

- **Primary Category**: `Productivity`
- **Secondary Category (if prompted)**: `Accessibility` or `Tools`
- **Language**: `English`

---

## 3. Privacy Practices & Permission Justifications

Google reviewers manually inspect and approve permissions. Use these exact justification texts:

### Single Purpose Description
```text
The single purpose of QuickTranslate is to translate user-selected text on web pages into the user's preferred language on demand.
```

### Permission Justifications (Copy into Developer Dashboard)

| Permission | Justification for Reviewer |
| :--- | :--- |
| **`storage`** | "Used strictly to save user preferences (default target language, trigger mode, theme) and optional local translation history on the user's device." |
| **`contextMenus`** | "Used to provide a right-click context menu item ('Translate selection') as a convenient alternative way to translate highlighted text." |
| **`activeTab`** | "Used to detect selected text and display the translation card on the currently active tab when requested." |
| **`https://translate.googleapis.com/*`** | "Required to securely communicate with the public Google Translate API endpoint to fetch translated text and dictionary definitions." |
| **`<all_urls>` (Content scripts)** | "Required to listen for user text selections across any webpage so the translation popover can be displayed directly next to the highlighted text." |

### Privacy Questionnaire Answers
- **Does your extension collect user data?** Select **NO**.
- **Are you selling user data to third parties?** Select **NO**.
- **Are you using or transferring user data for purposes unrelated to the item's core functionality?** Select **NO**.
- **Are you using or transferring user data to determine creditworthiness or for lending purposes?** Select **NO**.

---

## 4. Privacy Policy URL

Chrome Web Store requires a publicly accessible Privacy Policy URL. You can host [`privacy.html`](file:///Users/subashthiruppathy/Documents/projects/instant-translate-extension/privacy.html) on:
1. **GitHub Pages** (Free, takes 1 minute): Push your repository and turn on GitHub Pages.
2. Or a simple public gist / Notion page with the privacy policy text provided in `privacy.html`.

---

## 5. Store Graphics & Screenshots

The Chrome Web Store requires:
1. **Store Icon**: Upload [`icons/icon128.png`](file:///Users/subashthiruppathy/Documents/projects/instant-translate-extension/icons/icon128.png) (128x128 px).
2. **Screenshots** (At least 1 required, 1280x800 px or 640x400 px):
   - Open [`demo.html`](file:///Users/subashthiruppathy/Documents/projects/instant-translate-extension/demo.html) in Chrome.
   - Select text to bring up the translation card.
   - Take a clean screenshot of the browser window (`Cmd + Shift + 4` on Mac).
