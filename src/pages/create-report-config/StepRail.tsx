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
 * moved on. Answers alone are not enough: several steps start out already valid (Fields
 * ships a default column set, so `isFieldsComplete` is true on first render), so reading
 * `answered` on its own ticked steps nobody had opened. Position is not enough either —
 * the rail lets you jump anywhere, so arriving at Filters says nothing about Setup.
 *
 * `answered` still has a say, in one direction only: it can take a tick back. Commit a
 * step, walk back into it and clear a required answer, and the tick goes rather than
 * standing over questions that no longer have any.
 *
 * `skipped` is the optional step (Filters) committed with nothing filled in. Its button
 * says "Skip filters" in that state, and the rail should not then claim it was completed.
 */
function statusOf({ optional, answered, confirmed }: RailStep, index: number, current: number) {
  if (index === current) return StepperV2StepStatus.CURRENT
  if (!confirmed) return StepperV2StepStatus.PENDING
  if (answered) return StepperV2StepStatus.COMPLETED
  if (optional) return StepperV2StepStatus.SKIPPED
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
