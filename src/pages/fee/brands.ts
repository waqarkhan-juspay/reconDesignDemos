/**
 * Who processes a payment, and what it was paid with — as marks rather than words.
 *
 * Two registries, because the two are not the same kind of thing. A PSP is a *company* and
 * has a logo; a payment method is a *service* and mostly does not. So:
 *
 * - **PSPs** carry a logo and render as the logo alone. The name moves to `title`/`aria-label`,
 *   so it is still there for a screen reader and on hover — which is the trade a logo makes
 *   everywhere it is used. Two sources, in order of preference: a full-colour `logo` exported
 *   from the design file (src/assets/logos), or failing that a `mark` — a single-colour
 *   silhouette drawn in the brand's own hex.
 * - **Methods** carry a lucide glyph *and* their name. A glyph alone cannot separate a credit
 *   card from a debit card — they are the same object — so dropping the word would lose the
 *   distinction the rule is actually about.
 *
 * The logos in src/assets/logos were supplied rather than installed, because no free set
 * carries them: PayU and CCAvenue are not in simple-icons at all, and UPI is an NPCI mark
 * that no CC0 set ships because its use is trademark-restricted. Each was flood-filled from
 * the border to transparency and cropped to its own edges, so it sits on whatever surface it
 * is put on rather than on a white square — which is what lets the chip's own circle behind
 * them read as the logo's background (tags.tsx).
 *
 * Both `logo` and `mark` stay nullable: Paytm has only a silhouette, and the next brand added
 * may have neither. To give one a real logo, drop the file in src/assets/logos and set
 * `logo` — nothing else has to change.
 */

import {
  CalendarClock,
  CalendarDays,
  CalendarRange,
  CreditCard,
  Landmark,
  LayoutGrid,
  Smartphone,
  Wallet,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import ccavenueLogo from '../../assets/logos/ccavenue.png'
import payuLogo from '../../assets/logos/payu.png'
import phonepeLogo from '../../assets/logos/phonepe.png'
import razorpayLogo from '../../assets/logos/razorpay.png'
import upiLogo from '../../assets/logos/upi.png'

/**
 * A brand silhouette: one SVG path on a 24×24 viewBox, in the brand's own colour.
 *
 * Transcribed rather than imported. The `simple-icons` package has no per-icon entry point —
 * its root is one 5 MB module of ~3,300 brands — and importing it for a single glyph made
 * every dev page load of the whole app parse all of them. Rollup shook it out of the
 * production bundle, so this costs nothing at runtime either way; it is the dev server and
 * the dependency itself that are saved. The set is CC0, so the path travels freely.
 */
export type BrandMarkPath = { path: string; hex: string }

const PAYTM_MARK: BrandMarkPath = {
  hex: '20336B',
  path: 'M15.85 8.167a.204.204 0 0 0-.04.004c-.68.19-.543 1.148-1.781 1.23h-.12a.23.23 0 0 0-.052.005h-.001a.24.24 0 0 0-.184.235v1.09c0 .134.106.241.237.241h.645v4.623c0 .132.104.238.233.238h1.058a.236.236 0 0 0 .233-.238v-4.623h.6c.13 0 .236-.107.236-.241v-1.09a.239.239 0 0 0-.236-.24h-.612V8.386a.218.218 0 0 0-.216-.22zm4.225 1.17c-.398 0-.762.15-1.042.395v-.124a.238.238 0 0 0-.234-.224h-1.07a.24.24 0 0 0-.236.242v5.92a.24.24 0 0 0 .236.242h1.07c.12 0 .217-.091.233-.209v-4.25a.393.393 0 0 1 .371-.408h.196a.41.41 0 0 1 .226.09.405.405 0 0 1 .145.319v4.074l.004.155a.24.24 0 0 0 .237.241h1.07a.239.239 0 0 0 .235-.23l-.001-4.246c0-.14.062-.266.174-.34a.419.419 0 0 1 .196-.068h.198c.23.02.37.2.37.408.005 1.396.004 2.8.004 4.224a.24.24 0 0 0 .237.241h1.07c.13 0 .236-.108.236-.241v-4.543c0-.31-.034-.442-.08-.577a1.601 1.601 0 0 0-1.51-1.09h-.015a1.58 1.58 0 0 0-1.152.5c-.291-.308-.7-.5-1.153-.5zM.232 9.4A.234.234 0 0 0 0 9.636v5.924c0 .132.096.238.216.241h1.09c.13 0 .237-.107.237-.24l.004-1.658H2.57c.857 0 1.453-.605 1.453-1.481v-1.538c0-.877-.596-1.484-1.453-1.484H.232zm9.032 0a.239.239 0 0 0-.237.241v2.47c0 .94.657 1.608 1.579 1.608h.675s.016 0 .037.004a.253.253 0 0 1 .222.253c0 .13-.096.235-.219.251l-.018.004-.303.006H9.739a.239.239 0 0 0-.236.24v1.09a.24.24 0 0 0 .236.242h1.75c.92 0 1.577-.669 1.577-1.608v-4.56a.239.239 0 0 0-.236-.24h-1.07a.239.239 0 0 0-.236.24c-.005.787 0 1.525 0 2.255a.253.253 0 0 1-.25.25h-.449a.253.253 0 0 1-.25-.255c.005-.754-.005-1.5-.005-2.25a.239.239 0 0 0-.236-.24zm-4.004.006a.232.232 0 0 0-.238.226v1.023c0 .132.113.24.252.24h1.413c.112.017.2.1.213.23v.14c-.013.124-.1.214-.207.224h-.7c-.93 0-1.594.63-1.594 1.515v1.269c0 .88.57 1.506 1.495 1.506h1.94c.348 0 .63-.27.63-.6v-4.136c0-1.004-.508-1.637-1.72-1.637zm-3.713 1.572h.678c.139 0 .25.115.25.256v.836a.253.253 0 0 1-.25.256h-.1c-.192.002-.386 0-.578 0zm4.67 1.977h.445c.139 0 .252.108.252.24v.932a.23.23 0 0 1-.014.076.25.25 0 0 1-.238.164h-.445a.247.247 0 0 1-.252-.24v-.933c0-.132.113-.239.252-.239Z',
}

/** Blend's lightest blue — the backing for a blue mark that carries no plate of its own. */
const PRIMARY_TINT = FOUNDATION_THEME.colors.primary[50]

export type PspId = 'razorpay' | 'payu' | 'ccavenue' | 'paytm' | 'phonepe'

export type Psp = {
  name: string
  /** The two-letter code the design uses where there is no room for more. */
  short: string
  /**
   * The brand's own full-colour logo, as an imported asset URL. Preferred over `mark`: it is
   * the logo as the brand draws it, in the colours the brand draws it in.
   */
  logo: string | null
  /** A single-colour silhouette, where there is no full-colour logo — see the note above. */
  mark: BrandMarkPath | null
  /**
   * What the chip's circle is filled with behind the logo, for a logo that does not bring a
   * badge of its own. A token, never a sampled brand colour: Razorpay's mark is blue, so it
   * sits on the design system's lightest blue rather than on a grey that reads as nothing.
   * Left out, the chip falls back to its neutral (tags.tsx).
   */
  tint?: string
}

export const PSPS: Record<PspId, Psp> = {
  // Its artwork is a bare arrow with no plate, unlike PhonePe's and CCAvenue's circles, so
  // the chip supplies one.
  razorpay: { name: 'Razorpay', short: 'Rz', logo: razorpayLogo, mark: null, tint: PRIMARY_TINT },
  payu: { name: 'PayU', short: 'Pu', logo: payuLogo, mark: null },
  ccavenue: { name: 'CCAvenue', short: 'CC', logo: ccavenueLogo, mark: null },
  // The one PSP with no supplied logo: simple-icons' silhouette, in Paytm's own navy.
  paytm: { name: 'Paytm', short: 'Pt', logo: null, mark: PAYTM_MARK },
  phonepe: { name: 'PhonePe', short: 'Pp', logo: phonepeLogo, mark: null },
}

export type MethodId =
  | 'upi'
  | 'upi-lite'
  | 'credit-card'
  | 'debit-card'
  | 'net-banking'
  | 'wallet'
  | 'pay-later'
  | 'card-emi'
  | 'cardless-emi'
  | 'all'

/**
 * A method shows its own logo where one exists and a lucide glyph where none does. Only UPI
 * has one — "credit card" and "net banking" are categories, not brands, and nothing would be
 * telling the truth there except a generic glyph.
 */
export const METHODS: Record<MethodId, { name: string; icon: LucideIcon; logo?: string }> = {
  upi: { name: 'UPI', icon: Smartphone, logo: upiLogo },
  'upi-lite': { name: 'UPI Lite', icon: Zap, logo: upiLogo },
  'credit-card': { name: 'Credit card', icon: CreditCard },
  'debit-card': { name: 'Debit card', icon: CreditCard },
  'net-banking': { name: 'Net banking', icon: Landmark },
  wallet: { name: 'Wallet', icon: Wallet },
  'pay-later': { name: 'Pay later', icon: CalendarClock },
  'card-emi': { name: 'Card EMI', icon: CalendarDays },
  'cardless-emi': { name: 'Cardless EMI', icon: CalendarRange },
  all: { name: 'All methods', icon: LayoutGrid },
}

/**
 * How many of a list to show before the rest become a `+N`.
 *
 * Two numbers rather than one, because that is what the design does: three PSPs all show,
 * but five show as two and a `+3`; two methods both show, but three show as two and a `+1`.
 * `showAllUpTo` is the point at which the list still fits whole, `thenShow` how many survive
 * once it does not.
 */
export function withOverflow<T>(
  items: T[],
  { showAllUpTo, thenShow }: { showAllUpTo: number; thenShow: number },
): { shown: T[]; extra: number } {
  if (items.length <= showAllUpTo) return { shown: items, extra: 0 }
  return { shown: items.slice(0, thenShow), extra: items.length - thenShow }
}

/** The design's caps: PSPs stay whole to three, methods to two. */
export const PSP_OVERFLOW = { showAllUpTo: 3, thenShow: 2 }
export const METHOD_OVERFLOW = { showAllUpTo: 2, thenShow: 2 }
