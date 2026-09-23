import {
  FOUNDATION_THEME,
  StepperV2,
  StepperV2StepStatus,
  StepperV2Type,
  type StepperV2Step,
} from '@juspay/blend-design-system'
import { PrimitiveText, font } from '../../primitives'

export type RailStep = {
  /** The short name the rail shows. */
  label: string
  /** True on a step the flow never requires an answer to — Filters. */
  optional: boolean
  /** Whether this step's own questions have been answered. */
  answered: boolean
  /**
   * Whether the user has committed this step — reached it and clicked the flow's primary
   * action on it. This, not `answered`, is what earns a tick.
   */
  confirmed: boolean
}

/**
 * What the rail says about one step.
 *
 * A step is ticked once the user has *committed* it — clicked the primary action on it and
 * moved on. Answers alone are not enough: a step can start out already valid, and reading
 * `answered` on its own would tick steps nobody had opened.
 *
 * `answered` still has a say, in one direction only: it can take a tick back. Commit a
 * step, walk back into it and clear a required answer, and the tick goes rather than
 * standing over questions that no longer have any.
 *
 * `skipped` is an optional step (Grouping, Filters) committed with nothing filled in. Its
 * button says "Skip …" in that state, and the rail should not then claim it was completed.
 */
function statusOf({ optional, answered, confirmed }: RailStep, index: number, current: number) {
  if (index === current) return StepperV2StepStatus.CURRENT
  if (!confirmed) return StepperV2StepStatus.PENDING
  if (answered) return StepperV2StepStatus.COMPLETED
  if (optional) return StepperV2StepStatus.SKIPPED
  return StepperV2StepStatus.PENDING
}

/**
 * The create flow's step rail — Blend's vertical `StepperV2` (node 4853:101733).
 *
 * The rail goes **backwards only**. The current step and every step before it can be
 * clicked; every step after it is `disabled`, so the only way forward is the footer's primary
 * action, which is held until the step is answered. That is what guarantees Review is only
 * ever reached with every required step complete.
 *
 * `disabled` rather than ignoring the click: StepperV2 then drops the pointer cursor, takes
 * the step out of the tab order, skips it in its Up/Down/Home/End keyboard navigation and
 * announces it as disabled — a step that looked clickable and did nothing would be worse.
 * It also overrides `status` (StepperV2/utils.ts `getStepState`), so a step you have walked
 * back past shows as disabled rather than ticked until you Continue onto it again.
 *
 * A disabled step keeps its number. Blend draws a lock there, but a lock says "you may not",
 * where these steps are simply not reached yet — so `icon` (which Blend renders ahead of any
 * status glyph, Steps.tsx `renderStepIcon`) hands back the number instead, drawn the way
 * Blend draws a pending step's: 12px at 500, in the disabled icon colour, `gray[300]`
 * (`icon.disabled` in stepperV2.light.tokens.ts).
 *
 * Every other step's `status` comes from `statusOf` — passing it overrides Blend's own
 * completed/current derivation, which is what we want here.
 */
/**
 * A disabled step's number, in place of Blend's lock. `aria-hidden`, as Blend's own number
 * is: the step's accessible name already carries its position.
 */
function DisabledStepNumber({ value }: { value: number }) {
  return (
    <span aria-hidden="true" className="flex">
      <PrimitiveText
        as="span"
        {...font(FOUNDATION_THEME.font.size.body.sm)}
        color={FOUNDATION_THEME.colors.gray[300]}
      >
        {value}
      </PrimitiveText>
    </span>
  )
}

export function StepRail({
  steps,
  current,
  onNavigate,
}: {
  steps: RailStep[]
  current: number
  onNavigate: (target: number) => void
}) {
  const railSteps: StepperV2Step[] = steps.map((step, index) => ({
    id: index,
    title: step.label,
    status: statusOf(step, index, current),
    disabled: index > current,
    icon: index > current ? <DisabledStepNumber value={index + 1} /> : undefined,
  }))

  return (
    <StepperV2
      steps={railSteps}
      stepperType={StepperV2Type.VERTICAL}
      clickable
      // Guarded as well as disabled, so the rule does not rest on Blend honouring the flag.
      onStepClick={(target) => {
        if (target <= current) onNavigate(target)
      }}
    />
  )
}
