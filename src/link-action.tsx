import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
} from '@juspay/blend-design-system'
import type { CSSProperties } from 'react'

/**
 * Blend's type tokens are unitless numbers; CSS variables need the unit. Typed loosely
 * because Blend types them as CSSObject values, which include undefined.
 */
const px = (value: number | string | undefined) =>
  typeof value === 'number' ? `${value}px` : value

/**
 * A small text action beside a set of chips — "Clear all", "Select all".
 *
 * INLINE is Blend's link button — no padding or fill — and SECONDARY keeps it neutral
 * (gray[600]) so it does not compete with the tags it acts on.
 *
 * The type overrides are what make this worth a component rather than copies. TagV2 sm reads
 * font.fontSize[12] / font.lineHeight[18] (tagV2.light.tokens.ts:162,175) where a small
 * ButtonV2 would be 14px, and no ButtonV2 prop reaches its label — so the tokens are handed
 * down as CSS variables and applied to the label element (`[data-id]`) instead. Weight needs
 * nothing: both are already 500.
 *
 * The underline sits on the wrapper for the same reason (ButtonV2 omits className), and
 * targets the label rather than the button because a flex item does not reliably inherit a
 * parent's text-decoration. Keyboard focus gets it too, not just hover — and `:not(:disabled)`
 * keeps a refused control from underlining under the pointer as though it would answer.
 *
 * A file of its own because two steps draw it now: the Fields step's chip row and the column
 * organiser's palette. The escape hatch above is exactly the kind of thing that drifts once
 * there are two copies of it.
 */
export const LinkAction = ({
  text,
  onClick,
  disabled,
}: {
  text: string
  onClick: () => void
  /**
   * Drawn but refused, rather than removed, wherever the action would do nothing. The Fields
   * step's lone "Clear all" hides instead — it sits at the end of a wrapping row where
   * nothing moves when it goes. A *pair* of these cannot: removing the first slides the
   * second along the moment you use it, which is the one moment the user is looking at it.
   */
  disabled?: boolean
}) => (
  <span
    className="flex self-center [&_[data-id]]:!text-[length:var(--link-size)] [&_[data-id]]:!leading-[var(--link-leading)] [&_button:focus-visible_[data-id]]:underline [&_button:hover:not(:disabled)_[data-id]]:underline"
    style={
      {
        '--link-size': px(FOUNDATION_THEME.font.fontSize[12]),
        '--link-leading': px(FOUNDATION_THEME.font.lineHeight[18]),
      } as CSSProperties
    }
  >
    <ButtonV2
      buttonType={ButtonV2Type.SECONDARY}
      size={ButtonV2Size.SMALL}
      subType={ButtonV2SubType.INLINE}
      text={text}
      disabled={disabled}
      onClick={onClick}
    />
  </span>
)
