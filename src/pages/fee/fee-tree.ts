/**
 * The configuration tree behind one pricing rule — what the rule actually resolves to, once
 * every fee kind, payment method and acquirer it covers is written out.
 *
 * A rule card says `Card MDR · 1.8% · Credit card, Debit card · 3 PSPs` in a line. That line
 * is a summary of a cross product, and the tree is that cross product drawn: merchant → fee
 * category → fee kind → payment method → the instrument that actually carries a price.
 *
 * The shape of the top two levels is fixed, because it is the product's, not the rule's: a
 * merchant is billed a **PA Fee** and a **Feature Fee**, and each of those is either
 * **Transactional** (priced per payment) or **Fixed** (priced per period).
 *
 * What hangs under them is the merchant's configuration, not only the rule you came in on —
 * which is the point of opening it. A rule card can tell you what *that* rule charges; only
 * the tree can tell you whether the method beside it is priced at all, and by what. The
 * methods are priced by the rule that actually covers them, and the rule you opened prices
 * its own.
 *
 * This builds the whole configuration. The **tree views** then draw only `BRANCHES` of each
 * level, because a tree is read for its shape and a shape you have to scroll twice to see is
 * not one — but that is a property of drawing a tree, not of the data, so every other view
 * (fee-views.ts) gets the lot. `TREE_METHODS` leads the method list for the same reason: the
 * two the tree cuts down to are the two chosen to be worth drawing.
 */

import { FEE_PATH } from '../../layout/navigation'
import { METHODS, type MethodId } from './brands'
import { FEE_RULES, type FeeMode, type FeeRule } from './data'

/** Where a rule's tree lives. One spelling, so the cards and the breadcrumb cannot drift. */
export const ruleHref = (rule: FeeRule) => `${FEE_PATH}/${rule.id}`

/** The merchant the shell is signed in as (AppShell.tsx). The tree's root. */
export const MERCHANT = 'Hyper Recon'

/**
 * One thing an instrument is charged for, and what it charges.
 *
 * `lines` rather than a value, because a scope priced in bands has several — written the way
 * the design writes them, `0 – 2000 → 0%`, so the band and its rate stay on one line.
 */
export type TreeScope = { label: string; lines: string[] }

/** An instrument, as it is actually priced: the leaf of the tree. */
export type TreeLeaf = { id: string; name: string; mode: FeeMode; scopes: TreeScope[] }

/** A payment method, and the instruments under it. */
export type TreeMethod = { id: string; label: string; leaves: TreeLeaf[] }

/** A fee kind. `methods` is empty where nothing is configured — the "No data" branches. */
export type TreeKind = { id: string; label: string; methods: TreeMethod[] }

/** A fee category: what the merchant is billed for. */
export type TreeCategory = { id: string; label: string; kinds: TreeKind[] }

export type FeeTree = { root: string; categories: TreeCategory[] }

/**
 * The platform fee every instrument carries on top of its MDR.
 *
 * A fixed demo value: it is a property of the platform rather than of the rule, so no rule in
 * `data.ts` carries one.
 */
export const PLATFORM_FEE = '0.05%'

/**
 * The instruments a payment method resolves to — the level this tree exists to show.
 *
 * A rule names a *method*, "UPI", but nobody is charged for "UPI": they are charged for a PPI
 * order payment, a credit-line collect, a bank-account debit. Those are different products,
 * and `platform` — whether the instrument carries the platform fee on top of its MDR — is the
 * thing that genuinely differs between them, so it is written per instrument rather than
 * applied to all of them alike.
 *
 * Demo content in the shape of the design's own tree. A method with no row here falls back to
 * a single leaf for the method itself, so nothing disappears as methods are added.
 */
const INSTRUMENTS: Partial<Record<MethodId, { name: string; platform: boolean }[]>> = {
  upi: [
    { name: 'PPI Order Payment', platform: true },
    { name: 'Credit Card Offline', platform: false },
    { name: 'Bank Account', platform: true },
    { name: 'Credit Line', platform: true },
  ],
  'upi-lite': [
    { name: 'On-device Balance', platform: false },
    { name: 'Auto Top-up', platform: true },
  ],
  'credit-card': [
    { name: 'RuPay Retail', platform: true },
    { name: 'Visa Retail', platform: false },
    { name: 'Mastercard Retail', platform: true },
    { name: 'Corporate', platform: true },
  ],
  'debit-card': [
    { name: 'RuPay Retail', platform: true },
    { name: 'Visa Retail', platform: false },
    { name: 'Mastercard Retail', platform: true },
  ],
  'net-banking': [
    { name: 'Retail', platform: true },
    { name: 'Corporate', platform: false },
  ],
  wallet: [
    { name: 'Closed Loop', platform: true },
    { name: 'Open Loop', platform: false },
  ],
  'pay-later': [{ name: 'Postpaid', platform: true }],
  'card-emi': [
    { name: 'Standard Tenure', platform: true },
    { name: 'No-cost Tenure', platform: false },
  ],
  'cardless-emi': [{ name: 'Standard Tenure', platform: true }],
}

/**
 * How much a method costs relative to the rule's headline rate.
 *
 * A rule names one rate, and the rate is what the *rule* is worth saying — but it is never
 * literally what every method under it costs. Cards carry scheme and interchange fees that
 * UPI does not; UPI Lite settles off a prefunded balance and costs less than UPI; EMI carries
 * the tenure on top of the card. So the headline is the baseline and this is the spread
 * around it, which is what makes paging a rule's methods worth doing at all.
 *
 * **Demo figures.** These are ratios chosen to sit in the right order and the right
 * neighbourhood, not a price list — nothing here was taken from a real schedule. They live in
 * one table so that the card, the tree and the coverage view cannot quote a method different
 * numbers; change the table and all three move together.
 */
const METHOD_FACTOR: Record<MethodId, number> = {
  upi: 1,
  'upi-lite': 0.6,
  'credit-card': 1.35,
  'debit-card': 1.1,
  'net-banking': 0.9,
  wallet: 1.15,
  'pay-later': 1.25,
  'card-emi': 1.45,
  'cardless-emi': 1.4,
  // The wildcard is the rule as written, so it is the rule's own rate.
  all: 1,
}

/**
 * Re-price a formatted rate for one method.
 *
 * Rates are stored the way they are written — `0.5%`, `₹3 + 1.8%`, `₹500` — so this scales
 * the numbers inside the string and leaves the shape alone. A percentage rounds to two
 * places; money rounds to the rupee from ₹10 up and to the paisa below it.
 *
 * The paisa matter. Rounding a small fee to the nearest ₹0.50 collapsed the middle of the
 * spread — on a ₹2 rule, debit at ×1.1, net banking at ×0.9 and UPI at ×1 all landed on ₹2,
 * so three consecutive pages of the pager showed the same number and the view looked broken
 * rather than precise. ₹2.20, ₹1.80 and ₹2 is both the truer figure and the legible one, and
 * it is the form the data already writes elsewhere (`₹1.50`).
 *
 * Zero stays zero at every factor, which is the one figure that must not drift: `0%` is a
 * rule saying *free*, and 0.6 times free is still free.
 */
const reprice = (rate: string, factor: number): string =>
  rate.replace(/(₹\s?)([\d,]+(?:\.\d+)?)|(\d+(?:\.\d+)?)%/g, (_match, rupee, amount, percent) => {
    if (percent !== undefined) {
      const scaled = Number(percent) * factor
      return `${Math.round(scaled * 100) / 100}%`
    }
    const scaled = Number(String(amount).replace(/,/g, '')) * factor
    if (scaled >= 10) return `${rupee}${Math.round(scaled).toLocaleString('en-IN')}`
    // Two places, so ×1.1 and ×0.9 stay apart — and trimmed at a whole rupee, so ₹2 is ₹2.
    const paisa = Math.round(scaled * 100) / 100
    return `${rupee}${Number.isInteger(paisa) ? paisa : paisa.toFixed(2)}`
  })

/**
 * What the rule charges, as the lines its MDR scope shows.
 *
 * A banded rule shows every band, which is the whole reason the tree is worth opening: the
 * card could only ever show the span across them. On a banded rule only the *rate* moves with
 * the method — the bands are spans of transaction amount, and what a payment costs does not
 * change where it falls.
 *
 * Called without a method it answers for the rule itself, which is what a view showing the
 * rule rather than one of its methods should ask for.
 */
export const mdrLines = (rule: FeeRule, method?: MethodId): string[] => {
  const factor = method ? METHOD_FACTOR[method] : 1
  return rule.slabs
    ? rule.slabs.map((slab) => `${slab.band} → ${reprice(slab.rate, factor)}`)
    : [reprice(rule.rate, factor)]
}

/** The platform fee, which moves with the method on the same ratio the MDR does. */
export const platformFee = (method?: MethodId): string =>
  reprice(PLATFORM_FEE, method ? METHOD_FACTOR[method] : 1)

/** How many children a tree view draws per level below a fee kind. See the note at the top. */
export const BRANCHES = 2

/** The first `BRANCHES` of a level — what a tree draws of it. */
export const branch = <T,>(items: T[]): T[] => items.slice(0, BRANCHES)

/**
 * The two methods a tree leads with.
 *
 * Named rather than taken in rule order, because which two is a judgement: UPI and cards
 * behave differently from each other — one banded and bank-routed, one flat and
 * network-routed — so between them they show both shapes a leaf can take.
 */
const TREE_METHODS: MethodId[] = ['upi', 'credit-card']

/**
 * Every payment method the merchant has a rule for, the two a tree draws first.
 *
 * `'all'` contributes nothing: a rule that covers every method does not say which ones the
 * merchant actually has, and the rules that name them do.
 */
function configuredMethods(): MethodId[] {
  const seen: MethodId[] = [...TREE_METHODS]
  for (const rule of FEE_RULES) {
    for (const method of rule.methods) {
      if (method !== 'all' && !seen.includes(method)) seen.push(method)
    }
  }
  return seen
}

/**
 * Which rule prices a method.
 *
 * The one you opened wins wherever it covers the method, so its own branches read as the rule
 * you came to look at. Everything else falls to the first rule that names the method, and
 * then to a catch-all rule — which is how a method ends up priced at all on a page you
 * reached through a different rule entirely.
 */
function pricedBy(method: MethodId, opened: FeeRule): FeeRule {
  if (opened.methods.includes(method) || opened.methods.includes('all')) return opened
  return (
    FEE_RULES.find((entry) => entry.methods.includes(method)) ??
    FEE_RULES.find((entry) => entry.methods.includes('all')) ??
    opened
  )
}

/** A charge that is not a payment at all: a subscription, a one-off, a per-event feature. */
type Charge = { name: string; scopes: TreeScope[] }

/** A group of those, in the shape the tree already draws methods in. */
const charges = (id: string, label: string, items: Charge[]): TreeMethod => ({
  id,
  label,
  leaves: items.map((item) => ({
    id: `${id}-${item.name}`,
    name: item.name,
    // Everything that is not a payment is charged on the full amount, invoiced rather than
    // deducted — so none of these is ever Net.
    mode: 'Gross' as FeeMode,
    scopes: item.scopes,
  })),
})

/** PA Fee → Fixed: what the merchant pays to have an acquiring stack at all. */
const PA_FIXED: TreeMethod[] = [
  charges('pa-platform', 'Platform Charges', [
    {
      name: 'Setup Fee',
      scopes: [
        { label: 'Fee', lines: ['₹25,000'] },
        { label: 'Billed', lines: ['Once, on activation'] },
      ],
    },
    {
      name: 'Gateway Rental',
      scopes: [
        { label: 'Fee', lines: ['₹1,500'] },
        { label: 'Billed', lines: ['Monthly, in advance'] },
      ],
    },
    {
      name: 'Annual Maintenance',
      scopes: [
        { label: 'Fee', lines: ['₹12,000'] },
        { label: 'Billed', lines: ['Yearly, on renewal'] },
      ],
    },
  ]),
  charges('pa-compliance', 'Compliance', [
    {
      name: 'PCI-DSS Attestation',
      scopes: [
        { label: 'Fee', lines: ['₹18,000'] },
        { label: 'Billed', lines: ['Yearly'] },
      ],
    },
    {
      name: 'Security Audit',
      scopes: [
        { label: 'Fee', lines: ['₹40,000'] },
        { label: 'Billed', lines: ['Yearly'] },
      ],
    },
  ]),
]

/** Feature Fee → Transactional: features billed by the event rather than by the period. */
const FEATURE_TRANSACTIONAL: TreeMethod[] = [
  charges('ft-payments', 'Payments', [
    {
      name: 'Tokenisation',
      scopes: [
        { label: 'Fee', lines: ['₹0.15'] },
        { label: 'Charged', lines: ['Per token issued'] },
      ],
    },
    {
      name: 'Smart Routing',
      scopes: [
        { label: 'Fee', lines: ['₹0.10'] },
        { label: 'Charged', lines: ['Per routed payment'] },
      ],
    },
    {
      name: 'Payment Links',
      scopes: [
        { label: 'Fee', lines: ['₹2.00'] },
        { label: 'Charged', lines: ['Per link paid'] },
      ],
    },
  ]),
  charges('ft-post', 'Post-payment', [
    {
      name: 'Refunds',
      scopes: [
        { label: 'Fee', lines: ['₹3.00'] },
        { label: 'Charged', lines: ['Per refund processed'] },
      ],
    },
    {
      name: 'Chargeback Handling',
      scopes: [
        { label: 'Fee', lines: ['₹500'] },
        { label: 'Charged', lines: ['Per dispute raised'] },
      ],
    },
    {
      name: 'Instant Settlement',
      scopes: [
        { label: 'Fee', lines: ['0.08%'] },
        { label: 'Charged', lines: ['Per early settlement'] },
      ],
    },
  ]),
]

/** Feature Fee → Fixed: what the merchant rents by the month, payments or not. */
const FEATURE_FIXED: TreeMethod[] = [
  charges('ff-subscriptions', 'Subscriptions', [
    {
      name: 'Dashboard Seats',
      scopes: [
        { label: 'Fee', lines: ['₹500'] },
        { label: 'Billed', lines: ['Per seat, monthly'] },
      ],
    },
    {
      name: 'Webhook Retries',
      scopes: [
        { label: 'Fee', lines: ['₹2,000'] },
        { label: 'Billed', lines: ['Monthly'] },
      ],
    },
  ]),
  charges('ff-environments', 'Environments', [
    {
      name: 'Sandbox',
      scopes: [
        { label: 'Fee', lines: ['₹0'] },
        { label: 'Billed', lines: ['Included'] },
      ],
    },
    {
      name: 'Dedicated Gateway',
      scopes: [
        { label: 'Fee', lines: ['₹35,000'] },
        { label: 'Billed', lines: ['Monthly'] },
      ],
    },
  ]),
]

export function feeTree(rule: FeeRule): FeeTree {
  const methods: TreeMethod[] = configuredMethods().map((methodId) => {
    const owner = pricedBy(methodId, rule)
    const label = METHODS[methodId].name
    const instruments = INSTRUMENTS[methodId] ?? [{ name: label, platform: true }]
    return {
      id: methodId,
      label,
      leaves: instruments.map((instrument) => ({
        id: `${methodId}-${instrument.name}`,
        name: `${label} — ${instrument.name}`,
        mode: owner.mode,
        scopes: [
          { label: 'Mdr', lines: mdrLines(owner, methodId) },
          ...(instrument.platform
            ? [{ label: 'Platform', lines: [platformFee(methodId)] }]
            : []),
        ],
      })),
    }
  })

  return {
    root: MERCHANT,
    categories: [
      {
        id: 'pa-fee',
        label: 'PA Fee',
        kinds: [
          { id: 'pa-transactional', label: 'Transactional Fee', methods },
          { id: 'pa-fixed', label: 'Fixed Fee', methods: PA_FIXED },
        ],
      },
      {
        id: 'feature-fee',
        label: 'Feature Fee',
        kinds: [
          {
            id: 'feature-transactional',
            label: 'Transactional Fee',
            methods: FEATURE_TRANSACTIONAL,
          },
          { id: 'feature-fixed', label: 'Fixed Fee', methods: FEATURE_FIXED },
        ],
      },
    ],
  }
}
