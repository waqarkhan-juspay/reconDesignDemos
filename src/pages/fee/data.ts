/**
 * The pricing rules the Fee Module is drawn with — Figma nodes 2268:7289 (layout 1),
 * 2268:8499 (layout 2) and 2268:9641 (layout 3).
 *
 * Demo content, transcribed from the design rather than fetched: the page has no API behind
 * it, and the point of the screen is the rule card, not the numbers. Keep the spread as it
 * is — every status, both date shapes (open-ended and closed), a rule with no rate caption,
 * a five-PSP rule and the `all` wildcard each appear once, so a layout change is exercised
 * by the data rather than by a case nobody drew.
 *
 * Method counts run one to nine, plus the wildcard. That is wider than the design drew — the
 * frame's overflow case is a three-method rule — and it is deliberate: layout 5 pages its
 * body one method at a time (FeeGroup.tsx), and a pager with two pages demonstrates about as
 * much as a pager with none. Nine is the ceiling because the catalogue holds nine real
 * methods (brands.ts); `all` is a wildcard standing for every one of them, not a tenth.
 *
 * So the case that now needs protecting is the *short* rule, not the long one. Keep at least
 * one single-method rule — Net Banking Fee is it — or nothing on the page draws a one-page
 * pager or a method list below the `+N` cut again.
 *
 * PSPs and methods are ids, not strings, because all three layouts show them differently:
 * layout 1 and 2 as marks and short codes, layout 3 as full names and a count. One list of
 * ids, three readings of it (brands.tsx).
 */

import { METHODS, PSPS, type MethodId, type PspId } from './brands'

/** A rule's lifecycle. Drives the status tag's colour (FeeTicket.tsx). */
export type FeeStatus =
  | 'Active'
  | 'Draft'
  | 'Pending approval'
  | 'Expired'
  | 'Scheduled'
  | 'Inactive'

/** How the fee is taken. */
export type FeeMode = 'Net' | 'Gross' | 'Surcharge'

/**
 * What each mode means in one line — layout 3's detail pane shows it under the mode. Kept
 * here rather than on each rule because it is a property of the mode, not of the rule, and
 * twenty rules repeating three sentences would drift.
 */
export const MODE_HINT: Record<FeeMode, string> = {
  Net: 'Deducted from settlement',
  Gross: 'Charged on the full amount',
  Surcharge: 'Added to the payer’s total',
}

/**
 * One band of a slab: the amounts it covers, and what it charges on them.
 *
 * A rule is a slab when it prices by transaction amount rather than charging one rate — the
 * case raised in review, where ₹1–200 is one rate and ₹200–400 another. The card shows the
 * span across every band and opens to the table (FeeTicket.tsx).
 */
export type Slab = { band: string; rate: string }

export type FeeRule = {
  /** Stable identity, deliberately not the name — a rule can be renamed. React keys. */
  id: string
  name: string
  status: FeeStatus
  /** The headline rate, already formatted: "0.5%", "₹3 + 1.8%", "0–0.6%". */
  rate: string
  /** The floor/ceiling under the rate — "₹2–₹50", "≤ ₹100". Absent on a flat fee. */
  rateCaption?: string
  mode: FeeMode
  /** One line on what the rule charges for. */
  description: string
  /** The acquirers it covers, or `'all'` — which the design writes as "All PSPs". */
  psps: PspId[] | 'all'
  methods: MethodId[]
  /**
   * The bands, where the rule is priced by amount. Absent on a rule that charges one rate,
   * which is most of them — so `rate` stays the headline either way, and a slab's `rate` is
   * the span across its bands rather than any one of them.
   */
  slabs?: Slab[]
  /** When it takes effect: "01 Nov 2026 →" open-ended, or "01 Apr 2026 – 31 Mar 2027". */
  effective: string
  /** What happens at the end of that — layout 3's second line under VALID. */
  validHint: string
  /** When it was last touched: "2d ago", "Today", "30 Sep 2026". */
  when: string
  /** And by whom. "System" where nobody touched it — an expiry, say. */
  who: string
}

export const FEE_RULES: FeeRule[] = [
  {
    id: 'standard-upi',
    name: 'Standard UPI Fee',
    status: 'Active',
    rate: '0.5%',
    rateCaption: '₹2–₹50',
    mode: 'Net',
    description: 'Successful payments under ₹2,000',
    psps: ['razorpay'],
    methods: ['upi', 'upi-lite'],
    effective: '01 Nov 2026 →',
    validHint: 'No end date',
    when: '2d ago',
    who: 'Sneha R.',
  },
  {
    id: 'card-mdr',
    name: 'Card MDR',
    status: 'Active',
    rate: '₹3 + 1.8%',
    rateCaption: '₹10–₹500',
    mode: 'Net',
    description: 'Successful Visa, Mastercard and RuPay payments',
    psps: ['razorpay', 'payu', 'ccavenue'],
    methods: ['credit-card', 'debit-card', 'card-emi', 'cardless-emi'],
    effective: '01 Apr 2026 – 31 Mar 2027',
    validHint: 'Renews annually',
    when: '7d ago',
    who: 'Arjun M.',
  },
  {
    id: 'high-value-card',
    name: 'High Value Card Fee',
    status: 'Draft',
    rate: '₹10 + 1.5%',
    mode: 'Gross',
    description: 'Payments above ₹10,000',
    psps: ['payu'],
    methods: ['credit-card', 'debit-card', 'net-banking'],
    effective: '01 Dec 2026 →',
    validHint: 'Not yet submitted',
    when: 'Yesterday',
    who: 'Sneha R.',
  },
  {
    id: 'upi-slab',
    name: 'UPI Slab Pricing',
    status: 'Pending approval',
    rate: '0–0.6%',
    rateCaption: '≤ ₹100',
    mode: 'Net',
    description: 'All successful payments, priced by transaction amount',
    // The bands the rate spans: free under ₹500, climbing to 0.6% above ₹5,000.
    slabs: [
      { band: '₹1 – ₹500', rate: '0%' },
      { band: '₹500 – ₹2,000', rate: '0.3%' },
      { band: '₹2,000 – ₹5,000', rate: '0.5%' },
      { band: '₹5,000 and above', rate: '0.6%' },
    ],
    psps: ['razorpay', 'payu'],
    methods: ['upi', 'upi-lite', 'wallet', 'pay-later', 'net-banking', 'debit-card'],
    effective: '01 Dec 2026 →',
    validHint: 'Awaiting sign-off',
    when: 'Today',
    who: 'Priya K.',
  },
  {
    id: 'emi-processing',
    name: 'EMI Processing Fee',
    status: 'Expired',
    rate: '₹25 + 2%',
    mode: 'Surcharge',
    description: 'Tenures of 3 months and above',
    psps: ['payu'],
    methods: ['card-emi', 'cardless-emi'],
    effective: '01 Jan 2026 – 30 Sep 2026',
    validHint: 'Ended, not renewed',
    when: '30 Sep 2026',
    who: 'System',
  },
  {
    id: 'failed-auth',
    name: 'Failed Auth Fee',
    status: 'Active',
    rate: '₹2',
    mode: 'Gross',
    description: 'Failed and declined payments',
    psps: 'all',
    methods: [
      'credit-card',
      'debit-card',
      'net-banking',
      'upi',
      'upi-lite',
      'wallet',
      'pay-later',
      'card-emi',
      'cardless-emi',
    ],
    effective: '01 Apr 2026 →',
    validHint: 'No end date',
    when: '12 Jun 2026',
    who: 'Arjun M.',
  },
  {
    id: 'net-banking',
    name: 'Net Banking Fee',
    status: 'Scheduled',
    rate: '₹12',
    mode: 'Net',
    description: 'Successful payments',
    psps: ['ccavenue', 'razorpay'],
    methods: ['net-banking'],
    effective: '01 Jan 2027 →',
    validHint: 'Starts next year',
    when: '15d ago',
    who: 'Priya K.',
  },
  {
    id: 'chargeback',
    name: 'Chargeback Fee',
    status: 'Active',
    rate: '₹500',
    mode: 'Gross',
    description: 'Every successful chargeback',
    psps: 'all',
    methods: ['all'],
    effective: '01 Jan 2026 →',
    validHint: 'No end date',
    when: '14 Feb 2026',
    who: 'Arjun M.',
  },
  {
    id: 'wallet-pay-later',
    name: 'Wallet and Pay Later Fee',
    status: 'Active',
    rate: '1.2%',
    rateCaption: '≤ ₹300',
    mode: 'Net',
    description: 'Successful payments',
    psps: ['razorpay', 'payu', 'ccavenue', 'paytm', 'phonepe'],
    methods: ['wallet', 'pay-later', 'upi', 'upi-lite', 'cardless-emi'],
    effective: '01 Jul 2026 →',
    validHint: 'No end date',
    when: '4d ago',
    who: 'Sneha R.',
  },
  {
    id: 'cross-border-card',
    name: 'Cross-border Card Fee',
    status: 'Inactive',
    rate: '3.5%',
    rateCaption: '≥ ₹25',
    mode: 'Net',
    description: 'International cards',
    psps: ['razorpay'],
    methods: ['credit-card', 'debit-card', 'card-emi'],
    effective: '01 May 2026 →',
    validHint: 'Paused',
    when: '09 Aug 2026',
    who: 'Priya K.',
  },
  {
    id: 'international-upi',
    name: 'International UPI Fee',
    status: 'Active',
    rate: '1.1%',
    rateCaption: '₹5–₹120',
    mode: 'Net',
    description: 'Payments from UPI apps registered outside India',
    psps: ['razorpay', 'payu'],
    methods: ['upi', 'upi-lite'],
    effective: '01 Sep 2026 →',
    validHint: 'No end date',
    when: '3d ago',
    who: 'Meera T.',
  },
  {
    id: 'recurring-mandate',
    name: 'Recurring Mandate Fee',
    status: 'Active',
    rate: '₹5',
    mode: 'Gross',
    description: 'Each debit against a standing mandate',
    psps: ['razorpay', 'ccavenue'],
    methods: ['upi', 'credit-card', 'debit-card', 'net-banking'],
    effective: '01 Mar 2026 →',
    validHint: 'No end date',
    when: '21d ago',
    who: 'Arjun M.',
  },
  {
    id: 'refund-processing',
    name: 'Refund Processing Fee',
    status: 'Active',
    rate: '₹8',
    mode: 'Gross',
    description: 'Every refund returned to the payer',
    psps: 'all',
    methods: ['credit-card', 'debit-card', 'upi', 'wallet', 'net-banking', 'pay-later'],
    effective: '01 Feb 2026 →',
    validHint: 'No end date',
    when: '08 Oct 2026',
    who: 'Priya K.',
  },
  {
    id: 'settlement-advance',
    name: 'Settlement Advance Fee',
    status: 'Pending approval',
    rate: '0.25%',
    rateCaption: '≤ ₹1,000',
    mode: 'Net',
    description: 'Same-day settlement, ahead of the cycle',
    psps: ['razorpay'],
    methods: ['upi', 'credit-card', 'debit-card'],
    effective: '01 Jan 2027 →',
    validHint: 'Awaiting sign-off',
    when: 'Today',
    who: 'Meera T.',
  },
  {
    id: 'qr-collect',
    name: 'QR Collect Fee',
    status: 'Scheduled',
    rate: '₹1.50',
    mode: 'Net',
    description: 'Payments collected against a static QR',
    psps: ['paytm', 'phonepe'],
    methods: ['upi', 'upi-lite'],
    effective: '01 Feb 2027 →',
    validHint: 'Starts next year',
    when: '6d ago',
    who: 'Rahul V.',
  },
  {
    id: 'low-value-upi',
    name: 'Low Value UPI Fee',
    status: 'Active',
    rate: '0%',
    mode: 'Net',
    description: 'Successful payments under ₹200',
    psps: 'all',
    methods: ['upi'],
    effective: '01 Jan 2026 →',
    validHint: 'Mandated, no end date',
    when: '02 Jan 2026',
    who: 'System',
  },
  {
    id: 'subscription-emi',
    name: 'Subscription EMI Fee',
    status: 'Draft',
    rate: '₹18 + 1.2%',
    mode: 'Surcharge',
    description: 'Tenures billed monthly against a subscription',
    psps: ['payu', 'ccavenue'],
    methods: ['card-emi', 'cardless-emi', 'pay-later'],
    effective: '01 Feb 2027 →',
    validHint: 'Not yet submitted',
    when: 'Yesterday',
    who: 'Rahul V.',
  },
  {
    id: 'dispute-representment',
    name: 'Dispute Representment Fee',
    status: 'Inactive',
    rate: '₹250',
    mode: 'Gross',
    description: 'Every chargeback contested with the network',
    psps: ['razorpay', 'payu'],
    methods: ['credit-card', 'debit-card'],
    effective: '01 Jun 2026 →',
    validHint: 'Paused',
    when: '19 Sep 2026',
    who: 'Arjun M.',
  },
  {
    id: 'wallet-topup',
    name: 'Wallet Top-up Fee',
    status: 'Expired',
    rate: '0.8%',
    mode: 'Net',
    description: 'Money loaded into a closed-loop wallet',
    psps: ['paytm'],
    methods: ['wallet'],
    effective: '01 Apr 2026 – 31 Oct 2026',
    validHint: 'Ended, not renewed',
    when: '31 Oct 2026',
    who: 'System',
  },
  {
    id: 'enterprise-volume',
    name: 'Enterprise Volume Pricing',
    status: 'Active',
    rate: '0.2–0.9%',
    rateCaption: '≤ ₹400',
    mode: 'Net',
    description: 'Negotiated pricing, by monthly settled volume',
    // The second slab rule, so layout 4's banded scope is drawn by more than one card.
    slabs: [
      { band: 'Up to ₹50L', rate: '0.9%' },
      { band: '₹50L – ₹2Cr', rate: '0.6%' },
      { band: '₹2Cr – ₹10Cr', rate: '0.35%' },
      { band: '₹10Cr and above', rate: '0.2%' },
    ],
    psps: ['razorpay', 'payu', 'ccavenue', 'phonepe'],
    methods: [
      'credit-card',
      'debit-card',
      'upi',
      'upi-lite',
      'net-banking',
      'wallet',
      'card-emi',
      'cardless-emi',
    ],
    effective: '01 Oct 2026 →',
    validHint: 'Reviewed each quarter',
    when: '5d ago',
    who: 'Priya K.',
  },
]

/** "2d ago · Sneha R." — the one line the card footers show. */
export const lastTouched = (rule: FeeRule) => `${rule.when} · ${rule.who}`

/** "3 PSPs" / "All PSPs" / "1 PSP". */
const pspSummary = (rule: FeeRule) =>
  rule.psps === 'all' ? 'All PSPs' : `${rule.psps.length} PSP${rule.psps.length === 1 ? '' : 's'}`

/**
 * Two strings derived from each rule, settled once at module scope rather than per render.
 *
 * `FEE_RULES` is a constant, so both are fixed for the life of the page — but they were being
 * rebuilt inside a filter and inside a list row, which meant every rule's worth of `map`/`join`
 * on every keystroke in the search field. Keyed by `id`, since that is what a row has.
 */
type RuleText = {
  /** Everything about a rule someone might type into the search field, lowercased. */
  search: string
  /** "3 PSPs · Credit card, Debit card" — layout 3's second line. */
  summary: string
}

/**
 * The PSP and method *names* are in here deliberately: they are ids in the data, and the page
 * now shows them as marks rather than words, so without this they would be unsearchable.
 */
const ruleText = (rule: FeeRule): RuleText => {
  const psps = rule.psps === 'all' ? 'All PSPs' : rule.psps.map((psp) => PSPS[psp].name).join(' ')
  const methods = rule.methods.map((method) => METHODS[method].name)
  return {
    search: [rule.name, rule.description, rule.rate, rule.mode, rule.status, psps, ...methods]
      .join(' ')
      .toLowerCase(),
    summary: `${pspSummary(rule)} · ${methods.join(', ')}`,
  }
}

const RULE_TEXT: Record<string, RuleText> = Object.fromEntries(
  FEE_RULES.map((rule) => [rule.id, ruleText(rule)]),
)

/** Does this rule match what was typed? `needle` must already be lowercased and trimmed. */
export const matchesQuery = (rule: FeeRule, needle: string) =>
  RULE_TEXT[rule.id].search.includes(needle)

/** "3 PSPs · Credit card, Debit card" — what layout 3's list row says under the name. */
export const ruleSummary = (rule: FeeRule) => RULE_TEXT[rule.id].summary
