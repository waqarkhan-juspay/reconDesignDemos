import type { ComponentTokenType, ResponsiveModalV2Tokens } from '@juspay/blend-design-system'
import type { ReactNode } from 'react'
import { componentTokens } from '../../theme'
import { MODALV2_TOKENS } from '../../tokens/ModalV2'

/**
 * Every padding and gap in the Data Transform modal, in px. The modal's own chrome (header, body,
 * footer) is Blend's and reaches it through `tokens`; the rest is markup DataTransformModal owns
 * and reads straight off this object.
 *
 * `x` is horizontal and `y` vertical throughout: the modal is drawn symmetrically, so each
 * padding is two values rather than four.
 */
export type DataTransformLayout = {
  /** Handed to a ThemeProvider around the modal — MODALV2 with the chrome paddings applied. */
  tokens: ComponentTokenType
  /** The sign rules' explainer line to the grid under it. */
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

/**
 * The tuned values. On main they are the defaults of a DialKit panel; this branch has no
 * DialKit, so they are simply what the modal draws.
 */
const DEFAULTS = {
  chrome: {
    headerX: 20,
    headerY: 20,
    bodyX: 20,
    bodyY: 20,
    footerX: 20,
    footerY: 20,
    footerButtonGap: 16,
  },
  content: {
    headingToControls: 16,
    controlsToPreview: 16,
    selectColumnGap: 16,
    ruleGap: 20,
    trackGap: 12,
    markerGap: 20,
  },
  preview: { paddingX: 12, paddingY: 8, iconGap: 12, itemGap: 8 },
}

/**
 * MODALV2 with the header, body and footer paddings replaced — desktop (`lg`) only.
 *
 * The whole generated tree is spread rather than a partial object, because Blend replaces a
 * component's tokens outright (see src/tokens/ModalV2.ts). `sm` is left alone: the values are
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
 * The Data Transform modal's layout, handed to a render prop — the same shape as main's dial
 * panel, so ColumnOrganiser and DataTransformModal are identical on both branches.
 */
export function DataTransformDials({
  children,
}: {
  children: (layout: DataTransformLayout) => ReactNode
}) {
  const { chrome, content, preview } = DEFAULTS
  return children({
    tokens: modalTokens(chrome),
    ...content,
    previewPaddingX: preview.paddingX,
    previewPaddingY: preview.paddingY,
    previewIconGap: preview.iconGap,
    previewItemGap: preview.itemGap,
  })
}
