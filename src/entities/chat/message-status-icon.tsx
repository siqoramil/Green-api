import { cn } from '@/shared/lib'
import { AlertIcon, CheckIcon, ClockIcon, DoubleCheckIcon } from '@/shared/ui'
import type { MessageStatus } from './model'

const LABELS: Partial<Record<MessageStatus, string>> = {
  pending: 'Отправляется',
  sent: 'Отправлено',
  delivered: 'Доставлено',
  read: 'Прочитано',
  failed: 'Не доставлено',
  error: 'Ошибка отправки',
}

interface MessageStatusIconProps {
  status: MessageStatus
  /** `bubble` — inside an outgoing bubble, `list` — in the chat list. */
  tone?: 'bubble' | 'list'
}

export function MessageStatusIcon({ status, tone = 'bubble' }: MessageStatusIconProps) {
  const label = LABELS[status]
  if (!label) return null

  const readColor = tone === 'list' ? 'text-accent' : 'text-bubble-out-read'
  const icon = {
    pending: <ClockIcon size={14} />,
    sent: <CheckIcon size={15} />,
    delivered: <DoubleCheckIcon size={15} />,
    read: <DoubleCheckIcon size={15} />,
    failed: <AlertIcon size={14} />,
    error: <AlertIcon size={14} />,
  }[status as Exclude<MessageStatus, 'received'>]

  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex shrink-0',
        status === 'read' && readColor,
        (status === 'failed' || status === 'error') && 'text-danger',
      )}
    >
      {icon}
    </span>
  )
}
