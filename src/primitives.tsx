import { FOUNDATION_THEME } from '@juspay/blend-design-system'

export { default as Block } from 'blend-primitives/Block/Block'
export type { BlockProps } from 'blend-primitives/Block/Block'
export { default as PrimitiveText } from 'blend-primitives/PrimitiveText/PrimitiveText'
export type { TextProps as PrimitiveTextProps } from 'blend-primitives/PrimitiveText/PrimitiveText'

/**
 * Apply a whole Blend type token to PrimitiveText — see rule 6.
 *
 * Blend's type scale entries are `{ fontSize, lineHeight, letterSpacing }` as unitless
 * numbers. Passing only `.fontSize` leaves line-height at the browser default (~1.2x)
 * instead of the designed leading.
 *
 * lineHeight MUST be px-suffixed: styled-components lists lineHeight as a unitless CSS
 * property, so a bare `20` emits `line-height: 20` — twenty times the font size.
 *
 * letterSpacing is intentionally omitted: every value in the scale is 0, and PrimitiveText
 * already defaults it to 'normal'.
 *
 * It also carries the weight, and the weight is 500 (rule 10). PrimitiveText defaults
 * fontWeight to 400, so every text node that said nothing would otherwise be regular.
 * A `fontWeight` prop *after* the spread still wins — that is how headings take 600.
 */
type FontToken = {
  // Blend types these as CSSObject values, so they widen even though every value in the
  // shipped scale is a plain number.
  fontSize?: number | string
  lineHeight?: number | string
}

export function font({ fontSize, lineHeight }: FontToken) {
  return {
    fontSize,
    lineHeight: typeof lineHeight === 'number' ? `${lineHeight}px` : lineHeight,
    fontWeight: FOUNDATION_THEME.font.weight[500],
  }
}
