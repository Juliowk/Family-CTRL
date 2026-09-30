/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type Plugin } from 'vite';

/**
 * Injeta a Content-Security-Policy no index.html apenas no build de produção.
 * Em desenvolvimento o Vite usa scripts inline (hot reload), que a CSP bloquearia.
 * A política só permite recursos da própria origem e chamadas para a URL da API.
 */
function contentSecurityPolicy(apiUrl: string): Plugin {
  const politica = [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self' ${apiUrl}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
  return {
    name: 'content-security-policy',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace(
        '<!-- CSP -->',
        `<meta http-equiv="Content-Security-Policy" content="${politica}" />`,
      ),
  };
}

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_');
  const apiUrl = env.VITE_API_URL || 'http://localhost:8080';
  return {
    // No GitHub Pages o site fica em https://<usuario>.github.io/Family-CTRL/
    base: command === 'build' ? '/Family-CTRL/' : '/',
    plugins: [react(), contentSecurityPolicy(apiUrl)],
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: false,
      restoreMocks: true,
    },
  };
});
