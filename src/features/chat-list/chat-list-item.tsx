import { MessageStatusIcon, useLastMessage, type Chat, type Message } from '@/entities/chat'
import { cn, formatChatListDate } from '@/shared/lib'
import { Avatar } from '@/shared/ui'

interface ChatListItemProps {
  chat: Chat
  active: boolean
  onSelect: (chatId: string) => void
}

function preview(message: Message | undefined): string {
  if (!message) return 'Нет сообщений'
  if (message.unsupportedType) return 'Сообщение не поддерживается'
  return message.text
}

export function ChatListItem({ chat, active, onSelect }: ChatListItemProps) {
  // Each row subscribes to its own last message: a new message re-renders one row, not the whole list.
  const lastMessage = useLastMessage(chat.id)
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(chat.id)}
        aria-current={active ? 'true' : undefined}
        className={cn(
          'flex w-full cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors',
          active ? 'bg-surface-active' : 'hover:bg-surface-hover',
        )}
      >
        <Avatar id={chat.id} title={chat.title} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="min-w-0 flex-1 truncate font-semibold">{chat.title}</span>
            {lastMessage && (
              <span className="flex shrink-0 items-center gap-1 text-xs text-fg-muted">
                {lastMessage.direction === 'out' && <MessageStatusIcon status={lastMessage.status} tone="list" />}
                {formatChatListDate(lastMessage.timestamp)}
              </span>
            )}
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="line-clamp-1 min-w-0 flex-1 wrap-anywhere text-sm text-fg-muted">
              {lastMessage?.direction === 'out' && <span className="text-fg">Вы: </span>}
              {preview(lastMessage)}
            </span>
            {chat.unread > 0 && (
              <span
                aria-label={`Непрочитанных: ${chat.unread}`}
                className="min-w-5 shrink-0 rounded-full bg-accent px-1.5 text-center text-xs font-semibold leading-5 text-white"
              >
                {chat.unread > 99 ? '99+' : chat.unread}
              </span>
            )}
          </div>
        </div>
      </button>
    </li>
  )
}
