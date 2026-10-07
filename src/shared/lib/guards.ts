/** Narrowing helpers for validating untrusted data (API responses, storage) at runtime. */

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

export const isString = (value: unknown): value is string => typeof value === 'string'

export const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)

/** A type guard: tells TypeScript that `value` is `T` when it returns true. */
export type Guard<T> = (value: unknown) => value is T

/**
 * Builds a guard for an object shape from per-key guards.
 * The resulting type is inferred from the schema, so the guard and the type cannot drift apart.
 *
 * @example
 * const isPoint = shape({ x: isNumber, y: isNumber }) // Guard<{ x: number; y: number }>
 */
export function shape<S extends Record<string, Guard<unknown>>>(
  schema: S,
): Guard<{ [K in keyof S]: S[K] extends Guard<infer T> ? T : never }> {
  return (value: unknown): value is { [K in keyof S]: S[K] extends Guard<infer T> ? T : never } =>
    isRecord(value) && Object.entries(schema).every(([key, guard]) => guard(value[key]))
}

/** Exhaustiveness check for discriminated unions: fails to compile if a case is not handled. */
export function assertNever(value: never, message = 'Unexpected value'): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`)
}

/** Removes keys whose value is `undefined` — required with `exactOptionalPropertyTypes`. */
export function compact<T extends Record<string, unknown>>(
  object: T,
): { [K in keyof T]?: Exclude<T[K], undefined> } {
  return Object.fromEntries(Object.entries(object).filter(([, v]) => v !== undefined)) as {
    [K in keyof T]?: Exclude<T[K], undefined>
  }
}
