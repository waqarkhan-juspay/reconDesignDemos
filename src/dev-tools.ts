/**
 * The in-app development tools, and whether this build shows them.
 *
 * Both were off on 2026-09-22 for a demo and back on the same day. Flip either to `false`
 * to clear it out again; nothing is uninstalled and no code is deleted.
 *
 * They live here rather than in `src/main.tsx` because `SHOW_DIALKIT` is read in three
 * places: main.tsx mounts (or does not mount) `DialRoot`, and the two dial panels under
 * `src/pages/create-report-config/` have to know as well. A panel nobody can open still
 * *reads* its persisted value, so hiding the launcher alone would leave a browser pinned to
 * whatever version it last chose, with no UI left to change it back — see the note on the
 * clamp in fields-layout.tsx.
 */

/** DialKit — the version/spacing panels, launched from the button at top right. */
export const SHOW_DIALKIT = true

/**
 * Mesurer — the measure-and-annotate inspector, toggled with `M`.
 *
 * Read in main.tsx *inside* the condition that guards its `lazy()` factory, not beside it:
 * the `import()` has to sit in the dead branch or it survives into the build as its own
 * 365 KB chunk however dead the JSX is. Same reason `import.meta.env.DEV` is spelled out
 * there rather than here.
 *
 * Off since 2026-10-01 while InspectKit (below) is tried in its place. Flip back to `true`.
 */
export const SHOW_MESURER = false

/**
 * InspectKit — Figma-style redlines, rulers with guides (Shift+R), layout grids (Shift+G)
 * and a spacing lint (Shift+L). Measuring is Option-hover, so it never takes a plain click.
 *
 * Same `lazy()` bargain as Mesurer in main.tsx: the `import()` sits in the dead branch so
 * none of it reaches the build. Added on the PACB branch on 2026-10-01.
 */
export const SHOW_INSPECTKIT = true
