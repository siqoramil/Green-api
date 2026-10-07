import type { Credentials } from '@/shared/api'
import { compact } from '@/shared/lib'

/**
 * Credentials from `.env.local`, used to prefill the login form during local development.
 *
 * Security: Vite inlines `import.meta.env.VITE_*` into the JS bundle. The whole expression is
 * guarded by `import.meta.env.DEV`, so in production builds the branch is dead code and the
 * values are stripped by the minifier — a token in .env can never end up on a public host.
 * `vite.config.ts` additionally fails the build if the token string is found in any output chunk.
 */
export const devCredentials: Partial<Credentials> | null = import.meta.env.DEV
  ? compact<Record<keyof Credentials, string | undefined>>({
      idInstance: import.meta.env.VITE_GREEN_API_ID_INSTANCE?.trim() || undefined,
      apiTokenInstance: import.meta.env.VITE_GREEN_API_TOKEN_INSTANCE?.trim() || undefined,
      apiUrl: import.meta.env.VITE_GREEN_API_URL?.trim() || undefined,
    })
  : null
