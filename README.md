# MAX Web · GREEN-API

Веб-клиент мессенджера **MAX** для отправки и получения текстовых сообщений через [GREEN-API](https://green-api.com/max).
Интерфейс повторяет [web.max.ru](https://web.max.ru/): список чатов слева, переписка справа, светлая и тёмная темы, адаптивная вёрстка.

> Тестовое задание на должность «Фронтенд разработчик React».

- **Демо:** _ссылка на GitHub Pages_
- **Видео / скриншоты:** _ссылка_

## Возможности

| Сценарий из задания | Реализация |
| --- | --- |
| Ввод учётных данных `idInstance`, `apiTokenInstance` | Форма входа с валидацией и проверкой инстанса через `getStateInstance` (видно, если инстанс не авторизован, спит и т. п.) |
| Ввод номера получателя и создание чата | Номер нормализуется (`+7 (999) 123-45-67`, `8 999…` → `79991234567`), наличие MAX проверяется через `CheckAccount`, полученный `chatId` используется для отправки |
| Отправка текстового сообщения | [`SendMessage`](https://green-api.com/v3/docs/api/sending/SendMessage/), оптимистичное отображение, статусы ⏱ → ✓ → ✓✓ → прочитано, повтор при ошибке |
| Получение ответа | [HTTP API](https://green-api.com/v3/docs/api/receiving/technology-http-api/): long polling `ReceiveNotification` → обработка → `DeleteNotification` |

Дополнительно:

- входящие от новых собеседников автоматически создают чат, счётчик непрочитанных, поиск по чатам;
- сообщения, отправленные с телефона, тоже появляются в переписке (`outgoingMessageReceived`);
- индикатор соединения («Подключение…»), повторы с экспоненциальной задержкой при обрыве сети;
- скелетоны и спиннеры при загрузке, кнопка «к последним сообщениям» со счётчиком новых;
- Enter — отправить, Shift+Enter — новая строка, лимит 4000 символов;
- история хранится локально отдельно для каждого инстанса;
- клавиатурная навигация, ARIA-разметка, `prefers-reduced-motion`.

## Быстрый старт

Требования: **Node.js ≥ 22** (рекомендуется 24, см. `.nvmrc`) и **Yarn 1.x**.

```bash
git clone <repo-url>
cd Test_Green-API
yarn install
yarn dev            # http://localhost:5173
```

### Переменные окружения (необязательно)

Чтобы не вводить учётные данные при каждом запуске `yarn dev`, скопируйте пример и заполните его:

```bash
cp .env.example .env.local
```

| Переменная | Описание |
| --- | --- |
| `VITE_GREEN_API_ID_INSTANCE` | `idInstance` для автозаполнения формы входа |
| `VITE_GREEN_API_TOKEN_INSTANCE` | `apiTokenInstance` для автозаполнения формы входа |
| `VITE_GREEN_API_URL` | `apiUrl`, если отличается от стандартного |

> **Только для разработки.** Vite встраивает `VITE_*` прямо в JS-бандл, поэтому значения читаются
> исключительно под `import.meta.env.DEV` и вырезаются из production-сборки. Дополнительно сборка
> **падает с ошибкой**, если токен из `.env` обнаружится хоть в одном выходном файле.
> Файлы `.env*` в git не попадают (кроме `.env.example`). В production пользователь вводит данные в форме.

Production-сборка:

```bash
yarn build          # результат в dist/
yarn preview        # http://localhost:4173
```

Docker (nginx с security-заголовками, непривилегированный пользователь):

```bash
docker build -t max-web .
docker run --rm -p 8080:8080 max-web   # http://localhost:8080
```

### Подготовка инстанса GREEN-API

1. Зарегистрируйтесь в [личном кабинете](https://console.green-api.com), создайте инстанс MAX и авторизуйте его по QR-коду ([инструкция](https://green-api.com/v3/docs/before-start/)).
2. В настройках инстанса включите:
   - «Получать уведомления о входящих сообщениях и файлах» — обязательно;
   - «Получать уведомления о статусах отправки/доставки/прочтения» — для галочек;
   - «Получать уведомления о сообщениях, отправленных с телефона» — по желанию.
3. Поле **URL для получения уведомлений (webhookUrl) должно быть пустым** — иначе HTTP API не отдаёт уведомления.
4. В приложении введите `idInstance` и `apiTokenInstance`. `apiUrl` подставляется автоматически
   (`https://{первые 4 цифры idInstance}.api.green-api.com`), при необходимости его можно изменить в блоке «Дополнительно».

> MAX через GREEN-API поддерживает номера РФ (`+7`) и РБ (`+375`).

## Скрипты

| Команда | Описание |
| --- | --- |
| `yarn dev` | dev-сервер Vite |
| `yarn build` | проверка типов + production-сборка |
| `yarn typecheck` | `tsc -b` |
| `yarn lint` | Oxlint (correctness, suspicious, react, jsx-a11y, import, vitest), предупреждения = ошибки |
| `yarn test` / `yarn test:watch` | Vitest + Testing Library |
| `yarn validate` | typecheck + lint + test |

## Стек

- **React 19** + **React Compiler**, **TypeScript** в максимально строгом режиме: `strict`,
  `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `noImplicitOverride`, `noImplicitReturns`
- **Vite 8**, алиас `@/` → `src/`
- **TanStack Query** — мутации (вход, проверка номера, отправка) со статусами загрузки и ошибок
- **Zustand** — сессия и чаты (`persist` в Web Storage)
- **Tailwind CSS v4** — дизайн-токены в CSS-переменных, светлая/тёмная тема
- **Oxlint**, **Vitest**, **Testing Library**, **happy-dom**
- GitHub Actions: CI (типы, линт, тесты, сборка, `yarn audit`) и деплой на GitHub Pages

## Архитектура

Структура по мотивам Feature-Sliced Design; каждый модуль экспортирует публичный API через `index.ts`,
импорты идут только «сверху вниз»: `app → features → entities → shared`.

```
src/
├── app/                      # композиция: провайдеры, layout, ErrorBoundary, lazy-загрузка
├── features/
│   ├── auth/                 # форма входа
│   ├── chat-list/            # сайдбар, поиск, создание чата по номеру, скелетон
│   ├── conversation/         # переписка: лента, пузыри, поле ввода, отправка
│   └── notifications/        # цикл long polling
├── entities/
│   ├── chat/                 # модель, parseNotification, Zustand-store чатов
│   └── session/              # учётные данные, API-клиент в контексте, статус соединения
└── shared/
    ├── api/                  # типизированный клиент GREEN-API
    ├── config/               # переменные окружения (dev-only)
    ├── hooks/                # generic-хуки: useStickToBottom, useFilteredList, useToggle
    ├── lib/                  # телефоны, даты, валидация, безопасный linkify
    └── ui/                   # иконки, Avatar, Spinner, Skeleton
```

### Типизация и хуки

- **API-клиент обобщён по карте эндпоинтов** (`shared/api/endpoints.ts`): `request<N extends EndpointName>` выводит тело,
  query, path и тип ответа из имени метода — опечатка в имени или неверный payload не компилируются.
- **Явные generic-параметры у всех хуков:** `useState<string>('')`, `useRef<HTMLDivElement>(null)`,
  `useMutation<Credentials, Error, LoginVariables>`, `useSessionStore<boolean>(…)`, `useChatStore<T>(selector)`.
- **Собственные generic-хуки:**
  - `useApiMutation<TVariables, TData>` — `useMutation` с внедрённым API-клиентом инстанса;
  - `useStickToBottom<TElement, TItem>` — «липкий» скролл чата со счётчиком пропущенных сообщений;
  - `useFilteredList<T>` — фильтрация с `useDeferredValue`;
  - `useChatStore<T>` / `useChatStoreShallow<T>` и готовые селекторы (`useChat`, `useChatMessages`, `useSortedChats`…) —
    каждая строка списка подписана только на своё последнее сообщение.
- **Generic-утилиты:** `createStrictContext<T>` (контекст + хук, падающий вне провайдера), `createTypedStorage<T>`
  (Web Storage с проверкой type guard при чтении), `shape<S>` (guard, тип которого выводится из схемы), `compact<T>`, `assertNever`.
- Бизнес-логика вынесена из компонентов в хуки: `useLogin`, `useCreateChat`, `useSendMessage`, `useNotificationPolling`.
- Типы проверяются и тестами: `expectTypeOf` и `@ts-expect-error` (через `tsc`).

### Получение сообщений

```
┌────────────────────┐   null (таймаут 20 с)    ┌──────────────┐
│ receiveNotification├─────────────────────────►│ следующий    │
└─────────┬──────────┘                          │ запрос       │
          │ уведомление                         └──────────────┘
          ▼
 parseNotification (чистая функция, проверка формы в рантайме)
          ▼
 chatStore.applyEvent (идемпотентно: дедупликация по idMessage)
          ▼
 deleteNotification (в finally — «битое» уведомление не блокирует очередь)
```

- Один последовательный цикл на инстанс, отменяется через `AbortController` при выходе или размонтировании.
- Если `deleteNotification` не удался, уведомление придёт повторно — это безопасно благодаря идемпотентности store.
- Ошибки сети → статус `offline` и повтор с backoff 1 → 30 с; быстрый `getStateInstance` при старте сразу показывает статус соединения, не дожидаясь первого long-poll.

### Отправка сообщений

Сообщение сразу добавляется со статусом `pending` и локальным id. Ответ `SendMessage` заменяет id на `idMessage`.
Если вебхук `outgoingAPIMessageReceived`/`outgoingMessageStatus` пришёл раньше HTTP-ответа, store объединяет записи без дублей.
Статусы только «растут» (`sent → delivered → read`), поэтому вебхуки, пришедшие не по порядку, не откатывают галочки.

## Безопасность

- **Токен уходит только в GREEN-API.** `apiUrl` принимается только вида `https://*.green-api.com` (без пути, логина и параметров);
  проверка есть и в форме, и в конструкторе API-клиента, и в `connect-src` политики CSP.
- **Content-Security-Policy** добавляется в production-сборку (`default-src 'self'`, без inline-скриптов и `eval`, `object-src 'none'`, `base-uri 'none'`).
  В `deploy/nginx.conf` — те же заголовки плюс `frame-ancestors 'none'`, `X-Frame-Options`, `nosniff`, HSTS, `Permissions-Policy`.
- **Токен не попадает в бандл:** `.env` используется только в dev-режиме, сборка проверяет выходные файлы на утечку секретов.
- **Хранение секретов:** по умолчанию учётные данные и история — в `sessionStorage` (стираются при закрытии вкладки);
  `localStorage` — только при явном «Запомнить на этом устройстве». «Выйти» удаляет токен и локальную историю инстанса.
  Сохранённые данные при загрузке проходят повторную валидацию.
- **Без утечки токена в URL:** запросы идут с `referrerPolicy: 'no-referrer'`, `credentials: 'omit'`, `cache: 'no-store'`, в `index.html` — `<meta name="referrer" content="no-referrer">`;
  тексты ошибок не содержат адрес запроса.
- **XSS:** нет `dangerouslySetInnerHTML` (запрещено линтером); ссылки в сообщениях — только `http(s)`, с `rel="noopener noreferrer nofollow"`.
- **Недоверенные данные:** уведомления проверяются в рантайме, некорректные игнорируются.
- **Бережное отношение к аккаунту MAX:** повторное создание чата с известным номером не вызывает `CheckAccount` (частые проверки номеров могут привести к ограничениям).
- **Зависимости:** `yarn audit` в CI; на момент сдачи — 0 уязвимостей, deprecated-API не используются.

Ограничение клиентского приложения: токен по природе API передаётся в URL и доступен в браузере пользователя.
Для мультипользовательского продукта запросы стоит проксировать через свой backend, а уведомления получать через webhook.

## Тесты

```bash
yarn test
```

49 тестов (включая проверки типов через `expectTypeOf`): API-клиент (URL, ошибки, отмена), разбор уведомлений, store (дедупликация, порядок, статусы, гонки),
цикл опроса (удаление при ошибке обработчика, backoff), утилиты и валидация, а также интеграционный тест полного сценария из задания:
вход → новый чат по номеру → отправка → ответ собеседника и статус «прочитано» → выход с очисткой данных.

## Ограничения

- Только личные чаты и текстовые сообщения (по условию задания); другие типы показываются заглушкой «не поддерживается», группы игнорируются.
- История чата ведётся с момента входа — получение истории с сервера (`GetChatHistory`) не требовалось условием.
- Очередь уведомлений инстанса одна: если открыть приложение в нескольких вкладках, уведомления разойдутся между ними.
