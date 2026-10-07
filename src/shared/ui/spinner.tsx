import { cn } from '@/shared/lib'

interface SpinnerProps {
  className?: string
  /** Accessible label; announced by screen readers. */
  label?: string
}

/** Ring spinner that inherits `currentColor` (size via className, default 16px). */
export const Spinner = ({ className, label = 'Загрузка' }: SpinnerProps) => (
  <output aria-label={label} className={cn('inline-flex size-4 shrink-0', className)}>
    <svg viewBox="0 0 24 24" className="size-full animate-spin" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9.5" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
      <path d="M21.5 12A9.5 9.5 0 0 0 12 2.5" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  </output>
)
