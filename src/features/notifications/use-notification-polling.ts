import { useEffect } from 'react'
import { parseNotification, useChatStoreApi } from '@/entities/chat'
import { useConnectionStore, useGreenApi } from '@/entities/session'
import { runNotificationPoller } from './poller'

/** Starts the receive loop for the current instance while the component is mounted. */
export function useNotificationPolling(): void {
  const client = useGreenApi()
  const chatStore = useChatStoreApi()

  useEffect(() => {
    const controller = new AbortController()
    void runNotificationPoller({
      client,
      signal: controller.signal,
      healthCheck: (signal) => client.getStateInstance(signal),
      onNotification: ({ body }) => chatStore.getState().applyEvent(parseNotification(body)),
      onStatusChange: (status, error) =>
        useConnectionStore.setState({ status, error: error?.message ?? null }),
    })
    return () => controller.abort()
  }, [client, chatStore])
}
