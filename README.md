# BYECO UI Cloner

BYECO UI Cloner is a modern Manifest V3 Chrome extension for developers and designers. Select any element on a live webpage, inspect its visual structure, and turn it into clean React JSX, Tailwind CSS, and production-ready component code with AI assistance.

## Official Description

**BYECO UI Cloner helps you move from interface inspiration to usable code.** Inspect any web component directly in your browser, understand its layout and visual styles, generate a responsive React/Tailwind implementation, and copy the result into your project in seconds. It is designed for fast prototyping, design exploration, and front-end development while keeping your data and API settings under your control.

## ✨ Features

- **Live Element Inspection:** Hover over any DOM element with real-time dimensions and tag badge (`<button> 120 × 40px`). Press `ESC` at any time to cancel inspection.
- **Computed Style to Tailwind CSS:** Automatically converts background colors, text colors, font sizes, weights, flexbox/grid alignments, padding, radius, and borders into clean Tailwind utility classes.
- **React JSX Generation:** Instant JSX boilerplate ready to copy into your project.
- **AI-Powered UI Review (Groq):**
  - Architecture and visual summary
  - Structured visual notes
  - Accessibility (WCAG / ARIA) recommendations
  - Production-ready React code
  - Actionable next steps
- **Privacy & Security First (BYOK Support):**
  - **Direct Mode:** Enter your free Groq API key directly into the extension Settings. It is stored exclusively in your browser's private `chrome.storage.local` sandbox. No server required.
  - **Local Proxy Mode:** Alternatively, run the included Node.js Express proxy (`npm run server`) using the key stored in your local `.env` file.

---

## 🚀 Quick Start

### 1. Build the Extension

```bash
npm install
npm run build
```

To create an upload-ready ZIP, run:

```bash
npm run package
```

Upload `byeco-ui-cloner.zip` from the project root. The ZIP contains the contents of `dist/` at its root, including `manifest.json`; do not upload the project folder or a ZIP that contains a top-level `UICLONER/` directory.

The packaging command rebuilds `dist/`, removes any previous ZIP, and verifies that `manifest.json` is at the archive root before completing.

### Optional Local Proxy

```bash
copy .env.example .env
npm run server
```

The proxy listens on `http://localhost:8787`. Keep `.env` local and never commit its API key.

### 2. Load in Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top right.
3. Click **Load unpacked** and select the `dist/` directory.
4. Pin BYECO UI Cloner and open the Side Panel!

---

## 🤖 Groq AI Setup

You have two ways to power the AI features:

### Option A: Direct Client Mode (Recommended for personal use)
1. Open the BYECO UI Cloner side panel.
2. Click the **⚙ Settings** button in the header.
3. Choose **Direct Groq API** as your connection mode.
4. Paste your free API key from [Groq Console](https://console.groq.com/keys).
5. Select your preferred model (e.g. `llama-3.3-70b-versatile` or `llama-3.1-8b-instant`).
6. Click **Save Settings**. Done!

---

## 🔒 Security & Open-Source Guidelines

- `.env` and `.env.*` files are strictly ignored by `.gitignore`. **Never commit your API keys.**
- The repository is configured with a GitHub Actions CI pipeline (`.github/workflows/ci.yml`) that validates build integrity on every pull request.
- No third-party tracking or telemetry is collected.

---

## 🛠️ Project Structure

```text
UICLONER/
├── config/
│   └── extension-manifest.json # Source manifest emitted into dist/
├── public/
│   └── ICON/
├── src/
│   ├── background.js      # Service worker configuring side panel behavior
│   ├── content/
│   │   └── inspector.js   # In-page element inspector with badge & ESC support
│   ├── popup/
│   │   └── main.jsx       # Quick popup trigger
│   ├── sidepanel/
│   │   └── main.jsx       # Main sidebar interface with settings & AI review
│   ├── styleMapper.js     # Intelligent computed style -> Tailwind CSS mapper
│   └── styles.css         # Extension theme styling
├── vite.config.js         # Vite build configuration
└── package.json
```

## 📄 License

Distributed under the MIT License. See `LICENSE` for more information.
