import { cn } from '@/shared/lib'

/** Placeholder block with a shimmer highlight. Decorative — hidden from assistive tech. */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'relative block overflow-hidden rounded-md bg-surface-2',
        'after:absolute after:inset-0 after:-translate-x-full after:animate-shimmer',
        'after:bg-linear-to-r after:from-transparent after:via-white/10 after:to-transparent dark:after:via-white/5',
        className,
      )}
    />
  )
}
