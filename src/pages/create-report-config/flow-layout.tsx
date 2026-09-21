import { useDialKitController } from 'dialkit'
import type { ReactNode } from 'react'

/**
 * `v1` — the flow as shipped: five steps, and grouping is a property of the Fields table
 *        (the "Group by" bar, on layout version 7 of that step — see fields-layout.tsx).
 * `v2` — six steps, with **Grouping** inserted before Fields: the field vocabulary drawn as
 *        its own question, where picking a tag groups the report by it.
 *
 * The two answer the same question in opposite places, which is the point of having the dial.
 * GroupByBar's own note argues for v1 — grouping is a property of the columns, and a rule
 * stated in a step of its own is a rule you have to hold in your head while you pick them.
 * v2 is the counter-proposal: it makes the shape of the report the first thing you decide,
 * and the columns follow from it. Worth seeing side by side rather than asserted.
 */
export type FlowVersion = 'v1' | 'v2'

/**
 * A stable panel id, for the same reason fields-layout.tsx carries one: without it DialKit
 * mints `<name>-<useId()>` per mount and every visit retains its own copy of the values.
 */
const PANEL_ID = 'report-flow'

/** Named here rather than derived from the id, so renaming the id cannot orphan saved values. */
const PERSIST_KEY = 'dialkit:report-flow'

/**
 * The flow's own dial panel: which set of steps to walk.
 *
 * Unlike FieldsLayoutDials this wraps the whole flow rather than one step, because the thing
 * it changes *is* the step list — a panel that only existed on one step could not add a step
 * before it. So this panel is on screen for the whole flow, which is also the honest place
 * for it: it is a question about the flow, not about a page inside it.
 */
export function FlowDials({ children }: { children: (version: FlowVersion) => ReactNode }) {
  const { values } = useDialKitController(
    'Report flow',
    {
      version: {
        type: 'select',
        options: [
          { value: 'v1', label: 'Version 1 — Group by on the Fields table' },
          { value: 'v2', label: 'Version 2 — Grouping step before Fields' },
        ],
        default: 'v1',
      },
    },
    { id: PANEL_ID, persist: { key: PERSIST_KEY } },
  )

  // Narrowed by hand: DialKit types a select as a plain string, and a stored value from a
  // version that no longer exists should fall back to the shipped flow.
  return children(values.version === 'v2' ? 'v2' : 'v1')
}
