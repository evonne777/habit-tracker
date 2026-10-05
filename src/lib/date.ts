const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function toLocalIsoDate(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalIsoDate(value: string): Date {
  if (!ISO_DATE_PATTERN.test(value)) {
    throw new Error(`Invalid ISO date: ${value}`)
  }

  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12)
}

export function getRecentDates(count: number, today = new Date()): string[] {
  const normalizedToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 12)
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(normalizedToday)
    date.setDate(normalizedToday.getDate() - (count - 1 - index))
    return toLocalIsoDate(date)
  })
}

export function isDateBefore(left: string, right: string): boolean {
  return left < right
}

export function formatFullDate(value: string): string {
  const date = parseLocalIsoDate(value)
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long'
  }).format(date)
}

export function formatShortDate(value: string): string {
  const date = parseLocalIsoDate(value)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(value))
}

export function getDateSwitchDelay(now = new Date()): number {
  const nextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
  return Math.max(1000, nextDay.getTime() - now.getTime())
}
