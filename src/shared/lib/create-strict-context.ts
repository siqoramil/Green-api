import { createContext, use, type Context } from 'react'

/**
 * Creates a context together with a hook that throws when used outside of its provider.
 * No `null` checks leak into consumers, and misuse fails loudly during development.
 *
 * @example
 * const [ApiContext, useApi] = createStrictContext<GreenApiClient>('GreenApi')
 */
export function createStrictContext<T>(name: string): readonly [Context<T | null>, () => T] {
  const StrictContext = createContext<T | null>(null)
  StrictContext.displayName = name

  function useStrictContext(): T {
    const value = use(StrictContext)
    if (value === null) throw new Error(`use${name} must be used inside <${name}Provider>`)
    return value
  }

  return [StrictContext, useStrictContext] as const
}
