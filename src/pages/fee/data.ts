/**
 * The pricing rules the Fee Module is drawn with — Figma nodes 2268:7289 (layout 1),
 * 2268:8499 (layout 2) and 2268:9641 (layout 3).
 *
 * Demo content, transcribed from the design rather than fetched: the page has no API behind
 * it, and the point of the screen is the rule card, not the numbers. Keep the spread as it
 * is — every status, both date shapes (open-ended and closed), a rule with no rate caption,
 * and both overflow cases (a five-PSP rule, a three-method rule) each appear once, so a
 * layout change is exercised by the data rather than by a case nobody drew.
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
 * ten rules repeating three sentences would drift.
 */
export const MODE_HINT: Record<FeeMode, string> = {
  Net: 'Deducted from settlement',
  Gross: 'Charged on the full amount',
  Surcharge: 'Added to the payer’s total',
}

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
    methods: ['upi'],
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
    methods: ['credit-card', 'debit-card'],
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
    methods: ['credit-card'],
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
    description: 'All successful payments',
    psps: ['razorpay', 'payu'],
    methods: ['upi', 'upi-lite'],
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
    methods: ['credit-card', 'debit-card', 'net-banking'],
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
    methods: ['wallet', 'pay-later'],
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
    methods: ['credit-card', 'debit-card'],
    effective: '01 May 2026 →',
    validHint: 'Paused',
    when: '09 Aug 2026',
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
 * rebuilt inside a filter and inside a list row, which meant ten rules' worth of `map`/`join`
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
