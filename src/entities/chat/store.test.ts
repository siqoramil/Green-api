import { beforeEach, describe, expect, it } from 'vitest'
import type { Message } from './model'
import { defined } from '@/test/utils'
import { createChatStore, MAX_MESSAGES_PER_CHAT } from './store'

const incoming = (id: string, text = 'hi', timestamp = 1000): Message => ({
  id,
  chatId: 'c1',
  direction: 'in',
  text,
  timestamp,
  status: 'received',
})

let store: ReturnType<typeof createChatStore>

beforeEach(() => {
  store = createChatStore(null)
})

const chat = (id = 'c1') => defined(store.getState().chats[id], `chat ${id}`)
const messages = (id = 'c1') => defined(store.getState().messages[id], `messages of ${id}`)

describe('chat store', () => {
  it('creates a chat on the first incoming message and counts unread', () => {
    store.getState().applyEvent({ type: 'message', chat: { id: 'c1', title: 'Иван' }, message: incoming('m1') })
    expect(chat()).toMatchObject({ title: 'Иван', unread: 1 })
    expect(messages()).toHaveLength(1)
  })

  it('is idempotent: a re-delivered notification does not duplicate the message', () => {
    const event = { type: 'message' as const, chat: { id: 'c1' }, message: incoming('m1') }
    store.getState().applyEvent(event)
    store.getState().applyEvent(event)
    expect(messages()).toHaveLength(1)
    expect(chat().unread).toBe(1)
  })

  it('does not count unread for the open chat and resets unread on open', () => {
    store.getState().upsertChat({ id: 'c1', title: 'A' })
    store.getState().applyEvent({ type: 'message', chat: { id: 'c1' }, message: incoming('m1') })
    expect(chat().unread).toBe(1)
    store.getState().openChat('c1')
    expect(chat().unread).toBe(0)
    store.getState().applyEvent({ type: 'message', chat: { id: 'c1' }, message: incoming('m2') })
    expect(chat().unread).toBe(0)
  })

  it('keeps messages ordered by timestamp', () => {
    store.getState().applyEvent({ type: 'message', chat: { id: 'c1' }, message: incoming('late', 'b', 2000) })
    store.getState().applyEvent({ type: 'message', chat: { id: 'c1' }, message: incoming('early', 'a', 1000) })
    expect(messages().map((m) => m.id)).toEqual(['early', 'late'])
  })

  it('keeps arrival order within the same second (server ts has second precision)', () => {
    store.getState().upsertChat({ id: 'c1' })
    const localId = store.getState().addPendingMessage('c1', 'вопрос')
    const sentAt = defined(messages()[0]).timestamp
    store.getState().confirmMessage('c1', localId, 'srv')
    store.getState().applyEvent({
      type: 'message',
      chat: { id: 'c1' },
      message: incoming('reply', 'ответ', Math.floor(sentAt / 1000) * 1000),
    })
    expect(messages().map((m) => m.id)).toEqual(['srv', 'reply'])
  })

  it('confirms an optimistic message with the server id', () => {
    store.getState().upsertChat({ id: 'c1' })
    const localId = store.getState().addPendingMessage('c1', 'Привет')
    expect(defined(messages()[0])).toMatchObject({ id: localId, status: 'pending' })

    store.getState().confirmMessage('c1', localId, 'srv-1')
    expect(messages()).toEqual([expect.objectContaining({ id: 'srv-1', status: 'sent' })])
  })

  it('reconciles when the API echo arrives before the SendMessage response', () => {
    store.getState().upsertChat({ id: 'c1' })
    const localId = store.getState().addPendingMessage('c1', 'Привет')
    store.getState().applyEvent({
      type: 'message',
      chat: { id: 'c1' },
      message: { ...incoming('srv-1', 'Привет'), direction: 'out', status: 'sent' },
    })
    store.getState().applyEvent({ type: 'status', chatId: 'c1', messageId: 'srv-1', status: 'delivered' })
    store.getState().confirmMessage('c1', localId, 'srv-1')

    expect(messages()).toEqual([expect.objectContaining({ id: 'srv-1', status: 'delivered' })])
  })

  it('never downgrades a status (out-of-order webhooks)', () => {
    store.getState().upsertChat({ id: 'c1' })
    const localId = store.getState().addPendingMessage('c1', 'x')
    store.getState().confirmMessage('c1', localId, 'srv')
    store.getState().applyEvent({ type: 'status', chatId: 'c1', messageId: 'srv', status: 'read' })
    store.getState().applyEvent({ type: 'status', chatId: 'c1', messageId: 'srv', status: 'delivered' })
    expect(defined(messages()[0]).status).toBe('read')
  })

  it('marks failed sends and allows removing them', () => {
    store.getState().upsertChat({ id: 'c1' })
    const localId = store.getState().addPendingMessage('c1', 'x')
    store.getState().failMessage('c1', localId, 'Нет сети')
    expect(defined(messages()[0])).toMatchObject({ status: 'error', error: 'Нет сети' })
    store.getState().removeMessage('c1', localId)
    expect(messages()).toHaveLength(0)
  })

  it('caps stored history per chat', () => {
    for (let i = 0; i < MAX_MESSAGES_PER_CHAT + 5; i++) {
      store.getState().applyEvent({ type: 'message', chat: { id: 'c1' }, message: incoming(`m${i}`, 't', i) })
    }
    const list = messages()
    expect(list).toHaveLength(MAX_MESSAGES_PER_CHAT)
    expect(list.at(-1)?.id).toBe(`m${MAX_MESSAGES_PER_CHAT + 4}`)
  })

  it('does not overwrite a known chat title with an empty one', () => {
    store.getState().upsertChat({ id: 'c1', title: 'Иван', phone: '79990000000' })
    store.getState().upsertChat({ id: 'c1' })
    expect(chat()).toMatchObject({ title: 'Иван', phone: '79990000000' })
  })
})
