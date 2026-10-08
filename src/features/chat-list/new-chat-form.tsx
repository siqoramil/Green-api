import { useId, useState, type SubmitEvent } from 'react'
import { digitsOnly, formatPhoneInput, isSupportedMaxPhone, isValidPhone, normalizePhone } from '@/shared/lib'
import { AlertIcon, BackIcon, IconButton, Spinner } from '@/shared/ui'
import { useCreateChat } from './use-create-chat'

/** Position in a formatted phone right after its `count`-th digit. */
function caretAfterDigits(formatted: string, count: number): number {
  if (count <= 0) return formatted.startsWith('+') ? 1 : 0
  let seen = 0
  for (let index = 0; index < formatted.length; index++) {
    if (/\d/.test(formatted.charAt(index)) && ++seen === count) return index + 1
  }
  return formatted.length
}

interface NewChatFormProps {
  onClose: () => void
}

export function NewChatForm({ onClose }: NewChatFormProps) {
  const id = useId()
  const [phone, setPhone] = useState<string>('')
  const [validationError, setValidationError] = useState<string | null>(null)
  const mutation = useCreateChat(onClose)

  const onPhoneChange = (input: HTMLInputElement) => {
    const raw = input.value
    let digits = digitsOnly(raw)
    // The caret is tracked by the number of digits before it: the mask moves separators around it.
    let digitsBeforeCaret = digitsOnly(raw.slice(0, input.selectionStart ?? raw.length)).length
    // Deleting a separator ("-" or " ") must delete the digit before it, otherwise the mask restores it at once.
    if (raw.length < phone.length && digits === digitsOnly(phone) && digitsBeforeCaret > 0) {
      digits = digits.slice(0, digitsBeforeCaret - 1) + digits.slice(digitsBeforeCaret)
      digitsBeforeCaret -= 1
    }
    const formatted = formatPhoneInput(digits)
    setPhone(formatted)
    requestAnimationFrame(() => {
      const position = caretAfterDigits(formatted, digitsBeforeCaret)
      input.setSelectionRange(position, position)
    })
  }

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = normalizePhone(phone)
    if (!isValidPhone(normalized)) {
      setValidationError('Введите номер в международном формате: 11–12 цифр')
      return
    }
    if (!isSupportedMaxPhone(normalized)) {
      setValidationError('GREEN-API для MAX проверяет только номера РФ (+7) и РБ (+375)')
      return
    }
    setValidationError(null)
    mutation.mutate(normalized)
  }

  const error = validationError ?? (mutation.isError ? mutation.error.message : null)

  return (
    <section aria-labelledby={`${id}-title`} className="flex h-full flex-col">
      <header className="flex items-center gap-2 px-3 pb-3 pt-4">
        <IconButton label="Назад" onClick={onClose}>
          <BackIcon size={22} />
        </IconButton>
        <h2 id={`${id}-title`} className="text-xl font-semibold">
          Новый чат
        </h2>
      </header>

      <form onSubmit={onSubmit} noValidate className="space-y-3 px-4">
        <label htmlFor={`${id}-phone`} className="block px-1 text-[13px] text-fg-muted">
          Номер телефона получателя
        </label>
        <input
          id={`${id}-phone`}
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="+7 999 123-45-67"
          value={phone}
          onChange={(e) => onPhoneChange(e.currentTarget)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          className="w-full rounded-xl border border-transparent bg-surface-2 px-4 py-3 outline-none transition placeholder:text-fg-muted focus:border-accent aria-invalid:border-danger"
          autoFocus
        />
        {error ? (
          <p id={`${id}-error`} role="alert" className="flex items-start gap-1.5 px-1 text-[13px] text-danger">
            <AlertIcon size={16} className="mt-px shrink-0" />
            {error}
          </p>
        ) : (
          <p id={`${id}-hint`} className="px-1 text-[13px] text-fg-muted">
            GREEN-API для MAX поддерживает номера РФ (+7) и РБ (+375)
          </p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending || !phone.trim()}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent py-3 font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {mutation.isPending && <Spinner />}
          Создать чат
        </button>
      </form>
    </section>
  )
}
