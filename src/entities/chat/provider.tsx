import { useState, type ReactNode } from 'react'
import type { StoreApi } from 'zustand'
import { ChatStoreContext } from './context'
import { chatStorageKey, createChatStore, type ChatStore } from './store'

interface ChatStoreProviderProps {
  /** Chats are stored per instance so that switching accounts never mixes histories. */
  idInstance: string
  /** Persist history across browser restarts (localStorage) or only for the tab session. */
  persistent: boolean
  children: ReactNode
}

export function ChatStoreProvider({ idInstance, persistent, children }: ChatStoreProviderProps) {
  // Remount (key) the provider to switch instance; the store lives as long as the provider.
  const [store] = useState<StoreApi<ChatStore>>(() =>
    createChatStore(chatStorageKey(idInstance), () => (persistent ? localStorage : sessionStorage)),
  )
  return <ChatStoreContext value={store}>{children}</ChatStoreContext>
}
