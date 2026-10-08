import { isAllowedApiUrl, isRecord } from '@/shared/lib'
import {
  ENDPOINT_METHODS,
  type EndpointName,
  type EndpointOptions,
  type EndpointResponse,
} from './endpoints'
import type { Credentials, SendMessageRequest } from './types'

export type GreenApiErrorKind = 'http' | 'network' | 'timeout' | 'aborted' | 'config'

export class GreenApiError extends Error {
  readonly kind: GreenApiErrorKind
  readonly status: number | undefined

  constructor(message: string, kind: GreenApiErrorKind, status?: number) {
    super(message)
    this.name = 'GreenApiError'
    this.kind = kind
    this.status = status
  }
}

export const isAbortError = (error: unknown): boolean =>
  error instanceof GreenApiError && error.kind === 'aborted'

/** Statuses that will not go away by retrying: wrong/revoked token or exhausted tariff. */
const FATAL_HTTP_STATUSES: ReadonlySet<number> = new Set([401, 403, 466])

export const isFatalApiError = (error: unknown): boolean =>
  error instanceof GreenApiError &&
  (error.kind === 'config' || (error.kind === 'http' && error.status !== undefined && FATAL_HTTP_STATUSES.has(error.status)))

const DEFAULT_TIMEOUT_MS = 15_000

/**
 * Builds the default API host from an instance id. GREEN-API hosts are sharded by
 * the first four digits of idInstance (e.g. 3100123456 → https://3100.api.green-api.com).
 */
export function defaultApiUrl(idInstance: string): string {
  const prefix = idInstance.trim().slice(0, 4)
  return prefix.length === 4 ? `https://${prefix}.api.green-api.com` : 'https://api.green-api.com'
}

const MAX_DETAIL_LENGTH = 200

/** Extracts a short human-readable message from an error body (JSON, plain text or an HTML error page). */
function extractDetail(body: string): string {
  const text = body.trim()
  // HTML error pages from proxies (502/504) are useless to the user and can be huge.
  if (!text || text.startsWith('<')) return ''

  let detail = text
  try {
    const parsed: unknown = JSON.parse(text)
    if (isRecord(parsed)) {
      const field = ['message', 'reason', 'error'].map((key) => parsed[key]).find((v) => typeof v === 'string' && v.trim())
      detail = typeof field === 'string' ? field.trim() : ''
    }
  } catch {
    // plain-text body — use as is
  }
  return detail.length > MAX_DETAIL_LENGTH ? `${detail.slice(0, MAX_DETAIL_LENGTH)}…` : detail
}

function describeHttpError(status: number, body: string): string {
  const detail = extractDetail(body)
  const hint = HTTP_ERROR_HINTS[status]
  if (!hint) return detail ? `${detail} (HTTP ${status})` : `Ошибка сервера (HTTP ${status})`
  // Keep the server's own message visible: the hint is only our guess about the cause.
  return detail ? `${hint} (HTTP ${status}: ${detail})` : `${hint} (HTTP ${status})`
}

const HTTP_ERROR_HINTS: Partial<Record<number, string>> = {
  401: 'Неверный idInstance или apiTokenInstance',
  403: 'Неверный idInstance или apiTokenInstance',
  404: 'Инстанс или метод не найден. Проверьте idInstance, apiUrl и тип инстанса (MAX)',
  429: 'Слишком много запросов. Повторите попытку позже',
  466: 'Превышены лимиты тарифа GREEN-API',
  469: 'Слишком много проверок номеров. Подождите несколько минут',
}

/** Endpoints for which an empty body is a valid answer (an empty notification queue). */
const NULLABLE_RESPONSES: ReadonlySet<EndpointName> = new Set<EndpointName>(['receiveNotification'])

/** `AbortSignal.any` with a fallback for browsers that lack it (Safari < 17.4). */
function anySignal(signals: AbortSignal[]): AbortSignal {
  if (typeof AbortSignal.any === 'function') return AbortSignal.any(signals)
  const controller = new AbortController()
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason)
      break
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true })
  }
  return controller.signal
}

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>

/** Loosely typed view of the options used inside `request` (the public signature is strict). */
interface AnyEndpointOptions {
  signal?: AbortSignal
  timeoutMs?: number
  body?: unknown
  query?: Record<string, string | number>
  path?: string | number
}

/**
 * Thin, typed wrapper over the GREEN-API HTTP API.
 * URL format: {apiUrl}/waInstance{idInstance}/{method}/{apiTokenInstance}[/{path}][?query]
 */
export class GreenApiClient {
  private readonly credentials: Credentials
  private readonly fetchImpl: FetchLike

  constructor(credentials: Credentials, fetchImpl: FetchLike = (input, init) => fetch(input, init)) {
    // Defense in depth: never send the token anywhere except GREEN-API hosts.
    if (!isAllowedApiUrl(credentials.apiUrl)) {
      throw new GreenApiError('Недопустимый apiUrl: разрешены только https://*.green-api.com', 'config')
    }
    this.credentials = credentials
    this.fetchImpl = fetchImpl
  }

  getStateInstance(signal?: AbortSignal) {
    return this.request('getStateInstance', signal ? { signal } : {})
  }

  checkAccount(phoneNumber: number, signal?: AbortSignal) {
    return this.request('checkAccount', { body: { phoneNumber }, ...(signal && { signal }) })
  }

  sendMessage(body: SendMessageRequest, signal?: AbortSignal) {
    return this.request('sendMessage', { body, ...(signal && { signal }) })
  }

  /**
   * Long-polls the notification queue. Resolves with `null` when no notification
   * arrived within `receiveTimeout` seconds (5–60).
   */
  receiveNotification(receiveTimeout: number, signal?: AbortSignal) {
    return this.request('receiveNotification', {
      query: { receiveTimeout },
      timeoutMs: (receiveTimeout + 10) * 1000,
      ...(signal && { signal }),
    })
  }

  deleteNotification(receiptId: number, signal?: AbortSignal) {
    return this.request('deleteNotification', { path: receiptId, ...(signal && { signal }) })
  }

  /** Generic over the endpoint map: payload and response types are derived from `name`. */
  async request<N extends EndpointName>(name: N, options: EndpointOptions<N>): Promise<EndpointResponse<N>> {
    const { body, query, path, signal, timeoutMs = DEFAULT_TIMEOUT_MS } = options as AnyEndpointOptions
    const timeoutSignal = AbortSignal.timeout(timeoutMs)
    const combined = signal ? anySignal([signal, timeoutSignal]) : timeoutSignal

    const init: RequestInit = {
      method: ENDPOINT_METHODS[name],
      signal: combined,
      // The token is part of the URL — never leak it via Referer, cookies or HTTP cache.
      referrerPolicy: 'no-referrer',
      credentials: 'omit',
      cache: 'no-store',
    }
    if (body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' }
      init.body = JSON.stringify(body)
    }

    let response: Response
    let text: string
    try {
      response = await this.fetchImpl(this.buildUrl(name, path, query), init)
      // Reading the body is part of the request: the timeout or an abort may fire here too.
      text = await response.text()
    } catch {
      if (signal?.aborted) throw new GreenApiError('Запрос отменён', 'aborted')
      if (timeoutSignal.aborted) throw new GreenApiError('Превышено время ожидания ответа', 'timeout')
      throw new GreenApiError('Нет соединения с сервером GREEN-API', 'network')
    }

    if (!response.ok) {
      throw new GreenApiError(describeHttpError(response.status, text), 'http', response.status)
    }

    if (!text.trim() || text.trim() === 'null') {
      if (NULLABLE_RESPONSES.has(name)) return null as EndpointResponse<N>
      throw new GreenApiError('Сервер вернул пустой ответ', 'http', response.status)
    }
    try {
      return JSON.parse(text) as EndpointResponse<N>
    } catch {
      throw new GreenApiError('Некорректный ответ сервера', 'http', response.status)
    }
  }

  private buildUrl(method: EndpointName, path?: string | number, query?: Record<string, string | number>): string {
    const { apiUrl, idInstance, apiTokenInstance } = this.credentials
    const base = apiUrl.trim().replace(/\/+$/, '')
    const segments = [`waInstance${idInstance.trim()}`, method, apiTokenInstance.trim()]
    if (path !== undefined) segments.push(String(path))
    const search = query
      ? `?${new URLSearchParams(Object.entries(query).map(([k, v]) => [k, String(v)]))}`
      : ''
    return `${base}/${segments.map(encodeURIComponent).join('/')}${search}`
  }
}
