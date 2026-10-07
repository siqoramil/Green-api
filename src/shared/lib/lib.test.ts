import { describe, expect, it } from 'vitest'
import { formatPhone, isValidPhone, normalizePhone } from './phone'
import { splitLinks } from './linkify'
import { isAllowedApiUrl, isValidApiToken, isValidIdInstance } from './validation'

describe('phone', () => {
  it('normalizes common input formats', () => {
    expect(normalizePhone('+7 (999) 123-45-67')).toBe('79991234567')
    expect(normalizePhone('8 999 123 45 67')).toBe('79991234567')
    expect(normalizePhone('+375 29 123-45-67')).toBe('375291234567')
  })

  it('validates length', () => {
    expect(isValidPhone('79991234567')).toBe(true)
    expect(isValidPhone('375291234567')).toBe(true)
    expect(isValidPhone('12345')).toBe(false)
  })

  it('formats for display', () => {
    expect(formatPhone('79991234567')).toBe('+7 999 123-45-67')
    expect(formatPhone('375291234567')).toBe('+375 29 123-45-67')
    expect(formatPhone('998901234567')).toBe('+998901234567')
  })
})

describe('splitLinks', () => {
  it('extracts http(s) links and strips trailing punctuation', () => {
    expect(splitLinks('see https://green-api.com/docs, ok')).toEqual([
      { type: 'text', value: 'see ' },
      { type: 'link', value: 'https://green-api.com/docs', href: 'https://green-api.com/docs' },
      { type: 'text', value: ', ok' },
    ])
  })

  it('never turns non-http schemes into links', () => {
    const parts = splitLinks('javascript:alert(1) data:text/html,<b>x</b>')
    expect(parts.every((p) => p.type === 'text')).toBe(true)
  })
})

describe('credential validation', () => {
  it('accepts only https GREEN-API hosts', () => {
    expect(isAllowedApiUrl('https://3100.api.green-api.com')).toBe(true)
    expect(isAllowedApiUrl('https://api.green-api.com/')).toBe(true)
    expect(isAllowedApiUrl('http://3100.api.green-api.com')).toBe(false)
    expect(isAllowedApiUrl('https://green-api.com.attacker.io')).toBe(false)
    expect(isAllowedApiUrl('https://user:pass@api.green-api.com')).toBe(false)
    expect(isAllowedApiUrl('https://api.green-api.com/path')).toBe(false)
    expect(isAllowedApiUrl('not a url')).toBe(false)
  })

  it('validates idInstance and token shape', () => {
    expect(isValidIdInstance('3100123456')).toBe(true)
    expect(isValidIdInstance('31a0')).toBe(false)
    expect(isValidApiToken('d75b3a66374942c5b3c019c698abc2067e151558acbd412345')).toBe(true)
    expect(isValidApiToken('short')).toBe(false)
    expect(isValidApiToken('abc/../../evil?x=1&y=2abcdef')).toBe(false)
  })
})
