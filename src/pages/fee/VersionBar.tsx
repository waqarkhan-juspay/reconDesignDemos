/**
 * The layout switch, as a bar floating at the bottom of the page.
 *
 * It drives the same `layout` dial the DialKit panel does (fee-layout.ts), so the two are one
 * control with two faces rather than two states to keep in step. The panel is still where the
 * spacing lives; this is the one dial worth having on the page, because switching layouts is
 * the whole point of the screen and opening a panel to do it is three clicks too many.
 *
 * blend-gap: Blend 0.0.37 has no floating toolbar or segmented control, so the bar itself —
 * the fixed position, the pill, the shadow — is composed here. What sits inside it is
 * `TabsV2`, which is what this is: three views of one set of rules.
 */

import {
  FOUNDATION_THEME,
  TabsV2,
  TabsV2List,
  TabsV2Size,
  TabsV2Trigger,
  TabsV2Variant,
} from '@juspay/blend-design-system'
import type { CSSProperties } from 'react'
import { HAIRLINE } from '../pacb/helpers'
import { LAYOUTS, type FeeLayout } from './fee-layout'

const { colors } = FOUNDATION_THEME

/** PILLS, so the selected layout reads as a pressed segment rather than an underlined tab. */
const VARIANT = TabsV2Variant.PILLS
const SIZE = TabsV2Size.SM

/**
 * `shadows.lg` is the heaviest the design language allows — rule 10 caps shadow opacity at
 * 0.07, and every Blend shadow from `md` up sits exactly there, differing only in spread. A
 * bar floating over content needs the spread to separate from whatever scrolls under it.
 */
const BAR_STYLE: CSSProperties = {
  backgroundColor: colors.gray[0],
  border: HAIRLINE,
  borderRadius: FOUNDATION_THEME.border.radius.full,
  boxShadow: FOUNDATION_THEME.shadows.lg,
}

export function VersionBar({
  layout,
  onChange,
}: {
  layout: FeeLayout
  onChange: (next: FeeLayout) => void
}) {
  return (
    // The full-width rail is what centres the bar; it takes no clicks of its own, so the page
    // underneath stays reachable everywhere the bar itself is not.
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center px-6"
      style={{ zIndex: FOUNDATION_THEME.zIndex[100] }}
    >
      <nav
        aria-label="Layout"
        className="pointer-events-auto w-fit max-w-full p-1"
        style={BAR_STYLE}
      >
        <TabsV2
          variant={VARIANT}
          size={SIZE}
          fitContent
          value={layout}
          onValueChange={(value) => onChange(value as FeeLayout)}
        >
          <TabsV2List variant={VARIANT} size={SIZE}>
            {LAYOUTS.map(({ value, short, label }) => (
              <TabsV2Trigger key={value} value={value} variant={VARIANT} size={SIZE} title={label}>
                {short}
              </TabsV2Trigger>
            ))}
          </TabsV2List>
        </TabsV2>
      </nav>
    </div>
  )
}
