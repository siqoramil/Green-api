import type { StoreApi } from 'zustand'
import { createStrictContext } from '@/shared/lib'
import type { ChatStore } from './store'

export const [ChatStoreContext, useChatStoreApi] = createStrictContext<StoreApi<ChatStore>>('ChatStore')
