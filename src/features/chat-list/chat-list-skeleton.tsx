import { Skeleton } from '@/shared/ui'

const WIDTHS = ['w-3/5', 'w-2/5', 'w-1/2', 'w-3/4', 'w-1/3', 'w-2/3']
// Rows fade out towards the bottom.
const OPACITY = ['opacity-100', 'opacity-90', 'opacity-75', 'opacity-60', 'opacity-45', 'opacity-30']

export function ChatListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul aria-hidden className="space-y-0.5 px-2">
      {WIDTHS.slice(0, rows).map((width, index) => (
        <li key={index} className={`flex items-center gap-3 px-2.5 py-2 ${OPACITY[index]}`}>
          <Skeleton className="size-12 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex justify-between gap-6">
              <Skeleton className={`h-3.5 ${width}`} />
              <Skeleton className="h-3 w-9" />
            </div>
            <Skeleton className="h-3 w-4/5" />
          </div>
        </li>
      ))}
    </ul>
  )
}
