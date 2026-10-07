import { useMutation, type UseMutationResult } from '@tanstack/react-query'
import { useSessionStore, type SessionState } from '@/entities/session'
import { GreenApiClient, type Credentials, type InstanceState } from '@/shared/api'

export interface LoginVariables {
  credentials: Credentials
  remember: boolean
}

const STATE_MESSAGES: Record<Exclude<InstanceState, 'authorized'>, string> = {
  notAuthorized: 'Инстанс не авторизован. Отсканируйте QR-код в личном кабинете GREEN-API',
  blocked: 'Аккаунт MAX заблокирован',
  sleepMode: 'Инстанс в спящем режиме. Включите телефон с MAX',
  starting: 'Инстанс запускается. Повторите попытку через минуту',
  yellowCard: 'На аккаунте временные ограничения отправки сообщений',
}

/** Verifies credentials with getStateInstance and opens a session only for an authorized instance. */
async function verifyCredentials({ credentials }: LoginVariables): Promise<Credentials> {
  const { stateInstance } = await new GreenApiClient(credentials).getStateInstance()
  if (stateInstance !== 'authorized') {
    throw new Error(STATE_MESSAGES[stateInstance] ?? `Состояние инстанса: ${String(stateInstance)}`)
  }
  return credentials
}

export function useLogin(): UseMutationResult<Credentials, Error, LoginVariables> {
  const login = useSessionStore<SessionState['login']>((s) => s.login)
  return useMutation<Credentials, Error, LoginVariables>({
    mutationKey: ['auth', 'login'],
    mutationFn: verifyCredentials,
    onSuccess: (credentials, { remember }) => login(credentials, remember),
  })
}
