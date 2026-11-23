/**
 * Playground → Fee Locator. Figma 2350:11996, recreated.
 *
 * Every charge in the configuration, as one stream of cards, with a rail beside it that says
 * where in the tree the cards in front of you sit. **The rail follows the stream — it is not
 * a filter and it does not choose what the column shows.** The column always shows
 * everything; what moves is where you are in it.
 *
 * That is the whole idea, and it is why the frame is two halves. A stream of charge cards
 * answers *what does this merchant pay*. It cannot answer *and what is this one* —
 * `Credit Card-Visa Retail` names its place only because the title spells it out, and a
 * title is a poor map. So the rail draws the map, keeps every branch visible, and lights the
 * paths down to what is on screen (useCardFocus says exactly what, and why it is not a guess).
 *
 * Which is also why the rail draws connectors and not disclosure chevrons: the whole tree is
 * already open and nothing in the rail expands. Every row hangs off its parent by a faint
 * line, and the path to a lit card is the same line drawn darker — one unbroken stroke from
 * the root to the row (RailLines).
 *
 * The rail is still clickable, as the other half of the same bargain — a map you can read
 * but not travel on is half a map. A click scrolls the stream to that node's first card and
 * keeps it lit until you scroll on your own.
 *
 * The frame draws four cards all titled `UPI-PPI Order Payment`. They are not four charges
 * on one node — the second is Credit Card Offline's, and the retitling lives in
 * fee-locator.ts, where each leaf carries exactly one card.
 *
 * Four places this departs from the frame, each because the module already decided otherwise
 * and one app with two vocabularies is worse than one frame redrawn:
 *
 *   - off-path rows are gray[500], not the frame's gray[400], which AGENTS.md rule 10 keeps
 *     for placeholders and disabled text. The path still reads as the dark one.
 *   - cards take the module's 12px panel radius (PANEL_STYLE) rather than the frame's 8.
 *   - `Gross`/`Net` go through ModeTag, so they are the module's blue and green rather than
 *     the frame's purple and blue — purple means `Surcharge` everywhere else in Fee.
 *     (v2 takes the frame's purple for `Gross` back: there is no `Surcharge` on this page.)
 *   - the bottom tags are NeutralTag, rounded like every other tag in the module, not the
 *     frame's squarical.
 */

import { FOUNDATION_THEME, TagV2Color, TagV2SubType } from '@juspay/blend-design-system'
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { FEEDBACK_EASING, FEEDBACK_MS, MICRO_MS } from '../../motion'
import { font, PrimitiveText } from '../../primitives'
import { ModeTag, NeutralTag } from '../fee/tags'
import { PANEL_STYLE } from '../pacb/helpers'
import { PacbPage } from '../pacb/kit'
import {
  FEE_TREE,
  firstCardIndex,
  leafCount,
  LEAVES,
  pathTo,
  SECTIONS,
  type Charge,
  type LocatorCard,
  type LocatorMode,
  type LocatorNode,
  type LocatorSection,
} from './fee-locator'
import { useLocatorDials, type LocatorVersion } from './fee-locator-layout'
import { StoryFrame, StoryHeading } from './StoryFrame'

const { colors } = FOUNDATION_THEME

/** One level of indent, and the row's height — the frame's 32px square, both ways. */
const SLOT = 32

/** The frame's rail and card column, and the gutter between them (166px, put on the grid). */
const RAIL_WIDTH = 224
const CARD_WIDTH = 421
const GUTTER = 168

/** gray[100], the frame's rule above the tags — a shade lighter than the card's own edge. */
const INNER_RULE = `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[100]}`

/**
 * The frame's header rule, dashed and full width. Dashed because what is above it names the
 * charge and what is below it is the charge — a weaker break than the card's own edge, and a
 * different one from the solid rule that separates the figures from the tags.
 */
const HEADER_RULE = `${FOUNDATION_THEME.border.width[1]} dashed ${colors.gray[200]}`

const CARD_STYLE: CSSProperties = { ...PANEL_STYLE, width: CARD_WIDTH, maxWidth: '100%' }

/**
 * The rail's hover, handed to `.locator-row` in index.css — which keeps no values of its own
 * (rule 1). A micro gesture rather than feedback: the fill is acknowledging the pointer, and
 * nothing has happened yet.
 */
const MOTION = {
  '--locator-hover': colors.gray[50],
  '--locator-micro': `${MICRO_MS}ms`,
  '--locator-feedback': `${FEEDBACK_MS}ms`,
  '--locator-ease': FEEDBACK_EASING,
  // v2's card hover (`.locator-card`): the hairline's own gray at rest, gray[400] and the sm
  // shadow under the pointer — the card lifts to say it is the one the rail is showing.
  '--locator-card-edge': colors.gray[200],
  '--locator-card-edge-hover': colors.gray[400],
  '--locator-card-shadow': FOUNDATION_THEME.shadows.sm,
} as CSSProperties

/** The rail's distance from the top of the scroll area once it pins. */
const SCROLL_INSET = 24

/**
 * A section's title block — its trail, its name and its count — and the height it keeps while
 * pinned to the top of the scroll area with that section's cards passing under it.
 *
 * Fixed rather than measured, because two things key off it: the card a click lands on rests
 * just below it, and a card only counts as in view for the part of it below it.
 */
const SECTION_HEAD = 80

/** Under the head's own type, so the title sits on its cards rather than floating over them. */
const SECTION_HEAD_FOOT = 14

/** The trail's line (`PA Fee / Transactional Fee`, body.sm) — what a head without one is short of. */
const TRAIL_LINE = 18

/**
 * Between one section's last card and the next section's head. The head's own height already
 * carries air above its title, so this plus that is the 40-odd px that says "new section"
 * where the 16px between cards says "same section".
 */
const SECTION_GAP = 24

/** The page content scrolls this, not the window (AGENTS.md rule 8). */
const scrollRoot = () => document.querySelector<HTMLElement>('[data-main-content]')

/**
 * How much of a card has to be on screen for the rail to count it as in view: half of it, or
 * — for a slab card taller than half the window — half the window.
 */
const IN_VIEW = 0.5

const sameList = (a: number[], b: number[]) =>
  a.length === b.length && a.every((value, index) => value === b[index])

/**
 * Which cards the rail should light, and how to put one on screen.
 *
 * Not a scrollspy. A spy picks *one* card by a rule — the last past a line — and states it as
 * where you are, which is a guess: your eye may be on the card below it, and a card that never
 * reaches the line (the last ones, on a tall window) can never be picked at all. So the rail
 * is told only what the page actually knows, strongest first:
 *
 *   1. the card under the pointer — the one signal that is close to where you are looking;
 *   2. the card a rail click sent you to, until you scroll yourself — you asked for it;
 *   3. otherwise every card in view, each lit — what is on screen, without choosing.
 *
 * The window's top edge is measured from below the pinned heads (`topInset`), since a card
 * passing under them is no longer readable.
 */
function useCardFocus(count: number, topInset: number) {
  const cards = useRef<(HTMLElement | null)[]>([])
  const pointer = useRef<{ x: number; y: number } | null>(null)
  const [inView, setInView] = useState<number[]>([0])
  const [pointed, setPointed] = useState<number | null>(null)
  const [pinned, setPinned] = useState<number | null>(null)
  const [tail, setTail] = useState(0)
  const tailNow = useRef(0)

  useEffect(() => {
    const root = scrollRoot()
    if (!root) return
    let frame = 0
    const measure = () => {
      frame = 0
      const view = root.getBoundingClientRect()
      // Exactly the room the last card needs to reach the top — its top resting under the
      // pinned heads at full scroll, and not a pixel further, so the stream can never be
      // scrolled off into blank page. Worked out against the current tail, which is part of
      // the scroll height being measured.
      const last = cards.current[count - 1]
      if (last) {
        const reach = last.getBoundingClientRect().top - view.top + root.scrollTop - topInset
        const scrollable = root.scrollHeight - tailNow.current - root.clientHeight
        const room = Math.max(0, Math.ceil(reach - scrollable))
        if (Math.abs(room - tailNow.current) > 1) {
          tailNow.current = room
          setTail(room)
        }
      }
      const top = view.top + topInset
      const height = view.bottom - top
      const next: number[] = []
      let fallback = 0
      let most = -Infinity
      let under: number | null = null
      const at = pointer.current
      cards.current.slice(0, count).forEach((card, index) => {
        if (!card) return
        const rect = card.getBoundingClientRect()
        const shown = Math.min(rect.bottom, view.bottom) - Math.max(rect.top, top)
        if (shown >= Math.min(rect.height, height) * IN_VIEW) next.push(index)
        if (shown > most) {
          most = shown
          fallback = index
        }
        if (
          at &&
          at.y >= top &&
          at.x >= rect.left &&
          at.x <= rect.right &&
          at.y >= rect.top &&
          at.y <= rect.bottom
        ) {
          under = index
        }
      })
      // Something is always on screen; if no card clears the bar, the most visible one stands.
      if (!next.length) next.push(fallback)
      setInView((current) => (sameList(current, next) ? current : next))
      setPointed(under)
    }
    const schedule = () => {
      frame ||= requestAnimationFrame(measure)
    }
    const onPointer = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY }
      schedule()
    }
    const onLeave = () => {
      pointer.current = null
      schedule()
    }
    // Only a scroll the reader made releases a click's pin — the smooth scroll the click
    // itself started fires `scroll` too, and must not undo it.
    const release = () => setPinned(null)
    measure()
    root.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('pointermove', onPointer, { passive: true })
    document.documentElement.addEventListener('pointerleave', onLeave)
    root.addEventListener('wheel', release, { passive: true })
    root.addEventListener('touchmove', release, { passive: true })
    window.addEventListener('keydown', release)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      root.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('pointermove', onPointer)
      document.documentElement.removeEventListener('pointerleave', onLeave)
      root.removeEventListener('wheel', release)
      root.removeEventListener('touchmove', release)
      window.removeEventListener('keydown', release)
    }
  }, [count, topInset])

  /**
   * Put a card just under the pinned heads, and pin it as the lit one until the reader
   * scrolls. A section's first card lands with its own head exactly where that head would
   * sit anyway, so a click on `UPI · 2` opens the section.
   */
  const scrollToCard = useCallback(
    (index: number) => {
      const root = scrollRoot()
      const card = cards.current[index]
      if (!root || !card) return
      setPinned(index)
      const top =
        card.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop
      root.scrollTo({
        top: top - topInset,
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'auto'
          : 'smooth',
      })
    },
    [topInset],
  )

  const lit = pointed !== null ? [pointed] : pinned !== null ? [pinned] : inView
  return { cards, lit, tail, scrollToCard }
}

/**
 * Where a parent's connector runs: this far right of where the parent's label starts, so the
 * line drops from under its first letter rather than from empty air beside it.
 */
const TRUNK_INSET = 6

/** The bend where a connector turns from the trunk toward a child's label. */
const BEND = 6

/** Air between a connector's end and the label it points at. */
const LEAD_GAP = 6

/** From a row's middle to just under its text — where a parent's line starts. */
const UNDER_TEXT = 12

/** Faint enough to be structure; the path is the line you are meant to read. */
const TREE_LINE = colors.gray[200]
const PATH_LINE = colors.gray[400]

/**
 * A charge card's vertical spacing, top down: the card's padding above the title, the gap
 * from the title row to the dashed rule, and the gap from the rule to the first charge.
 * `tagBox` sizes the Gross/Net tag's wrapper to the tag, rather than to a 24px line box.
 * `ticket` draws the rule as a ticket's perforation (TicketRule) instead of a dashed border.
 * `tagShape` is the shape of the tags along the card's foot.
 * `modes` overrides the Gross/Net tag's colour, per mode (ModeTag's `palette`).
 * `shortTitles` titles a card by its `shortTitle` (`PPI`) where it has one, and otherwise drops
 * the section's name from the front of it (`Credit Card-RuPay Retail` → `RuPay Retail`).
 * `priority` adds the card's priority (`P0`–`P3`) as the last pill, where it has one.
 */
type CardSpacing = {
  top: number
  ruleAbove: number
  ruleBelow: number
  tagBox: boolean
  ticket: boolean
  tagShape: TagV2SubType
  modes: Partial<Record<LocatorMode, TagV2Color>>
  shortTitles: boolean
  priority: boolean
}

/**
 * v1 as first built. Measured, it has three slips: the tag's wrapper is a block on the
 * page's 16px/24px line, so the tag sits on a baseline 2px below the title and the row is
 * 24px tall; the header strip — which the full-width dashed rule makes a band of its own —
 * holds 22px above the title and 12px below it; and the body opens 14px under the rule but
 * closes on 20px.
 */
const V1_CARD_SPACING: CardSpacing = {
  top: 20,
  ruleAbove: 10,
  ruleBelow: 14,
  tagBox: false,
  ticket: false,
  tagShape: TagV2SubType.ROUNDED,
  modes: {},
  shortTitles: false,
  priority: false,
}

/**
 * v2 fixes them: the tag's wrapper is a flex box, so the row is the 20px of its title and
 * the two share a centre; the header strip is 16px either side of the title; and the body is
 * 20px under the rule, matching the 20px it closes on and the 20px at the sides. And the
 * rule is a perforation, so the card reads as a ticket: header stub above, charge below.
 */
const V2_CARD_SPACING: CardSpacing = {
  top: 16,
  ruleAbove: 16,
  ruleBelow: 20,
  tagBox: true,
  ticket: true,
  // Squarical, as the frame draws them — v1 kept the module's rounded ones.
  tagShape: TagV2SubType.SQUARICAL,
  // Gross in the frame's purple; Net keeps the module's green.
  modes: { Gross: TagV2Color.PURPLE },
  shortTitles: true,
  priority: true,
}

/** The perforation's dash and the gap after it — longer than a browser's dashed border. */
const PERF_DASH = 6
const PERF_GAP = 4

/**
 * A punch's height; its depth into the card is half that, so each is a half-circle. The same
 * 14px as the Fee module's ticket punches (../fee/FeeGroup.tsx), so the two tickets agree.
 */
const PUNCH = 14

/** Air between a punch and where the dashes start, so the line reads as running into it. */
const PUNCH_CLEAR = 4

/**
 * Between one root's tree and the next — wider than the 16px between branches, because PA
 * Fee and Feature Fee are two configurations, not two halves of one.
 */
const ROOT_GAP = 32


/**
 * How each version dresses the rail and the section heads — one row per version, so v2 can
 * keep moving without v1 changing under it.
 *
 * `offPath` — a rail row's label when it is not on a lit path. v1 keeps gray[500] (see the
 *   module comment on rule 10). v2 drops to gray[400], as asked: with the leaves gone the
 *   rail is a dozen short group names, and fading the ones you are not reading lets the lit
 *   path stand alone — the trade is that gray[400] is the shade the app otherwise keeps for
 *   placeholders and disabled text.
 * `rootOff` — a root heading (PA Fee, Feature Fee) with nothing under it lit. v1 never fades
 *   a heading; v2 fades it with its rows, so the root you are not in steps back too.
 * `counts` — `UPI · 2` in the rail and `2 charges` in the section head. v2 drops both: the
 *   cards are right there to count, and the number was the noisiest thing on each line.
 * `card` — the charge card's vertical rhythm around its dashed rule (ChargeCard).
 * `header` — the page subtitle and the story heading under the title; v2 drops both.
 * `rootFont` — a root heading's type. v1 sets it a size up (body.lg); v2 sets it at the rows'
 *   own body.md and lets weight alone mark it — 600 against the rows' 500.
 * `line` — the rail connectors' stroke, in px. v2 draws them a hairline thinner.
 * `pathLine` — the lit route. v1 draws it in a darker gray; v2 in the primary blue, so the
 *   route reads as the selection. The unlit tree stays gray in both.
 * `frame` — the bordered canvas round the stream. v2 drops it: the rail sits on the page's
 *   left edge, under the title, and the cards down the middle of the page.
 * `trail` — the `PA Fee / Transactional Fee` line over each section's name. v2 drops it, and its
 *   head is that line shorter (`sectionHead`); the rail beside it already shows the path.
 * `rootLead` — room under a root heading, so its first row sits a row's pitch (32px) below it
 *   rather than 26px. `rootGap` — between PA Fee and Feature Fee; v2 widens it so the break
 *   between roots (74px) is plainly more than the 48px between groups inside one.
 */
const VERSION_LOOK = {
  v1: {
    offPath: colors.gray[500],
    rootOff: colors.gray[700],
    counts: true,
    header: true,
    rootFont: FOUNDATION_THEME.font.size.body.lg,
    line: 1.5,
    pathLine: PATH_LINE,
    frame: true,
    trail: true,
    sectionHead: SECTION_HEAD,
    rootLead: 0,
    rootGap: ROOT_GAP,
    card: V1_CARD_SPACING,
  },
  v2: {
    offPath: colors.gray[400],
    rootOff: colors.gray[400],
    counts: false,
    header: false,
    rootFont: FOUNDATION_THEME.font.size.body.md,
    line: 1,
    pathLine: colors.primary[600],
    frame: false,
    trail: false,
    sectionHead: SECTION_HEAD - TRAIL_LINE,
    // A row centres its 20px line in 32px, 6px above it; the heading is a bare 20px line.
    rootLead: 6,
    rootGap: ROOT_GAP + SLOT / 2,
    card: V2_CARD_SPACING,
  },
} satisfies Record<LocatorVersion, unknown>

type VersionLook = (typeof VERSION_LOOK)[LocatorVersion]

/**
 * motion.ts's feedback curve as the four numbers Motion takes — parsed rather than retyped,
 * so rule 14 keeps one source of truth.
 */
const FEEDBACK_BEZIER = (FEEDBACK_EASING.match(/[\d.]+/g) ?? []).map(Number) as [
  number,
  number,
  number,
  number,
]

/** A row's vertical middle and the foot of its text, in the rail's own coordinates. */
type RowMetrics = { mid: number; foot: number }

/** Every node's depth, the root at 0 — the same depth that sets a row's indent. */
function depthsOf(node: LocatorNode, depth = 0, into = new Map<string, number>()) {
  into.set(node.id, depth)
  node.children?.forEach((child) => depthsOf(child, depth + 1, into))
  return into
}

// The container sits a level above the roots, so the roots — PA Fee, Feature Fee — are 0.
const DEPTHS = depthsOf(FEE_TREE, -1)

/** Whether the rail draws a node: every branch always, a charge only when `leaves` is on. */
const drawn = (node: LocatorNode, leaves: boolean) => leaves || !node.card

/**
 * The connectors, drawn once over the whole rail rather than one glyph per row.
 *
 * A glyph per row can only draw inside its own 32px, so a path that skips a sibling — UPI to
 * Credit Card Offline, past PPI Order Payment — broke into an elbow floating beside the row
 * with nothing above it. One drawing over the rail can run a line through any number of rows,
 * so the trunk from UPI · 2 is continuous all the way down to whichever child is lit.
 *
 * Two layers of the same geometry: every parent-to-child connector in TREE_LINE, so off-path
 * rows still hang from something, and the routes to every lit card over it in PATH_LINE.
 *
 * Several cards can be lit at once, so the lit layer is a set of connectors rather than one
 * path: the routes are merged, a connector two routes share is drawn once, and each is keyed
 * by its two ends. A connector arriving draws in from its parent toward the row; one leaving
 * fades. So as the stream scrolls, new rows are reached by a line growing out of the tree and
 * old ones let go of it, and a connector that stays lit never flickers. Positions are measured
 * off the rendered rows, because the gap between Transactional Fee and Fixed Fee and the
 * heading's own height are layout's to decide, not this drawing's.
 */
function RailLines({
  rows,
  routes,
  leaves,
  width,
  pathColor,
}: {
  rows: Map<string, RowMetrics>
  routes: LocatorNode[][]
  /** Whether the rail draws the charges themselves (v1) or stops at their groups (v2). */
  leaves: boolean
  /** Stroke width in px (VersionLook.line). */
  width: number
  /** The lit route's colour (VersionLook.pathLine). */
  pathColor: VersionLook['pathLine']
}) {
  const edge = (parent: LocatorNode, child: LocatorNode) => {
    const from = rows.get(parent.id)
    const to = rows.get(child.id)
    if (!from || !to) return ''
    const x = (DEPTHS.get(parent.id) ?? 0) * SLOT + TRUNK_INSET
    const end = (DEPTHS.get(child.id) ?? 0) * SLOT - LEAD_GAP
    return `M${x} ${from.foot}V${to.mid - BEND}Q${x} ${to.mid} ${x + BEND} ${to.mid}H${end}`
  }

  const tree: string[] = []
  const walk = (node: LocatorNode) =>
    node.children?.filter((child) => drawn(child, leaves)).forEach((child) => {
      tree.push(edge(node, child))
      walk(child)
    })
  // From each root down: the container is not drawn, so nothing connects the roots to it.
  FEE_TREE.children?.forEach(walk)

  const lit = new Map<string, string>()
  routes.forEach((route) =>
    route.slice(1).forEach((node, index) => {
      const parent = route[index]
      lit.set(`${parent.id}>${node.id}`, edge(parent, node))
    }),
  )
  const reduced = useReducedMotion()
  const transition = { duration: reduced ? 0 : FEEDBACK_MS / 1000, ease: FEEDBACK_BEZIER }

  return (
    <svg
      className="pointer-events-none absolute top-0 left-0 overflow-visible"
      width={RAIL_WIDTH}
      height={1}
      fill="none"
      strokeWidth={width}
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d={tree.join('')} stroke={TREE_LINE} />
      {/* Not drawn until the rows are measured, and not animated on the first lit set. */}
      {rows.size > 0 && (
        <AnimatePresence initial={false}>
          {[...lit].map(([key, d]) => (
            <motion.path
              key={key}
              d={d}
              stroke={pathColor}
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{ pathLength: 1, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={transition}
            />
          ))}
        </AnimatePresence>
      )}
    </svg>
  )
}

/**
 * One row of the rail.
 *
 * `depth` slots of 32px sit before the label, and nothing is drawn in them here — the
 * connectors belong to RailLines, which can run a line past a row as well as into it.
 */
function LocatorRow({
  node,
  depth,
  onPath,
  look,
  onSelect,
  rowRef,
}: {
  node: LocatorNode
  depth: number
  onPath: boolean
  /** How this version dresses the rail (VERSION_LOOK). */
  look: VersionLook
  onSelect: (node: LocatorNode) => void
  rowRef: (id: string, element: HTMLElement | null) => void
}) {
  const count = leafCount(node)
  return (
    <button
      ref={(element) => rowRef(node.id, element)}
      type="button"
      onClick={() => onSelect(node)}
      aria-current={onPath ? 'true' : undefined}
      className="locator-row flex w-full items-center text-left"
      style={{
        height: SLOT,
        paddingLeft: depth * SLOT,
        borderRadius: FOUNDATION_THEME.border.radius[8],
      }}
    >
      <PrimitiveText
        {...font(FOUNDATION_THEME.font.size.body.md)}
        color={onPath ? colors.gray[700] : look.offPath}
        truncate
      >
        {count === undefined || !look.counts ? node.label : `${node.label} · ${count}`}
      </PrimitiveText>
    </button>
  )
}

/** A node and everything under it, flattened into rows — the tree is open at every level. */
function RailBranch({
  node,
  depth,
  path,
  leaves,
  look,
  onSelect,
  rowRef,
}: {
  node: LocatorNode
  depth: number
  path: Set<string>
  leaves: boolean
  look: VersionLook
  onSelect: (node: LocatorNode) => void
  rowRef: (id: string, element: HTMLElement | null) => void
}) {
  return (
    <>
      <LocatorRow
        node={node}
        depth={depth}
        onPath={path.has(node.id)}
        look={look}
        onSelect={onSelect}
        rowRef={rowRef}
      />
      {node.children
        ?.filter((child) => drawn(child, leaves))
        .map((child) => (
          <RailBranch
            key={child.id}
            node={child}
            depth={depth + 1}
            path={path}
            leaves={leaves}
            look={look}
            onSelect={onSelect}
            rowRef={rowRef}
          />
        ))}
    </>
  )
}

/**
 * Each row's middle and text foot, relative to the rail, re-measured whenever the rail's size
 * changes — which is when a web font landing or a wrap could have moved a row — and whenever
 * `shape` does: a rail capped at its max height keeps its size when rows come and go, so a
 * size change alone would miss the switch between versions.
 */
function useRowMetrics(shape: unknown) {
  const rail = useRef<HTMLElement | null>(null)
  const elements = useRef(new Map<string, HTMLElement>())
  const [rows, setRows] = useState(() => new Map<string, RowMetrics>())

  const rowRef = useCallback((id: string, element: HTMLElement | null) => {
    if (element) elements.current.set(id, element)
    else elements.current.delete(id)
  }, [])

  useLayoutEffect(() => {
    const root = rail.current
    if (!root) return
    const measure = () => {
      // In the rail's content coordinates, so a rail scrolled on its own still measures true.
      const top = root.getBoundingClientRect().top - root.scrollTop
      const next = new Map<string, RowMetrics>()
      elements.current.forEach((element, id) => {
        const rect = element.getBoundingClientRect()
        const mid = rect.top - top + rect.height / 2
        next.set(id, { mid, foot: mid + UNDER_TEXT })
      })
      setRows(next)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    return () => observer.disconnect()
  }, [shape])

  return { rail, rows, rowRef, elements }
}

/** How much rail the lit row keeps above and below it when the rail scrolls to follow. */
const FOLLOW_MARGIN = 48

/**
 * The rail: each root as a heading, then its branches with 16px of air between them.
 *
 * Sticky, because a map that scrolls away with the thing it is mapping is a list. It is the
 * one part of the page that must stay put while the stream moves under it.
 *
 * Two roots make it taller than a window, so it is capped at the height left under the
 * pinned page head and scrolls on its own — and follows: when the lit rows would leave its
 * view it scrolls to keep them in, with their root heading too when it all fits. Without
 * that, reading Feature Fee's cards lights rows below the fold and the map says nothing.
 *
 * The air between branches is the frame's, and it is the only grouping a tree has — it is
 * otherwise a single 32px column with nothing to say where Transactional Fee ends and Fixed
 * Fee begins.
 */
function LocatorRail({
  lit: litLeaves,
  pinTop,
  leaves,
  look,
  onSelect,
}: {
  /** The leaves to light, in stream order. */
  lit: string[]
  /** The pinned page head's height — the rail pins this far down, plus its own inset. */
  pinTop: number
  /** Draw the charges themselves (v1), or stop at their groups (v2). */
  leaves: boolean
  /** How this version dresses the rail (VERSION_LOOK). */
  look: VersionLook
  onSelect: (node: LocatorNode) => void
}) {
  // Without leaf rows a lit card lights its group instead — `UPI · 2` for either UPI card —
  // so two lit cards in one group are one lit row, not two.
  const lit = leaves
    ? litLeaves
    : [
        ...new Set(
          litLeaves.map((id) => {
            const route = pathTo(id)
            return route[route.length - 2]?.id ?? id
          }),
        ),
      ]
  // The container is the first step of every route and is never drawn; lines start at the
  // root headings.
  const routes = lit.map((id) => pathTo(id).slice(1))
  const path = new Set(routes.flat().map((node) => node.id))
  const { rail, rows, rowRef, elements } = useRowMetrics(look)
  const [maxHeight, setMaxHeight] = useState<number>()

  useEffect(() => {
    const root = scrollRoot()
    const row = rail.current?.parentElement
    if (!root || !row) return
    const fit = () => {
      // The rail pins only within its row, and at the foot of the stream the row ends above
      // the window's bottom by whatever the page puts after it (the canvas padding, the
      // page's own). Capped to fit above that, the rail never gets pushed up under the head.
      const view = root.getBoundingClientRect()
      const rowEnd = row.getBoundingClientRect().bottom - view.top + root.scrollTop
      const after = Math.max(0, root.scrollHeight - rowEnd)
      setMaxHeight(root.clientHeight - pinTop - SCROLL_INSET - after)
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [pinTop, rail, look])

  const first = lit[0]
  const last = lit[lit.length - 1]
  const rootId = routes[0]?.[0]?.id
  useEffect(() => {
    const nav = rail.current
    const top = first ? elements.current.get(first) : undefined
    const bottom = last ? elements.current.get(last) : undefined
    const heading = rootId ? elements.current.get(rootId) : undefined
    if (!nav || !top || !bottom || nav.scrollHeight <= nav.clientHeight) return
    const view = nav.clientHeight
    const spanTop = top.offsetTop - FOLLOW_MARGIN
    const spanBottom = bottom.offsetTop + bottom.offsetHeight + FOLLOW_MARGIN
    let next = nav.scrollTop
    if (spanBottom > next + view) next = spanBottom - view
    // The first lit row wins over the last when the span is taller than the rail.
    if (spanTop < next) next = spanTop
    // Bring the root's heading in as well when it fits with the span, so the lit lines read
    // from where they start.
    if (heading && heading.offsetTop < next && spanBottom - heading.offsetTop <= view) {
      next = heading.offsetTop
    }
    if (Math.abs(next - nav.scrollTop) < 1) return
    nav.scrollTo({
      top: Math.max(0, next),
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [first, last, rootId, rail, elements])

  return (
    <nav
      ref={rail}
      aria-label="Fee configuration"
      className="sticky flex flex-col overflow-y-auto"
      style={{
        width: RAIL_WIDTH,
        top: pinTop + SCROLL_INSET,
        maxHeight,
        gap: look.rootGap,
        scrollbarWidth: 'thin',
      }}
    >
      {FEE_TREE.children?.map((root) => (
        <div key={root.id} className="flex flex-col gap-4">
          <div className="flex flex-col">
            {/* Measured like a row, so the root's line starts under its label too. */}
            {/* `.locator-root` fades the heading on the same beat as the rows under it. */}
            <div
              ref={(element) => rowRef(root.id, element)}
              className="locator-root"
              style={{ marginBottom: look.rootLead }}
            >
              <PrimitiveText
                as="h3"
                {...font(look.rootFont)}
                color={path.has(root.id) ? colors.gray[700] : look.rootOff}
                fontWeight={FOUNDATION_THEME.font.weight[600]}
              >
                {root.label}
              </PrimitiveText>
            </div>
            {root.children?.slice(0, 1).map((branch) => (
              <RailBranch
                key={branch.id}
                node={branch}
                depth={1}
                path={path}
                leaves={leaves}
                look={look}
                onSelect={onSelect}
                rowRef={rowRef}
              />
            ))}
          </div>
          {root.children?.slice(1).map((branch) => (
            <div key={branch.id} className="flex flex-col">
              <RailBranch
                node={branch}
                depth={1}
                path={path}
                leaves={leaves}
                look={look}
                onSelect={onSelect}
                rowRef={rowRef}
              />
            </div>
          ))}
        </div>
      ))}
      {/* Last, so the lines sit over a hovered row's fill rather than under it. */}
      <RailLines rows={rows} routes={routes} leaves={leaves} width={look.line}
        pathColor={look.pathLine}
      />
    </nav>
  )
}

/** A charge's rows: the label, then either one value beside it or the bands under it. */
function ChargeRows({ charge }: { charge: Charge }) {
  if (!charge.bands) {
    return (
      <div className="flex w-full items-start justify-between gap-3">
        <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[700]}>
          {charge.label}
        </PrimitiveText>
        <PrimitiveText
          {...font(FOUNDATION_THEME.font.size.body.md)}
          color={colors.gray[700]}
          style={{ whiteSpace: 'nowrap' }}
        >
          {charge.value}
        </PrimitiveText>
      </div>
    )
  }
  return (
    <div className="flex w-full flex-col gap-1">
      <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[700]}>
        {charge.label}
      </PrimitiveText>
      <div className="flex w-full flex-col gap-1">
        {charge.bands.map(({ band, rate }) => (
          <div key={band} className="flex w-full items-start justify-between gap-3">
            <PrimitiveText
              {...font(FOUNDATION_THEME.font.size.body.md)}
              color={colors.gray[500]}
              truncate
            >
              {band}
            </PrimitiveText>
            <PrimitiveText
              {...font(FOUNDATION_THEME.font.size.body.md)}
              color={colors.gray[700]}
              style={{ whiteSpace: 'nowrap' }}
            >
              {rate}
            </PrimitiveText>
          </div>
        ))}
      </div>
    </div>
  )
}

/**
 * The header rule drawn as a ticket's perforation: long dashes across, and a half-circle
 * punched out of each side edge where they meet it.
 *
 * The dashes are a repeating gradient rather than a dashed border, because a border's dash
 * length is the browser's to pick (about 3px) and too short to read as a tear line. The
 * punches are built as the Fee module's are (FeeGroup.tsx `Punch`), turned on their side:
 * painted in the canvas colour, one pixel proud so they cover the card's border where it
 * crosses, and carrying that border round their own arc so the outline follows the bite.
 * `edge` is that border's colour — the card's hover colour variable in v2, so the bite
 * darkens with the rest of the outline.
 */
function TicketRule({ marginTop, edge = colors.gray[200] }: { marginTop: number; edge?: string }) {
  const hairline = `${FOUNDATION_THEME.border.width[1]} solid ${edge}`
  const inset = PUNCH / 2 + PUNCH_CLEAR
  const punch: CSSProperties = {
    top: 0.5 - PUNCH / 2,
    width: PUNCH / 2,
    height: PUNCH,
    backgroundColor: colors.gray[0],
    borderTop: hairline,
    borderBottom: hairline,
  }
  return (
    <div className="relative -mx-5" style={{ marginTop, height: 1 }} aria-hidden="true">
      <div
        className="absolute top-0"
        style={{
          left: inset,
          right: inset,
          height: 1,
          backgroundImage: `repeating-linear-gradient(to right, ${colors.gray[200]} 0 ${PERF_DASH}px, transparent ${PERF_DASH}px ${PERF_DASH + PERF_GAP}px)`,
        }}
      />
      <div
        className="locator-punch pointer-events-none absolute"
        style={{
          ...punch,
          left: -1,
          borderRight: hairline,
          borderRadius: `0 ${PUNCH}px ${PUNCH}px 0`,
        }}
      />
      <div
        className="locator-punch pointer-events-none absolute"
        style={{
          ...punch,
          right: -1,
          borderLeft: hairline,
          borderRadius: `${PUNCH}px 0 0 ${PUNCH}px`,
        }}
      />
    </div>
  )
}

/**
 * A card's title without its section's name in front: the section head right above the card
 * already says it. Only a name followed by `-`, the joint the titles use, so `Remittance Fees`
 * under Remittance keeps its first word.
 */
function withoutPrefix(title: string, section: string) {
  const prefix = `${section}-`
  return title.startsWith(prefix) ? title.slice(prefix.length) : title
}

/**
 * One charge card.
 *
 * Two rules, and they are not the same break. The dashed one runs the full width because it
 * separates the card's header from its contents — the same job the card's own edge does, one
 * level in. The solid one stays inside the padding because it separates two kinds of content.
 */
function ChargeCard({
  card,
  section,
  cardRef,
  lift,
  spacing,
}: {
  card: LocatorCard
  /** The section's name — what a short title leaves off the front (`Credit Card-`). */
  section: string
  cardRef: (element: HTMLElement | null) => void
  /** v2: darken the edge and raise a shadow on hover (`.locator-card` in index.css). */
  lift: boolean
  spacing: CardSpacing
}) {
  return (
    <article
      ref={cardRef}
      // Relative so a ticket's punches can sit on its edge.
      className={`relative flex flex-col p-5${lift ? ' locator-card' : ''}`}
      // The edge colour is always set on its own, never left to the `border` shorthand in
      // PANEL_STYLE: when the dial goes from v2 to v1 React deletes the `borderColor` it had
      // set, and deleting it also clears the colour the shorthand supplied — the edge fell
      // back to currentColor, black. In v2 it is handed to the stylesheet, so hover can
      // change it without fighting an inline style.
      style={{
        ...CARD_STYLE,
        borderColor: lift ? 'var(--card-edge)' : colors.gray[200],
        paddingTop: spacing.top,
      }}
    >
      <div className="flex w-full items-center justify-between gap-3">
        <PrimitiveText
          {...font(FOUNDATION_THEME.font.size.body.md)}
          color={colors.gray[700]}
          truncate
        >
          {spacing.shortTitles
            ? (card.shortTitle ?? withoutPrefix(card.title, section))
            : card.title}
        </PrimitiveText>
        <div className={spacing.tagBox ? 'flex shrink-0' : 'shrink-0'}>
          <ModeTag mode={card.mode} palette={spacing.modes} />
        </div>
      </div>
      {spacing.ticket ? (
        <TicketRule marginTop={spacing.ruleAbove} edge={lift ? 'var(--card-edge)' : undefined} />
      ) : (
        <div className="-mx-5" style={{ marginTop: spacing.ruleAbove, borderTop: HEADER_RULE }} />
      )}
      <div className="flex flex-col gap-3" style={{ marginTop: spacing.ruleBelow }}>
        <div className="flex flex-col gap-4">
          {card.charges.map((charge) => (
            <ChargeRows key={charge.label} charge={charge} />
          ))}
        </div>
        <div style={{ borderTop: INNER_RULE }} />
        <div className="flex flex-wrap items-center gap-2">
          {card.tags.map((tag) => (
            <NeutralTag key={tag} text={tag} subType={spacing.tagShape} />
          ))}
          {spacing.priority && card.priority && (
            <NeutralTag text={card.priority} subType={spacing.tagShape} />
          )}
        </div>
      </div>
    </article>
  )
}

/**
 * A section's head, pinned while its cards scroll under it and pushed off by the next one.
 *
 * The rail already says where you are; this says it again where your eye actually is, which
 * on a long stream is nowhere near the rail. The trail above the name (`Transactional Fee`)
 * is what tells UPI's cards from Credit Card's when both are "MDR, Platform, Remittance".
 *
 * Opaque on the frame's own surface so the cards pass under it rather than through it.
 */
function SectionHead({
  section,
  id,
  top,
  counts,
  trail,
  height,
}: {
  section: LocatorSection
  id: string
  /** Where it pins: just under the page's own pinned head. */
  top: number
  /** Write `2 charges` beside the name (VERSION_LOOK.counts). */
  counts: boolean
  /** Write the trail over the name (VERSION_LOOK.trail). */
  trail: boolean
  /** The head's height (VERSION_LOOK.sectionHead). */
  height: number
}) {
  const count = section.leaves.length
  return (
    <header
      className="sticky z-10 flex flex-col justify-end"
      style={{
        top,
        height,
        paddingBottom: SECTION_HEAD_FOOT,
        backgroundColor: colors.gray[0],
      }}
    >
      {trail && (
        <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[500]}>
          {section.trail.map((node) => node.label).join(' / ')}
        </PrimitiveText>
      )}
      <div className="flex items-baseline gap-2">
        <PrimitiveText
          as="h3"
          id={id}
          {...font(FOUNDATION_THEME.font.size.body.lg)}
          color={colors.gray[700]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          {section.node.label}
        </PrimitiveText>
        {counts && (
          <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[500]}>
            {count === 1 ? '1 charge' : `${count} charges`}
          </PrimitiveText>
        )}
      </div>
    </header>
  )
}

/**
 * The pinned page head's height, which everything else that pins sits under — the rail, the
 * section heads, the edge a card counts as in view from. Measured, because the head's note
 * wraps to two lines on a narrow window and one on a wide one.
 */
function usePageHeadHeight() {
  const [height, setHeight] = useState(0)
  useLayoutEffect(() => {
    const head = document.querySelector<HTMLElement>('[data-page-head]')
    if (!head) return
    const measure = () => setHeight(Math.round(head.getBoundingClientRect().height))
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(head)
    return () => observer.disconnect()
  }, [])
  return height
}

const STORY_NAME = 'Where a charge sits'

export default function FeeLocator() {
  const { version } = useLocatorDials()
  const look = VERSION_LOOK[version]
  const pinTop = usePageHeadHeight()
  const { cards, lit, tail, scrollToCard } = useCardFocus(
    LEAVES.length,
    pinTop + look.sectionHead,
  )
  const litIds = lit.map((index) => LEAVES[index]?.id).filter((id): id is string => !!id)

  // A branch has no card of its own, so it travels to the first one underneath it.
  const goTo = (node: LocatorNode) => {
    const index = firstCardIndex(node)
    if (index >= 0) scrollToCard(index)
  }

  const stream = (
    <div
      className={look.frame ? 'flex flex-wrap items-start gap-y-8' : 'grid items-start'}
      style={
        look.frame
          ? { ...MOTION, columnGap: GUTTER }
          : // The middle column is the card's, with equal columns either side, so the cards
            // sit on the page's centre line; the rail takes the left one, as wide as it needs.
            {
              ...MOTION,
              gridTemplateColumns: `minmax(${RAIL_WIDTH}px, 1fr) ${CARD_WIDTH}px 1fr`,
              columnGap: SLOT,
              // The frame's top padding, kept: the first section head starts below the line it
              // pins at rather than above it, where it would pin at once, over the first card.
              paddingTop: SCROLL_INSET,
            }
      }
    >
      <LocatorRail
        lit={litIds}
        pinTop={pinTop}
        leaves={version === 'v1'}
        look={VERSION_LOOK[version]}
        onSelect={goTo}
      />
      {/*
        Pulled up by the rail's inset so the first head's type starts level with `PA Fee`
        rather than a head's worth of air below it.
      */}
      <div className="flex flex-col" style={{ gap: SECTION_GAP, marginTop: -SCROLL_INSET }}>
        {SECTIONS.map((section) => {
          const headId = `fee-locator-${section.node.id}`
          return (
            <section key={section.node.id} aria-labelledby={headId} className="flex flex-col">
              <SectionHead
                section={section}
                id={headId}
                top={pinTop}
                counts={VERSION_LOOK[version].counts}
                trail={look.trail}
                height={look.sectionHead}
              />
              <div className="flex flex-col gap-4">
                {section.leaves.map((leaf, offset) => (
                  <ChargeCard
                    section={section.node.label}
                    key={leaf.id}
                    card={leaf.card}
                    lift={version === 'v2'}
                    spacing={VERSION_LOOK[version].card}
                    cardRef={(element) => {
                      cards.current[section.start + offset] = element
                    }}
                  />
                ))}
              </div>
            </section>
          )
        })}
        {/*
          The last card's scroll room, inside the canvas rather than under it: the rail
          pins only as far as its canvas reaches, so room outside would let the canvas end
          early and push the rail up under the page head at the foot of the stream.
        */}
        <div style={{ height: tail }} aria-hidden="true" />
      </div>
    </div>
  )

  return (
    <PacbPage
      title="Fee Locator"
      // v2 is the title alone: no subtitle, no story heading — the page explains itself, and
      // the pinned head gives the stream that room back. An empty string, not undefined,
      // because undefined falls back to the route row's description.
      description={look.header ? undefined : ''}
      pinned
      subhead={
        look.header ? (
          <StoryHeading
            name={STORY_NAME}
            note="Every charge in the configuration, in one stream. The rail lights the cards on screen; point at a card to single it out, or click a row to go to it."
          />
        ) : undefined
      }
    >
      {look.frame ? (
        <StoryFrame
          name={STORY_NAME}
          note=""
          heading={false}
          width={RAIL_WIDTH + GUTTER + CARD_WIDTH}
          surface={colors.gray[0]}
        >
          {stream}
        </StoryFrame>
      ) : (
        <section aria-label={STORY_NAME}>{stream}</section>
      )}
    </PacbPage>
  )
}
