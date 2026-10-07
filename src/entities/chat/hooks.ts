import { useStore, type StoreApi } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { useChatStoreApi } from './context'
import type { Chat, Message } from './model'
import type { ChatActions, ChatStore } from './store'

/** Subscribes to a slice of the chat store; re-renders only when the selected value changes (Object.is). */
export function useChatStore<T>(selector: (state: ChatStore) => T): T {
  return useStore<StoreApi<ChatStore>, T>(useChatStoreApi(), selector)
}

/**
 * Same as `useChatStore`, but compares the result shallowly — use it for selectors that build
 * a new array/object on every call (otherwise the component would re-render on each store update).
 */
export function useChatStoreShallow<T>(selector: (state: ChatStore) => T): T {
  return useChatStore<T>(useShallow<ChatStore, T>(selector))
}

const EMPTY_MESSAGES: readonly Message[] = []

export const useChat = (chatId: string): Chat | undefined => useChatStore<Chat | undefined>((s) => s.chats[chatId])

export const useActiveChatId = (): string | null => useChatStore<string | null>((s) => s.activeChatId)

export const useChatMessages = (chatId: string): readonly Message[] =>
  useChatStore<readonly Message[]>((s) => s.messages[chatId] ?? EMPTY_MESSAGES)

export const useLastMessage = (chatId: string): Message | undefined =>
  useChatStore<Message | undefined>((s) => s.messages[chatId]?.at(-1))

/** Chats ordered by last activity. Elements keep their identity, so shallow comparison is enough. */
export const useSortedChats = (): Chat[] =>
  useChatStoreShallow<Chat[]>((s) => Object.values(s.chats).toSorted((a, b) => b.updatedAt - a.updatedAt))

/** All store actions; they never change, so components using only actions never re-render. */
export const useChatActions = (): ChatActions =>
  useChatStoreShallow<ChatActions>((s) => ({
    upsertChat: s.upsertChat,
    openChat: s.openChat,
    removeChat: s.removeChat,
    addPendingMessage: s.addPendingMessage,
    confirmMessage: s.confirmMessage,
    failMessage: s.failMessage,
    removeMessage: s.removeMessage,
    applyEvent: s.applyEvent,
  }))
