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
