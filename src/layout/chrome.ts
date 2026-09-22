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

/**
 * Nav icon size, and it is not a free choice — it is Blend's.
 *
 * Directory sizes its icon slot from `section.itemList.item.icon.width`
 * (Directory/directory.tokens.ts:273, which resolves to `unit[14]`) and then forces
 * `width/height: …!important` onto any `> svg` inside that slot (Directory/NavItem.tsx:101).
 *
 * So the two kinds of icon in this list were never the same size and could not be made so by
 * agreeing on a number. A lucide icon is an `<svg>`, so the `!important` rule caught it and
 * it drew at 14 whatever `size` said. A MaskIcon is a `<span>` with a CSS mask, which that
 * rule cannot reach, so it drew at exactly the 12 it was given. Passing 12 did not make the
 * icons smaller; it made half of them smaller.
 *
 * Reading the same token rather than writing 14 keeps them equal if Blend's value moves, and
 * `unit[14]` is a CSS length ('14px'), which is why MaskIcon takes a string.
 */
export const ICON_SIZE = FOUNDATION_THEME.unit[14]
