import type {
  MessageData,
  MessageWebhook,
  OutgoingStatus,
  OutgoingStatusWebhook,
  WebhookBody,
} from '@/shared/api'
import { compact, isNumber, isRecord, isString } from '@/shared/lib'
import type { Message, MessageStatus } from './model'

export interface ChatMeta {
  id: string
  title?: string
  phone?: string
}

/** Discriminated union of everything the store can receive from the notification queue. */
export type ChatEvent =
  | { type: 'message'; message: Message; chat: ChatMeta }
  | { type: 'status'; chatId: string; messageId: string; status: MessageStatus }
  | { type: 'ignored'; reason: string }

/** Narrows a ChatEvent by its discriminant, e.g. `EventOf<'status'>`. */
export type EventOf<T extends ChatEvent['type']> = Extract<ChatEvent, { type: T }>

const MESSAGE_WEBHOOKS = new Set<string>([
  'incomingMessageReceived',
  'outgoingMessageReceived',
  'outgoingAPIMessageReceived',
] satisfies MessageWebhook['typeWebhook'][])

// Notifications are external input: validate the shape at runtime instead of trusting the types.
const isMessageWebhook = (body: WebhookBody): body is MessageWebhook => {
  const b = body as Record<string, unknown>
  return (
    MESSAGE_WEBHOOKS.has(body.typeWebhook) &&
    isString(b['idMessage']) &&
    isNumber(b['timestamp']) &&
    isRecord(b['senderData']) &&
    isString(b['senderData']['chatId']) &&
    isRecord(b['messageData']) &&
    isString(b['messageData']['typeMessage'])
  )
}

const isStatusWebhook = (body: WebhookBody): body is OutgoingStatusWebhook => {
  const b = body as Record<string, unknown>
  return (
    body.typeWebhook === 'outgoingMessageStatus' &&
    isString(b['chatId']) &&
    isString(b['idMessage']) &&
    isString(b['status'])
  )
}

const asString = (value: unknown): string => (isString(value) ? value : '')

function extractText(data: MessageData): string | null {
  switch (data.typeMessage) {
    case 'textMessage':
      return asString(data.textMessageData?.textMessage)
    case 'extendedTextMessage':
    case 'quotedMessage':
      return asString(data.extendedTextMessageData?.text)
    default:
      return null
  }
}

function toMessageStatus(status: OutgoingStatus): MessageStatus {
  switch (status) {
    case 'pending':
    case 'sent':
      return 'sent'
    case 'delivered':
    case 'read':
      return status
    default:
      // failed, noAccount, notInGroup, yellowCard
      return 'failed'
  }
}

/** Maps a raw GREEN-API notification to a UI-level event. Pure function. */
export function parseNotification(body: WebhookBody): ChatEvent {
  if (!isRecord(body) || typeof body.typeWebhook !== 'string') {
    return { type: 'ignored', reason: 'malformed' }
  }
  if (isStatusWebhook(body)) {
    return {
      type: 'status',
      chatId: body.chatId,
      messageId: body.idMessage,
      status: toMessageStatus(body.status),
    }
  }

  if (!isMessageWebhook(body)) {
    return { type: 'ignored', reason: body.typeWebhook }
  }
  if (body.senderData.chatType === 'group') {
    // The UI works with personal chats created by phone number only.
    return { type: 'ignored', reason: 'group' }
  }

  const { senderData, messageData } = body
  const text = extractText(messageData)
  const incoming = body.typeWebhook === 'incomingMessageReceived'
  const phone =
    incoming && isNumber(senderData.senderPhoneNumber) && senderData.senderPhoneNumber > 0
      ? String(senderData.senderPhoneNumber)
      : undefined
  const title =
    asString(senderData.chatName) ||
    (incoming ? asString(senderData.senderContactName) || asString(senderData.senderName) : '') ||
    undefined

  return {
    type: 'message',
    chat: { id: senderData.chatId, ...compact({ title, phone }) },
    message: {
      id: body.idMessage,
      chatId: senderData.chatId,
      direction: incoming ? 'in' : 'out',
      text: text ?? '',
      timestamp: body.timestamp * 1000,
      status: incoming ? 'received' : 'sent',
      ...(text === null && { unsupportedType: messageData.typeMessage }),
    },
  }
}
