import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { computedStyleToTailwind, elementToJsx, styleRows, generatePureCss } from '../styleMapper';
import { translations } from '../i18n';
import '../styles.css';

const DEFAULT_MODEL = 'openai/gpt-oss-120b';
const DEFAULT_API_MODE = 'proxy';
const PROXY_API_URL = 'http://localhost:8787';
const VALID_MODELS = [
  'openai/gpt-oss-120b',
  'qwen/qwen3.8-27b',
  'groq/compound',
  'groq/compound-mini'
];

function getModelLimitSummary(modelName, lang = 'tr') {
  const limit = MODEL_ACCESS[modelName] || MODEL_ACCESS['openai/gpt-oss-120b'];

  if (limit.requestsPerDay === null) {
    return lang === 'tr'
      ? '30 istek/dakika • sınırsız günlük hak • 70K token/dakika • günlük token limiti yok'
      : '30 req/min • unlimited daily requests • 70K tokens/min • no daily token cap';
  }

  return lang === 'tr'
    ? `30 istek/dakika • ${limit.requestsPerDay}/gün • 8K token/dakika • 200K token/gün`
    : `30 req/min • ${limit.requestsPerDay}/day • 8K tokens/min • 200K tokens/day`;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const MODEL_ACCESS = {
  'groq/compound': {
    tier: 'free',
    label: 'Ücretsiz',
    shortLabel: 'Ücretsiz',
    requestsPerMinute: 30,
    requestsPerDay: null,
    tokensPerMinute: 70000,
    tokensPerDay: null
  },
  'groq/compound-mini': {
    tier: 'free',
    label: 'Ücretsiz',
    shortLabel: 'Ücretsiz',
    requestsPerMinute: 30,
    requestsPerDay: null,
    tokensPerMinute: 70000,
    tokensPerDay: null
  },
  'openai/gpt-oss-120b': {
    tier: 'paid',
    label: 'Günlük hak',
    shortLabel: '5/gün',
    requestsPerMinute: 30,
    requestsPerDay: 5,
    tokensPerMinute: 8000,
    tokensPerDay: 200000
  },
  'qwen/qwen3.8-27b': {
    tier: 'paid',
    label: 'Günlük hak',
    shortLabel: '10/gün',
    requestsPerMinute: 30,
    requestsPerDay: 10,
    tokensPerMinute: 8000,
    tokensPerDay: 200000
  }
};

function estimateRequestTokens(text = '') {
  return Math.max(1, Math.ceil((text || '').length / 4));
}

function compactSelection(selection) {
  if (!selection) return selection;

  const compactNode = (node, depth = 0) => {
    if (!node || depth > 2) return null;
    return {
      tagName: node.tagName,
      text: typeof node.text === 'string' ? node.text.slice(0, 80) : '',
      attributes: node.attributes || {},
      dimensions: node.dimensions,
      style: node.style,
      children: Array.isArray(node.children)
        ? node.children.slice(0, 8).map((child) => compactNode(child, depth + 1)).filter(Boolean)
        : []
    };
  };

  return {
    tagName: selection.tagName,
    text: typeof selection.text === 'string' ? selection.text.slice(0, 120) : '',
    selector: typeof selection.selector === 'string' ? selection.selector.slice(0, 240) : '',
    attributes: selection.attributes || {},
    dimensions: selection.dimensions,
    style: selection.style,
    children: Array.isArray(selection.children)
      ? selection.children.slice(0, 10).map((child) => compactNode(child)).filter(Boolean)
      : [],
    totalChildren: selection.totalChildren || 0
  };
}

function getModelErrorMessage(payload, lang) {
  const message = payload?.error?.message || payload?.error || '';
  const retryMatch = String(message).match(/try again in ([\d.]+)s/i);
  if (retryMatch) {
    return lang === 'tr'
      ? `Model şu anda yoğun. Yaklaşık ${Math.ceil(Number(retryMatch[1]))} saniye bekleyip tekrar deneyin.`
      : `The model is busy. Please wait about ${Math.ceil(Number(retryMatch[1]))} seconds and try again.`;
  }
  if (/tokens per minute|request too large|too large/i.test(String(message))) {
    return lang === 'tr'
      ? 'Bu istek modelin dakika başı token limitini aşıyor. Daha küçük bir öğe seçin veya Groq Compound Mini modelini deneyin.'
      : 'This request exceeds the model token limit. Select a smaller element or try Groq Compound Mini.';
  }
  return message || (lang === 'tr' ? 'Yapay zeka isteği başarısız oldu.' : 'AI request failed.');
}

function parseModelJson(content, lang) {
  const raw = String(content || '').trim();
  const withoutFences = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  const start = withoutFences.indexOf('{');
  const end = withoutFences.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error(lang === 'tr' ? 'Model geçerli JSON üretmedi. Daha küçük bir öğe seçip tekrar deneyin.' : 'The model did not return valid JSON. Select a smaller element and try again.');
  }

  try {
    return JSON.parse(withoutFences.slice(start, end + 1));
  } catch {
    throw new Error(lang === 'tr' ? 'Model cevabı eksik veya bozuk JSON içeriyor. Tekrar deneyin.' : 'The model returned incomplete or invalid JSON. Please try again.');
  }
}

function getModelUsageRecords(historyByModel, modelName) {
  if (!historyByModel || !modelName) return [];
  const items = historyByModel[modelName];
  if (!Array.isArray(items)) return [];
  return items.filter((entry) => entry && typeof entry === 'object' && typeof entry.timestamp === 'number');
}

function getUsageSnapshot(modelName, historyByModel) {
  const limit = MODEL_ACCESS[modelName] || MODEL_ACCESS['openai/gpt-oss-120b'];
  const records = getModelUsageRecords(historyByModel, modelName);
  const now = Date.now();
  const minuteWindowMs = 60 * 1000;
  const dayWindowMs = DAY_MS;

  const minuteRecords = records.filter((entry) => now - entry.timestamp < minuteWindowMs);
  const dayRecords = records.filter((entry) => now - entry.timestamp < dayWindowMs);

  return {
    minuteCount: minuteRecords.length,
    dayCount: dayRecords.length,
    minuteTokens: minuteRecords.reduce((sum, entry) => sum + Number(entry.tokens || 0), 0),
    dayTokens: dayRecords.reduce((sum, entry) => sum + Number(entry.tokens || 0), 0),
    limit,
    remainingMinuteRequests: Math.max(0, limit.requestsPerMinute - minuteRecords.length),
    remainingDayRequests: limit.requestsPerDay === null ? null : Math.max(0, limit.requestsPerDay - dayRecords.length),
    remainingMinuteTokens: limit.tokensPerMinute === null ? null : Math.max(0, limit.tokensPerMinute - minuteRecords.reduce((sum, entry) => sum + Number(entry.tokens || 0), 0)),
    remainingDayTokens: limit.tokensPerDay === null ? null : Math.max(0, limit.tokensPerDay - dayRecords.reduce((sum, entry) => sum + Number(entry.tokens || 0), 0))
  };
}

function formatCountdown(ms) {
  if (ms <= 0) return '00:00';
  const totalSec = Math.ceil(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec < 10 ? '0' : ''}${sec}`;
}

async function getStorageItem(key) {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const data = await chrome.storage.local.get([key]);
    return data[key];
  }
  return localStorage.getItem(key);
}

async function setStorageItem(key, value) {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [key]: value });
  } else {
    localStorage.setItem(key, value);
  }
}

async function captureCroppedScreenshot(rect) {
  try {
    if (typeof chrome === 'undefined' || !chrome.tabs?.captureVisibleTab) return null;
    const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
    if (!dataUrl) return null;

    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const dpr = rect.dpr || 1;
        const cropX = Math.max(0, rect.left * dpr);
        const cropY = Math.max(0, rect.top * dpr);
        const cropW = Math.min(img.width - cropX, rect.width * dpr);
        const cropH = Math.min(img.height - cropY, rect.height * dpr);

        if (cropW <= 2 || cropH <= 2) {
          resolve(null);
          return;
        }

        const canvas = document.createElement('canvas');
        const maxW = 1200;
        const scale = Math.min(1, maxW / cropW);
        canvas.width = Math.round(cropW * scale);
        canvas.height = Math.round(cropH * scale);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
  } catch (err) {
    console.warn('Screenshot capture warning:', err);
    return null;
  }
}

function SidePanel() {
  const [lang, setLang] = useState('tr');
  const t = translations[lang] || translations.tr;

  const [selection, setSelection] = useState(null);
  const [screenshot, setScreenshot] = useState(null);
  const [isInspecting, setIsInspecting] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState('');
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAiReadyToast, setShowAiReadyToast] = useState(false);
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' | 'raw'
  const [subTab, setSubTab] = useState('split'); // 'split' | 'jsx' | 'css' | 'tailwind'
  const [cache, setCache] = useState({});

  // AI Quota State: 5 uses per 30 minutes
  const [usageHistory, setUsageHistory] = useState([]);
  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const ticker = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  // Settings Modal State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [apiMode, setApiMode] = useState('direct');
  const [model, setModel] = useState(DEFAULT_MODEL);
  const [savedSettingsNotice, setSavedSettingsNotice] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isSettingsOpen) {
        setIsSettingsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSettingsOpen]);

  useEffect(() => {
    const loadSettings = async () => {
      const storedLang = await getStorageItem('appLanguage');
      const storedKey = await getStorageItem('groqApiKey');
      const storedMode = await getStorageItem('groqApiMode');
      const storedModel = await getStorageItem('groqModel');
      const storedHistory = await getStorageItem('aiUsageHistory');

      if (storedLang) setLang(storedLang);
      if (storedKey) setApiKey(storedKey);
      const initialMode = storedMode === 'direct' || storedMode === 'proxy'
        ? storedMode
        : DEFAULT_API_MODE;
      setApiMode(initialMode);
      if (!storedMode) await setStorageItem('groqApiMode', initialMode);
      if (storedHistory && typeof storedHistory === 'object' && !Array.isArray(storedHistory)) {
        setUsageHistory(storedHistory);
      } else if (Array.isArray(storedHistory)) {
        setUsageHistory({ [DEFAULT_MODEL]: storedHistory });
      }
      if (storedModel && VALID_MODELS.includes(storedModel)) {
        setModel(storedModel);
      } else {
        setModel(DEFAULT_MODEL);
        await setStorageItem('groqModel', DEFAULT_MODEL);
      }
    };
    loadSettings();

    const listener = (message) => {
      if (message.type === 'ELEMENT_SELECTED') {
        const payload = message.payload;
        setSelection(payload);
        setScreenshot(null);
        setIsInspecting(false);
        setAnalysis(null);
        setError('');
        setShowAiReadyToast(false);
        setActiveTab('ai');

        if (payload.rect) {
          captureCroppedScreenshot(payload.rect).then((imgUrl) => {
            if (imgUrl) setScreenshot(imgUrl);
          });
        }
      }
      if (message.type === 'INSPECTION_CANCELLED') {
        setIsInspecting(false);
      }
    };

    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      chrome.runtime.onMessage.addListener(listener);
      return () => chrome.runtime.onMessage.removeListener(listener);
    }
  }, []);

  const changeLanguage = async (newLang) => {
    setLang(newLang);
    await setStorageItem('appLanguage', newLang);
  };

  const saveSettings = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    await setStorageItem('appLanguage', lang);
    await setStorageItem('groqApiKey', apiKey.trim());
    await setStorageItem('groqApiMode', apiMode);
    await setStorageItem('groqModel', model);
    setSavedSettingsNotice(true);
    setTimeout(() => setSavedSettingsNotice(false), 2000);
  };

  const clearUserData = async () => {
    const confirmed = window.confirm(
      lang === 'tr'
        ? 'API anahtarını, kullanım geçmişini ve bu oturumdaki sonuçları silmek istediğinize emin misiniz?'
        : 'Are you sure you want to delete the API key, usage history, and results from this session?'
    );
    if (!confirmed) return;

    await setStorageItem('groqApiKey', '');
    await setStorageItem('aiUsageHistory', {});
    setApiKey('');
    setUsageHistory({});
    setCache({});
    setAnalysis(null);
    setScreenshot(null);
    setSavedSettingsNotice(true);
    setTimeout(() => setSavedSettingsNotice(false), 2000);
  };

  const toggleInspection = async () => {
    setError('');

    try {
      const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
      if (!tab?.id) {
        setError(t.errNoTab);
        return;
      }

      if (isInspecting) {
        try {
          await chrome.tabs.sendMessage(tab.id, { type: 'STOP_INSPECTION' });
        } catch {}
        setIsInspecting(false);
        return;
      }

      const url = tab.url || '';
      if (
        !url ||
        url.startsWith('chrome://') ||
        url.startsWith('chrome-extension://') ||
        url.startsWith('extensions://') ||
        url.startsWith('edge://') ||
        url.startsWith('view-source:') ||
        url.startsWith('about:')
      ) {
        setError(t.errRestrictedPage);
        return;
      }

      let isReady = false;
      try {
        const pingResponse = await Promise.race([
          chrome.tabs.sendMessage(tab.id, { type: 'PING' }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 150))
        ]);
        if (pingResponse?.pong) isReady = true;
      } catch {
        isReady = false;
      }

      if (!isReady) {
        const manifest = chrome.runtime.getManifest();
        const scriptFile = manifest.content_scripts?.[0]?.js?.[0] || 'assets/content.js';
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [scriptFile]
        });
        await new Promise((resolve) => setTimeout(resolve, 60));
      }

      await chrome.tabs.sendMessage(tab.id, { type: 'START_INSPECTION' });
      setIsInspecting(true);
    } catch (err) {
      console.error('Inspection toggle error:', err);
      setIsInspecting(false);
      setError(t.errInspect);
    }
  };

  const style = selection?.style;
  const tailwind = style ? computedStyleToTailwind(style) : '';
  const jsx = style ? elementToJsx(selection, style) : '';
  const pureCss = selection ? generatePureCss(selection) : '';
  const cssCode = analysis?.pureCss || pureCss;

  const isSharedProxy = apiMode === 'proxy';
  const quotaSnapshot = getUsageSnapshot(model, usageHistory);
  const activeModelQuota = isSharedProxy
    ? quotaSnapshot.limit
    : { requestsPerDay: null, tokensPerDay: null, tokensPerMinute: null, requestsPerMinute: null };
  const remainingQuota = isSharedProxy ? quotaSnapshot.remainingDayRequests : null;
  const remainingMinuteQuota = isSharedProxy ? quotaSnapshot.remainingMinuteRequests : null;
  const isQuotaReached = isSharedProxy && (remainingQuota === 0 || quotaSnapshot.remainingDayTokens === 0 || quotaSnapshot.remainingMinuteTokens === 0);
  const earliestUsage = quotaSnapshot.dayCount > 0 ? Math.min(...quotaSnapshot.dayCount ? getModelUsageRecords(usageHistory, model).map((entry) => entry.timestamp) : []) : null;
  const timeUntilReset = (remainingQuota === 0 && earliestUsage)
    ? Math.max(0, (earliestUsage + DAY_MS) - nowTick)
    : 0;

  const copyOutput = async (label, value) => {
    const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    await navigator.clipboard.writeText(text);
    setCopied(label);
    window.setTimeout(() => setCopied(''), 1600);
  };

  const analyzeSelection = async () => {
    if (!selection) return;
    setError('');
    setActiveTab('ai');

    const cacheKey = `${selection.selector}-${selection.dimensions?.width}x${selection.dimensions?.height}-${lang}-${model}`;
    if (cache[cacheKey]) {
      setAnalysis(cache[cacheKey]);
      setShowAiReadyToast(true);
      setError(lang === 'tr'
        ? 'Bu bileşen daha önce bu modelle üretildi. Kayıtlı sonuç gösterildi; hak kullanılmadı.'
        : 'This component was already generated with this model. The cached result was shown; no credit was used.');
      return;
    }

    if (isSharedProxy) {
      const selectedModelQuota = MODEL_ACCESS[model] || MODEL_ACCESS['openai/gpt-oss-120b'];
      const usageSnapshot = getUsageSnapshot(model, usageHistory);
      const estimatedTokens = estimateRequestTokens(JSON.stringify(selection)) + 800;
      const minuteTokenLimitReached = selectedModelQuota.tokensPerMinute !== null && usageSnapshot.minuteTokens + estimatedTokens > selectedModelQuota.tokensPerMinute;
      const dayTokenLimitReached = selectedModelQuota.tokensPerDay !== null && usageSnapshot.dayTokens + estimatedTokens > selectedModelQuota.tokensPerDay;
      const minuteRequestLimitReached = usageSnapshot.minuteCount >= selectedModelQuota.requestsPerMinute;
      const dayRequestLimitReached = selectedModelQuota.requestsPerDay !== null
        && usageSnapshot.dayCount >= selectedModelQuota.requestsPerDay;

      if (minuteRequestLimitReached || dayRequestLimitReached || minuteTokenLimitReached || dayTokenLimitReached) {
        const quotaMessage = lang === 'tr'
          ? `${selectedModelQuota.label} doldu. Bu model için gün/ dakika limiti aşıldı.`
          : `The request or token quota for this model has been reached for the current window.`;
        setError(quotaMessage);
        return;
      }
    }

    setIsAnalyzing(true);
    setShowAiReadyToast(false);

    try {
      let resultAnalysis;
      const promptSelection = compactSelection(selection);
      const promptSelectionJson = JSON.stringify(promptSelection);

      const langInstruction = lang === 'tr'
        ? '"summary" alanını tek cümlelik kısa ve profesyonel Türkçe olarak yaz.'
        : 'Provide "summary" as a single concise English sentence.';

      const promptText = `Sen uzman bir React + Tailwind CSS kıdemli frontend mühendisisin.
${langInstruction}

GÖREV:
Verilen arayüz tasarımını React ve Tailwind CSS kullanarak eksiksiz, üretime hazır (production-ready) bir fonksiyonel bileşen olarak klonla. Önceki üretimlerde yapılan hataları tekrarlamamak için aşağıdaki KESİN KURALLARA harfiyen uy:

1. PLACEHOLDER (YER TUTUCU) KULLANIMINI KESİNLİKLE YASAKLA:
- İkonlar için asla <span className="bg-gray-300 rounded-full" /> veya gri kutular gibi geçici geometrik şekiller üretme!
- Tasarımda görülen HER BİR İKON (Beğen, Yorum, Paylaş, Profil, Kaydet, Ses/Müzik/Pivot, Menü vb.) için uygun, ölçeklenebilir, estetik ve gerçek SVG kodlarını (<svg viewBox="0 0 24 24" fill="currentColor" className="...">...<path .../></svg>) eksiksiz olarak koda dahil et.

2. SABİT PİKSEL DEĞERLERİNDEN (HARDCODING) KAÇIN:
- Kapsayıcı (container) elemanlarda h-[610px], w-[400px] gibi sabit ve ekranı bozan piksel değerleri KESİNLİKLE KULLANMA.
- Bunun yerine eylem çubuğunu ve bileşenleri ekranın veya kapsayıcı videonun/kartın uygun yerine hizalamak için modern flexbox/grid mantığını (h-full, w-full, justify-end, items-center, absolute bottom-0 right-0, p-4 vb.) kullan. Tasarım tam anlamıyla responsive (duyarlı) ve akıcı olmalıdır.

3. EKSEN VE DÜZEN (LAYOUT) MANTIĞINI DÜZELT:
- Reels, Shorts ve benzeri modern UI yapılarında sağdaki eylem butonları (beğeni, yorum, paylaş) ve en alttaki "ses/pivot/müzik" butonu genellikle tek bir dikey sütunda (flex flex-col items-center gap-4) hizalanır. Pivot/ses butonunu sağa sola rastgele fırlatma (w-18, ml-2 gibi hatalı sınıflar kullanma).
- Arayüzü analiz ederken ana ekseni doğru belirle ve elemanları orijinal tasarımdaki gibi aynı dikey veya yatay hizada tutarlı tut.

4. ETKİLEŞİM GERİ BİLDİRİMLERİ (HOVER/ACTIVE) EKLE:
- Tasarım statik bir görsel olsa bile, klonlanan kodun yaşamasını ve interaktif hissettirmesini sağla.
- Tüm <button> ve <a> etiketlerine hover:opacity-80, hover:scale-105, active:scale-95, transition-all, duration-150 gibi standart Tailwind mikro etkileşim sınıflarını mutlaka ekle.

Do NOT output essays or text chatter. Return valid JSON with exactly these keys:
- "summary": A brief 1-sentence summary of the component in ${lang === 'tr' ? 'Turkish' : 'English'}.
- "reactCode": The complete React functional component code including all nested elements, real SVGs, responsive flex/grid, and Tailwind classes.
- "pureCss": Clean, complete standard CSS stylesheet rules for this component (without Tailwind classes).
- "tailwindClasses": The primary Tailwind classes for the root element.
Return one compact JSON object only. Do not wrap it in Markdown code fences. Keep the component concise enough to fit the response limit and escape quotes/newlines inside string values.

COMPONENT DATA:
${promptSelectionJson}`;
  const compactPromptText = `Create a concise responsive React + Tailwind component from the selected UI.
${langInstruction}
Return only a JSON object with exactly four string fields: summary, reactCode, pureCss, tailwindClasses.
No Markdown fences, explanations, or extra fields. Escape all quotes and newlines correctly. Use real SVG icons and responsive flex/grid classes.
Selected UI: ${promptSelectionJson}`;
      const userContent = activeTargetModel => activeTargetModel === 'qwen/qwen3.8-27b' && Boolean(screenshot)
        ? [
            { type: 'text', text: compactPromptText },
            { type: 'image_url', image_url: { url: screenshot } }
          ]
        : compactPromptText;

      if (apiMode === 'direct') {
        if (!apiKey) {
          throw new Error(t.errNoKey);
        }

        let activeTargetModel = VALID_MODELS.includes(model) ? model : DEFAULT_MODEL;
        const isVision = activeTargetModel === 'qwen/qwen3.8-27b' && Boolean(screenshot);

        let response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey.trim()}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: activeTargetModel,
            temperature: 0.2,
            max_tokens: 1700,
            messages: [
              { role: 'system', content: 'You produce clean React functional components with Tailwind CSS in JSON format.' },
              { role: 'user', content: userContent(activeTargetModel) }
            ]
          })
        });

        // Vision modeli meşgulse otomatik olarak amiral gemisi 120B modeline geç
        if (!response.ok && isVision) {
          console.warn('Vision model busy, falling back to openai/gpt-oss-120b flagship model...');
          activeTargetModel = 'openai/gpt-oss-120b';
          response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey.trim()}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: activeTargetModel,
              temperature: 0.2,
              max_tokens: 1700,
              messages: [
                { role: 'system', content: 'You produce clean React functional components with Tailwind CSS in JSON format.' },
                { role: 'user', content: userContent(activeTargetModel) }
              ]
            })
          });
        }

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(getModelErrorMessage(payload, lang));
        }

        const content = payload.choices?.[0]?.message?.content;
        resultAnalysis = { ...parseModelJson(content, lang), model: activeTargetModel };
      } else {
        const activeTargetModel = VALID_MODELS.includes(model) ? model : DEFAULT_MODEL;
        let response;
        try {
          response = await fetch(`${PROXY_API_URL}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ selection: promptSelection, model: activeTargetModel, language: lang })
          });
        } catch {
          throw new Error(
            lang === 'tr'
              ? 'Yerel AI sunucusu çalışmıyor. Terminalde "npm run server" komutunu çalıştırın veya Ayarlar > Bağlantı Modu bölümünden Doğrudan Groq API seçin.'
              : 'The local AI server is not running. Run "npm run server" in the terminal or choose Direct Groq API in Settings > Connection Mode.'
          );
        }
        const payload = await response.json();
        if (!response.ok) throw new Error(getModelErrorMessage(payload, lang) || t.errServer);
        resultAnalysis = { ...payload.analysis, model: activeTargetModel };
      }

      setAnalysis(resultAnalysis);
      setCache((prev) => ({ ...prev, [cacheKey]: resultAnalysis }));
      setShowAiReadyToast(true);

      if (isSharedProxy) {
        const approximateTokens = estimateRequestTokens(promptSelectionJson) + 1400;
        const currentModelHistory = Array.isArray(usageHistory?.[model]) ? usageHistory[model] : [];
        const updatedHistory = {
          ...(usageHistory || {}),
          [model]: [
            ...currentModelHistory,
            { timestamp: Date.now(), tokens: approximateTokens }
          ]
        };
        setUsageHistory(updatedHistory);
        await setStorageItem('aiUsageHistory', updatedHistory);
      }
    } catch (requestError) {
      setError(requestError.message || t.errAiFailed);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="panel-shell">
      {/* Floating Confirmation Toast in Top-Right Corner */}
      {savedSettingsNotice && (
        <aside className="floating-toast-container" role="status" aria-live="polite">
          <div className="floating-toast-card">
            <div className="toast-icon-circle">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <div className="toast-content">
              <strong className="toast-title">{lang === 'tr' ? 'Ayarlar Kaydedildi' : 'Settings Saved'}</strong>
              <p className="toast-desc">{lang === 'tr' ? 'Yapılandırma başarıyla güncellendi.' : 'Configuration successfully updated.'}</p>
            </div>
            <button
              type="button"
              className="toast-close-btn"
              onClick={() => setSavedSettingsNotice(false)}
              aria-label={lang === 'tr' ? 'Bildirimi Kapat' : 'Dismiss'}
            >
              ✕
            </button>
          </div>
        </aside>
      )}

      <div className="panel-container">
        {/* Sleek Top Header Bar */}
      <header className="panel-header-bar">
        <div className="header-left">
          <div className="brand-group">
            <span className="brand-dot" />
            <span className="brand-name">{t.brand}</span>
          </div>

          {isInspecting && (
            <div
              className="inspecting-live-pill"
              onClick={toggleInspection}
              title={lang === 'tr' ? 'Seçimi durdur (ESC)' : 'Stop selection (ESC)'}
              style={{ cursor: 'pointer' }}
            >
              <span className="live-ping-dot" />
              <span>{lang === 'tr' ? 'Hedef öğeye tıklayın...' : 'Click target element...'}</span>
              <kbd className="kbd-shortcut">ESC</kbd>
            </div>
          )}
        </div>

        <div className="header-right">
          <button
            type="button"
            className="lang-pill-btn"
            onClick={() => changeLanguage(lang === 'tr' ? 'en' : 'tr')}
            title="Dili Değiştir / Switch Language"
          >
            {lang === 'tr' ? '🇹🇷 TR' : '🇬🇧 EN'}
          </button>

          <button
            type="button"
            className={`settings-icon-btn ${isSettingsOpen ? 'active' : ''}`}
            onClick={() => setIsSettingsOpen(true)}
            title={lang === 'tr' ? 'Ayarlar' : 'Settings'}
            aria-label="Ayarlar"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Modern High-End Settings Modal */}
      {isSettingsOpen && (
        <div className="modal-backdrop" onClick={() => setIsSettingsOpen(false)}>
          <div
            className="settings-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className="settings-modal-header">
              <div className="settings-modal-title-group">
                <div className="settings-modal-icon-badge">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="3" />
                    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                  </svg>
                </div>
                <div>
                  <h2 className="settings-modal-title">{t.settingsTitle || 'Ayarlar'}</h2>
                  <p className="settings-modal-sub">
                    {lang === 'tr'
                      ? 'Yapay zeka modeli, API anahtarı ve bağlantı yapılandırması'
                      : 'AI model, API key and connection preferences'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setIsSettingsOpen(false)}
                title={lang === 'tr' ? 'Kapat (ESC)' : 'Close (ESC)'}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={saveSettings} className="settings-modal-body">
              <div className="modal-field-group">
                <div className="modal-label-row">
                  <label htmlFor="setting-model">{t.modelLabel}</label>
                  <span className="model-chip">{model.split('/')[1] || model}</span>
                </div>
                <select
                  id="setting-model"
                  value={model}
                  onChange={async (e) => {
                    const newModel = e.target.value;
                    setModel(newModel);
                    await setStorageItem('groqModel', newModel);
                  }}
                  className="modal-select"
                >
                  <option value="openai/gpt-oss-120b">OpenAI GPT-OSS 120B — 5/gün</option>
                  <option value="qwen/qwen3.8-27b">Qwen 3.8 27B — 10/gün</option>
                  <option value="groq/compound">Groq Compound — Sınırsız</option>
                  <option value="groq/compound-mini">Groq Compound Mini — Sınırsız</option>
                </select>
                <span className="modal-field-hint">
                  {MODEL_ACCESS[model]?.tier === 'free'
                    ? (lang === 'tr'
                        ? 'Groq modelleri ücretsizdir. Günlük hak sınırsızdır; dakikada 30 istek ve 70K token limiti vardır.'
                        : 'Groq models are free with unlimited daily requests; 30 req/min and 70K tokens/min limits still apply.')
                    : (lang === 'tr'
                        ? `${getModelLimitSummary(model, 'tr')}. Hak dolduğunda yeni gün beklenir.`
                        : `${getModelLimitSummary(model, 'en')}. It resets with the next daily window.`)}
                </span>
              </div>

              <div className="modal-field-group">
                <div className="modal-label-row">
                  <label htmlFor="setting-mode">{t.connectionMode}</label>
                  <span className={`status-pill ${apiMode === 'direct' ? 'direct' : 'proxy'}`}>
                    {apiMode === 'direct' ? 'BYOK Direct' : 'Proxy (8787)'}
                  </span>
                </div>
                <select
                  id="setting-mode"
                  value={apiMode}
                  onChange={async (e) => {
                    const newMode = e.target.value;
                    setApiMode(newMode);
                    await setStorageItem('groqApiMode', newMode);
                  }}
                  className="modal-select"
                >
                  <option value="proxy">{t.proxyMode}</option>
                  <option value="direct">{t.directMode}</option>
                </select>
                <span className="modal-field-hint">
                  {apiMode === 'direct' ? t.directModeHelp : t.proxyModeHelp}
                </span>
              </div>

              {apiMode === 'direct' && (
                <div className="modal-field-group">
                  <label htmlFor="setting-key">{t.apiKeyLabel}</label>
                  <input
                    id="setting-key"
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="gsk_..."
                    className="modal-input"
                    autoComplete="off"
                    spellCheck="false"
                  />
                  <span className="modal-field-hint">{t.apiKeyHelp}</span>
                </div>
              )}

              <section className="data-privacy-panel" aria-labelledby="data-privacy-title">
                <div className="data-privacy-heading">
                  <div className="data-privacy-icon" aria-hidden="true">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3 5 6v5c0 4.6 2.9 8.5 7 10 4.1-1.5 7-5.4 7-10V6l-7-3Z" />
                      <path d="m9 12 2 2 4-4" />
                    </svg>
                  </div>
                  <div>
                    <strong id="data-privacy-title">
                      {lang === 'tr' ? 'Verileriniz' : 'Your data'}
                    </strong>
                    <p>
                      {lang === 'tr'
                        ? 'Ayarlar ve kullanım sayacı bu tarayıcıda tutulur.'
                        : 'Settings and usage counters stay in this browser.'}
                    </p>
                  </div>
                </div>
                <ul className="data-privacy-list">
                  <li>{lang === 'tr' ? 'API anahtarı yalnızca yerel depolamada saklanır.' : 'The API key is stored only in local storage.'}</li>
                  <li>{lang === 'tr' ? 'Seçtiğiniz öğe ve üretilen kod kalıcı olarak kaydedilmez.' : 'Selected elements and generated code are not stored permanently.'}</li>
                  <li>{lang === 'tr' ? 'Proxy modunda istekler seçtiğiniz sunucu üzerinden Groq’a gönderilir.' : 'In proxy mode, requests go to Groq through your configured server.'}</li>
                </ul>
                <button type="button" className="data-clear-btn" onClick={clearUserData}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M3 6h18" />
                    <path d="M8 6V4h8v2M19 6l-1 15H6L5 6" />
                    <path d="M10 11v6M14 11v6" />
                  </svg>
                  {lang === 'tr' ? 'Yerel verileri temizle' : 'Clear local data'}
                </button>
                <a
                  className="privacy-policy-link"
                  href="privacy.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  {lang === 'tr' ? 'Gizlilik politikası ve sözleşmeler' : 'Privacy policy and agreements'}
                  <span aria-hidden="true">↗</span>
                </a>
              </section>

              <div className="settings-modal-footer">
                <div className="modal-footer-status">
                  {savedSettingsNotice && (
                    <span className="save-toast-tag">✓ {t.savedSuccess}</span>
                  )}
                </div>
                <div className="modal-footer-buttons">
                  <button
                    type="button"
                    className="modal-cancel-btn"
                    onClick={() => setIsSettingsOpen(false)}
                  >
                    {lang === 'tr' ? 'Kapat' : 'Close'}
                  </button>
                  <button type="submit" className="modal-save-btn">
                    💾 {t.saveSettings}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && <p className="notice">{error}</p>}

      {/* Empty State */}
      {!selection ? (
        <section className="empty-state">
          <div className="empty-state-card">
            <div className="empty-target-ring">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="22" y1="12" x2="18" y2="12" />
                <line x1="6" y1="12" x2="2" y2="12" />
                <line x1="12" y1="6" x2="12" y2="2" />
                <line x1="12" y1="22" x2="12" y2="18" />
              </svg>
            </div>
            <strong className="empty-title">{t.emptyTitle}</strong>
            <p className="empty-desc">{t.emptyDesc}</p>
            <button
              className={`empty-cta-button ${isInspecting ? 'inspecting' : ''}`}
              onClick={toggleInspection}
            >
              {isInspecting ? (
                <>
                  <span className="live-ping-dot" />
                  <span>{lang === 'tr' ? 'Seçim Aktif (ESC ile İptal)' : 'Inspecting (ESC to cancel)'}</span>
                </>
              ) : (
                <>
                  <span>🎯</span>
                  <span>{t.selectElement}</span>
                </>
              )}
            </button>
            <div className="quick-start-guide" aria-label={lang === 'tr' ? 'Hızlı kullanım rehberi' : 'Quick start guide'}>
              <div className="quick-start-heading">
                {lang === 'tr' ? 'Nasıl kullanılır?' : 'How it works'}
              </div>
              <div className="quick-start-steps">
                <div className="quick-start-step">
                  <span className="quick-start-number">1</span>
                  <span>{lang === 'tr' ? 'Öğe seç' : 'Select an element'}</span>
                </div>
                <div className="quick-start-step">
                  <span className="quick-start-number">2</span>
                  <span>{lang === 'tr' ? 'AI ile kodu üret' : 'Generate with AI'}</span>
                </div>
                <div className="quick-start-step">
                  <span className="quick-start-number">3</span>
                  <span>{lang === 'tr' ? 'Kodu kopyala' : 'Copy the code'}</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="workspace-container">
          {/* Primary Tabs + Reselect Action */}
          <div className="tabs-bar">
            <div className="tabs-group-left">
              <button
                className={`tab-btn ${activeTab === 'ai' ? 'active-ai' : ''}`}
                onClick={() => setActiveTab('ai')}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                </svg>
                <span>{t.tabAi}</span>
                <span className={`quota-tab-chip ${isQuotaReached ? 'depleted' : ''}`} title={t.quotaLeft}>
                  {activeModelQuota.requestsPerDay === null ? 'Ücretsiz' : `${remainingQuota ?? 0}/${activeModelQuota.requestsPerDay}`}
                </span>
                {isAnalyzing && <span className="tab-badge pulse">…</span>}
                {analysis && !isAnalyzing && <span className="tab-badge ready">✓</span>}
              </button>
              <button
                className={`tab-btn ${activeTab === 'raw' ? 'active' : ''}`}
                onClick={() => setActiveTab('raw')}
                title={lang === 'tr' ? 'İskelet & Tasarım kodları' : 'Skeleton & Design codes'}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                  <polyline points="16 18 22 12 16 6"/>
                  <polyline points="8 6 2 12 8 18"/>
                </svg>
                <span>{t.tabRaw}</span>
              </button>
              <button
                className={`tab-btn ${isInspecting ? 'tab-reselect-inspecting' : 'tab-reselect'}`}
                onClick={toggleInspection}
                title={isInspecting ? (lang === 'tr' ? 'Seçimi durdur (ESC)' : 'Cancel selection (ESC)') : (lang === 'tr' ? 'Başka bir bileşen seç' : 'Select another component')}
              >
                {isInspecting ? (
                  <>
                    <span className="live-ping-dot" />
                    <span>{lang === 'tr' ? 'İptal' : 'Cancel'}</span>
                    <kbd className="kbd-shortcut">ESC</kbd>
                  </>
                ) : (
                  <>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}>
                      <circle cx="12" cy="12" r="10"/>
                      <circle cx="12" cy="12" r="3"/>
                      <line x1="12" y1="2" x2="12" y2="5"/>
                      <line x1="12" y1="19" x2="12" y2="22"/>
                      <line x1="2" y1="12" x2="5" y2="12"/>
                      <line x1="19" y1="12" x2="22" y2="12"/>
                    </svg>
                    <span>{lang === 'tr' ? 'Yeni Seç' : 'Select'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Secondary Sub-Tabs — only when Raw tab is active */}
          {activeTab === 'raw' && (
            <div className="sub-tabs-bar">
              <button
                className={`sub-tab-btn ${subTab === 'split' ? 'active' : ''}`}
                onClick={() => setSubTab('split')}
              >{t.subSplit}</button>
              <button
                className={`sub-tab-btn ${subTab === 'jsx' ? 'active' : ''}`}
                onClick={() => setSubTab('jsx')}
              >{t.subJsx}</button>
              <button
                className={`sub-tab-btn ${subTab === 'css' ? 'active' : ''}`}
                onClick={() => setSubTab('css')}
              >{t.subCss}</button>
              <button
                className={`sub-tab-btn ${subTab === 'tailwind' ? 'active' : ''}`}
                onClick={() => setSubTab('tailwind')}
              >{t.subTailwind}</button>
            </div>
          )}

          {/* TAB 1: AI React Code (Pure Code Only) */}
          {activeTab === 'ai' && (
            <div className="tab-pane">
              {showAiReadyToast && (
                <div className="ai-ready-banner">
                  <span>{t.aiReadyNotice}</span>
                  <button
                    style={{ background: 'none', border: 'none', color: '#6ee7b7', cursor: 'pointer', fontSize: '13px' }}
                    onClick={() => setShowAiReadyToast(false)}
                  >
                    ✕
                  </button>
                </div>
              )}

              {/* Area Screenshot Preview Thumbnail */}
              {screenshot && (
                <div className="screenshot-preview-bar">
                  <div className="screenshot-preview-left">
                    <img
                      src={screenshot}
                      alt="Captured Area"
                      className="screenshot-thumb"
                      title={lang === 'tr' ? 'Seçilen Alanın Fotoğrafı' : 'Captured Area Photo'}
                    />
                    <div className="screenshot-info">
                      <span>📸 {lang === 'tr' ? 'Yakalanan Tasarım Fotoğrafı' : 'Captured Design Photo'}</span>
                      <small>{selection.dimensions.width} × {selection.dimensions.height}px</small>
                    </div>
                  </div>
                  <span className="model-pill">{model}</span>
                </div>
              )}

              {isAnalyzing && (
                <div className="ai-loading-box">
                  <div className="ai-loading-spinner" />
                  <p>{t.aiAnalyzingStatus}</p>
                  <div className="ai-skeleton-bar" />
                  <div className="ai-skeleton-bar" style={{ width: '60%' }} />
                </div>
              )}

              {!isAnalyzing && !analysis && (
                <div className="ai-cta-card">
                  <div className="ai-cta-inner">
                    {/* Quota Indicator Banner */}
                    <div className="quota-indicator-box">
                      <div className="quota-dots-row">
                        {activeModelQuota.requestsPerDay === null
                          ? [1].map(() => (
                              <span key="free" className="quota-pip active" title={lang === 'tr' ? 'Ücretsiz kullanım' : 'Free access'} />
                            ))
                          : [...Array(Math.min(activeModelQuota.requestsPerDay, 10))].map((_, i) => (
                              <span
                                key={i}
                                className={`quota-pip ${i < (remainingQuota ?? 0) / Math.max(1, Math.ceil((activeModelQuota.requestsPerDay || 1) / 10)) ? 'active' : 'used'}`}
                                title={i < (remainingQuota ?? 0) / Math.max(1, Math.ceil((activeModelQuota.requestsPerDay || 1) / 10)) ? (lang === 'tr' ? 'Kullanılabilir hak' : 'Available credit') : (lang === 'tr' ? 'Kullanıldı' : 'Used')}
                              />
                            ))}
                      </div>
                      <span className="quota-counter-text">
                        {activeModelQuota.requestsPerDay === null
                          ? (lang === 'tr' ? '⚡ Ücretsiz model. Günlük limit uygulanmaz.' : '⚡ Free model. No daily cap is enforced.')
                          : isQuotaReached
                            ? (lang === 'tr'
                                ? `⏳ Günlük istek limiti doldu. Yenilenme: ${formatCountdown(timeUntilReset)}`
                                : `⏳ Daily request limit reached. Resets in: ${formatCountdown(timeUntilReset)}`)
                            : (lang === 'tr'
                                ? `⚡ ${remainingQuota}/${activeModelQuota.requestsPerDay} günlük istek hakkı kaldı`
                                : `⚡ ${remainingQuota}/${activeModelQuota.requestsPerDay} daily requests left`)}
                      </span>
                    </div>

                    <button
                      className={`ai-cta-generate-btn ${isQuotaReached ? 'quota-disabled' : ''}`}
                      onClick={analyzeSelection}
                      disabled={isAnalyzing || isQuotaReached}
                      title={isQuotaReached ? t.quotaExceeded : ''}
                    >
                      {!isQuotaReached ? (
                        <>
                          <span>⚡</span>
                          <span>{t.analyzeAi}</span>
                          <span className="ai-cta-model-tag">{model.includes('120b') ? '120B Flagship' : (model.includes('27b') ? 'Vision 27B' : 'Fast')}</span>
                        </>
                      ) : (
                        <>
                          <span>⏳</span>
                          <span>{lang === 'tr' ? `Süre bekleniyor (${formatCountdown(timeUntilReset)})` : `Wait (${formatCountdown(timeUntilReset)})`}</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {!isAnalyzing && analysis && (
                <article className="capture-card capture-card-wide" style={{ overflow: 'hidden' }}>
                  <div className="code-card-header">
                    <div className="code-card-title">
                      <span className="model-pill">{analysis.model || model}</span>
                      {analysis.summary && <span className="summary-line">{analysis.summary}</span>}
                    </div>
                    <div className="code-card-actions">
                      <button
                        className={`regenerate-code-btn ${isQuotaReached ? 'quota-disabled' : ''}`}
                        onClick={analyzeSelection}
                        disabled={isAnalyzing || isQuotaReached}
                        title={isQuotaReached ? t.quotaExceeded : t.reAnalyzeAi}
                      >
                        {activeModelQuota.requestsPerDay === null
                          ? '🔄 Yeniden Üret'
                          : !isQuotaReached
                            ? `🔄 ${lang === 'tr' ? `Yeniden Üret (${remainingQuota}/${activeModelQuota.requestsPerDay})` : `Regenerate (${remainingQuota}/${activeModelQuota.requestsPerDay})`}`
                            : `⏳ ${formatCountdown(timeUntilReset)}`}
                      </button>
                      <button
                        className={`copy-code-btn ${copied === 'ai' ? 'copied' : ''}`}
                        onClick={() => copyOutput('ai', analysis.reactCode)}
                      >
                        {copied === 'ai' ? t.copied : t.copyAiCode}
                      </button>
                    </div>
                  </div>
                  <pre className="code-output">{analysis.reactCode}</pre>
                </article>
              )}
            </div>
          )}

          {/* TAB 2 / Sub: Yan Yana İskelet & Tasarım (Side-by-Side Split View) */}
          {activeTab === 'raw' && subTab === 'split' && (
            <div className="tab-pane">
              <div className="split-code-grid">
                {/* Sol Kolon: İskelet (React JSX) */}
                <article className="capture-card" style={{ overflow: 'hidden' }}>
                  <div className="code-card-header">
                    <div className="code-card-title">
                      <span>{t.skeletonTitle}</span>
                      {selection.totalChildren > 0 && (
                        <span className="model-pill">{selection.totalChildren} children</span>
                      )}
                    </div>
                    <button
                      className={`copy-code-btn ${copied === 'jsx' ? 'copied' : ''}`}
                      onClick={() => copyOutput('jsx', jsx)}
                    >
                      {copied === 'jsx' ? t.copied : t.copyJsx}
                    </button>
                  </div>
                  <pre className="code-output">{jsx}</pre>
                </article>

                {/* Sağ Kolon: Tasarım (Saf CSS) */}
                <article className="capture-card" style={{ overflow: 'hidden' }}>
                  <div className="code-card-header">
                    <div className="code-card-title">
                      <span>{t.designTitle}</span>
                      <span className="model-pill">Pure CSS</span>
                    </div>
                    <button
                      className={`copy-code-btn ${copied === 'css' ? 'copied' : ''}`}
                      onClick={() => copyOutput('css', cssCode)}
                    >
                      {copied === 'css' ? t.copied : t.copyCss}
                    </button>
                  </div>
                  <pre className="code-output">{cssCode}</pre>
                </article>
              </div>
            </div>
          )}

          {/* Sub: Saf CSS (Pure CSS Stylesheet) */}
          {activeTab === 'raw' && subTab === 'css' && (
            <div className="tab-pane">
              <article className="capture-card capture-card-wide" style={{ overflow: 'hidden' }}>
                <div className="code-card-header">
                  <div className="code-card-title">
                    <span>{t.designTitle}</span>
                    <span className="model-pill">Pure CSS Stylesheet</span>
                  </div>
                  <button
                    className={`copy-code-btn ${copied === 'css' ? 'copied' : ''}`}
                    onClick={() => copyOutput('css', cssCode)}
                  >
                    {copied === 'css' ? t.copied : t.copyCss}
                  </button>
                </div>
                <pre className="code-output">{cssCode}</pre>
              </article>
            </div>
          )}

          {/* Sub: Quick Local JSX */}
          {activeTab === 'raw' && subTab === 'jsx' && (
            <div className="tab-pane">
              <article className="capture-card capture-card-wide" style={{ overflow: 'hidden' }}>
                <div className="code-card-header">
                  <div className="code-card-title">
                    <span>React JSX</span>
                    {selection.totalChildren > 0 && <span className="model-pill">{selection.totalChildren} children</span>}
                  </div>
                  <button
                    className={`copy-code-btn ${copied === 'jsx' ? 'copied' : ''}`}
                    onClick={() => copyOutput('jsx', jsx)}
                  >
                    {copied === 'jsx' ? t.copied : t.copyJsx}
                  </button>
                </div>
                <pre className="code-output">{jsx}</pre>
              </article>
            </div>
          )}

          {/* Sub: Tailwind Classes */}
          {activeTab === 'raw' && subTab === 'tailwind' && (
            <div className="tab-pane">
              <article className="capture-card capture-card-wide" style={{ overflow: 'hidden' }}>
                <div className="code-card-header">
                  <div className="code-card-title">
                    <span>Tailwind CSS</span>
                  </div>
                  <button
                    className={`copy-code-btn ${copied === 'tailwind' ? 'copied' : ''}`}
                    onClick={() => copyOutput('tailwind', tailwind)}
                  >
                    {copied === 'tailwind' ? t.copied : t.copyClasses}
                  </button>
                </div>
                <pre className="code-output">{tailwind || 'No mapped styles'}</pre>
              </article>
            </div>
          )}

        </section>
      )}
      </div>
    </main>
  );
}

createRoot(document.getElementById('root')).render(<SidePanel />);
