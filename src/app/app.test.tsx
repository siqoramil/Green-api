import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useSessionStore } from '@/entities/session'
import { defined } from '@/test/utils'
import { App } from './app'

const ID = '3100123456'
const TOKEN = 'd75b3a66374942c5b3c019c698abc2067e151558acbd412345'

/** Minimal in-memory fake of the GREEN-API endpoints used by the app. */
function createFakeGreenApi() {
  const queue: Array<{ receiptId: number; body: unknown }> = []
  let receipt = 0
  const sent: Array<{ chatId: string; message: string }> = []

  const json = (body: unknown, status = 200) => Promise.resolve(new Response(JSON.stringify(body), { status }))

  const fetchMock = vi.fn((url: string, init?: RequestInit): Promise<Response> => {
    const { pathname } = new URL(url)
    const [, , method] = pathname.split('/')

    if (!pathname.includes(TOKEN)) return json({}, 401)

    switch (method) {
      case 'getStateInstance':
        return json({ stateInstance: 'authorized' })
      case 'checkAccount': {
        const { phoneNumber } = JSON.parse(String(init?.body))
        return json(phoneNumber === 79991234567 ? { exist: true, chatId: '10000000' } : { exist: false, chatId: '' })
      }
      case 'sendMessage': {
        const payload = JSON.parse(String(init?.body))
        sent.push(payload)
        return json({ idMessage: `out-${sent.length}` })
      }
      case 'receiveNotification': {
        const next = queue.shift()
        if (next) return json(next)
        // emulate long polling without blocking the test
        return new Promise((resolve, reject) => {
          const timer = setTimeout(() => resolve(new Response('null')), 20)
          init?.signal?.addEventListener('abort', () => {
            clearTimeout(timer)
            reject(new DOMException('Aborted', 'AbortError'))
          })
        })
      }
      case 'deleteNotification':
        return json({ result: true })
      default:
        return json({}, 404)
    }
  })

  return {
    fetchMock,
    sent,
    push: (body: unknown) => queue.push({ receiptId: ++receipt, body }),
  }
}

let api: ReturnType<typeof createFakeGreenApi>

beforeEach(() => {
  api = createFakeGreenApi()
  vi.stubGlobal('fetch', api.fetchMock)
  useSessionStore.setState({ credentials: null, remember: false })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('end-to-end scenario from the assignment', () => {
  it('logs in, creates a chat by phone, sends a message and shows the reply', async () => {
    const user = userEvent.setup()
    render(<App />)

    // 1. Credentials
    await user.type(screen.getByLabelText('idInstance'), ID)
    await user.type(screen.getByLabelText('apiTokenInstance'), TOKEN)
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    // credentials are kept in sessionStorage by default, not localStorage
    await screen.findAllByRole('button', { name: 'Новый чат' })
    expect(sessionStorage.getItem('green-max:session')).toContain(ID)
    expect(localStorage.getItem('green-max:session')).toBeNull()

    // 2. New chat by phone number
    await user.click(defined(screen.getAllByRole('button', { name: 'Новый чат' })[0]))
    await user.type(screen.getByLabelText('Номер телефона получателя'), '+7 (999) 123-45-67')
    await user.click(screen.getByRole('button', { name: 'Создать чат' }))

    const chat = await screen.findByRole('region', { name: 'Чат с +7 999 123-45-67' })

    // 3. Send a text message
    await user.type(within(chat).getByLabelText('Сообщение'), 'Привет из GREEN-API{Enter}')
    await waitFor(() => expect(api.sent).toEqual([{ chatId: '10000000', message: 'Привет из GREEN-API' }]))
    expect(within(chat).getByText('Привет из GREEN-API')).toBeInTheDocument()
    await within(chat).findByRole('img', { name: 'Отправлено' })

    // 4–5. Recipient replies in MAX → the reply appears in the chat
    api.push({
      typeWebhook: 'outgoingMessageStatus',
      timestamp: Math.floor(Date.now() / 1000),
      chatId: '10000000',
      idMessage: 'out-1',
      status: 'read',
    })
    api.push({
      typeWebhook: 'incomingMessageReceived',
      timestamp: Math.floor(Date.now() / 1000),
      idMessage: 'in-1',
      senderData: { chatId: '10000000', chatName: '', senderName: 'Иван', senderPhoneNumber: 79991234567 },
      messageData: { typeMessage: 'textMessage', textMessageData: { textMessage: 'Привет! Получил 👍' } },
    })

    expect(await within(chat).findByText('Привет! Получил 👍')).toBeInTheDocument()
    await within(chat).findByRole('img', { name: 'Прочитано' })

    // History follows the "remember me" choice (session only here) and is wiped on logout
    await waitFor(() => expect(sessionStorage.getItem(`green-max:chats:${ID}`)).toContain('Получил'))
    expect(localStorage.getItem(`green-max:chats:${ID}`)).toBeNull()
    await user.click(screen.getByRole('button', { name: `Выйти (инстанс ${ID})` }))
    expect(await screen.findByRole('button', { name: 'Войти' })).toBeInTheDocument()
    expect(sessionStorage.getItem('green-max:session')).toBeNull()
    expect(sessionStorage.getItem(`green-max:chats:${ID}`)).toBeNull()
  })

  it('shows an error for a phone without a MAX account', async () => {
    useSessionStore.getState().login(
      { idInstance: ID, apiTokenInstance: TOKEN, apiUrl: 'https://3100.api.green-api.com' },
      false,
    )
    const user = userEvent.setup()
    render(<App />)

    await user.click(defined((await screen.findAllByRole('button', { name: 'Новый чат' }))[0]))
    await user.type(screen.getByLabelText('Номер телефона получателя'), '79990000000')
    await user.click(screen.getByRole('button', { name: 'Создать чат' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Этот номер не зарегистрирован в MAX')
  })

  it('rejects wrong credentials', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('idInstance'), ID)
    await user.type(screen.getByLabelText('apiTokenInstance'), 'wrongtoken0000000000000')
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Неверный idInstance или apiTokenInstance')
    expect(sessionStorage.getItem('green-max:session')).toBeNull()
  })

  it('does not send the token to a non GREEN-API host', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.type(screen.getByLabelText('idInstance'), ID)
    await user.type(screen.getByLabelText('apiTokenInstance'), TOKEN)
    await user.click(screen.getByText('Дополнительно'))
    const apiUrl = screen.getByLabelText('apiUrl')
    await user.clear(apiUrl)
    await user.type(apiUrl, 'https://attacker.example.com')
    await user.click(screen.getByRole('button', { name: 'Войти' }))

    expect(screen.getByText('Разрешены только адреса https://*.green-api.com')).toBeInTheDocument()
    expect(api.fetchMock).not.toHaveBeenCalled()
  })
})
