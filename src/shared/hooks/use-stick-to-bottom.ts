import { useLayoutEffect, useRef, useState, type RefObject, type UIEvent } from 'react'

export interface StickToBottomOptions<TItem> {
  /** Always follow when the newest item matches (e.g. the user's own message). */
  shouldFollow?: (item: TItem) => boolean
  /** Distance (px) from the bottom within which the list keeps sticking to new items. */
  threshold?: number
}

export interface StickToBottom<TElement extends HTMLElement> {
  ref: RefObject<TElement | null>
  onScroll: (event: UIEvent<TElement>) => void
  /** True when the user scrolled up and a "jump to latest" button should be shown. */
  isDetached: boolean
  /** New items that arrived while detached. */
  missed: number
  scrollToBottom: (behavior?: ScrollBehavior) => void
}

/**
 * Chat-style scrolling: sticks to the bottom while the user is there, preserves the reading
 * position when they scrolled up, and counts items that arrived meanwhile.
 */
export function useStickToBottom<TElement extends HTMLElement, TItem>(
  items: readonly TItem[],
  { shouldFollow, threshold = 120 }: StickToBottomOptions<TItem> = {},
): StickToBottom<TElement> {
  const ref = useRef<TElement>(null)
  const atBottomRef = useRef<boolean>(true)
  const seenCountRef = useRef<number>(0)
  const [isDetached, setDetached] = useState<boolean>(false)
  const [missed, setMissed] = useState<number>(0)

  const scrollToBottom = (behavior: ScrollBehavior = 'auto'): void => {
    const element = ref.current
    element?.scrollTo({ top: element.scrollHeight, behavior })
  }

  useLayoutEffect(() => {
    const added = items.length - seenCountRef.current
    const isFirstRender = seenCountRef.current === 0
    seenCountRef.current = items.length
    if (added <= 0 && !isFirstRender) return

    const last = items.at(-1)
    if (isFirstRender || atBottomRef.current || (last !== undefined && shouldFollow?.(last))) {
      const element = ref.current
      element?.scrollTo({ top: element.scrollHeight })
      setMissed(0)
    } else {
      setMissed((count) => count + added)
    }
  }, [items, shouldFollow])

  const onScroll = (event: UIEvent<TElement>): void => {
    const element = event.currentTarget
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < threshold
    atBottomRef.current = atBottom
    setDetached(!atBottom)
    if (atBottom) setMissed(0)
  }

  return { ref, onScroll, isDetached, missed, scrollToBottom }
}
