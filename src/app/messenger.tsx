import { useActiveChatId } from '@/entities/chat'
import { useShallow } from 'zustand/react/shallow'
import { useConnectionStore, useSessionStore, type ConnectionState } from '@/entities/session'
import { Sidebar } from '@/features/chat-list'
import { ChatView } from '@/features/conversation'
import { useNotificationPolling } from '@/features/notifications'
import { cn } from '@/shared/lib'
import { AlertIcon, ChatsIcon, IconButton, LogoMark, LogoutIcon } from '@/shared/ui'

function ConnectionBanner() {
  const { status, error } = useConnectionStore(
    useShallow<ConnectionState, Pick<ConnectionState, 'status' | 'error'>>((s) => ({ status: s.status, error: s.error })),
  )
  if (status !== 'offline' || !error) return null
  return (
    <div role="alert" className="flex items-center gap-2 border-b border-line bg-danger/10 px-4 py-2 text-[13px] text-danger">
      <AlertIcon size={16} className="shrink-0" />
      <span className="min-w-0 truncate">{error}. Повторяем попытку…</span>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="chat-pattern flex h-full flex-col items-center justify-center p-6 text-center">
      <LogoMark size={64} />
      <p className="mt-4 text-lg font-semibold">MAX Web</p>
      <p className="mt-1 max-w-xs text-sm text-fg-muted">Выберите чат или создайте новый по номеру телефона</p>
    </div>
  )
}

export function Messenger() {
  useNotificationPolling()
  const activeChatId = useActiveChatId()
  const idInstance = useSessionStore<string | undefined>((s) => s.credentials?.idInstance)
  const logout = useSessionStore<() => void>((s) => s.logout)

  return (
    <div className="flex h-dvh overflow-hidden bg-surface">
      {/* Navigation rail, as in web.max.ru */}
      <nav aria-label="Навигация" className="hidden w-[72px] shrink-0 flex-col items-center border-r border-line py-4 md:flex">
        <span className="flex flex-col items-center gap-1 text-xs font-medium text-fg" aria-current="page">
          <span className="flex size-10 items-center justify-center rounded-xl bg-surface-2 text-accent">
            <ChatsIcon size={22} />
          </span>
          Все
        </span>
        <div className="mt-auto flex flex-col items-center gap-1">
          <IconButton label={`Выйти (инстанс ${idInstance})`} onClick={logout}>
            <LogoutIcon size={20} />
          </IconButton>
        </div>
      </nav>

      <aside
        className={cn(
          'w-full shrink-0 flex-col border-r border-line bg-surface md:flex md:w-[340px] lg:w-[380px]',
          activeChatId ? 'hidden' : 'flex',
        )}
      >
        <ConnectionBanner />
        <div className="min-h-0 flex-1">
          <Sidebar />
        </div>
        <div className="flex items-center justify-between border-t border-line px-4 py-2 text-xs text-fg-muted md:hidden">
          <span>Инстанс {idInstance}</span>
          <button type="button" onClick={logout} className="cursor-pointer text-accent">
            Выйти
          </button>
        </div>
      </aside>

      <main className={cn('min-w-0 flex-1', activeChatId ? 'block' : 'hidden md:block')}>
        {activeChatId ? <ChatView chatId={activeChatId} /> : <EmptyState />}
      </main>
    </div>
  )
}
