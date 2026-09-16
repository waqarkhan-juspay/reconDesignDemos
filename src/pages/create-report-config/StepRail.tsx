import {
  StepperV2,
  StepperV2StepStatus,
  StepperV2Type,
  type StepperV2Step,
} from '@juspay/blend-design-system'

export type RailStep = {
  /** The short name the rail shows. */
  label: string
  /** True on a step the flow never requires an answer to — Filters. */
  optional: boolean
  /** Whether this step's own questions have been answered. */
  answered: boolean
}

/**
 * What the rail says about one step.
 *
 * Read off the answers rather than off how far you have walked, because the flow lets you
 * jump to any step (see the note on navigation in index.tsx): arriving at Filters from the
 * rail does not mean Setup and Delivery were filled in on the way, so position alone would
 * tick steps nobody answered.
 *
 * `skipped` is the one place position still matters — it is the difference between an
 * optional step you have not reached yet and one you walked past and left empty.
 */
function statusOf({ optional, answered }: RailStep, index: number, current: number) {
  if (index === current) return StepperV2StepStatus.CURRENT
  if (answered) return StepperV2StepStatus.COMPLETED
  if (index < current && optional) return StepperV2StepStatus.SKIPPED
  return StepperV2StepStatus.PENDING
}

/**
 * The create flow's step rail — Blend's vertical `StepperV2`, replacing the breadcrumb that
 * used to sit in the topbar (node 4853:101733).
 *
 * Every step is reachable, so the whole rail is clickable and no step is `disabled`. Blend
 * gives that keyboard navigation for free: Up/Down move between steps, Home/End jump to the
 * ends, and Enter or Space activates.
 *
 * The rail carries no `status` of its own beyond what `statusOf` derives — passing `status`
 * on a step overrides Blend's own completed/current derivation (`StepperV2/utils.ts`), which
 * is exactly what we want here, and the one `current` step is also what Blend reads to decide
 * which step a keyboard user lands on.
 */
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
  }))

  return (
    <StepperV2
      steps={railSteps}
      stepperType={StepperV2Type.VERTICAL}
      clickable
      onStepClick={onNavigate}
    />
  )
}
