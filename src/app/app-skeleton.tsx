import { ChatListSkeleton } from '@/features/chat-list'
import { Skeleton, Spinner } from '@/shared/ui'

/** Shown while the messenger chunk is loading — mirrors the real layout to avoid layout shift. */
export function AppSkeleton() {
  return (
    <div className="flex h-dvh overflow-hidden bg-surface" aria-busy="true">
      <div className="hidden w-[72px] shrink-0 flex-col items-center border-r border-line py-4 md:flex">
        <Skeleton className="size-10 rounded-xl" />
      </div>
      <div className="flex w-full shrink-0 flex-col border-r border-line md:w-[340px] lg:w-[380px]">
        <div className="flex items-center justify-between px-4 pb-3 pt-5">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="size-9 rounded-full" />
        </div>
        <div className="px-4 pb-3">
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
        <ChatListSkeleton />
      </div>
      <div className="chat-pattern hidden flex-1 items-center justify-center md:flex">
        <Spinner className="size-8 text-accent" label="Загрузка мессенджера" />
      </div>
    </div>
  )
}
