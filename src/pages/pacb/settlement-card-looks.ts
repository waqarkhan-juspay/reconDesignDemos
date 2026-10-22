/**
 * How a version 3 settlement card sits on the page — the Version 3 workflow's "V3 Card" dial
 * (workflow-layout.ts). One row per look, read by both the card (SettlementCardV3.tsx) and
 * the list it sits in (PacbWorkflowV3.tsx), so a new look is one union member and one row.
 *
 * The first five restyle the design's two lines; the design's card has no edge at rest, so in
 * a long list the IDs float, and each of these gives them something to hang from:
 *
 * | Look       | At rest                                                  |
 * |------------|----------------------------------------------------------|
 * | `plain`    | nothing — the design as drawn                            |
 * | `divided`  | a hairline between cards, square corners                 |
 * | `outlined` | a gray 200 hairline round each card, gone once selected  |
 * | `tinted`   | a gray 25 fill                                           |
 * | `dot`      | the payout's colour as a dot before the ID               |
 *
 * The other six rebuild the card, in the outlined frame (the compact row between divider
 * lines instead):
 *
 * | Layout     | What leads                                                           |
 * |------------|----------------------------------------------------------------------|
 * | `amount`   | the amount, large, with the progress beside it; ID and details under |
 * | `progress` | a progress bar — settled out of all payments, in the payout colour   |
 * | `rail`     | a strip of the payout colour down the card's left edge               |
 * | `compact`  | one line: dot, shortened ID, progress, amount — half the height      |
 * | `split`    | a ticket stub: the progress as a column of its own on the right      |
 * | `tag`      | a status tag and the date over the ID and the amount                 |
 *
 * Hover and selected stay the gray 50 fill in every look.
 */
export type SettlementCardLook =
  | 'plain'
  | 'divided'
  | 'outlined'
  | 'tinted'
  | 'dot'
  | 'amount'
  | 'progress'
  | 'rail'
  | 'compact'
  | 'split'
  | 'tag'

export type LookFrame = {
  /** Rebuilds the card rather than restyling the design's two lines. */
  layout: boolean
  /** A gray 200 hairline round the card, clear once it is selected. */
  outlined: boolean
  /** Square corners, with divider lines drawn between cards by the list. */
  divided: boolean
  /** A gray 25 fill at rest. */
  tinted: boolean
  /** Px between cards in a list. */
  gap: number
}

const PLAIN: LookFrame = { layout: false, outlined: false, divided: false, tinted: false, gap: 6 }
const LAYOUT: LookFrame = { layout: true, outlined: true, divided: false, tinted: false, gap: 8 }

export const LOOKS: Record<SettlementCardLook, LookFrame> = {
  plain: PLAIN,
  divided: { ...PLAIN, divided: true, gap: 0 },
  outlined: { ...PLAIN, outlined: true, gap: 8 },
  tinted: { ...PLAIN, tinted: true },
  dot: PLAIN,
  amount: LAYOUT,
  progress: LAYOUT,
  rail: LAYOUT,
  compact: { ...LAYOUT, outlined: false, divided: true, gap: 0 },
  split: LAYOUT,
  tag: LAYOUT,
}
