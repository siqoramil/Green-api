import { isAllowedApiUrl, isRecord } from '@/shared/lib'
import {
  ENDPOINT_METHODS,
  type EndpointName,
  type EndpointOptions,
  type EndpointResponse,
} from './endpoints'
import type { Credentials, SendMessageRequest } from './types'

export type GreenApiErrorKind = 'http' | 'network' | 'timeout' | 'aborted'

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

const DEFAULT_TIMEOUT_MS = 15_000

/**
 * Builds the default API host from an instance id. GREEN-API hosts are sharded by
 * the first four digits of idInstance (e.g. 3100123456 → https://3100.api.green-api.com).
 */
export function defaultApiUrl(idInstance: string): string {
  const prefix = idInstance.trim().slice(0, 4)
  return prefix.length === 4 ? `https://${prefix}.api.green-api.com` : 'https://api.green-api.com'
}

function describeHttpError(status: number, body: string): string {
  let detail = body.trim()
  try {
    const parsed: unknown = JSON.parse(detail)
    if (isRecord(parsed) && 'message' in parsed) detail = String(parsed['message'])
  } catch {
    // plain-text body — use as is
  }

  switch (status) {
    case 401:
    case 403:
      return 'Неверный idInstance или apiTokenInstance'
    case 404:
      return 'Инстанс не найден. Проверьте idInstance и apiUrl'
    case 429:
      return 'Слишком много запросов. Повторите попытку позже'
    case 466:
      return 'Превышены лимиты тарифа GREEN-API'
    case 469:
      return 'Слишком много проверок номеров. Подождите несколько минут'
    default:
      return detail || `Ошибка сервера (HTTP ${status})`
  }
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
      throw new GreenApiError('Недопустимый apiUrl: разрешены только https://*.green-api.com', 'http')
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
    const combined = signal ? AbortSignal.any([signal, timeoutSignal]) : timeoutSignal

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
    try {
      response = await this.fetchImpl(this.buildUrl(name, path, query), init)
    } catch {
      if (signal?.aborted) throw new GreenApiError('Запрос отменён', 'aborted')
      if (timeoutSignal.aborted) throw new GreenApiError('Превышено время ожидания ответа', 'timeout')
      throw new GreenApiError('Нет соединения с сервером GREEN-API', 'network')
    }

    const text = await response.text()
    if (!response.ok) {
      throw new GreenApiError(describeHttpError(response.status, text), 'http', response.status)
    }

    if (!text || text === 'null') return null as EndpointResponse<N>
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
