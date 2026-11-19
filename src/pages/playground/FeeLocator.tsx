/**
 * Playground → Fee Locator. Figma 2350:11996, recreated.
 *
 * Every charge in the configuration, as one stream of cards, with a rail beside it that says
 * where in the tree the card you are reading sits. **The rail follows the scroll — it is not
 * a filter and it does not choose what the column shows.** The column always shows
 * everything; what moves is where you are in it.
 *
 * That is the whole idea, and it is why the frame is two halves. A stream of ten charge
 * cards answers *what does this merchant pay*. It cannot answer *and what is this one* —
 * `Credit Card-Visa Retail` names its place only because the title spells it out, and a
 * title is a poor map. So the rail draws the map, keeps every branch visible, and lights the
 * path down to whatever is under your eye. Scroll and the elbows walk down the tree with you.
 *
 * Which is also why the elbow glyph is not a disclosure chevron: the whole tree is already
 * open and nothing in the rail expands. It is the line the eye follows to where you are,
 * drawn one step at a time, and it moves because you scrolled.
 *
 * The rail is still clickable, as the other half of the same bargain — a map you can read
 * but not travel on is half a map. A click scrolls the stream to that node's first card,
 * which the spy then lights on its own; the click never sets the highlight directly, so
 * there is one source of truth for where you are and it is the scroll position.
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
 *   - the bottom tags are NeutralTag, rounded like every other tag in the module, not the
 *     frame's squarical.
 */

import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
import { FEEDBACK_EASING, MICRO_MS } from '../../motion'
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
  type Charge,
  type LocatorCard,
  type LocatorNode,
} from './fee-locator'
import { StoryFrame } from './StoryFrame'

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
  '--locator-ease': FEEDBACK_EASING,
} as CSSProperties

/**
 * How far below the top of the scroll area the line that decides "the card you are reading"
 * sits, in px.
 *
 * A fixed distance, not a fraction of the viewport — which is the obvious thing and is wrong
 * here. The cards are not one height: a slab card is 324px and a fixed fee is 132, so a line
 * a quarter of the way down a tall window has *three* fixed-fee cards above it at once, and
 * scrolling one of them to the top lights the row two below it. Just under the top edge asks
 * the one question every card height answers the same way — which card is at the top of what
 * you are reading — and it stays clear of the shortest card's pitch with room to spare.
 */
const SPY_LINE = 96

/** A clicked card's top edge to the top of the scroll area, once the scroll settles. */
const SCROLL_INSET = 24

/** The page content scrolls this, not the window (AGENTS.md rule 8). */
const scrollRoot = () => document.querySelector<HTMLElement>('[data-main-content]')

/**
 * Which card is under the reader's eye, and how to put one there.
 *
 * Measured off the scroll position rather than watched with an IntersectionObserver. A
 * scrollspy wants *the last card whose top has passed the line*, which is a question about
 * ordering, and an observer answers a different one — which elements overlap a band — that
 * needs reassembling into this one every time it fires. Ten cards is nothing to measure, and
 * measuring has no ambiguous case: at the foot of the stream the last card's top may never
 * reach the line, so the end of the scroll *is* the last card, stated rather than inferred.
 */
function useScrollSpy(count: number) {
  const cards = useRef<(HTMLElement | null)[]>([])
  const [active, setActive] = useState(0)
  const [tail, setTail] = useState(0)

  useEffect(() => {
    const root = scrollRoot()
    if (!root) return
    let frame = 0
    const measure = () => {
      frame = 0
      // Enough room under the last card that it can still be scrolled to the top. Without
      // it the stream runs out of scroll while the last few cards — the fixed fees, a
      // third the height of a slab — are still stranded below the line, and clicking their
      // rows lands you at the foot with a different row lit. Measured rather than guessed,
      // because it is the scroll area's own height minus the card that has to clear it.
      const last = cards.current[count - 1]
      if (last) {
        const room = Math.max(0, root.clientHeight - last.offsetHeight - SCROLL_INSET * 2)
        setTail((current) => (Math.abs(current - room) > 1 ? room : current))
      }
      const line = root.getBoundingClientRect().top + SPY_LINE
      let next = 0
      cards.current.forEach((card, index) => {
        if (card && card.getBoundingClientRect().top <= line) next = index
      })
      // Scrolled to the foot: there is no scrolling left to bring the last card's top up to
      // the line, so the last card is what you are reading whatever the measurement says.
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 2) next = count - 1
      setActive(next)
    }
    const onScroll = () => {
      frame ||= requestAnimationFrame(measure)
    }
    measure()
    root.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      if (frame) cancelAnimationFrame(frame)
      root.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
    }
  }, [count])

  /**
   * Put a card at the top of the scroll area. The spy is left to notice — a card resting
   * above the line is the last one past it, so the rail lights the row that was clicked
   * without the click ever saying so.
   */
  const scrollToCard = useCallback((index: number) => {
    const root = scrollRoot()
    const card = cards.current[index]
    if (!root || !card) return
    const top = card.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop
    root.scrollTo({
      top: top - SCROLL_INSET,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }, [])

  return { cards, active, tail, scrollToCard }
}

/**
 * The tree connector, `└`, in the slot immediately left of a row on the path.
 *
 * blend-gap: neither Blend nor lucide has a bare elbow. Lucide's `CornerDownRight` is the
 * near miss — it carries an arrowhead, which at 14px reads as "go here" rather than as the
 * line the frame draws. So this is the frame's own vector, at its own 11px inside the slot.
 */
function Elbow() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path
        d="M4 2v5.5A2.5 2.5 0 0 0 6.5 10H10"
        stroke={colors.gray[400]}
        strokeWidth="1.25"
        strokeLinecap="round"
      />
    </svg>
  )
}

/**
 * One row of the rail.
 *
 * `depth` slots of 32px sit before the label, and the elbow goes in the last of them — so a
 * row that is not on the path keeps the slot and draws nothing in it, and the labels at one
 * depth still line up whether or not that branch is where you are.
 */
function LocatorRow({
  node,
  depth,
  onPath,
  onSelect,
}: {
  node: LocatorNode
  depth: number
  onPath: boolean
  onSelect: (node: LocatorNode) => void
}) {
  const count = leafCount(node)
  return (
    <button
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
      {/* The elbow sits inside the last indent slot, so it costs no width of its own. */}
      <span
        className="-ml-8 flex shrink-0 items-center justify-center"
        style={{ width: SLOT, height: SLOT }}
      >
        {onPath && <Elbow />}
      </span>
      <PrimitiveText
        {...font(FOUNDATION_THEME.font.size.body.md)}
        color={onPath ? colors.gray[700] : colors.gray[500]}
        truncate
      >
        {count === undefined ? node.label : `${node.label} · ${count}`}
      </PrimitiveText>
    </button>
  )
}

/** A node and everything under it, flattened into rows — the tree is open at every level. */
function RailBranch({
  node,
  depth,
  path,
  onSelect,
}: {
  node: LocatorNode
  depth: number
  path: Set<string>
  onSelect: (node: LocatorNode) => void
}) {
  return (
    <>
      <LocatorRow node={node} depth={depth} onPath={path.has(node.id)} onSelect={onSelect} />
      {node.children?.map((child) => (
        <RailBranch key={child.id} node={child} depth={depth + 1} path={path} onSelect={onSelect} />
      ))}
    </>
  )
}

/**
 * The rail: the root as a heading, then its branches with 16px of air between them.
 *
 * Sticky, because a map that scrolls away with the thing it is mapping is a list. It is the
 * one part of the page that must stay put while the stream moves under it.
 *
 * The air between branches is the frame's, and it is the only grouping the rail has — the
 * tree is otherwise a single 32px column with nothing to say where Transactional Fee ends
 * and Fixed Fee begins.
 */
function LocatorRail({
  located,
  onSelect,
}: {
  located: string
  onSelect: (node: LocatorNode) => void
}) {
  const path = new Set(pathTo(located).map((node) => node.id))
  return (
    <nav
      aria-label="Fee configuration"
      className="sticky flex flex-col gap-4"
      style={{ width: RAIL_WIDTH, top: SCROLL_INSET }}
    >
      <div className="flex flex-col">
        <PrimitiveText
          as="h3"
          {...font(FOUNDATION_THEME.font.size.body.lg)}
          color={colors.gray[700]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          {FEE_TREE.label}
        </PrimitiveText>
        {FEE_TREE.children?.slice(0, 1).map((branch) => (
          <RailBranch key={branch.id} node={branch} depth={1} path={path} onSelect={onSelect} />
        ))}
      </div>
      {FEE_TREE.children?.slice(1).map((branch) => (
        <div key={branch.id} className="flex flex-col">
          <RailBranch node={branch} depth={1} path={path} onSelect={onSelect} />
        </div>
      ))}
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
 * One charge card.
 *
 * Two rules, and they are not the same break. The dashed one runs the full width because it
 * separates the card's header from its contents — the same job the card's own edge does, one
 * level in. The solid one stays inside the padding because it separates two kinds of content.
 */
function ChargeCard({
  card,
  cardRef,
}: {
  card: LocatorCard
  cardRef: (element: HTMLElement | null) => void
}) {
  return (
    <article ref={cardRef} className="flex flex-col p-5" style={CARD_STYLE}>
      <div className="flex w-full items-center justify-between gap-3">
        <PrimitiveText
          {...font(FOUNDATION_THEME.font.size.body.md)}
          color={colors.gray[700]}
          truncate
        >
          {card.title}
        </PrimitiveText>
        <div className="shrink-0">
          <ModeTag mode={card.mode} />
        </div>
      </div>
      <div className="-mx-5 mt-2.5" style={{ borderTop: HEADER_RULE }} />
      <div className="mt-3.5 flex flex-col gap-3">
        <div className="flex flex-col gap-4">
          {card.charges.map((charge) => (
            <ChargeRows key={charge.label} charge={charge} />
          ))}
        </div>
        <div style={{ borderTop: INNER_RULE }} />
        <div className="flex flex-wrap items-center gap-2">
          {card.tags.map((tag) => (
            <NeutralTag key={tag} text={tag} />
          ))}
        </div>
      </div>
    </article>
  )
}

export default function FeeLocator() {
  const { cards, active, tail, scrollToCard } = useScrollSpy(LEAVES.length)
  const located = LEAVES[active]?.id ?? ''

  // A branch has no card of its own, so it travels to the first one underneath it.
  const goTo = (node: LocatorNode) => {
    const index = firstCardIndex(node)
    if (index >= 0) scrollToCard(index)
  }

  return (
    <PacbPage title="Fee Locator">
      <StoryFrame
        name="Where a charge sits"
        note="Figma 2350:11996 as drawn. Every charge in the configuration, in one stream — scroll it and the rail walks down to whichever card you are reading. Click a row to go the other way."
        width={RAIL_WIDTH + GUTTER + CARD_WIDTH}
        surface={colors.gray[0]}
      >
        <div
          className="flex flex-wrap items-start gap-y-8"
          style={{ ...MOTION, columnGap: GUTTER }}
        >
          <LocatorRail located={located} onSelect={goTo} />
          <div className="flex flex-col gap-4">
            {LEAVES.map((leaf, index) => (
              <ChargeCard
                key={leaf.id}
                card={leaf.card}
                cardRef={(element) => {
                  cards.current[index] = element
                }}
              />
            ))}
          </div>
        </div>
      </StoryFrame>
      {/*
        The scroll room the last card needs, kept *outside* the story's canvas: inside it,
        a thousand pixels of white below the last card reads as a broken frame, and out here
        it is only the end of the page.
      */}
      <div style={{ height: tail }} aria-hidden="true" />
    </PacbPage>
  )
}
