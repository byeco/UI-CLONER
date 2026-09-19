// Fails if anything that looks like a real Groq API key appears in
// git-tracked files. Placeholders such as "gsk_..." (4 chars or fewer
// after the prefix) are ignored so the UI placeholder text passes.
// Usage: npm run secret-scan
import { execSync } from 'node:child_process';

const files = execSync('git ls-files', { encoding: 'utf8' })
  .split('\n')
  .map((f) => f.trim())
  .filter(Boolean)
  .filter((f) => !f.endsWith('.zip'));

const { readFileSync } = await import('node:fs');
const pattern = /gsk_[A-Za-z0-9_-]{8,}/;
let failed = false;

for (const file of files) {
  let content;
  try {
    content = readFileSync(file, 'utf8');
  } catch {
    continue; // binary file
  }
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    if (pattern.test(line)) {
      console.error(`SECRET LEAK: ${file}:${idx + 1} looks like a Groq API key.`);
      failed = true;
    }
  });
}

// .env and the encrypted key store must never be tracked.
try {
  const tracked = execSync('git ls-files', { encoding: 'utf8' });
  for (const forbidden of ['.env', '.groqkey.enc']) {
    if (new RegExp(`^${forbidden}$`, 'm').test(tracked)) {
      console.error(`SECRET LEAK: ${forbidden} is tracked by git. Remove it immediately.`);
      failed = true;
    }
  }
} catch { /* git unavailable — skip this check */ }

if (failed) {
  console.error('\nRotate the exposed key at https://console.groq.com/keys, then purge it from history.');
  process.exit(1);
}
console.log('secret-scan: no tracked secrets found.');
