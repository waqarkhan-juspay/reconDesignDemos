import { useDialKitController } from 'dialkit'
import { SHOW_DIALKIT } from '../../dev-tools'
import type { CSSProperties, ReactNode } from 'react'

/**
 * `v1` — the table first, the field vocabulary and "Add custom column" under it.
 * `v2` — the vocabulary and "Add custom column" first, the table last.
 * `v3` — v2's order on a 1200px step, everything on the table's left edge. The left/right
 *        buttons it used to own alone are now on every version — see FieldsStep — so this is
 *        v4 with the vocabulary above the table.
 * `v4` — v1's order and chrome (table first, no arrows) on v3's 1200px step.
 * `v5` — v4, with "Add custom column" moved out of the step heading and into the container,
 *        below the chips.
 * `v6` — v4's layout with the redrawn field chips (node 4861:105311): subtle rather than
 *        outlined when off, squarical rather than pill, md rather than sm, and a leading #
 *        on a selected one.
 * `v7` — v6 plus the grouping rule: an ordered "Group by" bar above the table, drawn from the
 *        columns already chosen, with the grouped columns pinned to the table's left edge.
 * `v8` — the column organiser (node 4911:111609). The table, the chip row and the step's own
 *        "Add custom column" are gone; in their place, two panes sharing one frame — the
 *        vocabulary as a searchable column on the left, the chosen columns as reorderable
 *        cards on the right. See ColumnOrganiser.tsx.
 */
export type FieldsLayoutVersion = 'v1' | 'v2' | 'v3' | 'v4' | 'v5' | 'v6' | 'v7' | 'v8'

export type FieldsLayout = {
  version: FieldsLayoutVersion
  /** Whether the step takes the wide 1200px measure (versions 3 and 4) — see index.css. */
  wide: boolean
  /**
   * Goes on the step's grid element. `rowGap` is the grid's own gap between the heading and
   * the step body; the custom properties are read further down, by the heading block in
   * index.tsx and inside FieldsStep, each with the original value as its fallback.
   */
  style: CSSProperties
}

/**
 * A stable panel id.
 *
 * Without one DialKit mints `<name>-<useId()>` on every mount, and persistence marks a panel
 * as retained — so each visit to this step would leave its own copy of the values in memory
 * after unmounting. A stable id makes every visit reuse the one entry.
 *
 * It does not keep the panel on screen: unregistering removes a panel from DialKit's list
 * whether or not it is retained. Retention only keeps the values.
 */
const PANEL_ID = 'fields-layout'

/**
 * Where the values live between reloads. Named here rather than derived from the panel id,
 * so renaming the id cannot silently orphan everyone's saved settings.
 */
const PERSIST_KEY = 'dialkit:fields-layout'

/** The action control's path — what DialKit hands `onAction` when the button is pressed. */
const RESET_ACTION = 'resetToCode'

/** Every version FieldsStep can draw. All of them stay implemented and reachable. */
const ALL_VERSION_OPTIONS: { value: FieldsLayoutVersion; label: string }[] = [
  { value: 'v1', label: 'Version 1 — table first' },
  { value: 'v2', label: 'Version 2 — fields first' },
  { value: 'v3', label: 'Version 3 — 1200px, fields first' },
  { value: 'v4', label: 'Version 4 — 1200px, table first' },
  { value: 'v5', label: 'Version 5 — v4, add button below chips' },
  { value: 'v6', label: 'Version 6 — v4, redrawn field chips' },
  { value: 'v7', label: 'Version 7 — v6, plus Group by' },
  { value: 'v8', label: 'Version 8 — column organiser' },
]

/**
 * Which of those the dial actually offers. Add an id back here to resurface it — nothing
 * else has to change, and the hidden versions are still drawn by FieldsStep.
 *
 * It also clamps the stored value below, so a browser holding a now-hidden version from an
 * earlier session draws the default rather than a layout the panel can no longer show.
 */
const VISIBLE_VERSIONS: FieldsLayoutVersion[] = ['v6', 'v8']

/**
 * The column organiser — "Version 2" in the panel below. Moved off v6 on 2026-09-22: with the
 * dials hidden (src/dev-tools.ts) the default is the only version anyone can reach, and the
 * organiser is the one this step is now about.
 */
const DEFAULT_VERSION: FieldsLayoutVersion = 'v8'

/**
 * Display names that override the labels above, so the dial numbers what it actually offers.
 * Six of the eight versions are hidden, so v6 and v8 read as "Version 1" and "Version 2"
 * rather than carrying numbers from a list nobody can see. The ids stay `v6`/`v8` — FieldsStep
 * still switches on them, and the real v1/v2 are different layouts. Delete an entry to go back
 * to the version's own label.
 */
const LABEL_OVERRIDES: Partial<Record<FieldsLayoutVersion, string>> = {
  v6: 'Version 1',
  v8: 'Version 2',
}

/**
 * The versions drawn on the wide 1200px measure — see index.css.
 *
 * v8 is deliberately NOT one of them. The wide measure exists for the table, which is the one
 * thing in this flow that does not fit the content column; the organiser does fit, and node
 * 4911:111609 draws it at exactly 960 — x 240 to 1200 on a 1440 frame, which is the flow's
 * standard measure. So v8 is the first version of this step to sit on the same column as
 * every other step in the flow, which is what the design asks for.
 */
const WIDE_VERSIONS: FieldsLayoutVersion[] = ['v3', 'v4', 'v5', 'v6', 'v7']

/**
 * The Fields step's dial panel: which layout version to draw, and every vertical gap on the
 * page. Defaults are the tuned values — version 4, with 32px from the table to the fields and
 * from the fields to "Add custom column" — so these, not the CSS fallbacks in FieldsStep, are
 * what an untouched panel draws.
 *
 * A render-prop component rather than a hook called in index.tsx, because the panel should
 * exist only on this step. DialKit removes a panel from its list when the component that
 * registered it unmounts, so mounting this only while Fields is showing is what keeps the
 * panel off the other four steps.
 */
export function FieldsLayoutDials({ children }: { children: (layout: FieldsLayout) => ReactNode }) {
  const dials = useDialKitController(
    'Fields layout',
    {
      version: {
        type: 'select',
        options: ALL_VERSION_OPTIONS.filter((option) => VISIBLE_VERSIONS.includes(option.value)).map(
          (option) => ({ ...option, label: LABEL_OVERRIDES[option.value] ?? option.label }),
        ),
        default: DEFAULT_VERSION,
      },
      spacing: {
        titleToDescription: [8, 0, 48, 4],
        headerToContent: [32, 0, 120, 4],
        tableToFields: [32, 0, 96, 4],
        betweenTagRows: [12, 0, 40, 4],
        fieldsToAddColumn: [32, 0, 64, 4],
      },
      [RESET_ACTION]: { type: 'action', label: 'Reset to code defaults' },
    },
    {
      id: PANEL_ID,
      persist: { key: PERSIST_KEY },
      /**
       * Persistence means a saved value outlives the code that set its default: change
       * `headerToContent`'s 32 above and a browser that ever dragged the slider keeps its own
       * number, because DialKit keeps a stored value over the default whenever it is still
       * valid. This is the way back. `resetValues` restores the defaults parsed from this
       * config — not the last saved values, nor the active DialKit preset — and writes them
       * to storage, so the reset itself survives a reload too. Saved presets are left alone.
       */
      onAction: (action) => {
        if (action === RESET_ACTION) dials.resetValues()
      },
    },
  )

  const { values } = dials
  const { spacing } = values

  /**
   * Narrowed by hand: DialKit types a select as a plain string, and a stored value the panel
   * no longer offers should fall back to the default layout.
   *
   * With the dials hidden the stored value is ignored outright, not just narrowed. Persistence
   * outlives the UI that wrote it: a browser that ever picked a version keeps it, and with no
   * launcher on screen there would be nothing left to change it back with — the page would
   * simply draw the wrong layout for that one person, for good. The panel is still registered
   * (the hook above runs either way), so flipping SHOW_DIALKIT back restores the saved value.
   */
  const version = !SHOW_DIALKIT
    ? DEFAULT_VERSION
    : (VISIBLE_VERSIONS as string[]).includes(values.version)
      ? (values.version as FieldsLayoutVersion)
      : DEFAULT_VERSION

  return children({
    version,
    wide: WIDE_VERSIONS.includes(version),
    style: {
      rowGap: `${spacing.headerToContent}px`,
      '--step-heading-gap': `${spacing.titleToDescription}px`,
      '--fields-table-gap': `${spacing.tableToFields}px`,
      '--fields-tag-row-gap': `${spacing.betweenTagRows}px`,
      '--fields-add-gap': `${spacing.fieldsToAddColumn}px`,
    } as CSSProperties,
  })
}
