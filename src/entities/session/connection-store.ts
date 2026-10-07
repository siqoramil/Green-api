import { create } from 'zustand'

export type ConnectionStatus = 'connecting' | 'online' | 'offline'

export interface ConnectionState {
  status: ConnectionStatus
  error: string | null
}

/** Health of the notification channel; written by the poller, read by the UI. */
export const useConnectionStore = create<ConnectionState>()(() => ({
  status: 'connecting',
  error: null,
}))
