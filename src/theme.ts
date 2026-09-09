import {
  FOUNDATION_THEME,
  getDirectoryTokens,
  getTableToken,
  type ComponentTokenType,
  type DirectoryTokenType,
  type ResponsiveDirectoryTokens,
  type ResponsiveTableTokens,
  type ResponsiveTabsV2Tokens,
} from '@juspay/blend-design-system'
import { TABSV2_TOKENS } from './tokens/TabsV2'

/**
 * Component token overrides — the only mechanism this app uses to restyle a Blend
 * component. No global CSS, no `!important`, nothing anchored on Blend's internal DOM.
 *
 * ⚠️ Overrides REPLACE, they do not merge. The docs site says partial `BUTTONV2` overrides
 * are "merged on top of the active light or dark defaults"; the installed 0.0.37 does not
 * do that. All 81 slots in `initComponentTokens.ts` resolve as
 * `componentTokens.X ?? getXTokens(...)`, and there is no deep-merge helper in the package
 * (rule 2 — source is truth, not the docs). So every override here starts from the
 * component's own getter and edits one path. Handing in a partial object would discard the
 * component's whole token tree, dark variant included.
 *
 * ⚠️ Overrides are also GLOBAL. A slot set here applies to every instance in the app. Where
 * only one instance should move, use `scopedTokens` below instead.
 */

/**
 * A breakpoint-keyed token tree, edited one breakpoint at a time.
 *
 * Mapped over the keys rather than naming `sm` and `lg`, so a third breakpoint could not
 * silently keep the default.
 */
const perBreakpoint = <T,>(tokens: Record<string, T>, edit: (token: T) => T) =>
  Object.fromEntries(Object.entries(tokens).map(([bp, token]) => [bp, edit(token)]))

/**
 * Nav rows at 500 — Blend's own value (directory.tokens.ts:146,257) and AGENTS.md rule 10's
 * weight for body copy.
 *
 * They spent a while at 400: the rail looked heavy and weight was the obvious lever. The
 * cause turned out to be macOS subpixel antialiasing thickening every stem, fixed with
 * grayscale smoothing, and with that gone 500 reads correctly. The override stays rather
 * than reverting to Blend's default so the value is explicit and the reasoning is a comment
 * rather than a bisect.
 *
 * Section labels keep Blend's 600 — they are headings, and the contrast is the point.
 */
const DIRECTORY = perBreakpoint(
  getDirectoryTokens(FOUNDATION_THEME) as unknown as Record<string, DirectoryTokenType>,
  (token) => ({
    ...token,
    section: {
      ...token.section,
      itemList: {
        ...token.section.itemList,
        item: {
          ...token.section.itemList.item,
          fontWeight: FOUNDATION_THEME.font.weight[500],
        },
      },
    },
  }),
) as unknown as ResponsiveDirectoryTokens

/**
 * The table's outer radius: 12, not Blend's 8.
 *
 * 12 is what the design specifies and what DESIGN.md §7 asks of a card-like surface. This
 * one is reachable because DataTable reads the token to build its inline style
 * (`borderRadius: tableToken.dataTable.borderRadius`, DataTable.tsx:1581) — so setting the
 * token sets the inline style, and no CSS has to out-shout it.
 */
const TABLE = perBreakpoint(
  getTableToken(FOUNDATION_THEME) as unknown as Record<
    string,
    { dataTable: { borderRadius: unknown } }
  >,
  (token) => ({
    ...token,
    dataTable: { ...token.dataTable, borderRadius: FOUNDATION_THEME.border.radius[12] },
  }),
) as unknown as ResponsiveTableTokens

/**
 * Only slots that actually override something are wired.
 *
 * src/tokens/ carries a full tree for all 14 V2 components this app renders, but a tree
 * sitting at Blend's own values earns nothing by being handed back to ThemeProvider — and
 * costs something, because these are light values and passing them replaces the dark
 * defaults too. Edit a value in that file, then add its slot here.
 */
export const componentTokens: ComponentTokenType = { DIRECTORY, TABLE }

/**
 * Tabs with the design's 24px between triggers, for the ONE tab set that wants it.
 *
 * `tabList.gap` is a single value in the token tree — unlike `backgroundColor`,
 * `borderRadius` and `padding`, it is not keyed by variant or size. Setting it globally
 * would also space out the boxed All / Reconciliation / File Summary tabs, which the design
 * keeps tight inside their track.
 *
 * So it is scoped by React instead of by CSS selector: `useResponsiveTokens` reads
 * `useContext(ThemeContext)` (useResponsiveTokens.ts:69), which means a ThemeProvider
 * nested around one subtree gives that subtree its own tokens. Wrap only the section tabs
 * and nothing else moves.
 */
export const sectionTabsTokens: ComponentTokenType = {
  ...componentTokens,
  TABSV2: perBreakpoint(
    TABSV2_TOKENS as unknown as Record<string, { tabList: { gap: unknown } }>,
    (token) => ({ ...token, tabList: { ...token.tabList, gap: FOUNDATION_THEME.unit[24] } }),
  ) as unknown as ResponsiveTabsV2Tokens,
}
