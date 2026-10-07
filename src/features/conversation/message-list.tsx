import { Fragment } from 'react'
import type { Message } from '@/entities/chat'
import { useStickToBottom } from '@/shared/hooks'
import { formatDayDivider, isSameDay } from '@/shared/lib'
import { ArrowDownIcon } from '@/shared/ui'
import { MessageBubble } from './message-bubble'

interface MessageListProps {
  messages: readonly Message[]
  onRetry: (message: Message) => void
  onDelete: (message: Message) => void
}

/** The user's own messages always scroll the list down; incoming ones only when already at the bottom. */
const isOwnMessage = (message: Message): boolean => message.direction === 'out'

export function MessageList({ messages, onRetry, onDelete }: MessageListProps) {
  const { ref, onScroll, isDetached, missed, scrollToBottom } = useStickToBottom<HTMLDivElement, Message>(messages, {
    shouldFollow: isOwnMessage,
  })

  return (
    <div className="relative min-h-0 flex-1">
      <div ref={ref} onScroll={onScroll} className="scrollbar-thin h-full overflow-y-auto px-3 py-3 md:px-[8%]">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="rounded-full bg-surface/80 px-4 py-1.5 text-sm text-fg-muted backdrop-blur">
              Напишите первое сообщение
            </p>
          </div>
        ) : (
          <ol role="log" aria-live="polite" aria-label="Сообщения" className="mx-auto flex max-w-3xl flex-col">
            {messages.map((message, index) => {
              const prev = messages[index - 1]
              const newDay = prev === undefined || !isSameDay(prev.timestamp, message.timestamp)
              return (
                <Fragment key={message.id}>
                  {newDay && (
                    <li className="sticky top-0 z-10 my-3 flex justify-center">
                      <span className="rounded-full bg-surface/85 px-3 py-1 text-xs font-medium text-fg-muted shadow-sm backdrop-blur">
                        {formatDayDivider(message.timestamp)}
                      </span>
                    </li>
                  )}
                  <MessageBubble
                    message={message}
                    groupStart={newDay || prev.direction !== message.direction}
                    onRetry={onRetry}
                    onDelete={onDelete}
                  />
                </Fragment>
              )
            })}
          </ol>
        )}
      </div>

      {isDetached && (
        <button
          type="button"
          onClick={() => scrollToBottom('smooth')}
          aria-label="К последним сообщениям"
          className="absolute bottom-4 right-4 flex size-11 cursor-pointer items-center justify-center rounded-full bg-surface text-fg-muted shadow-lg hover:text-fg"
        >
          <ArrowDownIcon size={22} />
          {missed > 0 && (
            <span className="absolute -right-1 -top-1.5 min-w-5 rounded-full bg-accent px-1.5 text-xs font-semibold leading-5 text-white">
              {missed}
            </span>
          )}
        </button>
      )}
    </div>
  )
}
