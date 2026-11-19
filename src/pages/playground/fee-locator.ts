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
 * The figures past the first two are invented in the same spirit as data.ts: plausible, in
 * the right order, not a price list. The first two are the frame's, to the digit.
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
  mode: LocatorMode
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

/** The slab the frame draws on both of its transactional cards. */
const UPI_BANDS = [
  { band: '₹1 – ₹500', rate: '0%' },
  { band: '₹500 – ₹2,000', rate: '0.3%' },
  { band: '₹2,000 – ₹5,000', rate: '0.5%' },
  { band: '₹5,000+', rate: '0.6%' },
]

const CARD_BANDS = [
  { band: '₹1 – ₹2,000', rate: '1.2%' },
  { band: '₹2,000 – ₹10,000', rate: '1.6%' },
  { band: '₹10,000+', rate: '1.9%' },
]

/** A transactional charge: a slab, then what is taken on top of it. */
const transactional = (
  title: string,
  mode: LocatorMode,
  bands: { band: string; rate: string }[],
  platform: string,
  tags: string[],
): LocatorCard => ({
  title,
  mode,
  charges: [
    { label: 'MDR', bands },
    { label: 'Platform', value: platform },
    { label: 'Remittance', value: '5%' },
  ],
  tags,
})

/** A fixed charge: one amount, no slab, and a cadence rather than a payment method. */
const fixed = (title: string, mode: LocatorMode, value: string, cadence: string): LocatorCard => ({
  title,
  mode,
  charges: [{ label: 'Fee', value }],
  tags: [cadence],
})

export const FEE_TREE: LocatorNode = {
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
              id: 'ppi-order-payment',
              label: 'PPI Order Payment',
              // The frame's first card, to the digit.
              card: transactional('UPI-PPI Order Payment', 'Gross', UPI_BANDS, '1%', [
                'Mandate Order Payment',
                'Order Refund',
              ]),
            },
            {
              id: 'credit-card-offline',
              label: 'Credit Card Offline',
              // The frame's second card, which it titles `UPI-PPI Order Payment` and which
              // belongs to this leaf — the retitling is the whole correction.
              card: transactional('UPI-Credit Card Offline', 'Net', UPI_BANDS, '1%', [
                'Order Payment',
                'Settlement',
              ]),
            },
          ],
        },
        {
          id: 'credit-card',
          label: 'Credit Card',
          children: [
            {
              id: 'rupay-retail',
              label: 'RuPay Retail',
              card: transactional('Credit Card-RuPay Retail', 'Gross', CARD_BANDS, '0.8%', [
                'Order Payment',
                'Order Refund',
              ]),
            },
            {
              id: 'visa-retail',
              label: 'Visa Retail',
              card: transactional('Credit Card-Visa Retail', 'Net', CARD_BANDS, '1%', [
                'Order Payment',
                'Settlement',
              ]),
            },
            {
              id: 'mastercard-retail',
              label: 'Mastercard Retail',
              card: transactional('Credit Card-Mastercard Retail', 'Gross', CARD_BANDS, '1%', [
                'Order Payment',
                'Order Refund',
              ]),
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
