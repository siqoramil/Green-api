import { useDeferredValue } from 'react'

/**
 * Filters a list by a free-text query. The query is deferred, so typing stays responsive
 * even for long lists; `match` receives the already trimmed, lower-cased query.
 */
export function useFilteredList<T>(
  items: readonly T[],
  query: string,
  match: (item: T, normalizedQuery: string) => boolean,
): readonly T[] {
  const deferredQuery = useDeferredValue<string>(query.trim().toLowerCase())
  if (!deferredQuery) return items
  return items.filter((item) => match(item, deferredQuery))
}
