/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig, loadEnv, type Plugin } from 'vite'

/**
 * Content-Security-Policy for production builds (dev needs inline scripts for HMR).
 * - connect-src: the API token may only ever be sent to GREEN-API hosts;
 * - no inline/eval scripts, no plugins, no foreign frames or form targets.
 * Headers that cannot be set via <meta> (frame-ancestors, HSTS…) live in deploy/nginx.conf.
 */
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self'",
  "img-src 'self' data:",
  "font-src 'self'",
  'connect-src https://*.green-api.com',
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-src 'none'",
].join('; ')

const contentSecurityPolicy = (): Plugin => ({
  name: 'content-security-policy',
  apply: 'build',
  transformIndexHtml: () => [
    { tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: CSP }, injectTo: 'head-prepend' },
  ],
})

/**
 * Fails the production build if a secret from .env leaked into any emitted file.
 * Dev credentials are referenced only behind `import.meta.env.DEV` and must be stripped.
 */
const forbidSecretsInBundle = (secrets: string[]): Plugin => ({
  name: 'forbid-secrets-in-bundle',
  apply: 'build',
  generateBundle(_options, bundle) {
    for (const file of Object.values(bundle)) {
      const content = file.type === 'chunk' ? file.code : String(file.source)
      if (secrets.some((secret) => content.includes(secret))) {
        this.error(`Secret from .env found in ${file.fileName}. Credentials must never be bundled.`)
      }
    }
  },
})

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  const secrets = [env.VITE_GREEN_API_TOKEN_INSTANCE].filter((value): value is string => Boolean(value?.trim()))

  return {
    // Relative base lets the same build work on GitHub Pages (/<repo>/) and on a domain root.
    base: './',
    plugins: [
      react(),
      babel({ presets: [reactCompilerPreset()] }),
      tailwindcss(),
      contentSecurityPolicy(),
      forbidSecretsInBundle(secrets),
    ],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    test: {
      environment: 'happy-dom',
      globals: true,
      setupFiles: ['./src/test/setup.ts'],
      css: false,
    },
  }
})
