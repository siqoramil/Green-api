import { create } from 'zustand'
import type { Credentials } from '@/shared/api'
import {
  createTypedStorage,
  getStorage,
  isAllowedApiUrl,
  isString,
  isValidApiToken,
  isValidIdInstance,
  shape,
  type Guard,
  type StorageKind,
  type TypedStorage,
} from '@/shared/lib'

const SESSION_KEY = 'green-max:session'
/** Must match `chatStorageKey` in entities/chat (kept as a string to avoid a cross-entity import). */
const chatHistoryKey = (idInstance: string): string => `green-max:chats:${idInstance}`

/** Stored credentials are re-validated on load, so a tampered entry cannot redirect requests. */
const hasCredentialsShape = shape({ apiUrl: isString, idInstance: isString, apiTokenInstance: isString })
const isCredentials: Guard<Credentials> = (value): value is Credentials =>
  hasCredentialsShape(value) &&
  isAllowedApiUrl(value.apiUrl) &&
  isValidIdInstance(value.idInstance) &&
  isValidApiToken(value.apiTokenInstance)

const slots: Record<StorageKind, TypedStorage<Credentials>> = {
  session: createTypedStorage<Credentials>(SESSION_KEY, 'session', isCredentials),
  local: createTypedStorage<Credentials>(SESSION_KEY, 'local', isCredentials),
}

export interface SessionState {
  credentials: Credentials | null
  /** When true, credentials survive a browser restart (localStorage), otherwise only the tab session. */
  remember: boolean
  login: (credentials: Credentials, remember: boolean) => void
  logout: () => void
}

function restore(): Pick<SessionState, 'credentials' | 'remember'> {
  const fromSession = slots.session.read()
  if (fromSession) return { credentials: fromSession, remember: false }
  const fromLocal = slots.local.read()
  return { credentials: fromLocal, remember: fromLocal !== null }
}

function removeEverywhere(key: string): void {
  for (const kind of ['local', 'session'] as const satisfies readonly StorageKind[]) {
    try {
      getStorage(kind)?.removeItem(key)
    } catch {
      // ignore
    }
  }
}

/**
 * Security note: apiTokenInstance is a secret. By default it is kept in sessionStorage
 * (cleared when the tab is closed); localStorage is used only on explicit "remember me".
 * Chat history follows the same choice (see ChatStoreProvider) and is wiped on logout.
 */
export const useSessionStore = create<SessionState>()((set, get) => ({
  ...restore(),

  login: (credentials, remember) => {
    removeEverywhere(SESSION_KEY)
    slots[remember ? 'local' : 'session'].write(credentials)
    set({ credentials, remember })
  },

  // Logging out wipes the token and the local chat history of this instance (shared devices).
  logout: () => {
    const idInstance = get().credentials?.idInstance
    removeEverywhere(SESSION_KEY)
    if (idInstance) removeEverywhere(chatHistoryKey(idInstance))
    set({ credentials: null, remember: false })
  },
}))
