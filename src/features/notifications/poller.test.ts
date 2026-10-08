import { describe, expect, it, vi } from 'vitest'
import type { Notification } from '@/shared/api'
import { GreenApiError } from '@/shared/api'
import { runNotificationPoller } from './poller'

const notification = (receiptId: number): Notification => ({
  receiptId,
  body: { typeWebhook: 'incomingMessageReceived' },
})

describe('runNotificationPoller', () => {
  it('handles and deletes each notification, then keeps polling', async () => {
    const controller = new AbortController()
    const queue: Array<Notification | null> = [notification(1), null, notification(2)]
    const client = {
      receiveNotification: vi.fn(async () => {
        if (queue.length === 0) controller.abort()
        return queue.shift() ?? null
      }),
      deleteNotification: vi.fn(async (_receiptId: number, _signal?: AbortSignal) => ({ result: true })),
    }
    const handled: number[] = []

    await runNotificationPoller({
      client,
      signal: controller.signal,
      onNotification: (n) => handled.push(n.receiptId),
    })

    expect(handled).toEqual([1, 2])
    expect(client.deleteNotification.mock.calls.map((c) => c[0])).toEqual([1, 2])
  })

  it('still deletes a notification when the handler throws', async () => {
    const controller = new AbortController()
    let served = false
    const client = {
      receiveNotification: vi.fn(async () => {
        if (served) controller.abort()
        served = true
        return notification(7)
      }),
      deleteNotification: vi.fn(async (_receiptId: number, _signal?: AbortSignal) => ({ result: true })),
    }
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await runNotificationPoller({
      client,
      signal: controller.signal,
      onNotification: () => {
        throw new Error('boom')
      },
    })

    expect(client.deleteNotification).toHaveBeenCalledWith(7, controller.signal)
  })

  it('reports offline on errors, retries with backoff and recovers', async () => {
    const controller = new AbortController()
    let calls = 0
    const client = {
      receiveNotification: vi.fn(async () => {
        calls++
        if (calls === 1) throw new GreenApiError('Нет соединения', 'network')
        controller.abort()
        return null
      }),
      deleteNotification: vi.fn(),
    }
    const statuses: string[] = []

    await runNotificationPoller({
      client,
      signal: controller.signal,
      onNotification: vi.fn(),
      onStatusChange: (s) => statuses.push(s),
      minRetryMs: 1,
    })

    expect(statuses).toEqual(['connecting', 'offline', 'online'])
  })

  it('throttles an empty queue that the server answers immediately', async () => {
    vi.useFakeTimers()
    const controller = new AbortController()
    const client = {
      receiveNotification: vi.fn(async () => null),
      deleteNotification: vi.fn(),
    }

    const done = runNotificationPoller({ client, signal: controller.signal, onNotification: vi.fn() })
    await vi.advanceTimersByTimeAsync(3_000)
    controller.abort()
    await done
    vi.useRealTimers()

    // One call right away plus one per second, not hundreds.
    expect(client.receiveNotification.mock.calls.length).toBeLessThanOrEqual(4)
  })

  it('stops polling on fatal errors instead of retrying forever', async () => {
    const controller = new AbortController()
    const client = {
      receiveNotification: vi.fn(async () => {
        throw new GreenApiError('Неверный idInstance или apiTokenInstance', 'http', 401)
      }),
      deleteNotification: vi.fn(),
    }
    const statuses: string[] = []

    await runNotificationPoller({
      client,
      signal: controller.signal,
      onNotification: vi.fn(),
      onStatusChange: (s) => statuses.push(s),
      minRetryMs: 1,
    })

    expect(statuses).toEqual(['connecting', 'failed'])
    expect(client.receiveNotification).toHaveBeenCalledTimes(1)
  })

  it('reports online immediately after a successful health check', async () => {
    const controller = new AbortController()
    const statuses: string[] = []
    const client = {
      receiveNotification: vi.fn(async () => {
        controller.abort()
        return null
      }),
      deleteNotification: vi.fn(),
    }

    await runNotificationPoller({
      client,
      signal: controller.signal,
      healthCheck: async () => {
        statuses.push('ping')
      },
      onNotification: vi.fn(),
      onStatusChange: (s) => statuses.push(s),
    })

    expect(statuses.slice(0, 3)).toEqual(['connecting', 'ping', 'online'])
    expect(client.receiveNotification).toHaveBeenCalledTimes(1)
  })
})
