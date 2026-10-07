import type { Guard } from './guards'

export type StorageKind = 'local' | 'session'

export interface TypedStorage<T> {
  read: () => T | null
  write: (value: T) => void
  remove: () => void
}

/** Web Storage may throw (privacy mode, sandboxed iframes, quota) — never let that crash the app. */
export function getStorage(kind: StorageKind): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

/**
 * JSON storage slot bound to a key and validated by a type guard on every read,
 * so tampered or outdated data is treated as absent instead of being trusted.
 */
export function createTypedStorage<T>(key: string, kind: StorageKind, guard: Guard<T>): TypedStorage<T> {
  return {
    read: () => {
      try {
        const raw = getStorage(kind)?.getItem(key)
        if (!raw) return null
        const parsed: unknown = JSON.parse(raw)
        return guard(parsed) ? parsed : null
      } catch {
        return null
      }
    },
    write: (value) => {
      try {
        getStorage(kind)?.setItem(key, JSON.stringify(value))
      } catch {
        // quota exceeded / storage disabled — the value stays in memory only
      }
    },
    remove: () => {
      try {
        getStorage(kind)?.removeItem(key)
      } catch {
        // ignore
      }
    },
  }
}
