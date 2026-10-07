import { useMemo, type ReactNode } from 'react'
import { GreenApiClient, type Credentials } from '@/shared/api'
import { GreenApiContext } from './api-context'

export function GreenApiProvider({ credentials, children }: { credentials: Credentials; children: ReactNode }) {
  const client = useMemo<GreenApiClient>(() => new GreenApiClient(credentials), [credentials])
  return <GreenApiContext value={client}>{children}</GreenApiContext>
}
