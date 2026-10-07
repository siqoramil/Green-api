const timeFormatter = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' })
const dayMonthFormatter = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' })
const fullDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', {
  day: '2-digit',
  month: '2-digit',
  year: '2-digit',
})
const weekdayFormatter = new Intl.DateTimeFormat('ru-RU', { weekday: 'short' })

const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
const DAY_MS = 86_400_000

const daysBetween = (a: Date, b: Date) =>
  Math.round((startOfDay(a).getTime() - startOfDay(b).getTime()) / DAY_MS)

export const formatTime = (timestamp: number): string => timeFormatter.format(timestamp)

export const isSameDay = (a: number, b: number): boolean =>
  startOfDay(new Date(a)).getTime() === startOfDay(new Date(b)).getTime()

/** Label for the chat list: time for today, weekday within a week, otherwise a date. */
export function formatChatListDate(timestamp: number, now = Date.now()): string {
  const diff = daysBetween(new Date(now), new Date(timestamp))
  if (diff <= 0) return formatTime(timestamp)
  if (diff === 1) return 'вчера'
  if (diff < 7) return weekdayFormatter.format(timestamp)
  return shortDateFormatter.format(timestamp)
}

/** Separator label inside a conversation. */
export function formatDayDivider(timestamp: number, now = Date.now()): string {
  const diff = daysBetween(new Date(now), new Date(timestamp))
  if (diff === 0) return 'Сегодня'
  if (diff === 1) return 'Вчера'
  return new Date(timestamp).getFullYear() === new Date(now).getFullYear()
    ? dayMonthFormatter.format(timestamp)
    : fullDateFormatter.format(timestamp)
}
