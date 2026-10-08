import type { UseMutationResult } from '@tanstack/react-query'
import { useChatStoreApi } from '@/entities/chat'
import { useApiMutation } from '@/entities/session'
import { GreenApiError } from '@/shared/api'
import { formatPhone } from '@/shared/lib'

const NOT_REGISTERED = 'Этот номер не зарегистрирован в MAX'

/** Normalized phone number (digits only) → chatId of the created or existing chat. */
export type CreateChatMutation = UseMutationResult<string, Error, string>

/**
 * Resolves a phone number to a MAX chatId (CheckAccount), registers the chat and opens it.
 * Known numbers are reused without calling CheckAccount: MAX rate-limits number checks
 * and may temporarily restrict accounts that check numbers too often.
 */
export function useCreateChat(onCreated?: (chatId: string) => void): CreateChatMutation {
  const store = useChatStoreApi()

  return useApiMutation<string, string>(
    async (api, phone) => {
      const existing = Object.values(store.getState().chats).find((chat) => chat.phone === phone)
      if (existing) return existing.id

      const result = await api.checkAccount(Number(phone)).catch((error: unknown) => {
        // The instance is already authorized here, so 404 refers to the number, not the instance.
        if (error instanceof GreenApiError && error.status === 404) throw new Error(NOT_REGISTERED)
        throw error
      })
      if ('status' in result) throw new Error(result.reason || 'Не удалось проверить номер')
      if (!result.exist || !result.chatId) throw new Error(NOT_REGISTERED)

      store.getState().upsertChat({ id: result.chatId, phone, title: formatPhone(phone) })
      return result.chatId
    },
    {
      mutationKey: ['chats', 'create'],
      onSuccess: (chatId) => {
        store.getState().openChat(chatId)
        onCreated?.(chatId)
      },
    },
  )
}
