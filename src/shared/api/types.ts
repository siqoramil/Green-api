/**
 * Types for the subset of the GREEN-API (MAX, v3) HTTP API used by the app.
 * Docs: https://green-api.com/v3/docs/api/
 */

export interface Credentials {
  /** API host, e.g. `https://3100.api.green-api.com` */
  apiUrl: string
  idInstance: string
  apiTokenInstance: string
}

export type InstanceState =
  | 'notAuthorized'
  | 'authorized'
  | 'blocked'
  | 'sleepMode'
  | 'starting'
  | 'yellowCard'

export interface StateInstanceResponse {
  stateInstance: InstanceState
}

export interface CheckAccountResponse {
  exist: boolean
  chatId: string
  fromCache?: boolean
}

/** Returned by CheckAccount with HTTP 200 when the check could not be performed. */
export interface CheckAccountFailure {
  status: false
  reason: string
}

export interface SendMessageRequest {
  chatId: string
  message: string
}

export interface SendMessageResponse {
  idMessage: string
}

export interface DeleteNotificationResponse {
  result: boolean
  reason?: string
}

export interface SenderData {
  chatId: string
  chatName?: string
  chatType?: 'user' | 'group' | string
  sender?: string
  senderName?: string
  senderContactName?: string
  senderPhoneNumber?: number
}

export interface MessageData {
  typeMessage: string
  textMessageData?: { textMessage: string }
  extendedTextMessageData?: { text: string }
}

export type MessageWebhookType =
  | 'incomingMessageReceived'
  | 'outgoingMessageReceived'
  | 'outgoingAPIMessageReceived'

export interface MessageWebhook {
  typeWebhook: MessageWebhookType
  timestamp: number
  idMessage: string
  senderData: SenderData
  messageData: MessageData
}

export type OutgoingStatus =
  | 'pending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'noAccount'
  | 'notInGroup'
  | 'yellowCard'

export interface OutgoingStatusWebhook {
  typeWebhook: 'outgoingMessageStatus'
  timestamp: number
  chatId: string
  idMessage: string
  status: OutgoingStatus
}

/** Any other notification type (stateInstanceChanged, incomingCall, …) — not used by the UI. */
export interface OtherWebhook {
  typeWebhook: string
  [key: string]: unknown
}

export type WebhookBody = MessageWebhook | OutgoingStatusWebhook | OtherWebhook

export interface Notification {
  receiptId: number
  body: WebhookBody
}
