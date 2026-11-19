/**
 * Playground → Fee Card. What the ticket does when one rule carries **many** conditions.
 *
 * The question, from the review thread: a rule can be configured as a slab — ₹1–200 at
 * 2 + 3%, ₹200–400 at 3 + 4%, and on — so what does the card show, and *"how can it be
 * intuitive enough for the user to click?"* A card that hides four bands behind an unmarked
 * surface is a card nobody opens.
 *
 * So these five are not five layouts. They are five answers to that one question, ordered by
 * how much they tell you before you touch anything:
 *
 *   1. a count and a chevron          — says there is more, not what
 *   2. the first band, then `+3 more` — shows a sample, so the rest needs no leap
 *   3. tabs down the stub             — nothing hidden; every band is one click away
 *   4. the whole ladder in the stub   — nothing hidden and nothing to click for the gist
 *   5. a pager in the body            — one condition at a time, stepped with arrows
 *
 * Iteration 5 is the odd one: it is Figma `2321:8333` recreated as drawn, so it carries the
 * frame's own data rather than the slab above. That makes it the one card here you cannot
 * compare like for like — which is the point of having it, since what it proposes is not a
 * way to fit four bands into a card but a reason not to try.
 *
 * All five are live: click them. Each is built from the same parts as the real ticket
 * (../fee/tags.tsx), so what differs is only the thing under test.
 *
 * blend-gap: same as FeeTicket.tsx — `CardV2`'s padding scale stops at 12px where the design
 * is 16px and it strips `style`, so the frame is composed on PANEL_STYLE.
 */

import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
} from '@juspay/blend-design-system'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'
import { FEEDBACK_EASING, FEEDBACK_MS } from '../../motion'
import { font, PrimitiveText } from '../../primitives'
import { FEE_RULES, type FeeRule, type Slab } from '../fee/data'
import { FeeTicket } from '../fee/FeeTicket'
import { GroupCard } from '../fee/FeeGroup'
import { NeutralTag, RuleFoot, RuleHeader, SlabTable, TagRow } from '../fee/tags'
import { HAIRLINE, PANEL_STYLE } from '../pacb/helpers'
import { PacbPage, SectionTitle } from '../pacb/kit'
import { StoryFrame } from './StoryFrame'

const { colors } = FOUNDATION_THEME

/** The ticket's width in the design (Figma 2268:7289 — 653px). */
const CARD_WIDTH = 653

/** The pager arrows in iteration 5 — 14px in the frame, matching the kebab's glyph. */
const PAGER_ICON_SIZE = 14

/** The thread's own example, carried on past two bands to show a rule that has grown. */
const SLABS: Slab[] = [
  { band: '₹1 – ₹200', rate: '2 + 3%' },
  { band: '₹200 – ₹400', rate: '3 + 4%' },
  { band: '₹400 – ₹1,000', rate: '4 + 5%' },
  { band: '₹1,000 and above', rate: '5 + 6%' },
]

/** The span the whole slab charges across — the one number a collapsed card can honestly show. */
const SPAN = '2 + 3% – 5 + 6%'

const cardMdr = FEE_RULES.find((rule) => rule.id === 'card-mdr')!

/** The same rule, reconfigured as a slab. Only the description changes to admit it. */
const RULE: FeeRule = {
  ...cardMdr,
  name: 'Card MDR',
  description: 'Successful card payments, priced by transaction amount',
}

/**
 * Durations for the reveal, handed to the stylesheet as custom properties so rule 14 keeps
 * one source of truth and index.css holds no second copy of the numbers.
 */
const MOTION = {
  '--slab-reveal': `${FEEDBACK_MS}ms`,
  '--slab-reveal-ease': FEEDBACK_EASING,
} as CSSProperties

/**
 * The hover fill that tells you a card takes a click, on the chrome's own pattern
 * (src/layout/chrome.ts): a custom property from the token, handed to an arbitrary-value
 * utility, because rule 1 bans both a Tailwind colour class and a hex.
 */
const CLICKABLE = { '--slab-hover': colors.gray[25] } as CSSProperties

const STUB_FILL: CSSProperties = { backgroundColor: colors.gray[25] }

function Perforation() {
  return (
    <div
      className="w-px shrink-0 self-stretch"
      style={{ backgroundColor: colors.gray[200] }}
      aria-hidden
    />
  )
}

/**
 * The stub, with whatever headline the iteration gives it.
 *
 * No `h-full` on any of the stubs here: the card is `items-stretch`, and `height: 100%`
 * against an auto-height parent does not resolve — it falls back to the stub's own content
 * height and cancels the stretch, leaving the tint stopping short of the card's bottom edge.
 */
function Stub({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex w-[180px] shrink-0 flex-col items-center justify-center gap-1.5 overflow-hidden px-3.5 py-[18px]"
      style={STUB_FILL}
    >
      {children}
    </div>
  )
}

/**
 * The card frame when clicking anywhere on the card opens it.
 *
 * Not a `<button>` wrapping the lot, which is the obvious way to write this and is invalid:
 * the card already contains the kebab's button, and a button inside a button is markup the
 * browser repairs by splitting — React says so out loud, and the kebab's clicks reach both.
 *
 * So the card is an `<article>` whose click handler ignores anything that came from a real
 * control, and the affordance beside the description is itself a `<button>` carrying the
 * `aria-expanded`. The mouse gets the whole card; the keyboard gets one tab stop that says
 * what it does. `ExpandToggle` below is that button.
 */
function ExpandableCard({
  onToggle,
  children,
}: {
  onToggle: () => void
  children: ReactNode
}) {
  const handleClick = (event: MouseEvent<HTMLElement>) => {
    // The kebab and the toggle are real buttons; let them answer for themselves.
    if ((event.target as HTMLElement).closest('button')) return
    onToggle()
  }
  return (
    <article
      onClick={handleClick}
      className="flex w-full cursor-pointer items-stretch overflow-hidden hover:bg-[var(--slab-hover)]"
      style={{ ...PANEL_STYLE, ...CLICKABLE }}
    >
      {children}
    </article>
  )
}

/** The thing that says the card opens, and the card's only keyboard path into the bands. */
function ExpandToggle({
  open,
  onToggle,
  label,
  tone = colors.gray[500],
  children,
}: {
  open: boolean
  onToggle: () => void
  label: string
  tone?: string
  children: ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-label={label}
      className="flex shrink-0 cursor-pointer items-center gap-1 border-none bg-transparent p-0"
    >
      {children}
      <ChevronDown
        size={14}
        color={tone}
        style={{ transform: open ? 'rotate(180deg)' : undefined }}
        aria-hidden
      />
    </button>
  )
}

// ─── 1. A count and a chevron ────────────────────────────────────────────────────────────

/**
 * The least that could work: the stub says how many bands there are, and a chevron says the
 * card opens.
 *
 * It is the convention everyone already reads, and it costs no height at rest — a grid of
 * these still scans. What it does not do is say *what* is inside: "4 slabs" tells you the
 * rule is banded but not how, so the click is a leap of faith. That is exactly the doubt
 * raised in the thread, and this iteration is here to be measured against, not to win.
 */
function CountAndChevron({ rule }: { rule: FeeRule }) {
  const [open, setOpen] = useState(false)
  return (
    <ExpandableCard onToggle={() => setOpen((was) => !was)}>
      <Stub>
        <PrimitiveText
          {...font(FOUNDATION_THEME.font.size.heading.sm)}
          color={colors.gray[700]}
          style={{ whiteSpace: 'nowrap' }}
        >
          {SPAN}
        </PrimitiveText>
        <NeutralTag text={rule.mode} />
      </Stub>
      <Perforation />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 overflow-hidden px-4 py-3.5">
        <RuleHeader rule={rule} />
        <div className="flex w-full items-center gap-2 overflow-hidden">
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.body.sm)}
            color={colors.gray[500]}
            style={{ flex: '1 0 0', minWidth: 0 }}
            truncate
          >
            {rule.description}
          </PrimitiveText>
          <ExpandToggle
            open={open}
            onToggle={() => setOpen((was) => !was)}
            label={`${SLABS.length} slabs for ${rule.name}`}
          >
            <PrimitiveText
              as="span"
              {...font(FOUNDATION_THEME.font.size.body.sm)}
              color={colors.gray[500]}
              style={{ whiteSpace: 'nowrap' }}
            >
              {SLABS.length} slabs
            </PrimitiveText>
          </ExpandToggle>
        </div>
        {open && <SlabTable slabs={SLABS} />}
        <TagRow rule={rule} />
        <RuleFoot lead={rule.effective} rule={rule} />
      </div>
    </ExpandableCard>
  )
}

// ─── 2. The first band, then `+3 more` ───────────────────────────────────────────────────

/**
 * One band is always on the card, and the rest are behind a row that names them.
 *
 * This is the direct answer to "how can it be intuitive enough to click": you do not have to
 * guess what opens, because you can already see one. The `+3 more slabs` row is a line of the
 * table it belongs to, so it reads as the table continuing rather than as a control bolted on.
 * The cost is one row of height at rest, every card, forever.
 */
function PeekAndExpand({ rule }: { rule: FeeRule }) {
  const [open, setOpen] = useState(false)
  const rest = SLABS.length - 1
  return (
    <ExpandableCard onToggle={() => setOpen((was) => !was)}>
      <Stub>
        <PrimitiveText
          {...font(FOUNDATION_THEME.font.size.heading.sm)}
          color={colors.gray[700]}
          style={{ whiteSpace: 'nowrap' }}
        >
          {SPAN}
        </PrimitiveText>
        <NeutralTag text={rule.mode} />
      </Stub>
      <Perforation />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 overflow-hidden px-4 py-3.5">
        <RuleHeader rule={rule} />
        <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[500]}>
          {rule.description}
        </PrimitiveText>
        {open ? (
          <SlabTable slabs={SLABS} />
        ) : (
          <div className="flex w-full flex-col">
            <div className="flex w-full items-baseline justify-between gap-3 py-1.5">
              <PrimitiveText
                {...font(FOUNDATION_THEME.font.size.body.sm)}
                color={colors.gray[500]}
                truncate
              >
                {SLABS[0].band}
              </PrimitiveText>
              <PrimitiveText
                {...font(FOUNDATION_THEME.font.size.body.md)}
                color={colors.gray[700]}
                style={{ whiteSpace: 'nowrap' }}
              >
                {SLABS[0].rate}
              </PrimitiveText>
            </div>
            <div className="flex w-full items-center py-1.5" style={{ borderTop: HAIRLINE }}>
              <ExpandToggle
                open={open}
                onToggle={() => setOpen((was) => !was)}
                label={`Show the other ${rest} slabs for ${rule.name}`}
                tone={colors.gray[700]}
              >
                <PrimitiveText
                  as="span"
                  {...font(FOUNDATION_THEME.font.size.body.sm)}
                  color={colors.gray[700]}
                >
                  +{rest} more {rest === 1 ? 'slab' : 'slabs'}
                </PrimitiveText>
              </ExpandToggle>
            </div>
          </div>
        )}
        <TagRow rule={rule} />
        <RuleFoot lead={rule.effective} rule={rule} />
      </div>
    </ExpandableCard>
  )
}

// ─── 3. Tabs down the stub ───────────────────────────────────────────────────────────────

/**
 * The receipt stub becomes the band list, and the body shows the band you picked.
 *
 * Nothing is hidden and nothing expands, so the card never changes height — which is the one
 * thing a grid of cards cares about most. Every band is one click, and the clicks are
 * obviously clicks.
 *
 * What it costs is the stub: it stops being the big number the whole layout was built around,
 * and at four bands the rows are already 10px text. Past about five it needs a scroll, which
 * a 144px card cannot really give it.
 *
 * blend-gap: `TabsV2` draws a horizontal tablist with its own padding and indicator; this is
 * a vertical rail inside a 180px stub, which none of its variants will do. The rows are
 * composed on the stub's own tokens instead.
 */
function StubTabs({ rule }: { rule: FeeRule }) {
  const [picked, setPicked] = useState(0)
  const slab = SLABS[picked]
  return (
    <article className="flex items-stretch overflow-hidden" style={PANEL_STYLE}>
      <div className="flex w-[180px] shrink-0 flex-col" style={STUB_FILL}>
        {SLABS.map((entry, index) => {
          const isPicked = index === picked
          return (
            <button
              key={entry.band}
              type="button"
              onClick={() => setPicked(index)}
              aria-pressed={isPicked}
              className="flex flex-1 cursor-pointer items-center justify-center border-none px-3 hover:bg-[var(--slab-hover)]"
              style={{
                ...CLICKABLE,
                backgroundColor: isPicked ? colors.gray[0] : 'transparent',
                borderTop: index > 0 ? HAIRLINE : undefined,
              }}
            >
              <PrimitiveText
                as="span"
                {...font(FOUNDATION_THEME.font.size.body.xs)}
                color={isPicked ? colors.gray[700] : colors.gray[500]}
                style={{ whiteSpace: 'nowrap' }}
              >
                {entry.band}
              </PrimitiveText>
            </button>
          )
        })}
      </div>
      <Perforation />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 overflow-hidden px-4 py-3.5">
        <RuleHeader rule={rule} />
        <div className="flex w-full items-baseline gap-2 overflow-hidden whitespace-nowrap">
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.heading.md)}
            color={colors.gray[700]}
          >
            {slab.rate}
          </PrimitiveText>
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.body.xs)}
            color={colors.gray[500]}
          >
            on {slab.band}
          </PrimitiveText>
        </div>
        <TagRow rule={rule} />
        <RuleFoot lead={`${rule.mode} · ${rule.effective}`} rule={rule} />
      </div>
    </article>
  )
}

// ─── 4. The whole ladder in the stub ─────────────────────────────────────────────────────

/**
 * Every band on the card at rest, as a compressed ladder where the stub's one number was.
 *
 * Nothing is hidden, nothing has to be clicked to understand the rule, and the shape of the
 * pricing — four steps, climbing — is legible at a glance from across the page. For a rule
 * someone is scanning rather than editing, that is the most information per pixel of the four.
 *
 * What it costs is the most of all: the stub's headline is gone entirely, the type is down to
 * 10px, and a rule with eight bands has nowhere to go. It is the right answer for a slab of
 * three or four and the wrong one for a slab of ten — which is itself worth knowing, because
 * it says the card wants a cap on how big a rule it will draw before it defers to a drawer.
 */
function LadderStub({ rule }: { rule: FeeRule }) {
  return (
    <article className="flex items-stretch overflow-hidden" style={PANEL_STYLE}>
      <div
        className="flex w-[180px] shrink-0 flex-col justify-center gap-1 px-3 py-3"
        style={STUB_FILL}
      >
        {SLABS.map((slab) => (
          <div key={slab.band} className="flex items-baseline justify-between gap-2">
            <PrimitiveText
              {...font(FOUNDATION_THEME.font.size.body.xs)}
              color={colors.gray[500]}
              style={{ whiteSpace: 'nowrap' }}
            >
              {slab.band}
            </PrimitiveText>
            <PrimitiveText
              {...font(FOUNDATION_THEME.font.size.body.xs)}
              color={colors.gray[700]}
              style={{ whiteSpace: 'nowrap' }}
            >
              {slab.rate}
            </PrimitiveText>
          </div>
        ))}
      </div>
      <Perforation />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5 overflow-hidden px-4 py-3.5">
        <RuleHeader rule={rule} />
        <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[500]}>
          {rule.description}
        </PrimitiveText>
        <TagRow rule={rule} />
        <RuleFoot lead={`${rule.mode} · ${rule.effective}`} rule={rule} />
      </div>
    </article>
  )
}

// ─── 5. A pager in the body ──────────────────────────────────────────────────────────────

/** The frame's width. 640, where the ticket the other four are drawn on is 653. */
const PAGER_CARD_WIDTH = 640

/**
 * The condition group the frame's stub describes: one set of MCCs, one status, and the
 * instruments underneath it that the pager walks.
 */
const GROUP = {
  name: 'Ecomm & Others - NB',
  count: '32 MCC Count',
  effective: '01 Apr 2026 – 31 Mar 2027',
  touched: '7d ago · Yogesh',
}

/**
 * What the pager steps through.
 *
 * `UPI - Bank Account` is the frame's own, and so are its four bands and its `Platform 0.05%`
 * — read off `2327:8401`–`2327:8404` and `2327:8407`. Its third and fourth bands are the same
 * line twice, which is what the frame draws; it is left as drawn rather than quietly deduped,
 * since a repeated band is the kind of thing worth seeing on the screen. The three
 * instruments beside it are demo values in the same shape, so the arrows have somewhere to go.
 */
const CONDITIONS = [
  {
    name: 'UPI - Bank Account',
    bands: [
      '0 – 2000 → 0%',
      '2000 – 75000 → 0.4%',
      '75000 – 1000000000000 → ₹300',
      '75000 – 1000000000000 → ₹300',
    ],
    platform: '0.05%',
  },
  {
    name: 'UPI - Credit Line',
    bands: ['0 – 2000 → 0%', '2000 – 75000 → 0.65%', '75000 – 1000000000000 → ₹450'],
    platform: '0.08%',
  },
  {
    name: 'Credit Card - Domestic',
    bands: ['0 – 2000 → 1.4%', '2000 – 75000 → 1.75%', '75000 – 1000000000000 → 1.9%'],
    platform: '0.10%',
  },
  {
    name: 'Net Banking',
    bands: ['0 – 2000 → ₹9', '2000 – 75000 → ₹14', '75000 – 1000000000000 → ₹22'],
    platform: '0.05%',
  },
]

/**
 * The name of the frame's banded scope, which is also what opens the card at rest.
 *
 * Bare, with no `(N)`: `Scope` appends the count itself now (FeeGroup.tsx), and `defaultOpen`
 * is matched against this label rather than against what is drawn from it.
 */
const MDR_LABEL = 'MDR'

/**
 * Figma `2321:8333`, recreated as drawn — the open state of `2327:8382`.
 *
 * The body is a pager: one condition fills it, and two arrows step between them. It is the
 * only iteration here that does not try to fit the whole rule into the card — it shows one
 * condition properly, with its bands under a scope that opens, and lets you walk the rest.
 * Nothing is squeezed to 10px.
 *
 * What it costs is comparison: iteration 4 gives you the shape of the pricing in one glance,
 * and this one makes you click three times to learn the same thing. It is the right card for
 * a rule you are reading and the wrong one for a rule you are scanning past.
 *
 * The arrows wrap rather than stopping at the ends, which is what the frame draws — both are
 * enabled, and a stub line that says `32 MCC Count` cannot say which condition you are on.
 *
 * One departure, and it is the repo's rule rather than a preference: the frame's secondary
 * text is `gray[400]`, which rule 10 reserves for placeholders and disabled. It reads at
 * `gray[500]`, as `RuleFoot` already does for the same reason. The chevron keeps the frame's
 * `gray[400]` — that bar is on body text, not on a glyph.
 */
function PagedConditions() {
  const [page, setPage] = useState(0)
  const condition = CONDITIONS[page]
  const step = (by: number) =>
    setPage((at) => (at + by + CONDITIONS.length) % CONDITIONS.length)
  return (
    <GroupCard
      // Remounts on every step, so the newly drawn bands animate in rather than swapping
      // under a scope that was already open.
      key={condition.name}
      heading={GROUP.name}
      note={GROUP.count}
      surface={colors.gray[25]}
      status="Active"
      title={condition.name}
      scopes={[
        { label: MDR_LABEL, bands: condition.bands },
        { label: 'Platform', value: condition.platform },
      ]}
      defaultOpen={MDR_LABEL}
      effective={GROUP.effective}
      touched={GROUP.touched}
      action={
        <div className="flex shrink-0 items-center gap-1">
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            size={ButtonV2Size.SMALL}
            subType={ButtonV2SubType.ICON_ONLY}
            onClick={() => step(-1)}
            aria-label={`Previous condition in ${GROUP.name}`}
            leftSlot={{ slot: <ChevronLeft size={PAGER_ICON_SIZE} /> }}
          />
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            size={ButtonV2Size.SMALL}
            subType={ButtonV2SubType.ICON_ONLY}
            onClick={() => step(1)}
            aria-label={`Next condition in ${GROUP.name}`}
            leftSlot={{ slot: <ChevronRight size={PAGER_ICON_SIZE} /> }}
          />
        </div>
      }
    />
  )
}

// ─── The page ────────────────────────────────────────────────────────────────────────────

const STORIES: { name: string; note: string; width?: number; render: () => ReactNode }[] = [
  {
    name: '1 — A count and a chevron',
    note: 'Says there is more; does not say what. No height at rest. Click the card.',
    render: () => <CountAndChevron rule={RULE} />,
  },
  {
    name: '2 — The first band, then “+3 more”',
    note: 'You can see one before you click, so the rest needs no leap. One row of height at rest.',
    render: () => <PeekAndExpand rule={RULE} />,
  },
  {
    name: '3 — Tabs down the stub',
    note: 'Nothing hidden, height never changes. The stub stops being the big number. Click a band.',
    render: () => <StubTabs rule={RULE} />,
  },
  {
    name: '4 — The whole ladder in the stub',
    note: 'Every band at rest, nothing to click. Most information per pixel; runs out past ~5 bands.',
    render: () => <LadderStub rule={RULE} />,
  },
  {
    name: '5 — A pager in the body',
    note: 'Figma 2321:8333 as drawn, open. The scope’s bands close on the chevron; the arrows wrap between conditions.',
    width: PAGER_CARD_WIDTH,
    render: () => <PagedConditions />,
  },
]

export default function FeeCards() {
  return (
    <div style={MOTION}>
      <PacbPage title="Fee Card">
        <div className="flex flex-col gap-4">
          <SectionTitle>One condition, one rule</SectionTitle>
          <StoryFrame
            name="Single rate"
            note="The live ticket, for comparison — the case the thread agreed is already fine."
            width={CARD_WIDTH}
            fullscreen
          >
            <FeeTicket rule={cardMdr} />
          </StoryFrame>
        </div>

        <div className="flex flex-col gap-4">
          <SectionTitle>Many conditions in one rule</SectionTitle>
          {STORIES.map(({ name, note, width, render }) => (
            <StoryFrame key={name} name={name} note={note} width={width ?? CARD_WIDTH} fullscreen>
              {render()}
            </StoryFrame>
          ))}
        </div>
      </PacbPage>
    </div>
  )
}
