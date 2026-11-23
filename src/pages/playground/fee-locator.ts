/**
 * Playground → Fee Locator: the configuration tree the rail walks, and the charge each leaf
 * of it carries. Figma 2350:11996 ("Fee Config/SampleConfigUpload - 13").
 *
 * The frame's own vocabulary, kept verbatim rather than mapped onto FEE_RULES
 * (../fee/data.ts). The two are different fictions — the Pricing Rules page names rules
 * ("Card MDR", "UPI Slab Pricing"), this frame names *where a rule sits* (PA Fee →
 * Transactional Fee → UPI → PPI Order Payment) — and the second is the thing the frame is
 * about. `Something Fee` is the frame's placeholder and is left as drawn.
 *
 * **One card per leaf, and the order of the leaves is the order of the stream.** The frame
 * draws four cards all titled `UPI-PPI Order Payment`, which reads as four charges on one
 * node and is not what it is: the first belongs to PPI Order Payment and the second to
 * Credit Card Offline, the leaf under it in the rail. So the title is the leaf's own name,
 * and `card` sits on the leaf rather than in a list beside it — a card that could go missing
 * or double up is a card the rail cannot highlight.
 *
 * The transactional charges — their names, rates and slabs — are three merchants' live
 * configurations (Hyperpg dashboard: Google Cloud, Google Play Apps, Flipkart), merged: Google
 * Cloud's PA Fee is the fullest and the other two agree with it, and Google Play Apps' is the
 * only Feature Fee. A slab's open top end (`1000-100000000000`) is written `₹1,000+`. The fixed
 * fees are still the frame's, because no dashboard configures one.
 *
 * A transactional card's order type is its dashboard name's (`ORDER PAYMENT`, `MANDATE
 * REGISTER`); PPI's and the transaction types of PPI, RuPay Retail and Mastercard Retail are
 * the frame's own pills (`Mandate Order Payment`, `Order Refund`), and Visa Retail's is the
 * Chargeback it was given. Every other transaction type is `Order`, a placeholder.
 */

/**
 * One line of a card: a label and either a single value, or the bands of a slab.
 *
 * Both shapes read the same way — name on the left, rate on the right — which is why a slab
 * is bands under a label rather than a different kind of row. `MDR → ₹1 – ₹500 → 0%` and
 * `Platform → 1%` are the same statement at two depths.
 */
export type Charge = {
  label: string
  /** A rate that needs no bands. Mutually exclusive with `bands`. */
  value?: string
  /** A slab: the amount span on the left, what it costs on the right. */
  bands?: { band: string; rate: string }[]
}

/** How a charge is taken, as the module names it (../fee/data.ts). */
export type LocatorMode = 'Net' | 'Gross'

/** The charge card a leaf of the tree carries. */
export type LocatorCard = {
  /**
   * The charge's name, which is the leaf's place rather than its label alone — `UPI-PPI
   * Order Payment`, not `PPI Order Payment`. The rail already says where you are; a card in
   * a stream of ten has to say it on its own.
   */
  title: string
  /**
   * A shorter title Fee Locator v2 uses in place of `title`, where it has one: a UPI card
   * without its `UPI-`, which the section head over it already says, and without its order
   * type (`Order Payment`, `Recurring Mandate Register`), which the footer's pill already says.
   */
  shortTitle?: string
  mode: LocatorMode
  /** A transactional rule's priority (Priority). Fixed fees have none. */
  priority?: Priority
  charges: Charge[]
  /** What the charge applies to, along the card's bottom edge. */
  tags: string[]
}

/**
 * A node of the configuration tree.
 *
 * `id` is identity and is deliberately not the label: a label is copy and gets edited, and
 * the rail's highlight should survive that (the same reasoning as `AppRoute.id`, AGENTS.md
 * rule 9). A node has children or a card, never both — a branch is a place you can stand,
 * a leaf is where a charge is configured.
 */
export type LocatorNode = {
  id: string
  label: string
  children?: LocatorNode[]
  card?: LocatorCard
}

/**
 * A transactional card's two pills, always both and one value each: how the order was made
 * (`ORDER_PAYMENT`, `MANDATE_ORDER_PAYMENT`, `MANDATE_ORDER_REGISTER`, in sentence case), and
 * what the transaction is. There is no `Order Refund` or `Settlement`: neither is either kind.
 */
export type OrderType = 'Order payment' | 'Mandate order payment' | 'Mandate order register'
export type TxnType = 'Order' | 'Refund' | 'Chargeback'

/**
 * Which rule wins where two match the same payment, P0 first. No dashboard shows one, so the
 * values are placeholders: P0, P1, P2, P3 down each group in card order, then round again.
 */
export type Priority = 'P0' | 'P1' | 'P2' | 'P3'

/** An MDR at one rate, whatever the amount. */
const mdr = (rate: string): Charge[] => [{ label: 'MDR', value: rate }]

/**
 * An MDR cut at ₹2,000, the one cut every card network in the dashboards makes. Two bands
 * even where both rates match, because that is how the configuration is written.
 */
const mdrAt2000 = (below: string, above: string): Charge[] => [
  {
    label: 'MDR',
    bands: [
      { band: '₹0 – ₹2,000', rate: below },
      { band: '₹2,000+', rate: above },
    ],
  },
]

/** A transactional charge: its fees, its order type and transaction type, and its priority. */
const transactional = (
  title: string,
  mode: LocatorMode,
  charges: Charge[],
  orderType: OrderType,
  txn: TxnType,
  priority: Priority,
): LocatorCard => ({ title, mode, priority, charges, tags: [orderType, txn] })

/** A fixed charge: one amount, no slab, and a cadence rather than a payment method. */
const fixed = (title: string, mode: LocatorMode, value: string, cadence: string): LocatorCard => ({
  title,
  mode,
  charges: [{ label: 'Fee', value }],
  tags: [cadence],
})

const PA_FEE: LocatorNode = {
  id: 'pa-fee',
  label: 'PA Fee',
  children: [
    {
      id: 'transactional',
      label: 'Transactional Fee',
      children: [
        {
          id: 'upi',
          label: 'UPI',
          children: [
            {
              id: 'upi-mandate-register',
              label: 'Default Recurring Mandate Register',
              card: {
                ...transactional(
                  'UPI-Default Recurring Mandate Register',
                  'Net',
                  [
                    {
                      label: 'MDR',
                      bands: [
                        { band: '₹0 – ₹250', rate: '₹1' },
                        { band: '₹250 – ₹1,000', rate: '₹4.5' },
                        { band: '₹1,000+', rate: '₹5' },
                      ],
                    },
                  ],
                  'Mandate order register',
                  'Order',
                  'P0',
                ),
                shortTitle: 'Default',
              },
            },
            {
              id: 'upi-credit-line',
              label: 'Credit Line Order Payment',
              card: {
                ...transactional(
                  'UPI-Credit Line Order Payment',
                  'Net',
                  mdr('1.35%'),
                  'Order payment',
                  'Order',
                  'P1',
                ),
                shortTitle: 'Credit Line',
              },
            },
            {
              id: 'ppi-order-payment',
              label: 'PPI Order Payment',
              card: {
                ...transactional(
                  'UPI-PPI Order Payment',
                  'Net',
                  mdr('1.35%'),
                  'Mandate order payment',
                  'Refund',
                  'P2',
                ),
                shortTitle: 'PPI',
              },
            },
            {
              id: 'credit-card-offline',
              label: 'Credit Card Order Payment',
              card: {
                ...transactional(
                  'UPI-Credit Card Order Payment',
                  'Net',
                  mdr('1.95%'),
                  'Order payment',
                  'Order',
                  'P3',
                ),
                shortTitle: 'Credit Card',
              },
            },
            {
              id: 'upi-bank-account',
              label: 'Bank Account Order Payment',
              // The one charge in the dashboards with a second fee. Flipkart's is 0.02%; this
              // is the 0.025% Google Cloud and Google Play Apps both take.
              card: {
                ...transactional(
                  'UPI-Bank Account Order Payment',
                  'Net',
                  [
                    { label: 'MDR', value: '0%' },
                    { label: 'Platform', value: '0.025%' },
                  ],
                  'Order payment',
                  'Order',
                  'P0',
                ),
                shortTitle: 'Bank Account',
              },
            },
          ],
        },
        {
          id: 'credit-card',
          label: 'Credit Card',
          children: [
            {
              id: 'diners-retail',
              label: 'Diners Retail',
              card: transactional(
                'Credit Card-Diners Retail',
                'Net',
                mdrAt2000('1.8%', '1.8%'),
                'Order payment',
                'Order',
                'P0',
              ),
            },
            {
              id: 'rupay-retail',
              label: 'RuPay Retail',
              card: transactional(
                'Credit Card-RuPay Retail',
                'Net',
                mdrAt2000('1.8%', '1.8%'),
                'Order payment',
                'Refund',
                'P1',
              ),
            },
            {
              id: 'rupay-corporate',
              label: 'RuPay Corporate',
              card: transactional(
                'Credit Card-RuPay Corporate',
                'Net',
                mdrAt2000('2.25%', '2.25%'),
                'Order payment',
                'Order',
                'P2',
              ),
            },
            {
              id: 'rupay-prepaid',
              label: 'RuPay Prepaid',
              card: transactional(
                'Credit Card-RuPay Prepaid',
                'Net',
                mdrAt2000('2.25%', '2.25%'),
                'Order payment',
                'Order',
                'P3',
              ),
            },
            {
              id: 'mastercard-retail',
              label: 'Mastercard Retail',
              card: transactional(
                'Credit Card-Mastercard Retail',
                'Net',
                mdrAt2000('1.8%', '1.8%'),
                'Order payment',
                'Refund',
                'P0',
              ),
            },
            {
              id: 'mastercard-corporate',
              label: 'Mastercard Corporate',
              card: transactional(
                'Credit Card-Mastercard Corporate',
                'Net',
                mdrAt2000('2.25%', '2.25%'),
                'Order payment',
                'Order',
                'P1',
              ),
            },
            {
              id: 'mastercard-prepaid',
              label: 'Mastercard Prepaid',
              card: transactional(
                'Credit Card-Mastercard Prepaid',
                'Net',
                mdrAt2000('2.25%', '2.25%'),
                'Order payment',
                'Order',
                'P2',
              ),
            },
            {
              id: 'visa-retail',
              label: 'Visa Retail',
              card: transactional(
                'Credit Card-Visa Retail',
                'Net',
                mdrAt2000('1.8%', '1.8%'),
                'Order payment',
                'Chargeback',
                'P3',
              ),
            },
            {
              id: 'visa-corporate',
              label: 'Visa Corporate',
              card: transactional(
                'Credit Card-Visa Corporate',
                'Net',
                mdrAt2000('2.25%', '2.25%'),
                'Order payment',
                'Order',
                'P0',
              ),
            },
            {
              id: 'visa-prepaid',
              label: 'Visa Prepaid',
              card: transactional(
                'Credit Card-Visa Prepaid',
                'Net',
                mdrAt2000('2.25%', '2.25%'),
                'Order payment',
                'Order',
                'P1',
              ),
            },
          ],
        },
        {
          id: 'credit-card-emi',
          label: 'Credit Card EMI',
          children: [
            {
              id: 'emi-default',
              label: 'Default',
              card: transactional(
                'Credit Card EMI-Default',
                'Net',
                mdr('1.9%'),
                'Order payment',
                'Order',
                'P0',
              ),
            },
          ],
        },
        {
          id: 'debit-card',
          label: 'Debit Card',
          children: [
            {
              id: 'debit-rupay',
              label: 'RuPay',
              card: transactional(
                'Debit Card-RuPay',
                'Net',
                mdr('0.025%'),
                'Order payment',
                'Order',
                'P0',
              ),
            },
            {
              id: 'debit-mastercard',
              label: 'Mastercard',
              card: transactional(
                'Debit Card-Mastercard',
                'Net',
                mdrAt2000('0.35%', '0.8%'),
                'Order payment',
                'Order',
                'P1',
              ),
            },
            {
              id: 'debit-visa',
              label: 'Visa',
              card: transactional(
                'Debit Card-Visa',
                'Net',
                mdrAt2000('0.35%', '0.8%'),
                'Order payment',
                'Order',
                'P2',
              ),
            },
          ],
        },
        {
          id: 'international-card',
          label: 'International Card',
          children: [
            {
              id: 'international-diners',
              label: 'Diners',
              card: transactional(
                'International Card-Diners',
                'Net',
                mdrAt2000('2.8%', '2.8%'),
                'Order payment',
                'Order',
                'P0',
              ),
            },
            {
              id: 'international-mastercard',
              label: 'Mastercard',
              card: transactional(
                'International Card-Mastercard',
                'Net',
                mdrAt2000('2.8%', '2.8%'),
                'Order payment',
                'Order',
                'P1',
              ),
            },
            {
              id: 'international-visa',
              label: 'Visa',
              card: transactional(
                'International Card-Visa',
                'Net',
                mdrAt2000('2.8%', '2.8%'),
                'Order payment',
                'Order',
                'P2',
              ),
            },
          ],
        },
      ],
    },
    {
      id: 'fixed',
      label: 'Fixed Fee',
      children: [
        {
          id: 'platform-charge',
          label: 'Platform Charge',
          children: [
            {
              id: 'setup-fee',
              label: 'Setup Fee',
              card: fixed('Platform Charge-Setup Fee', 'Gross', '₹25,000', 'One time'),
            },
            {
              id: 'gateway-rental',
              label: 'Gateway Rental',
              card: fixed('Platform Charge-Gateway Rental', 'Net', '₹4,500', 'Monthly'),
            },
            {
              id: 'something-fee',
              label: 'Something Fee',
              card: fixed('Platform Charge-Something Fee', 'Net', '₹1,200', 'Monthly'),
            },
          ],
        },
        {
          id: 'compliance',
          label: 'Compliance',
          children: [
            {
              id: 'pci-dss',
              label: 'PCI-DSS Attestation',
              card: fixed('Compliance-PCI-DSS Attestation', 'Gross', '₹60,000', 'Yearly'),
            },
            {
              id: 'security-audit',
              label: 'Security Audit',
              card: fixed('Compliance-Security Audit', 'Gross', '₹35,000', 'Yearly'),
            },
          ],
        },
      ],
    },
  ],
}

/**
 * Feature Fee — the second root of Figma 2333:8711.
 *
 * Its ids carry a `feature-` prefix, so a label that repeats PA Fee's (`Transactional Fee`,
 * `Compliance`) is still a row of its own. The transactional charges are Google Play Apps'
 * remittance fees, the only Feature Fee any of the three dashboards configures. The
 * dashboard hangs them straight off Transactional Fee; here they sit under `Remittance`,
 * what the two have in common, because the rail stops at groups. Platform Charges and
 * Compliance are the frame's, unchanged: no dashboard configures a fixed fee.
 */
const FEATURE_FEE: LocatorNode = {
  id: 'feature-fee',
  label: 'Feature Fee',
  children: [
    {
      id: 'feature-transactional',
      label: 'Transactional Fee',
      children: [
        {
          id: 'feature-remittance',
          label: 'Remittance',
          children: [
            {
              id: 'feature-remittance-fees',
              label: 'Remittance Fees',
              card: transactional(
                'Remittance Fees',
                'Net',
                [
                  { label: 'Merchant Crossborder Remittance', value: '0.17%' },
                  { label: 'Merchant Remittance Charges', value: '0.05%' },
                ],
                'Order payment',
                'Order',
                'P0',
              ),
            },
            {
              id: 'feature-tax-on-remittance',
              label: 'Tax On Remittance',
              card: transactional(
                'Tax On Remittance',
                'Net',
                [
                  // In lakhs: ₹1,00,000 – ₹10,00,000 would not fit beside rates this long.
                  {
                    label: 'Merchant Tax On Remittance',
                    bands: [
                      { band: '₹0 – ₹1L', rate: '0.18% (min ₹45, max ₹180)' },
                      { band: '₹1L – ₹10L', rate: '₹180 + 0.09% (min ₹180, max ₹990)' },
                      { band: '₹10L+', rate: '₹990 + 0.018% (min ₹990, max ₹10,800)' },
                    ],
                  },
                ],
                'Order payment',
                'Order',
                'P1',
              ),
            },
          ],
        },
      ],
    },
    {
      id: 'feature-fixed',
      label: 'Fixed Fee',
      children: [
        {
          id: 'feature-platform-charges',
          label: 'Platform Charges',
          children: [
            {
              id: 'feature-setup-fee',
              label: 'Setup Fee',
              card: fixed('Platform Charges-Setup Fee', 'Gross', '₹10,000', 'One time'),
            },
            {
              id: 'feature-gateway-rental',
              label: 'Gateway Rental',
              card: fixed('Platform Charges-Gateway Rental', 'Net', '₹2,000', 'Monthly'),
            },
          ],
        },
        {
          id: 'feature-compliance',
          label: 'Compliance',
          children: [
            {
              id: 'feature-pci-dss',
              label: 'PCI-DSS Attestation',
              card: fixed('Compliance-PCI-DSS Attestation', 'Gross', '₹20,000', 'Yearly'),
            },
            {
              id: 'feature-security-audit',
              label: 'Security Audit',
              card: fixed('Compliance-Security Audit', 'Gross', '₹15,000', 'Yearly'),
            },
          ],
        },
      ],
    },
  ],
}

/**
 * The whole configuration: an unnamed container over the roots the rail draws as headings.
 *
 * A container rather than a list of roots, so every walk below — leaves, paths, counts —
 * stays a walk of one tree. The rail never draws this node; it starts at its children.
 */
export const FEE_TREE: LocatorNode = {
  id: 'fee-config',
  label: 'Fee configuration',
  children: [PA_FEE, FEATURE_FEE],
}

/** A node that carries a card — so the stream never has to ask whether one is there. */
export type LocatorLeaf = LocatorNode & { card: LocatorCard }

const isLeaf = (node: LocatorNode): node is LocatorLeaf => node.card !== undefined

/** Every node that carries a card, in the order the rail draws them — and the stream's order. */
function leavesOf(node: LocatorNode): LocatorLeaf[] {
  if (isLeaf(node)) return [node]
  return (node.children ?? []).flatMap(leavesOf)
}

/**
 * The stream, derived from the tree rather than listed beside it.
 *
 * Two orders that have to agree — the rail's and the column's — are one order read twice,
 * or the rail highlights the wrong row the first time a node moves.
 */
export const LEAVES = leavesOf(FEE_TREE)

/**
 * A run of the stream that shares a parent — UPI's two cards, Credit Card's three — with the
 * branches above that parent (`trail`, from PA Fee or Feature Fee down; the container is
 * left out) and where in LEAVES the run starts.
 */
export type LocatorSection = {
  node: LocatorNode
  trail: LocatorNode[]
  start: number
  leaves: LocatorLeaf[]
}

/**
 * The stream cut where the rail counts: one section per row that carries a `· N`.
 *
 * Cut by consecutive parent rather than grouped, so a section is always a contiguous stretch
 * of LEAVES and a card's index in the stream is its section's `start` plus its place in it.
 */
export const SECTIONS = LEAVES.reduce<LocatorSection[]>((sections, leaf, index) => {
  const path = pathTo(leaf.id)
  const parent = path[path.length - 2]
  const current = sections[sections.length - 1]
  if (current?.node.id === parent.id) current.leaves.push(leaf)
  else sections.push({ node: parent, trail: path.slice(1, -2), start: index, leaves: [leaf] })
  return sections
}, [])

/** Where a node's own stretch of the stream starts: its first leaf, or itself if it is one. */
export function firstCardIndex(node: LocatorNode): number {
  const [first] = leavesOf(node)
  return first ? LEAVES.indexOf(first) : -1
}

/**
 * The path from the root down to `id`, root first, or an empty array if there is no such node.
 *
 * Derived rather than stored, because a path stored beside the tree is a second copy of the
 * tree's shape and the two drift the first time a node moves.
 */
export function pathTo(id: string, node: LocatorNode = FEE_TREE): LocatorNode[] {
  if (node.id === id) return [node]
  for (const child of node.children ?? []) {
    const below = pathTo(id, child)
    if (below.length) return [node, ...below]
  }
  return []
}

/**
 * What the rail writes after a label as `· N`.
 *
 * Only where the children are leaves, which is what the frame draws: `UPI · 2` and
 * `Credit Card · 3` are counted, `Transactional Fee` above them is not. The count means
 * *how many charges sit under this*, and that is only a number you can trust at the level
 * where the next step down is the charge itself.
 */
export function leafCount(node: LocatorNode): number | undefined {
  const children = node.children
  if (!children?.length) return undefined
  return children.every((child) => !child.children?.length) ? children.length : undefined
}
