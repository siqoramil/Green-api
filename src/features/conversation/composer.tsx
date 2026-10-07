import { useState, type SubmitEvent, type KeyboardEvent } from 'react'
import { cn, MAX_MESSAGE_LENGTH } from '@/shared/lib'
import { IconButton, SendIcon } from '@/shared/ui'

interface ComposerProps {
  onSend: (text: string) => void
}

const COUNTER_THRESHOLD = MAX_MESSAGE_LENGTH - 500

export function Composer({ onSend }: ComposerProps) {
  const [text, setText] = useState<string>('')
  const trimmed = text.trim()
  const tooLong = text.length > MAX_MESSAGE_LENGTH
  const canSend = trimmed.length > 0 && !tooLong

  const submit = (event?: SubmitEvent<HTMLFormElement>) => {
    event?.preventDefault()
    if (!canSend) return
    onSend(trimmed)
    setText('')
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends, Shift+Enter inserts a newline; ignore Enter while an IME is composing.
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      submit()
    }
  }

  return (
    <form onSubmit={submit} className="flex items-end gap-2 border-t border-line bg-surface px-3 py-2.5 md:px-4">
      <div className="relative min-w-0 flex-1">
        <label htmlFor="composer" className="sr-only">
          Сообщение
        </label>
        <textarea
          id="composer"
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Сообщение"
          autoFocus
          aria-invalid={tooLong}
          className="scrollbar-thin block max-h-40 min-h-11 w-full resize-none rounded-2xl bg-surface-2 px-4 py-[11px] leading-[22px] outline-none field-sizing-content placeholder:text-fg-muted focus:ring-2 focus:ring-accent/30"
        />
        {text.length > COUNTER_THRESHOLD && (
          <span
            aria-live="polite"
            className={cn('absolute -top-5 right-2 text-xs', tooLong ? 'text-danger' : 'text-fg-muted')}
          >
            {text.length} / {MAX_MESSAGE_LENGTH}
          </span>
        )}
      </div>
      <IconButton type="submit" label="Отправить" variant="primary" disabled={!canSend} className="size-11">
        <SendIcon size={22} />
      </IconButton>
    </form>
  )
}
