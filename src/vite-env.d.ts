/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Dev-only: prefills the login form. Never shipped in production builds. */
  readonly VITE_GREEN_API_ID_INSTANCE?: string
  /** Dev-only: prefills the login form. Never shipped in production builds. */
  readonly VITE_GREEN_API_TOKEN_INSTANCE?: string
  /** Dev-only: overrides the derived API host. */
  readonly VITE_GREEN_API_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
