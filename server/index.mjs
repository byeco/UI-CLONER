import 'dotenv/config';
import cors from 'cors';
import express from 'express';

const app = express();
const port = Number(process.env.PORT || 8787);
const groqApiKey = String(process.env.GROQ_API_KEY || '').trim();
const defaultModel = process.env.GROQ_MODEL || 'groq/compound-mini';
const sharedUsage = new Map();
const modelLimits = {
  'openai/gpt-oss-120b': { requestsPerMinute: 30, requestsPerDay: 5, tokensPerMinute: 8000, tokensPerDay: 200000 },
  'qwen/qwen3.8-27b': { requestsPerMinute: 30, requestsPerDay: 10, tokensPerMinute: 8000, tokensPerDay: 200000 },
  'groq/compound': { requestsPerMinute: 30, requestsPerDay: null, tokensPerMinute: 70000, tokensPerDay: null },
  'groq/compound-mini': { requestsPerMinute: 30, requestsPerDay: null, tokensPerMinute: 70000, tokensPerDay: null }
};

const allowedOrigins = new Set(['http://localhost', 'http://127.0.0.1']);

app.use(cors({
  origin(origin, callback) {
    if (!origin || origin.startsWith('chrome-extension://') || allowedOrigins.has(origin)) {
      callback(null, true);
      return;
    }
    callback(new Error('CORS: Unauthorized origin'));
  }
}));
app.use(express.json({ limit: '4mb' }));

app.get('/health', (_req, res) => {
  res.json({ ok: true, configured: Boolean(groqApiKey), model: defaultModel });
});

app.post('/api/analyze', async (req, res) => {
  if (!groqApiKey) {
    res.status(500).json({ error: 'GROQ_API_KEY .env dosyasinda tanimli degil.' });
    return;
  }

  const { selection, model, language = 'tr' } = req.body || {};
  if (!selection) {
    res.status(400).json({ error: 'Selection data is required.' });
    return;
  }

  const activeModel = model || defaultModel;
  const limit = modelLimits[activeModel] || modelLimits[defaultModel] || modelLimits['groq/compound-mini'];
  const now = Date.now();
  const records = (sharedUsage.get(activeModel) || []).filter((entry) => now - entry.timestamp < 24 * 60 * 60 * 1000);
  const minuteRecords = records.filter((entry) => now - entry.timestamp < 60 * 1000);
  const dayTokens = records.reduce((sum, entry) => sum + entry.tokens, 0);
  const minuteTokens = minuteRecords.reduce((sum, entry) => sum + entry.tokens, 0);
  const estimatedTokens = Math.max(1, Math.ceil(JSON.stringify(selection).length / 4) + 1400);
  if (
    minuteRecords.length >= limit.requestsPerMinute ||
    (limit.requestsPerDay !== null && records.length >= limit.requestsPerDay) ||
    (limit.tokensPerMinute !== null && minuteTokens + estimatedTokens > limit.tokensPerMinute) ||
    (limit.tokensPerDay !== null && dayTokens + estimatedTokens > limit.tokensPerDay)
  ) {
    res.status(429).json({ error: 'BYECO ortak kullanım kotası doldu. Lütfen daha sonra tekrar deneyin.' });
    return;
  }

  const languageInstruction = language === 'tr'
    ? 'Özeti Türkçe yaz. Kod ve CSS isimleri İngilizce olabilir.'
    : 'Write the summary in English.';
  const prompt = `Create a concise responsive React + Tailwind component from the selected UI.
${languageInstruction}
Return only a valid JSON object with exactly four string fields: summary, reactCode, pureCss, tailwindClasses.
No Markdown fences, explanations, or extra fields. Use real SVG icons and responsive flex/grid classes.
Selected UI: ${JSON.stringify(selection).slice(0, 24000)}`;

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: activeModel,
        temperature: 0.2,
        max_tokens: 1700,
        messages: [
          { role: 'system', content: 'You produce clean React functional components with Tailwind CSS in JSON format.' },
          { role: 'user', content: prompt }
        ]
      })
    });

    const payload = await response.json();
    if (!response.ok) {
      res.status(response.status).json({ error: payload.error?.message || payload.error || 'Groq request failed.' });
      return;
    }

    const content = String(payload.choices?.[0]?.message?.content || '').trim();
    const withoutFences = content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
    const start = withoutFences.indexOf('{');
    const end = withoutFences.lastIndexOf('}');
    if (start < 0 || end <= start) {
      res.status(502).json({ error: 'Groq valid JSON döndürmedi.' });
      return;
    }

    sharedUsage.set(activeModel, [...records, { timestamp: now, tokens: estimatedTokens }]);
    res.json({ analysis: JSON.parse(withoutFences.slice(start, end + 1)) });
  } catch (error) {
    res.status(502).json({ error: error.message || 'AI request failed.' });
  }
});

app.listen(port, () => {
  console.log(`BYECO AI proxy listening on http://localhost:${port}`);
});
