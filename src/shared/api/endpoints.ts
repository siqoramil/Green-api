import type {
  CheckAccountFailure,
  CheckAccountResponse,
  DeleteNotificationResponse,
  Notification,
  SendMessageRequest,
  SendMessageResponse,
  StateInstanceResponse,
} from './types'

export type HttpMethod = 'GET' | 'POST' | 'DELETE'

/**
 * Single source of truth for the API surface: method name → HTTP verb, request body,
 * query string, extra path segment and response type. The client is generic over this map,
 * so a typo in a method name or a wrong payload is a compile-time error.
 */
export interface Endpoints {
  getStateInstance: { method: 'GET'; response: StateInstanceResponse }
  checkAccount: {
    method: 'POST'
    body: { phoneNumber: number; force?: boolean }
    response: CheckAccountResponse | CheckAccountFailure
  }
  sendMessage: { method: 'POST'; body: SendMessageRequest; response: SendMessageResponse }
  receiveNotification: {
    method: 'GET'
    query: { receiveTimeout: number }
    response: Notification | null
  }
  deleteNotification: { method: 'DELETE'; path: number; response: DeleteNotificationResponse }
}

export type EndpointName = keyof Endpoints

/** Picks a field of an endpoint definition, or `never` if the endpoint does not declare it. */
type Field<N extends EndpointName, F extends string> = Endpoints[N] extends Record<F, infer V> ? V : never

export type EndpointBody<N extends EndpointName> = Field<N, 'body'>
export type EndpointQuery<N extends EndpointName> = Field<N, 'query'>
export type EndpointPath<N extends EndpointName> = Field<N, 'path'>
export type EndpointResponse<N extends EndpointName> = Endpoints[N]['response']

/** Options are required only for what the endpoint actually declares. */
export type EndpointOptions<N extends EndpointName> = { signal?: AbortSignal; timeoutMs?: number } & ([
  EndpointBody<N>,
] extends [never]
  ? unknown
  : { body: EndpointBody<N> }) &
  ([EndpointQuery<N>] extends [never] ? unknown : { query: EndpointQuery<N> }) &
  ([EndpointPath<N>] extends [never] ? unknown : { path: EndpointPath<N> })

export const ENDPOINT_METHODS = {
  getStateInstance: 'GET',
  checkAccount: 'POST',
  sendMessage: 'POST',
  receiveNotification: 'GET',
  deleteNotification: 'DELETE',
} as const satisfies { [N in EndpointName]: Endpoints[N]['method'] }
