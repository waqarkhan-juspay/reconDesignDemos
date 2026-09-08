import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import type { CSSProperties } from 'react'

/**
 * The hover fill for app chrome — topbar buttons and sidebar footer rows alike.
 *
 * A custom property rather than a Tailwind colour class or a hex literal, both of which
 * rule 1 bans: Tailwind cannot read a JS token at build time, but a variable set from the
 * token can be handed to an arbitrary-value utility and stays on the palette. Pair it with
 * `hover:bg-[var(--chrome-hover)]`.
 *
 * Its own module so the component files around it export only components, which is what
 * React Fast Refresh needs.
 */
export const CHROME_HOVER = {
  '--chrome-hover': FOUNDATION_THEME.colors.gray[50],
} as CSSProperties
