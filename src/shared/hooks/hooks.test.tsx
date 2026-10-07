import { act, renderHook } from '@testing-library/react'
import type { UIEvent } from 'react'
import { describe, expect, expectTypeOf, it } from 'vitest'
import { useFilteredList } from './use-filtered-list'
import { useStickToBottom, type StickToBottom } from './use-stick-to-bottom'
import { useToggle } from './use-toggle'

interface Item {
  id: number
  name: string
}

const items: readonly Item[] = [
  { id: 1, name: 'Анна' },
  { id: 2, name: 'Борис' },
]

describe('useFilteredList<T>', () => {
  it('returns all items for an empty query and filters by the normalized query', () => {
    const { result, rerender } = renderHook(
      ({ query }: { query: string }) =>
        useFilteredList<Item>(items, query, (item, q) => item.name.toLowerCase().includes(q)),
      { initialProps: { query: '' } },
    )
    expect(result.current).toBe(items)
    expectTypeOf(result.current).toEqualTypeOf<readonly Item[]>()

    rerender({ query: '  БОР ' })
    expect(result.current.map((i) => i.id)).toEqual([2])
  })
})

describe('useToggle', () => {
  it('exposes named setters', () => {
    const { result } = renderHook(() => useToggle(false))
    act(() => result.current[1].on())
    expect(result.current[0]).toBe(true)
    act(() => result.current[1].toggle())
    expect(result.current[0]).toBe(false)
  })
})

describe('useStickToBottom<TElement, TItem>', () => {
  it('is typed by the element and item generics', () => {
    const { result } = renderHook(() => useStickToBottom<HTMLDivElement, Item>(items))
    expectTypeOf(result.current).toEqualTypeOf<StickToBottom<HTMLDivElement>>()
    expectTypeOf(result.current.ref.current).toEqualTypeOf<HTMLDivElement | null>()
  })

  it('counts items that arrive while the user is scrolled up', () => {
    const element = document.createElement('div')
    Object.defineProperties(element, {
      scrollHeight: { value: 1000 },
      clientHeight: { value: 300 },
      scrollTop: { get: () => 0 },
      scrollTo: { value: () => {} },
    })

    const { result, rerender } = renderHook(
      ({ list }: { list: readonly Item[] }) => {
        const state = useStickToBottom<HTMLDivElement, Item>(list, { shouldFollow: (item) => item.id < 0 })
        state.ref.current = element
        return state
      },
      { initialProps: { list: items } },
    )

    // user scrolls far from the bottom
    act(() => result.current.onScroll({ currentTarget: element } as unknown as UIEvent<HTMLDivElement>))
    expect(result.current.isDetached).toBe(true)

    rerender({ list: [...items, { id: 3, name: 'Вера' }] })
    expect(result.current.missed).toBe(1)

    // own item (shouldFollow) scrolls down and resets the counter
    rerender({ list: [...items, { id: 3, name: 'Вера' }, { id: -1, name: 'я' }] })
    expect(result.current.missed).toBe(0)
  })
})
