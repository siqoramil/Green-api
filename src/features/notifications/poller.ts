import type { ConnectionStatus } from '@/entities/session'
import { isAbortError, isFatalApiError, type GreenApiClient, type Notification } from '@/shared/api'

export interface PollerOptions {
  client: Pick<GreenApiClient, 'receiveNotification' | 'deleteNotification'>
  onNotification: (notification: Notification) => void
  onStatusChange?: (status: ConnectionStatus, error?: Error) => void
  signal: AbortSignal
  /**
   * Fast request used to report `online` right away — the first long-poll call
   * may legitimately hang for `receiveTimeout` seconds on an empty queue.
   */
  healthCheck?: (signal: AbortSignal) => Promise<unknown>
  /** Long-poll window in seconds (5–60). */
  receiveTimeout?: number
  /** Backoff bounds for consecutive errors. */
  minRetryMs?: number
  maxRetryMs?: number
}

const toError = (error: unknown): Error => (error instanceof Error ? error : new Error(String(error)))

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, ms)
    signal.addEventListener('abort', () => {
      clearTimeout(timer)
      resolve()
    }, { once: true })
  })

/**
 * Sequential long-polling loop over the GREEN-API notification queue:
 * receiveNotification → handle → deleteNotification → repeat.
 *
 * - The notification is deleted even if the handler throws, so a single bad
 *   notification can never block the queue.
 * - If deletion fails the same notification is delivered again; handlers are
 *   idempotent (messages are deduplicated by idMessage), so this is safe.
 * - Network/HTTP errors are retried with exponential backoff.
 * - Fatal errors (wrong token, exhausted tariff) stop the loop with the `failed` status.
 */
export async function runNotificationPoller({
  client,
  onNotification,
  onStatusChange,
  signal,
  healthCheck,
  receiveTimeout = 20,
  minRetryMs = 1_000,
  maxRetryMs = 30_000,
}: PollerOptions): Promise<void> {
  let retryMs = minRetryMs
  let status: ConnectionStatus | null = null
  const setStatus = (next: ConnectionStatus, error?: Error) => {
    if (next !== status || error) onStatusChange?.(next, error)
    status = next
  }

  setStatus('connecting')
  if (healthCheck) {
    try {
      await healthCheck(signal)
      setStatus('online')
    } catch (error) {
      if (signal.aborted || isAbortError(error)) return
      if (isFatalApiError(error)) return setStatus('failed', toError(error))
      setStatus('offline', toError(error))
    }
  }

  while (!signal.aborted) {
    try {
      const notification = await client.receiveNotification(receiveTimeout, signal)
      setStatus('online')
      retryMs = minRetryMs
      if (!notification) continue

      try {
        onNotification(notification)
      } catch (error) {
        console.error('[notifications] handler failed', error)
      } finally {
        await client.deleteNotification(notification.receiptId, signal)
      }
    } catch (error) {
      if (signal.aborted || isAbortError(error)) break
      if (isFatalApiError(error)) return setStatus('failed', toError(error))
      setStatus('offline', toError(error))
      await sleep(retryMs, signal)
      retryMs = Math.min(retryMs * 2, maxRetryMs)
    }
  }
}
