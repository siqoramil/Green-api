import { createStore, type StateCreator, type StoreApi } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { assertNever } from '@/shared/lib'
import { isLocalMessageId, mergeStatus, type Chat, type Message } from './model'
import type { ChatEvent, ChatMeta, EventOf } from './parse-notification'

/** Keeps Web Storage small: only the latest N messages per chat are persisted. */
export const MAX_MESSAGES_PER_CHAT = 300

export interface ChatState {
  chats: Record<string, Chat>
  messages: Record<string, Message[]>
  activeChatId: string | null
}

export interface ChatUpsert extends ChatMeta {
  updatedAt?: number
}

export interface ChatActions {
  /** Creates a chat or updates its metadata. Known title/phone are never overwritten by empty values. */
  upsertChat: (chat: ChatUpsert) => void
  openChat: (chatId: string | null) => void
  removeChat: (chatId: string) => void
  /** Adds an optimistic outgoing message and returns its local id. */
  addPendingMessage: (chatId: string, text: string) => string
  /** Replaces a local id with the id returned by SendMessage. */
  confirmMessage: (chatId: string, localId: string, idMessage: string) => void
  failMessage: (chatId: string, localId: string, error: string) => void
  removeMessage: (chatId: string, messageId: string) => void
  /** Applies an event received from the notification queue. Idempotent. */
  applyEvent: (event: ChatEvent) => void
}

export type ChatStore = ChatState & ChatActions

/** Persisted subset of the state. */
type PersistedChatState = Pick<ChatState, 'chats' | 'messages'>

const initialState: ChatState = { chats: {}, messages: {}, activeChatId: null }

let localSeq = 0
const nextLocalId = (): string => `local-${Date.now().toString(36)}-${(localSeq++).toString(36)}`

/**
 * GREEN-API timestamps have second precision while optimistic messages use Date.now().
 * Comparing at second precision (stable sort) keeps arrival order within the same second,
 * so a quick reply never jumps above the message it answers.
 */
const toSeconds = (ms: number): number => Math.floor(ms / 1000)
const sortByTime = (list: readonly Message[]): Message[] =>
  list.toSorted((a, b) => toSeconds(a.timestamp) - toSeconds(b.timestamp))

const trim = (list: Message[]): Message[] =>
  list.length > MAX_MESSAGES_PER_CHAT ? list.slice(-MAX_MESSAGES_PER_CHAT) : list

/** Immutable update of a single record entry; skips the update when the key is missing. */
function updateEntry<T>(record: Record<string, T>, key: string, update: (value: T) => T): Record<string, T> {
  const current = record[key]
  return current === undefined ? record : { ...record, [key]: update(current) }
}

function updateMessages(
  state: ChatState,
  chatId: string,
  update: (list: Message[]) => Message[],
): Pick<ChatState, 'messages'> {
  return { messages: { ...state.messages, [chatId]: update(state.messages[chatId] ?? []) } }
}

/** Inserts or merges a message coming from the server (dedup by id). */
function mergeIncoming(list: Message[], message: Message): Message[] {
  const index = list.findIndex((m) => m.id === message.id)
  const existing = list[index]
  if (!existing) return trim(sortByTime([...list, message]))

  return list.with(index, {
    ...existing,
    text: existing.text || message.text,
    status: mergeStatus(existing.status, message.status),
  })
}

/** Drops the optional `error` field — with exactOptionalPropertyTypes it cannot be set to `undefined`. */
function withoutError({ error: _error, ...message }: Message): Message {
  return message
}

export const chatStorageKey = (idInstance: string): string => `green-max:chats:${idInstance}`

const chatStoreCreator: StateCreator<ChatStore> = (set, get) => {
  const applyMessage = ({ message, chat }: EventOf<'message'>): void => {
    get().upsertChat({ ...chat, updatedAt: message.timestamp })
    set((state) => {
      const isUnreadIncoming =
        message.direction === 'in' &&
        state.activeChatId !== message.chatId &&
        !state.messages[message.chatId]?.some((m) => m.id === message.id)
      return {
        ...updateMessages(state, message.chatId, (list) => mergeIncoming(list, message)),
        chats: isUnreadIncoming
          ? updateEntry(state.chats, message.chatId, (c) => ({ ...c, unread: c.unread + 1 }))
          : state.chats,
      }
    })
  }

  const applyStatus = ({ chatId, messageId, status }: EventOf<'status'>): void =>
    set((state) =>
      state.messages[chatId]
        ? updateMessages(state, chatId, (list) =>
            list.map((m) => (m.id === messageId ? { ...m, status: mergeStatus(m.status, status) } : m)),
          )
        : state,
    )

  return {
    ...initialState,

    upsertChat: ({ id, title, phone, updatedAt }) =>
      set((state) => {
        const existing = state.chats[id]
        const nextPhone = phone ?? existing?.phone
        const chat: Chat = {
          id,
          title: title || existing?.title || nextPhone || id,
          unread: existing?.unread ?? 0,
          updatedAt: Math.max(updatedAt ?? 0, existing?.updatedAt ?? 0) || Date.now(),
          ...(nextPhone !== undefined && { phone: nextPhone }),
        }
        return { chats: { ...state.chats, [id]: chat } }
      }),

    openChat: (chatId) =>
      set((state) =>
        chatId && state.chats[chatId]
          ? { activeChatId: chatId, chats: updateEntry(state.chats, chatId, (c) => ({ ...c, unread: 0 })) }
          : { activeChatId: null },
      ),

    removeChat: (chatId) =>
      set((state) => {
        const { [chatId]: _chat, ...chats } = state.chats
        const { [chatId]: _messages, ...messages } = state.messages
        return { chats, messages, activeChatId: state.activeChatId === chatId ? null : state.activeChatId }
      }),

    addPendingMessage: (chatId, text) => {
      const id = nextLocalId()
      const timestamp = Date.now()
      const message: Message = { id, chatId, direction: 'out', text, timestamp, status: 'pending' }
      set((state) => ({
        ...updateMessages(state, chatId, (list) => trim([...list, message])),
        chats: updateEntry(state.chats, chatId, (c) => ({ ...c, updatedAt: timestamp })),
      }))
      return id
    },

    confirmMessage: (chatId, localId, idMessage) =>
      set((state) =>
        updateMessages(state, chatId, (list) => {
          if (!list.some((m) => m.id === localId)) return list
          // The notification for this message may have arrived before the HTTP response.
          if (list.some((m) => m.id === idMessage)) {
            return list
              .filter((m) => m.id !== localId)
              .map((m) => (m.id === idMessage ? { ...m, status: mergeStatus(m.status, 'sent') } : m))
          }
          return list.map((m) => (m.id === localId ? { ...withoutError(m), id: idMessage, status: 'sent' } : m))
        }),
      ),

    failMessage: (chatId, localId, error) =>
      set((state) =>
        updateMessages(state, chatId, (list) =>
          list.map((m) => (m.id === localId ? { ...m, status: 'error', error } : m)),
        ),
      ),

    removeMessage: (chatId, messageId) =>
      set((state) => updateMessages(state, chatId, (list) => list.filter((m) => m.id !== messageId))),

    applyEvent: (event) => {
      switch (event.type) {
        case 'message':
          return applyMessage(event)
        case 'status':
          return applyStatus(event)
        case 'ignored':
          return undefined
        default:
          return assertNever(event, 'Unknown chat event')
      }
    },
  }
}

/** Unsent drafts make no sense after a reload — keep them as failed so the user can retry. */
function toPersisted({ chats, messages }: ChatState): PersistedChatState {
  return {
    chats,
    messages: Object.fromEntries(
      Object.entries(messages).map(([chatId, list]) => [
        chatId,
        list.map(
          (m): Message =>
            isLocalMessageId(m.id) && m.status === 'pending'
              ? { ...m, status: 'error', error: 'Сообщение не было отправлено' }
              : m,
        ),
      ]),
    ),
  }
}

/**
 * @param storageKey persistence key, or `null` for an in-memory store (tests)
 * @param storage where to persist: localStorage only when the user chose "remember me"
 */
export function createChatStore(
  storageKey: string | null,
  storage: () => Storage = () => localStorage,
): StoreApi<ChatStore> {
  if (!storageKey) return createStore<ChatStore>()(chatStoreCreator)

  return createStore<ChatStore>()(
    persist<ChatStore, [], [], PersistedChatState>(chatStoreCreator, {
      name: storageKey,
      version: 1,
      storage: createJSONStorage<PersistedChatState>(storage),
      partialize: toPersisted,
    }),
  )
}
