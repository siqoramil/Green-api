import { useState } from 'react'
import { useActiveChatId, useChatActions, useSortedChats, type Chat } from '@/entities/chat'
import { useConnectionStore, type ConnectionStatus } from '@/entities/session'
import { useFilteredList, useToggle } from '@/shared/hooks'
import { digitsOnly } from '@/shared/lib'
import { ChatsIcon, IconButton, PlusIcon, SearchIcon, Spinner } from '@/shared/ui'
import { ChatListItem } from './chat-list-item'
import { ChatListSkeleton } from './chat-list-skeleton'
import { NewChatForm } from './new-chat-form'

const matchChat = (chat: Chat, query: string): boolean => {
  const queryDigits = digitsOnly(query)
  return chat.title.toLowerCase().includes(query) || (queryDigits !== '' && chat.phone?.includes(queryDigits) === true)
}

function SidebarTitle({ status }: { status: ConnectionStatus }) {
  // `failed` is explained by the connection banner; a spinner would promise a recovery that will not happen.
  if (status === 'online' || status === 'failed') return <>Чаты</>
  return (
    <>
      <Spinner className="size-5 text-fg-muted" label="Подключение" />
      <span className="text-lg font-semibold text-fg-muted">
        {status === 'connecting' ? 'Подключение…' : 'Ожидание сети…'}
      </span>
    </>
  )
}

export function Sidebar() {
  const chats = useSortedChats()
  const activeChatId = useActiveChatId()
  const { openChat } = useChatActions()
  const connection = useConnectionStore<ConnectionStatus>((s) => s.status)
  const [creating, createPanel] = useToggle(false)
  const [query, setQuery] = useState<string>('')
  const visibleChats = useFilteredList<Chat>(chats, query, matchChat)

  if (creating) return <NewChatForm onClose={createPanel.off} />

  const hasChats = chats.length > 0

  return (
    <section aria-label="Список чатов" className="flex h-full flex-col">
      <header className="flex items-center justify-between px-4 pb-3 pt-4">
        <h2 className="flex items-center gap-2 text-2xl font-bold" aria-live="polite">
          <SidebarTitle status={connection} />
        </h2>
        <IconButton label="Новый чат" variant="primary" className="size-9" onClick={createPanel.on}>
          <PlusIcon size={20} strokeWidth={2.5} />
        </IconButton>
      </header>

      {hasChats && (
        <div className="px-4 pb-2">
          <label className="relative block">
            <span className="sr-only">Поиск</span>
            <SearchIcon size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-muted" />
            <input
              type="search"
              placeholder="Поиск"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full rounded-xl bg-surface-2 py-2 pl-10 pr-3 outline-none placeholder:text-fg-muted focus:ring-2 focus:ring-accent/40"
            />
          </label>
        </div>
      )}

      <div className="scrollbar-thin min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {visibleChats.length > 0 ? (
          <ul className="space-y-0.5">
            {visibleChats.map((chat) => (
              <ChatListItem key={chat.id} chat={chat} active={chat.id === activeChatId} onSelect={openChat} />
            ))}
          </ul>
        ) : connection === 'connecting' && !hasChats ? (
          <ChatListSkeleton />
        ) : hasChats ? (
          <p className="px-4 py-10 text-center text-sm text-fg-muted">Ничего не найдено</p>
        ) : (
          <div className="flex flex-col items-center px-6 py-14 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-surface-2 text-accent">
              <ChatsIcon size={30} />
            </div>
            <p className="mt-4 font-semibold">Пока нет чатов</p>
            <p className="mt-1 text-sm text-fg-muted">Начните переписку по номеру телефона</p>
            <button
              type="button"
              onClick={createPanel.on}
              className="mt-5 cursor-pointer rounded-xl bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
            >
              Новый чат
            </button>
          </div>
        )}
      </div>
    </section>
  )
}
