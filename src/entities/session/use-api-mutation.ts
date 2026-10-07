import { useMutation, type UseMutationOptions, type UseMutationResult } from '@tanstack/react-query'
import type { GreenApiClient } from '@/shared/api'
import { useGreenApi } from './api-context'

export type ApiMutationFn<TVariables, TData> = (client: GreenApiClient, variables: TVariables) => Promise<TData>

/**
 * `useMutation` with the current instance's API client injected.
 * Generic over the variables and the result, so call sites stay fully typed:
 *
 * @example
 * const send = useApiMutation<SendVariables, string>((api, v) => api.sendMessage(v).then((r) => r.idMessage))
 */
export function useApiMutation<TVariables, TData, TContext = unknown>(
  mutationFn: ApiMutationFn<TVariables, TData>,
  options?: Omit<UseMutationOptions<TData, Error, TVariables, TContext>, 'mutationFn'>,
): UseMutationResult<TData, Error, TVariables, TContext> {
  const client = useGreenApi()
  return useMutation<TData, Error, TVariables, TContext>({
    ...options,
    mutationFn: (variables: TVariables) => mutationFn(client, variables),
  })
}
