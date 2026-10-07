import { useId, useState, type SubmitEvent } from 'react'
import { defaultApiUrl, type Credentials } from '@/shared/api'
import { devCredentials } from '@/shared/config'
import { useToggle } from '@/shared/hooks'
import { cn, isAllowedApiUrl, isValidApiToken, isValidIdInstance } from '@/shared/lib'
import { AlertIcon, EyeIcon, EyeOffIcon, LogoMark, Spinner } from '@/shared/ui'
import { useLogin } from './use-login'

type Field = keyof Credentials
type FieldErrors = Partial<Record<Field, string>>

function validate(values: Credentials): FieldErrors {
  const errors: FieldErrors = {}
  if (!isValidIdInstance(values.idInstance)) errors.idInstance = 'Только цифры, например 3100123456'
  if (!isValidApiToken(values.apiTokenInstance)) errors.apiTokenInstance = 'Токен — латинские буквы и цифры'
  if (!isAllowedApiUrl(values.apiUrl)) errors.apiUrl = 'Разрешены только адреса https://*.green-api.com'
  return errors
}

const inputClass =
  'w-full rounded-xl border border-transparent bg-surface-2 px-4 py-3 text-[15px] text-fg outline-none transition placeholder:text-fg-muted focus:border-accent aria-invalid:border-danger'

export function LoginForm() {
  const id = useId()
  // Prefilled from .env.local in development only (see shared/config/env.ts).
  const [idInstance, setIdInstance] = useState<string>(devCredentials?.idInstance ?? '')
  const [apiTokenInstance, setApiToken] = useState<string>(devCredentials?.apiTokenInstance ?? '')
  const [customApiUrl, setCustomApiUrl] = useState<string | null>(devCredentials?.apiUrl ?? null)
  const [remember, setRemember] = useState<boolean>(false)
  const [touched, setTouched] = useState<boolean>(false)
  const [showToken, tokenVisibility] = useToggle(false)
  const mutation = useLogin()

  const apiUrl = customApiUrl ?? defaultApiUrl(idInstance)
  const values: Credentials = {
    idInstance: idInstance.trim(),
    apiTokenInstance: apiTokenInstance.trim(),
    apiUrl: apiUrl.trim().replace(/\/+$/, ''),
  }
  const errors: FieldErrors = touched ? validate(values) : {}

  const onSubmit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTouched(true)
    if (Object.keys(validate(values)).length > 0) return
    mutation.mutate({ credentials: values, remember })
  }

  const fieldError = (field: Field) =>
    errors[field] ? (
      <p id={`${id}-${field}-error`} className="mt-1.5 px-1 text-[13px] text-danger">
        {errors[field]}
      </p>
    ) : null

  return (
    <main className="chat-pattern flex min-h-full items-center justify-center overflow-y-auto p-4">
      <form
        noValidate
        onSubmit={onSubmit}
        aria-labelledby={`${id}-title`}
        className="w-full max-w-[400px] rounded-3xl bg-surface p-8 shadow-xl shadow-black/5"
      >
        <div className="mb-6 flex flex-col items-center text-center">
          <LogoMark size={56} />
          <h1 id={`${id}-title`} className="mt-4 text-[22px] font-semibold">
            Вход в MAX Web
          </h1>
          <p className="mt-1.5 text-sm text-fg-muted">
            Введите параметры инстанса из{' '}
            <a
              href="https://console.green-api.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent hover:underline"
            >
              личного кабинета GREEN-API
            </a>
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor={`${id}-id`} className="mb-1.5 block px-1 text-[13px] font-medium text-fg-muted">
              idInstance
            </label>
            <input
              id={`${id}-id`}
              name="idInstance"
              inputMode="numeric"
              autoComplete="username"
              placeholder="3100123456"
              value={idInstance}
              onChange={(e) => setIdInstance(e.target.value)}
              aria-invalid={Boolean(errors.idInstance)}
              aria-describedby={errors.idInstance ? `${id}-idInstance-error` : undefined}
              className={inputClass}
              autoFocus
            />
            {fieldError('idInstance')}
          </div>

          <div>
            <label htmlFor={`${id}-token`} className="mb-1.5 block px-1 text-[13px] font-medium text-fg-muted">
              apiTokenInstance
            </label>
            <div className="relative">
              <input
                id={`${id}-token`}
                name="apiTokenInstance"
                type={showToken ? 'text' : 'password'}
                autoComplete="current-password"
                spellCheck={false}
                placeholder="d75b3a66374942c5b3c019c698abc2067e151558acbd412345"
                value={apiTokenInstance}
                onChange={(e) => setApiToken(e.target.value)}
                aria-invalid={Boolean(errors.apiTokenInstance)}
                aria-describedby={errors.apiTokenInstance ? `${id}-apiTokenInstance-error` : undefined}
                className={cn(inputClass, 'pr-12')}
              />
              <button
                type="button"
                onClick={tokenVisibility.toggle}
                aria-label={showToken ? 'Скрыть токен' : 'Показать токен'}
                className="absolute inset-y-0 right-0 flex w-12 cursor-pointer items-center justify-center text-fg-muted hover:text-fg"
              >
                {showToken ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
              </button>
            </div>
            {fieldError('apiTokenInstance')}
          </div>

          <details className="group" open={Boolean(errors.apiUrl)}>
            <summary className="cursor-pointer select-none px-1 text-[13px] text-fg-muted hover:text-fg">
              Дополнительно
            </summary>
            <div className="mt-3">
              <label htmlFor={`${id}-url`} className="mb-1.5 block px-1 text-[13px] font-medium text-fg-muted">
                apiUrl
              </label>
              <input
                id={`${id}-url`}
                name="apiUrl"
                inputMode="url"
                spellCheck={false}
                value={apiUrl}
                onChange={(e) => setCustomApiUrl(e.target.value)}
                aria-invalid={Boolean(errors.apiUrl)}
                aria-describedby={errors.apiUrl ? `${id}-apiUrl-error` : undefined}
                className={inputClass}
              />
              {fieldError('apiUrl')}
            </div>
          </details>

          <label className="flex cursor-pointer items-center gap-2.5 px-1 text-sm">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 accent-(--accent)"
            />
            Запомнить на этом устройстве
          </label>
        </div>

        {mutation.isError && (
          <div role="alert" className="mt-5 flex items-start gap-2 rounded-xl bg-danger/10 px-3.5 py-3 text-sm text-danger">
            <AlertIcon size={18} className="mt-px shrink-0" />
            <span>{mutation.error.message}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={mutation.isPending}
          className="mt-6 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-accent py-3 font-medium text-white transition-colors hover:bg-accent-hover disabled:cursor-wait disabled:opacity-70"
        >
          {mutation.isPending && <Spinner />}
          {mutation.isPending ? 'Проверяем…' : 'Войти'}
        </button>
      </form>
    </main>
  )
}
