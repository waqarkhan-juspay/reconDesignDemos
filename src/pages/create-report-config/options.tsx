import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { PrimitiveText, font } from '../../primitives'

const { colors } = FOUNDATION_THEME

/** One selectable answer: a short id that is also its visible title, and a line under it. */
export type Option = { id: string; description: string }

/**
 * One answer in the flow.
 *
 * blend-gap: no selectable option card. CardV2 is the near miss — it derives role="button",
 * tabIndex and aria-pressed from `interactive`/`selected` exactly as this does — but its
 * selected state is a 1px primary border plus a 3px primary[50] ring
 * (cardV2.light.tokens.ts:33-36), where the design draws a bare border and a check badge on
 * the corner. Adopting it would change the visual, so this stays a composition.
 *
 * `dimmed` is the de-emphasis the prototype asks for: once a group has an answer, its other
 * options recede so the eye lands on the question that is still open. They stay clickable,
 * and index.css brings them back to full on hover so changing an earlier answer does not
 * become a hunt.
 *
 * Selected is a primary[600] border plus a filled check straddling the top-right corner
 * (Figma's `Property 1=Selected`, node 4418:6584) — not a tinted fill; the card stays white.
 */
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
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      data-dimmed={dimmed}
      className="flow-card relative flex h-full w-full cursor-pointer flex-col items-start gap-2 border px-4 py-3 text-left"
      style={{
        borderRadius: FOUNDATION_THEME.border.radius[8],
        borderColor: selected ? colors.primary[600] : colors.gray[200],
        backgroundColor: colors.gray[0],
      }}
    >
      <PrimitiveText
        {...font(FOUNDATION_THEME.font.size.body.md)}
        color={colors.gray[700]}
        fontWeight={FOUNDATION_THEME.font.weight[600]}
      >
        {option.id}
      </PrimitiveText>
      <PrimitiveText
        {...font(FOUNDATION_THEME.font.size.body.md)}
        color={colors.gray[400]}
        fontWeight={FOUNDATION_THEME.font.weight[400]}
      >
        {option.description}
      </PrimitiveText>
      {selected && (
        <span
          aria-hidden
          className="absolute flex size-4 items-center justify-center rounded-full"
          // Centred on the corner: the design puts the 16px badge at x=295/y=-7 of a
          // 304-wide card, i.e. overhanging by 7px on both edges.
          style={{ top: -7, right: -7, backgroundColor: colors.primary[600] }}
        >
          <Check size={10} strokeWidth={3} color={colors.gray[0]} />
        </span>
      )}
    </button>
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
 * A labelled question. `.flow-question` carries the reveal keyframe, so remounting one —
 * which is what a changed `key` at the call site does — replays its arrival.
 */
export function QuestionGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flow-question flex flex-col gap-4">
      <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[700]}>
        {label}
      </PrimitiveText>
      {children}
    </div>
  )
}
