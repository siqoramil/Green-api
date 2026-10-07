export type MessageDirection = 'in' | 'out'

/**
 * Lifecycle of a message in the UI.
 * `pending` / `error` exist only locally (before / instead of the API acknowledging it);
 * the rest mirror GREEN-API `outgoingMessageStatus` values.
 */
export type MessageStatus = 'pending' | 'error' | 'sent' | 'delivered' | 'read' | 'failed' | 'received'

export interface Message {
  /** GREEN-API idMessage, or a local id (`local-…`) while the message is being sent. */
  id: string
  chatId: string
  direction: MessageDirection
  text: string
  /** Milliseconds since epoch. */
  timestamp: number
  status: MessageStatus
  /** Set for non-text messages that the UI does not render (image, sticker, …). */
  unsupportedType?: string
  /** Last send error, shown with a retry action. */
  error?: string
}

export interface Chat {
  /** GREEN-API chatId (for MAX — a numeric user id). */
  id: string
  title: string
  phone?: string
  unread: number
  /** Timestamp used to sort the chat list. */
  updatedAt: number
}

export const isLocalMessageId = (id: string): boolean => id.startsWith('local-')

const STATUS_RANK: Record<MessageStatus, number> = {
  pending: 0,
  error: 0,
  received: 0,
  sent: 1,
  delivered: 2,
  read: 3,
  failed: 4,
}

/**
 * Status updates may arrive out of order (e.g. `read` before `delivered`),
 * so a status is only allowed to move forward.
 */
export const mergeStatus = (current: MessageStatus, next: MessageStatus): MessageStatus =>
  STATUS_RANK[next] >= STATUS_RANK[current] ? next : current
