/**
 * The toolbar's period filter: the range it opens on, what falls inside it, and the pair of
 * controls that change it.
 *
 * One file because the three pieces only make sense together — the opening range is chosen
 * for how the preset dropdown will name it, and the field is that range read back.
 */

import {
  DateFormatPreset,
  DateRangePicker,
  DateRangePickerSize,
  DateRangePreset,
  type DateRange,
} from '@juspay/blend-design-system'

import { dayStart, formatRange } from '../pacb/dates'

/**
 * The presets the dropdown offers, in order.
 *
 * Deliberately not Blend's default list, which leads with Last 30 Minutes / 1 Hour /
 * 6 Hours / 24 Hours (`DateRangePicker/utils.ts:4243`). A ledger entry is a day's business:
 * sub-day windows would return nothing but still take the top four rows of the menu, which
 * is where the eye lands first. `DateRangePreset` has no six-month member, so the old chip's
 * "Past 6 Months" has no preset of its own — Last 3 Months and Last 12 Months bracket it.
 */
const PRESETS = [
  DateRangePreset.TODAY,
  DateRangePreset.YESTERDAY,
  DateRangePreset.LAST_7_DAYS,
  DateRangePreset.LAST_30_DAYS,
  DateRangePreset.THIS_MONTH,
  DateRangePreset.LAST_MONTH,
  DateRangePreset.LAST_3_MONTHS,
  DateRangePreset.LAST_12_MONTHS,
]

/** "Oct 19 – Nov 17, 2026 · 30 days" — the house format, shared with PACB (dates.ts). */
const RANGE_FORMAT = {
  preset: DateFormatPreset.CUSTOM,
  customFormat: ({ startDate, endDate }: DateRange) => formatRange(startDate, endDate),
}

/**
 * The range the page opens on: Last 12 months, widened if anything on file is older.
 *
 * Twelve months rather than the chip's old "Past 6 Months" for two reasons. It is a preset
 * the rail offers, so the dropdown and the field open telling one story — and Blend decides
 * which preset a range *is* by rounding its length to the nearest 30 days
 * (`DateRangePicker/utils.ts:4188`), so a range that is nearly-but-not-quite a preset gets
 * that preset's name over dates that disagree with it. And it is the longest window on the
 * rail, which is what keeps it honest: a shorter default would start hiding rows as the
 * clock moved past fixed entry dates, and a filter that hides rows before anyone has
 * touched it reads as a bug rather than a choice.
 *
 * The floor still gives way to an older row, because wrong-looking beats hidden: the label
 * degrades to "Custom" while every row stays on screen. The ceiling is today rather than
 * the newest row because a new entry is stamped `new Date()` (use-ledger.ts:74) — stop the
 * range short of today and recording one makes it vanish on the way in.
 */
export function openingRange(...rows: readonly { date: string }[][]): DateRange {
  const today = new Date()
  const yearAgo = new Date(today)
  yearAgo.setFullYear(yearAgo.getFullYear() - 1)
  const start = rows
    .flat()
    .reduce((earliest, row) => Math.min(earliest, dayStart(new Date(row.date))), dayStart(yearAgo))
  return { startDate: new Date(start), endDate: today }
}

/**
 * Whole calendar days, both ends inclusive — the same reading of a range as PACB's
 * `daysIn`. Compared at day boundaries on purpose: rows carry a time of day and the picker
 * hands back midnight, so comparing the raw timestamps would drop everything recorded after
 * 00:00 on the last day of the range.
 */
export function withinRange(iso: string, { startDate, endDate }: DateRange) {
  const day = dayStart(new Date(iso))
  return day >= dayStart(startDate) && day <= dayStart(endDate ?? startDate)
}

/**
 * Two controls, not one: a preset dropdown and the range itself.
 *
 * The picker's own field rather than a `ButtonV2` trigger like PACB's header range
 * (`pacb/kit.tsx`), because the presets ride on it. `DateRangePicker.tsx:1211` renders the
 * preset dropdown only when no custom trigger is given — hand it a button and the presets
 * are silently dropped, leaving a calendar as the only way to say "last 30 days".
 *
 * V1 `DateRangePicker` because Blend ships no V2 (AGENTS.md rule 4).
 */
export function PeriodFilter({
  value,
  onChange,
}: {
  value: DateRange
  onChange: (range: DateRange) => void
}) {
  return (
    <div className="inline-flex shrink-0">
      <DateRangePicker
        value={value}
        onChange={onChange}
        size={DateRangePickerSize.SMALL}
        formatConfig={RANGE_FORMAT}
        customPresets={PRESETS}
        showPresets
        showDateTimePicker={false}
        popoverConfig={{ align: 'end' }}
      />
    </div>
  )
}
