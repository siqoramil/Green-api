import { describe, expect, expectTypeOf, it, vi } from 'vitest'
import type { Notification } from './types'
import { defined } from '@/test/utils'
import { defaultApiUrl, GreenApiClient, GreenApiError, type FetchLike } from './green-api'

const credentials = {
  apiUrl: 'https://3100.api.green-api.com/',
  idInstance: '3100123456',
  apiTokenInstance: 'abc123def456abc123def456',
}

const jsonResponse = (body: unknown, status = 200) =>
  new Response(body === null ? '' : JSON.stringify(body), { status })

describe('defaultApiUrl', () => {
  it('derives the shard host from the first four digits', () => {
    expect(defaultApiUrl('3100123456')).toBe('https://3100.api.green-api.com')
    expect(defaultApiUrl('7103000000')).toBe('https://7103.api.green-api.com')
  })
})

describe('GreenApiClient', () => {
  it('rejects api hosts outside green-api.com (token exfiltration guard)', () => {
    expect(() => new GreenApiClient({ ...credentials, apiUrl: 'https://evil.example.com' })).toThrow(GreenApiError)
    expect(() => new GreenApiClient({ ...credentials, apiUrl: 'http://3100.api.green-api.com' })).toThrow()
    expect(() => new GreenApiClient({ ...credentials, apiUrl: 'https://green-api.com.evil.io' })).toThrow()
  })

  it('builds the request URL and JSON body for sendMessage', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ idMessage: 'm1' }))
    const client = new GreenApiClient(credentials, fetchMock)

    await expect(client.sendMessage({ chatId: '10000000', message: 'Привет' })).resolves.toEqual({ idMessage: 'm1' })

    const [url, init] = defined(fetchMock.mock.calls[0], 'fetch call')
    expect(url).toBe('https://3100.api.green-api.com/waInstance3100123456/sendMessage/abc123def456abc123def456')
    expect(init).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ chatId: '10000000', message: 'Привет' }),
      referrerPolicy: 'no-referrer',
      credentials: 'omit',
    })
  })

  it('passes receiveTimeout and returns null for an empty queue', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(new Response('null', { status: 200 }))
    const client = new GreenApiClient(credentials, fetchMock)

    await expect(client.receiveNotification(20)).resolves.toBeNull()
    expect(defined(fetchMock.mock.calls[0])[0]).toMatch(/\/receiveNotification\/abc123def456abc123def456\?receiveTimeout=20$/)
  })

  it('uses DELETE with the receipt id for deleteNotification', async () => {
    const fetchMock = vi.fn<FetchLike>().mockResolvedValue(jsonResponse({ result: true }))
    await new GreenApiClient(credentials, fetchMock).deleteNotification(42)
    expect(defined(fetchMock.mock.calls[0])[0]).toMatch(/\/deleteNotification\/abc123def456abc123def456\/42$/)
    expect(defined(fetchMock.mock.calls[0])[1].method).toBe('DELETE')
  })

  it('maps HTTP errors to readable messages', async () => {
    const client = new GreenApiClient(credentials, vi.fn<FetchLike>().mockResolvedValue(new Response('', { status: 401 })))
    await expect(client.getStateInstance()).rejects.toMatchObject({
      kind: 'http',
      status: 401,
      message: 'Неверный idInstance или apiTokenInstance',
    })
  })

  it('reports network failures without leaking the URL/token', async () => {
    const client = new GreenApiClient(credentials, vi.fn<FetchLike>().mockRejectedValue(new TypeError('Failed to fetch')))
    const error = await client.getStateInstance().then(
      () => {
        throw new Error('expected a rejection')
      },
      (e: GreenApiError) => e,
    )
    expect(error).toBeInstanceOf(GreenApiError)
    expect(error.kind).toBe('network')
    expect(error.message).not.toContain(credentials.apiTokenInstance)
  })

  it('distinguishes caller aborts from failures', async () => {
    const fetchMock = vi.fn<FetchLike>((_url, init) =>
      new Promise<Response>((_, reject) =>
        init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError'))),
      ),
    )
    const controller = new AbortController()
    const promise = new GreenApiClient(credentials, fetchMock).receiveNotification(5, controller.signal)
    controller.abort()
    await expect(promise).rejects.toMatchObject({ kind: 'aborted' })
  })
})

describe('typed endpoint map', () => {
  it('derives request and response types from the endpoint name', () => {
    const client = new GreenApiClient(credentials, vi.fn<FetchLike>())
    expectTypeOf(client.request<'sendMessage'>)
      .parameter(1)
      .toHaveProperty('body')
      .toEqualTypeOf<{ chatId: string; message: string }>()
    expectTypeOf(client.receiveNotification).returns.resolves.toEqualTypeOf<Notification | null>()

    // Never executed — these lines only have to (not) compile.
    const compileOnly = () => {
      // @ts-expect-error — unknown endpoint names do not compile
      void client.request('sendFile', {})
      // @ts-expect-error — sendMessage requires a body
      void client.request('sendMessage', {})
    }
    expectTypeOf(compileOnly).toBeFunction()
  })
})
