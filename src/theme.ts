import {
  FOUNDATION_THEME,
  getDirectoryTokens,
  getKeyValuePairV2Tokens,
  getTableToken,
  type ComponentTokenType,
  type DirectoryTokenType,
  type ResponsiveDirectoryTokens,
  type ResponsiveTableTokens,
  type ResponsiveTabsV2Tokens,
} from '@juspay/blend-design-system'
import { BUTTONV2_TOKENS } from './tokens/ButtonV2'
import { DRAWER_TOKENS } from './tokens/Drawer'
import { TABSV2_TOKENS } from './tokens/TabsV2'
import { SINGLE_SELECT_V2_TOKENS } from './tokens/SingleSelectV2'
import { TAGV2_TOKENS } from './tokens/TagV2'

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

type Sides = 'top' | 'right' | 'bottom' | 'left'
type GhostButtonToken = {
  backgroundColor: { secondary: { inline: Record<'default' | 'hover' | 'active' | 'disabled', unknown> } }
  borderRadius: Record<'lg', { secondary: { inline: unknown } }>
  padding: Record<Sides, Record<'lg', { secondary: { inline: unknown } }>>
}

/**
 * A ghost button: secondary + INLINE (no border, no fill at rest), given the padding of a
 * LARGE secondary button, a radius, and a gray[50] fill on hover — so it has a real hit area
 * and a surface that answers the pointer, while still reading as the quiet action.
 *
 * blend-gap: ButtonV2Type has no ghost (primary/secondary/danger/success only), and INLINE
 * zeroes every padding (buttonV2.light.tokens.ts), which left footer Exit a 23×20 target.
 * Only the LARGE size is touched and the tokens are scoped by a nested ThemeProvider, so
 * the inline buttons elsewhere (Cc, Bcc, Save as draft) keep their shape.
 */
export const ghostButtonTokens: ComponentTokenType = {
  ...componentTokens,
  BUTTONV2: perBreakpoint(
    BUTTONV2_TOKENS as unknown as Record<string, GhostButtonToken>,
    (token) => {
      const pad = (side: Sides, value: string) => ({
        ...token.padding[side],
        lg: {
          ...token.padding[side].lg,
          secondary: { ...token.padding[side].lg.secondary, inline: value },
        },
      })
      return {
        ...token,
        backgroundColor: {
          ...token.backgroundColor,
          secondary: {
            ...token.backgroundColor.secondary,
            inline: {
              default: 'transparent',
              hover: FOUNDATION_THEME.colors.gray[50],
              active: FOUNDATION_THEME.colors.gray[100],
              disabled: 'transparent',
            },
          },
        },
        borderRadius: {
          ...token.borderRadius,
          lg: {
            ...token.borderRadius.lg,
            secondary: { ...token.borderRadius.lg.secondary, inline: FOUNDATION_THEME.border.radius[10] },
          },
        },
        // The secondary LARGE button's padding (9px / 16px on lg) plus its 1px border, so
        // Exit is exactly as tall as the Back button beside the primary action.
        padding: {
          ...token.padding,
          top: pad('top', '10px'),
          bottom: pad('bottom', '10px'),
          left: pad('left', '16px'),
          right: pad('right', '16px'),
        },
      }
    },
  ) as unknown as ComponentTokenType['BUTTONV2'],
}

type ButtonTextColors = {
  text: {
    color: { secondary: { inline: Record<'default' | 'hover' | 'active' | 'disabled', unknown> } }
  }
}

/**
 * Secondary inline buttons in gray[500] rather than Blend's gray[600], for quiet link-style
 * actions such as the email card's "Cc" / "Bcc" links.
 *
 * blend-gap: ButtonV2 takes no colour prop and omits `style`, so the only reach is the
 * token. Scoped with a nested ThemeProvider for the same reason as sectionTabsTokens — set
 * globally it would also grey out Exit and "Save as draft", which keep gray[600]. Hover
 * steps up to 600 so the link still acknowledges the pointer.
 */
export const neutralLinkTokens: ComponentTokenType = {
  ...componentTokens,
  BUTTONV2: perBreakpoint(
    BUTTONV2_TOKENS as unknown as Record<string, ButtonTextColors>,
    (token) => ({
      ...token,
      text: {
        ...token.text,
        color: {
          ...token.text.color,
          secondary: {
            ...token.text.color.secondary,
            inline: {
              default: FOUNDATION_THEME.colors.gray[500],
              hover: FOUNDATION_THEME.colors.gray[600],
              active: FOUNDATION_THEME.colors.gray[600],
              disabled: FOUNDATION_THEME.colors.gray[400],
            },
          },
        },
      },
    }),
  ) as unknown as ComponentTokenType['BUTTONV2'],
}

type TagBorderToken = {
  border: { noFill: { neutral: unknown }; subtle: { neutral: unknown } }
}

/** The design's chip hairline — `tag/borderColor/subtle/neutral`, #ECEFF3. */
const TAG_HAIRLINE = `1px solid ${FOUNDATION_THEME.colors.gray[150]}`

/**
 * The field vocabulary's chips — version 6's, and the column organiser's palette — with the
 * design's own hairline in place of Blend's.
 *
 * Node 4861:105311 sets `tag/borderColor/subtle/neutral` to #ECEFF3 — gray[150]. Blend's own
 * token is gray[200] (#E1E4EA), one step darker on the ramp. On a single chip the difference
 * is invisible; across twenty-two of them it is the difference between a field of soft
 * shapes and a grid of hard-edged boxes, which is the whole point of the subtle style.
 *
 * `noFill` takes the same value, and that one is not a nicety. The organiser's palette draws
 * an *unchosen* chip as NO_FILL (ColumnOrganiser.tsx), and Blend borders that one in
 * gray[950] — near-black, which down a column of twenty-nine reads as a stack of outlined
 * boxes rather than as a list. Node 4911:111688, the design's own default chip, is this same
 * #ECEFF3 hairline with its fill switched off, so in the design the two states differ by
 * their fill and their glyph and by nothing else.
 *
 * It reaches exactly that one chip: nothing under these tokens draws NO_FILL in a non-neutral
 * colour, and the Fields step's older round chips — the flow's only other NO_FILL — render
 * unwrapped (FieldsStep.tsx:862) and keep Blend's border.
 *
 * Scoped by a nested ThemeProvider rather than set globally, for the same reason as
 * sectionTabsTokens: SUBTLE/NEUTRAL is also the Filters step's "Optional" chip, and that one
 * keeps Blend's default. Every other value the design asks for — gray[50] fill, radius 6,
 * 24px height, 10/4 padding, 6px gap, 14px/500 type — is already Blend's MD SQUARICAL token,
 * so this override is two paths deep and nothing else moves.
 */
export const fieldTagTokens: ComponentTokenType = {
  ...componentTokens,
  TAGV2: perBreakpoint(
    TAGV2_TOKENS as unknown as Record<string, TagBorderToken>,
    (token) => ({
      ...token,
      border: {
        ...token.border,
        noFill: { ...token.border.noFill, neutral: TAG_HAIRLINE },
        subtle: { ...token.border.subtle, neutral: TAG_HAIRLINE },
      },
    }),
  ) as unknown as ComponentTokenType['TAGV2'],
}

type SelectTriggerToken = { trigger: { selectedValue: { color: unknown } } }

/**
 * The column organiser (ColumnOrganiser.tsx) — the field chips above, plus its aggregation
 * select.
 *
 * Spreads `fieldTagTokens` rather than restating it: the organiser's palette is the same
 * chip as the Fields step's vocabulary, drawn from the same node, and two copies of one
 * border colour is how the two would drift apart.
 *
 * The one thing added is the select's trigger colour. Node 4911:111609 draws "COUNT" at
 * gray[400] — the same tint as the grip, pencil and duplicate glyphs beside it, which is the
 * organiser saying these are the row's secondary controls and the column's name is the row.
 * Blend colours a *chosen* value gray[700] (singleSelectV2.light.tokens.ts:184) and only its
 * placeholder gray[400], which is the right default for a select that is answering a
 * question — but every one of these has an answer from the moment the column exists, so
 * gray[700] would make a rank of COUNTs the loudest thing in the panel.
 *
 * Deliberately not conditional on whether the aggregation is still COUNT. A select that
 * darkened once touched would be a third state to explain, and the design draws one.
 *
 * Scoped by a nested ThemeProvider, not global: the Filters step's selects
 * (FiltersStep.tsx:180-192) are the ordinary kind and keep Blend's gray[700].
 */
export const columnOrganiserTokens: ComponentTokenType = {
  ...fieldTagTokens,
  SINGLE_SELECT_V2: perBreakpoint(
    SINGLE_SELECT_V2_TOKENS as unknown as Record<string, SelectTriggerToken>,
    (token) => ({
      ...token,
      trigger: {
        ...token.trigger,
        selectedValue: {
          ...token.trigger.selectedValue,
          color: FOUNDATION_THEME.colors.gray[400],
        },
      },
    }),
  ) as unknown as ComponentTokenType['SINGLE_SELECT_V2'],
}

/**
 * The report config detail sheet's spacing, set on Blend's own tokens rather than on the
 * markup around them — see ConfigDetailSheet.tsx.
 *
 * Two values move, and both are the panel's own rhythm rather than anything about a single
 * row:
 *
 * `DRAWER.content.padding` 16/20 → 24. Blend's values are a bottom-sheet inset — right on a
 * phone, thin on a 600px reference panel, where 20px leaves the title, the key column and the
 * preview table all running to within 20px of the edge and nothing reading as a margin. 24 is
 * the step the pages already use, and because DrawerHeader, DrawerBody and DrawerFooter all
 * read this one token, the header/body boundary opens to 48px at the same time — which is
 * what lets the sheet separate its zones with space instead of a rule (better-layout: group
 * with space, not lines).
 *
 * `KEYVALUEPAIRV2.gap.vertical` 4 → 8. Only the stacked rows use it (Metrics, Filters, Column
 * Order, File Name Template), and their values wrap to two 20px lines. At 4px the key sits
 * closer to its value than the value's own lines sit to each other, so the pair reads as one
 * paragraph and the list loses its keys; 8px still leaves the 20px between those rows at
 * 2.5x the gap inside one, which is the ratio that makes a group read as a group.
 *
 * Scoped by a nested ThemeProvider for the same reason as sectionTabsTokens: DRAWER is also
 * every mobile select panel Blend opens (SingleSelectDrawer and friends), which want the
 * bottom-sheet inset they were designed with.
 */
export const detailSheetTokens: ComponentTokenType = {
  ...componentTokens,
  DRAWER: perBreakpoint(
    DRAWER_TOKENS as unknown as Record<
      string,
      { content: { padding: { x: unknown; y: unknown } } }
    >,
    (token) => ({
      ...token,
      content: {
        ...token.content,
        padding: { x: FOUNDATION_THEME.unit[24], y: FOUNDATION_THEME.unit[24] },
      },
    }),
  ) as unknown as ComponentTokenType['DRAWER'],
  KEYVALUEPAIRV2: perBreakpoint(
    getKeyValuePairV2Tokens(FOUNDATION_THEME) as unknown as Record<
      string,
      { gap: { vertical: unknown; horizontal: unknown } }
    >,
    (token) => ({ ...token, gap: { ...token.gap, vertical: FOUNDATION_THEME.unit[8] } }),
  ) as unknown as ComponentTokenType['KEYVALUEPAIRV2'],
}
