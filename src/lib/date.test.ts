import { describe, expect, it } from 'vitest'
import {
  formatShortDate,
  getRecentDates,
  isDateBefore,
  parseLocalIsoDate,
  toLocalIsoDate
} from './date'

describe('local date helpers', () => {
  it('formats local dates without converting through UTC', () => {
    expect(toLocalIsoDate(new Date(2026, 9, 5, 23, 30))).toBe('2026-10-05')
    expect(toLocalIsoDate(new Date(2026, 0, 1, 0, 5))).toBe('2026-01-01')
  })

  it('builds a seven-day range across month and year boundaries', () => {
    const dates = getRecentDates(7, new Date(2025, 0, 2, 12))
    expect(dates).toEqual([
      '2024-12-27',
      '2024-12-28',
      '2024-12-29',
      '2024-12-30',
      '2024-12-31',
      '2025-01-01',
      '2025-01-02'
    ])
  })

  it('parses dates at local noon to avoid daylight-saving shifts', () => {
    const parsed = parseLocalIsoDate('2026-03-08')
    expect(parsed.getFullYear()).toBe(2026)
    expect(parsed.getMonth()).toBe(2)
    expect(parsed.getDate()).toBe(8)
    expect(parsed.getHours()).toBe(12)
  })

  it('formats short dates and compares date strings', () => {
    expect(formatShortDate('2026-10-05')).toBe('10/5')
    expect(isDateBefore('2026-10-04', '2026-10-05')).toBe(true)
    expect(isDateBefore('2026-10-05', '2026-10-05')).toBe(false)
  })
})
