import { useChatActions, type Message } from '@/entities/chat'
import { useApiMutation } from '@/entities/session'

interface SendVariables {
  chatId: string
  localId: string
  text: string
}

export interface SendMessageControls {
  send: (chatId: string, text: string) => void
  retry: (message: Message) => void
}

/**
 * Optimistic sending: the message is shown immediately with the `pending` status,
 * then reconciled with the id returned by SendMessage (or marked as failed with a retry action).
 */
export function useSendMessage(): SendMessageControls {
  const { addPendingMessage, confirmMessage, failMessage, removeMessage } = useChatActions()

  const { mutate } = useApiMutation<SendVariables, string>(
    async (api, { chatId, text }) => {
      const response = await api.sendMessage({ chatId, message: text })
      if (!response?.idMessage) throw new Error('Сервер не вернул идентификатор сообщения')
      return response.idMessage
    },
    {
      mutationKey: ['messages', 'send'],
      onSuccess: (idMessage, { chatId, localId }) => confirmMessage(chatId, localId, idMessage),
      onError: (error, { chatId, localId }) => failMessage(chatId, localId, error.message),
    },
  )

  const send = (chatId: string, text: string): void => {
    mutate({ chatId, localId: addPendingMessage(chatId, text), text })
  }

  const retry = (message: Message): void => {
    removeMessage(message.chatId, message.id)
    send(message.chatId, message.text)
  }

  return { send, retry }
}
