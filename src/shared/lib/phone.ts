/** Strips everything except digits. */
export const digitsOnly = (value: string): string => value.replace(/\D/g, '')

/**
 * Normalizes user input to the international format accepted by GREEN-API
 * (digits only, 11–12 chars). Russian numbers typed with a trunk prefix `8`
 * are converted to `7`.
 */
export function normalizePhone(value: string): string {
  const digits = digitsOnly(value)
  if (digits.length === 11 && digits.startsWith('8')) return `7${digits.slice(1)}`
  return digits
}

export const isValidPhone = (normalized: string): boolean => /^\d{11,12}$/.test(normalized)

/** GREEN-API for MAX checks only Russian (+7) and Belarusian (+375) numbers in CheckAccount. */
export const isSupportedMaxPhone = (normalized: string): boolean => /^(7\d{10}|375\d{9})$/.test(normalized)

/** Formats a normalized phone for display: `79991234567` → `+7 999 123-45-67`. */
export function formatPhone(normalized: string): string {
  const ru = /^7(\d{3})(\d{3})(\d{2})(\d{2})$/.exec(normalized)
  if (ru) return `+7 ${ru[1]} ${ru[2]}-${ru[3]}-${ru[4]}`
  const by = /^375(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(normalized)
  if (by) return `+375 ${by[1]} ${by[2]}-${by[3]}-${by[4]}`
  return normalized ? `+${normalized}` : ''
}

/** Digit group sizes and the separator placed before each group, per supported country code. */
const INPUT_MASKS = [
  { code: '375', groups: [3, 2, 3, 2, 2], separators: ['+', ' ', ' ', '-', '-'] },
  { code: '7', groups: [1, 3, 3, 2, 2], separators: ['+', ' ', ' ', '-', '-'] },
] as const

const MAX_INTERNATIONAL_DIGITS = 15

/**
 * Formats a phone while it is being typed: `7999123` → `+7 999 123`, `79991234567` → `+7 999 123-45-67`.
 * A leading trunk `8` becomes `7`. Numbers of other countries are shown as `+<digits>`.
 */
export function formatPhoneInput(value: string): string {
  let digits = digitsOnly(value)
  if (!digits) return ''
  if (digits.startsWith('8')) digits = `7${digits.slice(1)}`

  // '3' and '37' are prefixes of '375' — format them with the BY mask while it is still being typed.
  const mask = INPUT_MASKS.find(({ code }) => digits.startsWith(code) || code.startsWith(digits))
  if (!mask) return `+${digits.slice(0, MAX_INTERNATIONAL_DIGITS)}`

  let result = ''
  let offset = 0
  mask.groups.forEach((size, index) => {
    if (offset >= digits.length) return
    result += mask.separators[index] + digits.slice(offset, offset + size)
    offset += size
  })
  return result
}
