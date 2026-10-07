import { MessageStatusIcon, type Message } from '@/entities/chat'
import { cn, formatTime, splitLinks } from '@/shared/lib'

interface MessageBubbleProps {
  message: Message
  /** First message of a consecutive group from the same side — gets the "tail" corner. */
  groupStart: boolean
  onRetry: (message: Message) => void
  onDelete: (message: Message) => void
}

function MessageText({ text }: { text: string }) {
  // Rendered as React text nodes and <a> elements only — no innerHTML, so message content cannot inject markup.
  return (
    <>
      {splitLinks(text).map((part, index) =>
        part.type === 'link' ? (
          <a
            key={index}
            href={part.href}
            target="_blank"
            rel="noopener noreferrer nofollow"
            className="underline decoration-1 underline-offset-2 hover:opacity-80"
          >
            {part.value}
          </a>
        ) : (
          part.value
        ),
      )}
    </>
  )
}

export function MessageBubble({ message, groupStart, onRetry, onDelete }: MessageBubbleProps) {
  const outgoing = message.direction === 'out'
  const unsent = message.status === 'error'

  return (
    <li className={cn('flex animate-fade-in flex-col', outgoing ? 'items-end' : 'items-start', groupStart ? 'mt-2' : 'mt-0.5')}>
      <div
        className={cn(
          'relative max-w-[min(75%,560px)] rounded-2xl px-3 pb-1.5 pt-2 shadow-sm',
          outgoing ? 'bg-bubble-out text-bubble-out-fg' : 'bg-bubble-in text-bubble-in-fg',
          groupStart && (outgoing ? 'rounded-tr-md' : 'rounded-tl-md'),
          unsent && 'opacity-80',
        )}
      >
        <p className="whitespace-pre-wrap wrap-anywhere">
          {message.unsupportedType ? (
            <span className="italic opacity-70">Этот тип сообщений не поддерживается</span>
          ) : (
            <MessageText text={message.text} />
          )}
          {/* Spacer so the absolutely positioned meta never overlaps the last line. */}
          <span aria-hidden className={cn('inline-block', outgoing ? 'w-16' : 'w-11')} />
        </p>
        <span
          className={cn(
            'absolute bottom-1.5 right-3 flex items-center gap-1 text-[11px] leading-none',
            outgoing ? 'text-bubble-out-meta' : 'text-fg-muted',
          )}
        >
          <time dateTime={new Date(message.timestamp).toISOString()}>{formatTime(message.timestamp)}</time>
          {outgoing && <MessageStatusIcon status={message.status} />}
        </span>
      </div>

      {unsent && (
        <div className="mt-1 flex items-center gap-3 px-1 text-xs">
          <span className="text-danger">{message.error ?? 'Не отправлено'}</span>
          <button type="button" onClick={() => onRetry(message)} className="cursor-pointer font-medium text-accent hover:underline">
            Повторить
          </button>
          <button type="button" onClick={() => onDelete(message)} className="cursor-pointer text-fg-muted hover:underline">
            Удалить
          </button>
        </div>
      )}
    </li>
  )
}
