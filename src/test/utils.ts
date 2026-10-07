/** Asserts that a value is present and narrows its type — keeps tests strict under `noUncheckedIndexedAccess`. */
export function defined<T>(value: T | null | undefined, what = 'value'): T {
  if (value === null || value === undefined) throw new Error(`Expected ${what} to be defined`)
  return value
}
