/**
 * The size and weight of an icon sitting in a tag's slot — the `+` on a field chip, the ✕ on
 * a chosen one, the ✓, the asterisk on a custom field.
 *
 * ## Why the two numbers travel together
 *
 * lucide draws every icon on a 24-unit viewBox, so the stroke a reader actually sees is
 * `strokeWidth × size / 24` — the `size` prop scales the whole drawing, stroke included.
 * Neither number means anything on its own: change the size and the weight changes with it,
 * which is exactly the kind of coupling that goes wrong when the two are written apart.
 *
 * ## Why 2.5 and not lucide's 2
 *
 * At `size: 12`, lucide's shipped `strokeWidth: 2` renders at exactly 1.0px — the thinnest a
 * stroke can be and still be a stroke. Nothing is wrong with it technically (at dpr 2 it is
 * two device pixels, so it is crisp rather than smeared), but beside a 14px/500 label it
 * reads as faint: the glyph is the one thing in the chip drawn at the minimum.
 *
 * 2.5 renders at 1.25px. It thickens the mark without growing its box, so the chip's 24px
 * height, its 6px gap and the 12px slot Blend reserves (`rightSlot.maxHeight`) all stay put
 * — which is the whole reason to reach for the weight rather than the size.
 *
 * The 16px icons elsewhere on these pages — the organiser row's grip, pencil, duplicate and
 * ✕, and the search glyph — are deliberately not on this: the same `strokeWidth: 2` already
 * renders 1.33px at that size, and lifting them too would thicken the row's chrome rather
 * than fix anything.
 *
 * Spread onto the icon, before `color`, so a call site can still tint it:
 *
 * ```tsx
 * const ADD_SLOT = { slot: <Plus {...SLOT_ICON} color={colors.gray[500]} /> }
 * ```
 */
export const SLOT_ICON = { size: 12, strokeWidth: 2.5 } as const
