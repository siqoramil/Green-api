import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Credentials } from '@/shared/api'
import { lazy, Suspense, useState } from 'react'
import { ChatStoreProvider } from '@/entities/chat'
import { GreenApiProvider, useSessionStore } from '@/entities/session'
import { LoginForm } from '@/features/auth'
import { ErrorBoundary } from './error-boundary'
import { AppSkeleton } from './app-skeleton'

// Code splitting: the login screen does not download the messenger bundle.
const Messenger = lazy(() => import('./messenger').then((m) => ({ default: m.Messenger })))

function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      // Sending a message or checking a number must not be silently repeated.
      mutations: { retry: false },
      queries: { retry: 1, refetchOnWindowFocus: false },
    },
  })
}

export function App() {
  const [queryClient] = useState<QueryClient>(createQueryClient)
  const credentials = useSessionStore<Credentials | null>((s) => s.credentials)
  const remember = useSessionStore<boolean>((s) => s.remember)

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {credentials ? (
          <GreenApiProvider credentials={credentials}>
            {/* key: a different instance gets its own chat storage and poller */}
            <ChatStoreProvider
              key={credentials.idInstance}
              idInstance={credentials.idInstance}
              persistent={remember}
            >
              <Suspense fallback={<AppSkeleton />}>
                <Messenger />
              </Suspense>
            </ChatStoreProvider>
          </GreenApiProvider>
        ) : (
          <LoginForm />
        )}
      </QueryClientProvider>
    </ErrorBoundary>
  )
}
