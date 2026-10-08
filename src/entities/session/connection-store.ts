import { create } from 'zustand'

/** `failed` — the poller stopped: retrying cannot help (wrong token, exhausted tariff). */
export type ConnectionStatus = 'connecting' | 'online' | 'offline' | 'failed'

export interface ConnectionState {
  status: ConnectionStatus
  error: string | null
}

/** Health of the notification channel; written by the poller, read by the UI. */
export const useConnectionStore = create<ConnectionState>()(() => ({
  status: 'connecting',
  error: null,
}))
