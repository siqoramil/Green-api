import { describe, expect, it } from 'vitest'
import type { WebhookBody } from '@/shared/api'
import { parseNotification } from './parse-notification'

const senderData = {
  chatId: '10000000',
  chatName: 'Иван Петров',
  chatType: 'user',
  sender: '10000000',
  senderName: 'Иван',
  senderPhoneNumber: 79876543210,
}

describe('parseNotification', () => {
  it('parses an incoming text message', () => {
    const event = parseNotification({
      typeWebhook: 'incomingMessageReceived',
      timestamp: 1763115112,
      idMessage: 'A1',
      senderData,
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет!' } },
    })

    expect(event).toEqual({
      type: 'message',
      chat: { id: '10000000', title: 'Иван Петров', phone: '79876543210' },
      message: {
        id: 'A1',
        chatId: '10000000',
        direction: 'in',
        text: 'Привет!',
        timestamp: 1763115112000,
        status: 'received',
      },
    })
  })

  it('parses extended text (with URL) and outgoing messages sent from the phone', () => {
    const event = parseNotification({
      typeWebhook: 'outgoingMessageReceived',
      timestamp: 1,
      idMessage: 'B1',
      senderData,
      messageData: { typeMessage: 'extendedTextMessage', extendedTextMessageData: { text: 'https://green-api.com' } },
    })
    expect(event).toMatchObject({ type: 'message', message: { direction: 'out', text: 'https://green-api.com', status: 'sent' } })
  })

  it('marks non-text messages as unsupported instead of dropping them', () => {
    const event = parseNotification({
      typeWebhook: 'incomingMessageReceived',
      timestamp: 1,
      idMessage: 'C1',
      senderData,
      messageData: { typeMessage: 'imageMessage' },
    })
    expect(event).toMatchObject({ type: 'message', message: { text: '', unsupportedType: 'imageMessage' } })
  })

  it('maps delivery statuses', () => {
    const base = { typeWebhook: 'outgoingMessageStatus', timestamp: 1, chatId: '1', idMessage: 'X' } as const
    expect(parseNotification({ ...base, status: 'read' })).toMatchObject({ type: 'status', status: 'read' })
    expect(parseNotification({ ...base, status: 'pending' })).toMatchObject({ status: 'sent' })
    expect(parseNotification({ ...base, status: 'noAccount' })).toMatchObject({ status: 'failed' })
  })

  it('ignores unrelated, group and malformed notifications', () => {
    expect(parseNotification({ typeWebhook: 'stateInstanceChanged' })).toMatchObject({ type: 'ignored' })
    expect(
      parseNotification({
        typeWebhook: 'incomingMessageReceived',
        timestamp: 1,
        idMessage: 'G',
        senderData: { ...senderData, chatType: 'group' },
        messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'hi' } },
      }),
    ).toMatchObject({ type: 'ignored', reason: 'group' })
    expect(
      parseNotification({ typeWebhook: 'incomingMessageReceived', idMessage: 1 } as unknown as WebhookBody),
    ).toMatchObject({ type: 'ignored' })
    expect(parseNotification(null as unknown as WebhookBody)).toMatchObject({ type: 'ignored', reason: 'malformed' })
  })
})
