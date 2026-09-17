import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(fileURLToPath(import.meta.url));
const extensionManifest = readFileSync(
  resolve(rootDir, 'config/extension-manifest.json'),
  'utf8'
);

function extensionManifestPlugin() {
  return {
    name: 'extension-manifest',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: 'manifest.json',
        source: extensionManifest
      });
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), extensionManifestPlugin()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: resolve(rootDir, 'popup.html'),
        sidepanel: resolve(rootDir, 'sidepanel.html'),
        privacy: resolve(rootDir, 'privacy.html'),
        content: resolve(rootDir, 'src/content/inspector.js'),
        background: resolve(rootDir, 'src/background.js')
      },
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
});
