import { CheckboxV2, FOUNDATION_THEME, SelectorV2Size } from '@juspay/blend-design-system'
import type { KeyboardEvent, ReactNode } from 'react'
import { PrimitiveText, font } from '../../primitives'

const { colors } = FOUNDATION_THEME

/**
 * One selectable answer: a short id, a line under it, and optionally a title to show in
 * place of the id. The id is the stored value; `title` exists for answers whose value is
 * read elsewhere (the Configurator table) and must not change when the copy does.
 */
export type Option = { id: string; title?: string; description: string }

/**
 * The flow's one selection surface — every single-choice card in it, with or without an
 * illustration on top (node 4541:16282).
 *
 * Selected is a primary[500] border plus a CheckboxV2 inline with the title, pushed to the
 * far end of that row. The checkbox only appears on the chosen card, as the design draws it;
 * the card stays white either way.
 *
 * blend-gap: no selectable option card. CardV2 is the near miss — it derives role="button",
 * tabIndex and aria-pressed from `interactive`/`selected` exactly as this does — but its
 * selected state is a 1px primary border plus a 3px primary[50] ring
 * (cardV2.light.tokens.ts:33-36), which is not the design's border-plus-checkbox.
 *
 * The card is a `div role="button"` rather than a `<button>` because CheckboxV2 renders a
 * button of its own, and a button inside a button is invalid markup the browser silently
 * rearranges. The checkbox is therefore decoration here: out of the tab order, hidden from
 * assistive tech (aria-pressed on the card already says selected), and click-through, so a
 * click on it lands on the card like a click anywhere else.
 *
 * `dimmed` is the de-emphasis the prototype asks for: once a group has an answer, its other
 * options recede so the eye lands on the question that is still open. They stay clickable,
 * and index.css brings them back to full on hover so changing an earlier answer does not
 * become a hunt.
 */
export function SelectableCard({
  title,
  description,
  selected,
  dimmed,
  onSelect,
  onPointerEnter,
  media,
}: {
  title: string
  description: string
  selected: boolean
  dimmed: boolean
  onSelect: () => void
  /** Hover in — the Setup step replays a card's illustration on it. */
  onPointerEnter?: () => void
  /** An illustration above the copy. A card with one is the larger variant: 12px radius,
      16px padding and a body/lg title (node 4541:16354). */
  media?: ReactNode
}) {
  const large = media !== undefined

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      // Space would otherwise scroll the flow's content pane.
      event.preventDefault()
      onSelect()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      data-dimmed={dimmed}
      onClick={onSelect}
      onKeyDown={onKeyDown}
      onPointerEnter={onPointerEnter}
      className="flow-card flex h-full w-full cursor-pointer flex-col overflow-hidden border text-left outline-offset-2 focus-visible:outline-2"
      style={{
        borderRadius: FOUNDATION_THEME.border.radius[large ? 12 : 8],
        borderColor: selected ? colors.primary[500] : colors.gray[200],
        backgroundColor: colors.gray[0],
        outlineColor: colors.primary[500],
      }}
    >
      {media}
      {/* 12px on the right, not 16 — node 4541:16282 pulls the checkbox in so it sits as
          far from the card's right edge as the copy does from its top. */}
      <div className={`flex flex-col gap-1 pr-3 ${large ? 'py-4 pl-4' : 'py-3 pl-4'}`}>
        <div className="flex items-start justify-between gap-4">
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.body[large ? 'lg' : 'md'])}
            color={colors.gray[700]}
            fontWeight={FOUNDATION_THEME.font.weight[600]}
          >
            {title}
          </PrimitiveText>
          {/* The checkbox sits 12px from the card's top and right edges (node 4541:16282).

              size-4 + overflow-hidden clips it to the 16px box. CheckboxV2 always renders an
              empty label container beside the box, 8px gap included, and takes no className
              or style to remove it — unclipped, that gap pushed the box 20px off the edge.

              Pinned to the row's top rather than centred on the title, so the top inset is
              the padding itself. The large card pads 16px, so it lifts 4px to match. Being
              shorter than the title line, it never grows the row when it appears. */}
          {selected && (
            <span
              aria-hidden
              className={`pointer-events-none flex size-4 shrink-0 overflow-hidden ${large ? '-mt-1' : ''}`}
            >
              <CheckboxV2 checked size={SelectorV2Size.MD} tabIndex={-1} />
            </span>
          )}
        </div>
        <PrimitiveText
          {...font(FOUNDATION_THEME.font.size.body.md)}
          color={colors.gray[500]}
          fontWeight={FOUNDATION_THEME.font.weight[400]}
        >
          {description}
        </PrimitiveText>
      </div>
    </div>
  )
}

/** One text-only answer in the flow — a SelectableCard over an Option. */
export function OptionCard({
  option,
  selected,
  dimmed,
  onSelect,
}: {
  option: Option
  selected: boolean
  dimmed: boolean
  onSelect: () => void
}) {
  return (
    <SelectableCard
      title={option.title ?? option.id}
      description={option.description}
      selected={selected}
      dimmed={dimmed}
      onSelect={onSelect}
    />
  )
}

/**
 * Equal-width columns, equal heights.
 *
 * A grid rather than `flex-1` cards because the design pads shorter descriptions with blank
 * lines to make a row match (node 4410:29820 carries two trailing `<br>`s). `auto-cols-fr`
 * gets the same result from the layout, so the copy stays copy.
 */
export function OptionRow({ children }: { children: ReactNode }) {
  return <div className="grid auto-cols-fr grid-flow-col gap-4">{children}</div>
}

/**
 * A labelled question — node 4541:16487: a body/lg/medium gray.700 label 8px above its
 * options. `.flow-question` carries the reveal keyframe, so remounting one — which is what a
 * changed `key` at the call site does — replays its arrival.
 */
export function QuestionGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flow-question flex flex-col gap-2">
      <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.lg)} color={colors.gray[700]}>
        {label}
      </PrimitiveText>
      {children}
    </div>
  )
}
