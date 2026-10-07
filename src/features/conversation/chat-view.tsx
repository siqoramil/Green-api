import { useChat, useChatActions, useChatMessages, type Message } from '@/entities/chat'
import { formatPhone } from '@/shared/lib'
import { Avatar, BackIcon, IconButton } from '@/shared/ui'
import { Composer } from './composer'
import { MessageList } from './message-list'
import { useSendMessage } from './use-send-message'

export function ChatView({ chatId }: { chatId: string }) {
  const chat = useChat(chatId)
  const messages = useChatMessages(chatId)
  const { openChat, removeMessage } = useChatActions()
  const { send, retry } = useSendMessage()

  if (!chat) return null

  const formattedPhone = chat.phone ? formatPhone(chat.phone) : null
  const subtitle = formattedPhone && formattedPhone !== chat.title ? formattedPhone : 'в MAX'

  return (
    <section aria-label={`Чат с ${chat.title}`} className="flex h-full min-w-0 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-line bg-surface px-2 md:px-4">
        <IconButton label="Назад к чатам" className="md:hidden" onClick={() => openChat(null)}>
          <BackIcon size={22} />
        </IconButton>
        <Avatar id={chat.id} title={chat.title} size="sm" />
        <div className="min-w-0">
          <h2 className="truncate font-semibold">{chat.title}</h2>
          <p className="truncate text-[13px] text-fg-muted">{subtitle}</p>
        </div>
      </header>

      <div className="chat-pattern flex min-h-0 flex-1 flex-col">
        <MessageList
          // Remount per chat to reset scroll position and counters.
          key={chatId}
          messages={messages}
          onRetry={retry}
          onDelete={(message: Message) => removeMessage(message.chatId, message.id)}
        />
      </div>

      <Composer key={chatId} onSend={(text: string) => send(chatId, text)} />
    </section>
  )
}
