import { describe, expect, expectTypeOf, it } from 'vitest'
import { createTypedStorage } from './typed-storage'
import { compact, isNumber, isString, shape } from './guards'

describe('shape<S>', () => {
  const isPoint = shape({ x: isNumber, label: isString })

  it('infers the guarded type from the schema', () => {
    expectTypeOf(isPoint).guards.toEqualTypeOf<{ x: number; label: string }>()
  })

  it('validates at runtime', () => {
    expect(isPoint({ x: 1, label: 'a' })).toBe(true)
    expect(isPoint({ x: '1', label: 'a' })).toBe(false)
    expect(isPoint(null)).toBe(false)
    expect(isPoint([1, 'a'])).toBe(false)
  })
})

describe('compact<T>', () => {
  it('drops undefined values and makes keys optional', () => {
    const result = compact({ a: 1, b: undefined as string | undefined })
    expect(result).toEqual({ a: 1 })
    expectTypeOf(result).toEqualTypeOf<{ a?: number; b?: string }>()
  })
})

describe('createTypedStorage<T>', () => {
  const isUser = shape({ name: isString })
  const slot = createTypedStorage<{ name: string }>('test:user', 'session', isUser)

  it('round-trips valid values', () => {
    slot.write({ name: 'Анна' })
    expect(slot.read()).toEqual({ name: 'Анна' })
    expectTypeOf(slot.read()).toEqualTypeOf<{ name: string } | null>()
  })

  it('treats tampered or corrupted data as absent', () => {
    sessionStorage.setItem('test:user', JSON.stringify({ name: 42 }))
    expect(slot.read()).toBeNull()
    sessionStorage.setItem('test:user', '{not json')
    expect(slot.read()).toBeNull()
  })
})
