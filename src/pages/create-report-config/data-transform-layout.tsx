import type { ComponentTokenType, ResponsiveModalV2Tokens } from '@juspay/blend-design-system'
import { useDialKitController } from 'dialkit'
import type { ReactNode } from 'react'
import { SHOW_DIALKIT } from '../../dev-tools'
import { componentTokens } from '../../theme'
import { MODALV2_TOKENS } from '../../tokens/ModalV2'

/**
 * Every padding and gap in the Data Transform modal, in px. The modal's own chrome (header, body,
 * footer) is Blend's and reaches it through `tokens`; the rest is markup DataTransformModal owns
 * and reads straight off this object.
 *
 * `x` is horizontal and `y` vertical throughout, so each padding is two dials rather than four:
 * the modal is drawn symmetrically, and a dial per side would be three ways to break that.
 */
export type DataTransformLayout = {
  /** Handed to a ThemeProvider around the modal — MODALV2 with the chrome paddings applied. */
  tokens: ComponentTokenType
  /** The divider under the sign rules' title to the grid under it. */
  headingToControls: number
  /** The controls to the preview strip under them. */
  controlsToPreview: number
  /** Between the Order and Separator selects. */
  selectColumnGap: number
  /** Between the sign rule rows. */
  ruleGap: number
  /** Between a rule's column, condition, value and sign controls. */
  trackGap: number
  /** The IF / ELSE IF / ELSE gutter to the controls beside it. */
  markerGap: number
  previewPaddingX: number
  previewPaddingY: number
  /** The transform icon to the values beside it. */
  previewIconGap: number
  /** Between the preview's values — the example, "to", and the result. */
  previewItemGap: number
}

/** Stable, for the reason fields-layout.tsx gives: without it every open keeps its own copy. */
const PANEL_ID = 'data-transform-layout'

/**
 * Named here rather than derived from the id, so renaming the id cannot orphan saved values.
 * Still the Data Parser's key for exactly that reason: the modal was renamed Data Transform,
 * and dials tuned under the old name carry over.
 */
const PERSIST_KEY = 'dialkit:data-parser-layout'

const RESET_ACTION = 'resetToCode'

/** The tuned values — what an untouched panel draws, and all a hidden one does. */
const DEFAULTS = {
  chrome: {
    headerX: 20,
    headerY: 20,
    bodyX: 40,
    bodyY: 32,
    footerX: 20,
    footerY: 20,
    footerButtonGap: 16,
  },
  content: {
    headingToControls: 20,
    controlsToPreview: 16,
    selectColumnGap: 16,
    ruleGap: 24,
    trackGap: 12,
    markerGap: 4,
  },
  preview: { paddingX: 12, paddingY: 8, iconGap: 12, itemGap: 8 },
}

/** [default, min, max, step] — a 4px step, so every value the dial can produce is on the grid. */
const dial = (value: number, max = 48): [number, number, number, number] => [value, 0, max, 4]

/**
 * MODALV2 with the header, body and footer paddings replaced — desktop (`lg`) only.
 *
 * The whole generated tree is spread rather than a partial object, because Blend replaces a
 * component's tokens outright (see src/tokens/ModalV2.ts). `sm` is left alone: the dials are
 * tuned on a desktop modal, and phone modals keep Blend's tighter 16px.
 */
function modalTokens(chrome: typeof DEFAULTS.chrome): ComponentTokenType {
  const lg = MODALV2_TOKENS.lg
  const MODALV2: ResponsiveModalV2Tokens = {
    ...MODALV2_TOKENS,
    lg: {
      ...lg,
      header: {
        ...lg.header,
        paddingTop: chrome.headerY,
        paddingBottom: chrome.headerY,
        paddingLeft: chrome.headerX,
        paddingRight: chrome.headerX,
      },
      body: {
        ...lg.body,
        paddingTop: chrome.bodyY,
        paddingBottom: chrome.bodyY,
        paddingLeft: chrome.bodyX,
        paddingRight: chrome.bodyX,
      },
      footer: {
        ...lg.footer,
        paddingTop: chrome.footerY,
        paddingBottom: chrome.footerY,
        paddingLeft: chrome.footerX,
        paddingRight: chrome.footerX,
        gap: chrome.footerButtonGap,
      },
    },
  }
  // The app's own overrides ride along: a nested ThemeProvider starts from Blend's defaults for
  // anything it is not handed, not from the provider above it.
  return { ...componentTokens, MODALV2 }
}

/**
 * The Data Transform modal's dial panel. Defaults are the tuned values in DEFAULTS, so an
 * untouched panel draws exactly what ships.
 *
 * Mounted by ColumnOrganiser, so the panel is listed while the organiser is on screen — it has
 * to exist before the modal opens to be of any use once it has.
 */
export function DataTransformDials({
  children,
}: {
  children: (layout: DataTransformLayout) => ReactNode
}) {
  const dials = useDialKitController(
    'Data Transform modal',
    {
      chrome: {
        headerX: dial(DEFAULTS.chrome.headerX),
        headerY: dial(DEFAULTS.chrome.headerY),
        bodyX: dial(DEFAULTS.chrome.bodyX),
        bodyY: dial(DEFAULTS.chrome.bodyY),
        footerX: dial(DEFAULTS.chrome.footerX),
        footerY: dial(DEFAULTS.chrome.footerY),
        footerButtonGap: dial(DEFAULTS.chrome.footerButtonGap),
      },
      content: {
        headingToControls: dial(DEFAULTS.content.headingToControls),
        controlsToPreview: dial(DEFAULTS.content.controlsToPreview),
        selectColumnGap: dial(DEFAULTS.content.selectColumnGap),
        ruleGap: dial(DEFAULTS.content.ruleGap),
        trackGap: dial(DEFAULTS.content.trackGap),
        markerGap: dial(DEFAULTS.content.markerGap),
      },
      preview: {
        paddingX: dial(DEFAULTS.preview.paddingX),
        paddingY: dial(DEFAULTS.preview.paddingY),
        iconGap: dial(DEFAULTS.preview.iconGap),
        itemGap: dial(DEFAULTS.preview.itemGap),
      },
      [RESET_ACTION]: { type: 'action', label: 'Reset to code defaults' },
    },
    {
      id: PANEL_ID,
      persist: { key: PERSIST_KEY },
      onAction: (action) => {
        if (action === RESET_ACTION) dials.resetValues()
      },
    },
  )

  // With the dials hidden, stored values are ignored for the reason fields-layout.tsx gives:
  // nothing would be left on screen to change them back.
  const { chrome, content, preview } = SHOW_DIALKIT ? dials.values : DEFAULTS

  return children({
    tokens: modalTokens(chrome),
    ...content,
    previewPaddingX: preview.paddingX,
    previewPaddingY: preview.paddingY,
    previewIconGap: preview.iconGap,
    previewItemGap: preview.itemGap,
  })
}
