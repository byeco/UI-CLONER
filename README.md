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
- **Privacy & Security First:**
  - **BYECO AI Server (Recommended):** Run the included Node.js proxy (`npm run server` or double-click `BASLAT-SUNUCU.bat`) with the shared key in your local `.env` file. Extension users need no API key of their own.
  - **Direct Mode:** Alternatively, enter your own free Groq API key in Settings. It stays in your browser's private `chrome.storage.local` sandbox.

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

### 2. Deploy the AI server once (your key lives here, never in the extension)

Users install only the extension — no terminal, no `.bat`, zero setup.
Your Groq key stays on the server as an environment variable.

1. Deploy `server/` to any Node host (Render / Railway / Fly.io / VPS with Docker):
   - Docker: build this repo's `Dockerfile` (`.env` and `.groqkey.enc` are excluded by `.dockerignore`).
   - Or plain Node: copy `server/`, `package.json`, `package-lock.json`; run `npm ci --omit=dev`, then `node server/index.mjs`.
2. Set these environment variables on the host:
   - `GROQ_API_KEY` = your shared key (secret env var — never in code)
   - `HOST=0.0.0.0`, `PORT=8787` (or the host's port), `PUBLIC_MODE=true`
3. Point the extension at it: set `PROXY_API_URL` in `src/sidepanel/main.jsx` to your public URL (e.g. `https://byeco-ai.onrender.com`), then rebuild + repackage.

Local development alternative (key stays on your machine only):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/set-key.ps1
npm run server
```

### 3. Load in Chrome

1. Open Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top right.
3. Click **Load unpacked** and select the `dist/` directory.
4. Pin BYECO UI Cloner and open the Side Panel!

---

## 🤖 Groq AI Setup

Two ways to power the AI features:

### Option A: BYECO AI Server (Recommended — no key needed in the extension)
1. Put the shared key in `.env` as `GROQ_API_KEY`.
2. Start the server (`npm run server` or `BASLAT-SUNUCU.bat`).
3. In the side panel Settings, choose **BYECO AI Server**. Done!

### Option B: Direct Mode (your own key, no server)
1. Open Settings (⚙) in the side panel.
2. Choose **Direct Groq API**.
3. Paste your free API key from [Groq Console](https://console.groq.com/keys).
4. Click **Save Settings**. Done!

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
