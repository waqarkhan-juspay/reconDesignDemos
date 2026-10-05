/**
 * How PACB writes a date range — the picker's trigger, and anywhere a page names its period.
 *
 * Compact, then its length: "Sep 1 – 30, 2026 · 30 days". The month and year are written
 * once when both ends share them, so the range reads as one span rather than two dates:
 *
 *   same month   Sep 1 – 30, 2026 · 30 days
 *   same year    Sep 22 – Oct 3, 2026 · 12 days
 *   across years Dec 28, 2026 – Jan 3, 2027 · 7 days
 *   one day      Sep 1, 2026 · 1 day
 *
 * The length counts calendar days inclusively — Sep 22 to Sep 29 is 8 — because the picker
 * selects whole days and both ends are in the range. Chosen on 2026-10-01.
 */

const month = (date: Date) => date.toLocaleDateString('en-US', { month: 'short' })

/** Midnight of the date's own calendar day, so a range ending 23:59:59 still counts whole days. */
const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const DAY_MS = 24 * 60 * 60 * 1000

export function daysIn(start: Date, end: Date) {
  return Math.round((dayStart(end).getTime() - dayStart(start).getTime()) / DAY_MS) + 1
}

export function formatRange(start: Date, end?: Date) {
  const startDay = start.getDate()
  const startYear = start.getFullYear()
  if (!end || daysIn(start, end) <= 1) return `${month(start)} ${startDay}, ${startYear} · 1 day`

  const endDay = end.getDate()
  const endYear = end.getFullYear()
  const span =
    startYear !== endYear
      ? `${month(start)} ${startDay}, ${startYear} – ${month(end)} ${endDay}, ${endYear}`
      : start.getMonth() !== end.getMonth()
        ? `${month(start)} ${startDay} – ${month(end)} ${endDay}, ${endYear}`
        : `${month(start)} ${startDay} – ${endDay}, ${endYear}`
  return `${span} · ${daysIn(start, end)} days`
}
