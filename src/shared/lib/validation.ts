/**
 * Input validation for credentials.
 *
 * Security note: the API token travels in the request URL, so the app must never send it
 * to a host other than GREEN-API. `apiUrl` is restricted to HTTPS hosts under green-api.com —
 * a phished/mistyped URL cannot be used to exfiltrate the token. The same allow-list is
 * enforced by the Content-Security-Policy `connect-src` in production builds.
 */
const API_HOST_RE = /^([a-z0-9-]+\.)*green-api\.com$/i

export const isValidIdInstance = (value: string): boolean => /^\d{6,15}$/.test(value.trim())

export const isValidApiToken = (value: string): boolean => /^[A-Za-z0-9]{20,100}$/.test(value.trim())

export function isAllowedApiUrl(value: string): boolean {
  try {
    const url = new URL(value.trim())
    return (
      url.protocol === 'https:' &&
      API_HOST_RE.test(url.hostname) &&
      !url.username &&
      !url.password &&
      (url.pathname === '/' || url.pathname === '') &&
      !url.search &&
      !url.hash
    )
  } catch {
    return false
  }
}

/** Max text length accepted by SendMessage. */
export const MAX_MESSAGE_LENGTH = 4000
