import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
  ThemeProvider,
  TopbarV2,
} from '@juspay/blend-design-system'
import { CaretRight } from '@phosphor-icons/react'
import { Fragment, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import tenantLogo from '../../assets/icons/tenant-logo.svg'
import { TopbarStatusIcons } from '../../layout/topbar'
import { FEEDBACK_EASING, FEEDBACK_MS, PAGE_EASING, PAGE_MS } from '../../motion'
import { PrimitiveText, font } from '../../primitives'
import { ghostButtonTokens } from '../../theme'
import { DeliveryStep } from './DeliveryStep'
import { ExitFlowModal } from './ExitFlowModal'
import { FieldsStep } from './FieldsStep'
import { FieldsLayoutDials, type FieldsLayout } from './fields-layout'
import { FiltersStep } from './FiltersStep'
import { ReviewStep } from './ReviewStep'
import { SetupStep } from './SetupStep'
import {
  EMPTY_DELIVERY,
  EMPTY_FIELDS,
  EMPTY_FILTERS,
  EMPTY_SETUP,
  hasAnyFilter,
  isDeliveryComplete,
  isFieldsComplete,
  isSetupComplete,
  type DeliveryAnswers,
  type FieldsAnswers,
  type FiltersAnswers,
  type SetupAnswers,
} from './answers'

const { colors } = FOUNDATION_THEME

/**
 * One measure for the whole flow: a 960px content column, with a `full` track beside it
 * for the one thing that cannot fit (the Fields table). The tracks themselves are
 * `.flow-grid` in index.css — see the note there; the width is `--flow-content`.
 *
 * Wider than the design's own 800px Review column (node 4530:10457) on purpose: the flow is
 * card grids, a three-select rule row and tables rather than prose, so the extra width goes
 * to longer option descriptions and column names instead of to line length. Inputs keep
 * their own fixed widths and do not stretch. It replaces three per-step widths — 632, 848
 * and 1158 — which is what made the column jump as you walked the flow.
 */
const COLUMN = 'flow-grid'

/**
 * The five steps of the create flow, with the heading each one carries.
 *
 * Every step now takes the same measure, so there is no per-step width here any more —
 * `.flow-grid` is the one column and a step's own content decides whether any part of it
 * breaks out (see `.flow-full`).
 *
 * The design draws the progress bar at 288px of 1440 on Setup, 576px on Delivery and 864px
 * on Fields: one, two and three fifths of these five.
 */
const STEPS: {
  label: string
  title: string
  /** Optional standfirst under the title. */
  description?: string
  /** A chip above the title. Only Filters carries one, saying it can be skipped. */
  tag?: string
  /**
   * Present on a step the flow does not require an answer to. It carries the label the
   * primary action takes while that step is still untouched, and its presence is also what
   * says the step can never block — the two always travel together, so a step cannot end up
   * optional in one sense and required in the other.
   */
  skipLabel?: string
}[] = [
  {
    label: 'Setup',
    // Node 4542:17104.
    title: 'Set up your report',
    description:
      'Pick a report type, choose which records to include, and decide how the data is presented.',
  },
  { label: 'Delivery', title: 'Delivery and scheduling' },
  {
    label: 'Fields',
    title: 'Customise your fields',
    // The first sentence is node 4457:15485's; the second was rewritten in review, replacing
    // the design's "Re arrange, edit, delete as per your wish!".
    description:
      'Select data from existing columns or add a custom column of your choice. ' +
      'Re-arrange, edit, and delete columns that work for you!',
  },
  {
    label: 'Filters',
    title: 'Choose which rows to filter out',
    description: 'Only the rows matching your conditions are written to the report',
    tag: 'Optional',
    skipLabel: 'Skip filters',
  },
  {
    label: 'Review',
    title: 'Review and submit',
    description: 'Take a moment to review your entire configuration file before submitting.',
  },
]

/**
 * The primary action on the final step. Longer than the step's own label on purpose — the
 * design names the button for what it does to the config (node 4530:10456), not for the
 * step it sits on.
 */
const SUBMIT_LABEL = 'Submit for approval'


/**
 * Measure for a step's description.
 *
 * 480 gives the Fields description one sentence per line — "…of your choice." /
 * "Re-arrange, edit, and delete…". Measured in InterDisplay 14px: anything from 460 to 499
 * breaks there; 400–459 splits the first sentence, and at 400 the last word ends up alone
 * on a third line, while 500 and up pulls "Re-arrange," onto the first line. 480 sits mid-
 * window so a rendering difference of a few pixels cannot move the break. Re-measure if the
 * copy or the body font changes — the window is only 40px wide.
 */
const DESCRIPTION_WIDTH = 480

/**
 * Timings handed to the stylesheet as custom properties, so the keyframes and transitions
 * in index.css still read their numbers from src/motion.ts (rule 14) rather than keeping a
 * second copy. Set once on the flow root; custom properties inherit.
 */
const MOTION = {
  '--flow-reveal': `${PAGE_MS}ms`,
  '--flow-reveal-ease': PAGE_EASING,
  '--flow-feedback': `${FEEDBACK_MS}ms`,
  '--flow-feedback-ease': FEEDBACK_EASING,
} as CSSProperties

type StepNavigation = {
  step: number
  onNavigate: (target: number) => void
}

/**
 * TEMPORARY — every step is reachable, on request. Nothing gates the breadcrumb: no step is
 * disabled, and any label jumps straight to its step whether or not the ones before it have
 * been answered. To put the gate back, restore `canGoTo` (see the git history for this file)
 * and take `reachable` back into `disabled`, the cursor and the colour below.
 *
 * Dark therefore has to mean something else now. It used to mean *reachable*, which with
 * everything reachable would light the whole bar and say nothing; it now marks the step you
 * are standing on, which is the one thing left worth reading off it — and the same thing
 * `aria-current` already told a screen reader.
 *
 * The button is always rendered rather than swapped in: a label that changes element type
 * moves focus out from under the keyboard.
 */
function StepBreadcrumb({ step, onNavigate }: StepNavigation) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map(({ label }, index) => {
        const current = index === step
        return (
          <Fragment key={label}>
            {index > 0 && <CaretRight size={16} color={colors.gray[400]} />}
            <button
              type="button"
              aria-current={current ? 'step' : undefined}
              onClick={() => onNavigate(index)}
              className={`border-none bg-transparent p-0 ${
                current ? 'cursor-default' : 'cursor-pointer'
              }`}
            >
              <PrimitiveText
                {...font(FOUNDATION_THEME.font.size.body.lg)}
                color={current ? colors.gray[700] : colors.gray[400]}
              >
                {label}
              </PrimitiveText>
            </button>
          </Fragment>
        )
      })}
    </div>
  )
}

function TopbarContent({ onExit, ...navigation }: StepNavigation & { onExit: () => void }) {
  return (
    <div className="flex w-full items-center justify-between">
      {/* The logo is one of the flow's two exits (the footer's Exit is the other). Both open
          the same confirmation rather than leaving outright — see ExitFlowModal. */}
      <button
        type="button"
        onClick={onExit}
        aria-label="Exit report setup"
        className="flex size-8 cursor-pointer items-center justify-center overflow-clip rounded-[6.4px] border-none bg-transparent p-0"
      >
        <img src={tenantLogo} alt="" className="block size-[18px]" />
      </button>
      <StepBreadcrumb {...navigation} />
      <TopbarStatusIcons />
    </div>
  )
}

/**
 * Full-screen takeover for creating a report config — the rule 8 exception to the app
 * shell. It is routed outside AppShell precisely so no sidebar renders beside it: the flow
 * is one decision at a time, and app nav next to it is an invitation to leave.
 *
 * The bar is a standalone TopbarV2, which is the one correct use of one — everywhere else
 * SidebarV2 renders its own internally. Content scrolls its own element rather than the
 * window, with the bar and the action footer as that element's siblings, so both stay put.
 *
 * Every step's answers live here rather than in the step, so Back is free: walking away and
 * returning finds the questions as they were, with their reveals already open.
 */
function CreateReportConfig() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [setup, setSetup] = useState<SetupAnswers>(EMPTY_SETUP)
  const [delivery, setDelivery] = useState<DeliveryAnswers>(EMPTY_DELIVERY)
  const [fields, setFields] = useState<FieldsAnswers>(EMPTY_FIELDS)
  const [filters, setFilters] = useState<FiltersAnswers>(EMPTY_FILTERS)
  const [confirmingExit, setConfirmingExit] = useState(false)

  /**
   * Both exits land on the Configurator. There is no draft store yet, so "Save as draft"
   * leaves the same way Discard does — the choice is recorded in the UI, not persisted.
   * When drafts exist, this is the one place that writes one.
   */
  const leaveFlow = () => {
    setConfirmingExit(false)
    navigate('/configurator')
  }

  const { title, description, tag, skipLabel } = STEPS[step]
  const isLastStep = step === STEPS.length - 1

  /**
   * Filters is the one step nothing has to be answered on, so its primary action is not
   * quite the button the other steps get: it never disables, and while the step is still
   * untouched it says what clicking it will actually do.
   *
   * "Continue" over an optional step nobody has touched claims something was configured.
   * "Skip filters" is a promise about the click, and it stops being true the moment there
   * is a filter to carry forward — which is why the label flips back rather than staying a
   * skip for the rest of the step.
   */
  const optional = skipLabel !== undefined
  const skipping = optional && !hasAnyFilter(filters)

  /**
   * Each step's answers, checked. Only the current step is read today — the breadcrumb used
   * to need the whole list and no longer does (see StepBreadcrumb) — but it stays a list
   * because that is what putting the gate back needs, and five booleans cost nothing.
   *
   * Steps past the built ones have nothing to answer, so they are complete by definition
   * and never hold the flow up.
   */
  const stepComplete = STEPS.map((_, index) =>
    index === 0
      ? isSetupComplete(setup)
      : index === 1
        ? isDeliveryComplete(delivery)
        : index === 2
          ? isFieldsComplete(fields)
          : true,
  )

  const complete = stepComplete[step]

  /**
   * One step's heading and body. A function rather than inline JSX so the Fields step can
   * render it inside FieldsLayoutDials, which hands back the spacing and layout version its
   * dial panel is set to. Every other step calls it with nothing and keeps the defaults: the
   * inline row-gap is absent, and the heading's custom property falls back to 8px.
   */
  const renderStep = (layout?: FieldsLayout) => (
    // Setup follows node 4541:16282, which sets its sections 24px apart; the other steps
    // keep the 32px rhythm their own frames were drawn at.
    <div key={step} className={`${COLUMN} flow-question ${step === 0 ? 'gap-y-6' : 'gap-y-8'} pt-24 pb-12`}
      style={layout?.style}
      data-layout={layout?.wide ? 'wide' : undefined}
    >
      {/* Every step's heading sits on the content column's left edge, Fields
          included. Node 4457:15485 draws that heading flush with its table's left
          edge instead, which the old per-step width reproduced — but the table is
          now the one thing that breaks out of the column, so the two no longer
          meet. Deliberate: a heading that moved with its step's widest element is
          exactly the jumping this grid removes. */}
      {/* 4px between title and standfirst — node 4542:17173's gap. The Fields dials can
          still override it through the custom property. */}
      <div className="flex flex-col" style={{ gap: 'var(--step-heading-gap, 4px)' }}>
        {/* Above the title, not beside it: it qualifies the whole step rather than
            the heading, and it is the first thing worth knowing on a step you are
            allowed to walk straight past. */}
        {tag && (
          <div className="flex">
            <TagV2
              text={tag}
              type={TagV2Type.SUBTLE}
              subType={TagV2SubType.SQUARICAL}
              color={TagV2Color.NEUTRAL}
              size={TagV2Size.XS}
            />
          </div>
        )}
        <PrimitiveText
          as="h1"
          {...font(FOUNDATION_THEME.font.size.heading.md)}
          color={colors.gray[700]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          {title}
        </PrimitiveText>
        {description && (
          // Measured, not full-bleed: the design breaks this into two lines against
          // a 1110px table, and a single 1110px line of 14px copy is a worse read.
          // The width goes on a wrapper — PrimitiveText builds its own style object
          // from named props and never forwards a `style` (PrimitiveText.tsx:110).
          <div style={{ maxWidth: DESCRIPTION_WIDTH }}>
            <PrimitiveText
              as="p"
              {...font(FOUNDATION_THEME.font.size.body.md)}
              color={colors.gray[500]}
              fontWeight={FOUNDATION_THEME.font.weight[400]}
            >
              {description}
            </PrimitiveText>
          </div>
        )}
      </div>

      {step === 0 && <SetupStep answers={setup} onChange={setSetup} />}
      {step === 1 && <DeliveryStep answers={delivery} onChange={setDelivery} />}
      {step === 2 && (
        <FieldsStep answers={fields} onChange={setFields} version={layout?.version} />
      )}
      {step === 3 && <FiltersStep answers={filters} onChange={setFilters} />}
      {step === 4 && <ReviewStep fields={fields} />}
    </div>
  )

  return (
    <div
      className="flex h-screen flex-col"
      style={{ ...MOTION, backgroundColor: colors.gray[0] }}
    >
      <div className="shrink-0">
        <TopbarV2
          topbar={
            <TopbarContent
              step={step}
              onNavigate={setStep}
              onExit={() => setConfirmingExit(true)}
            />
          }
        />
        {/* Progress across the five steps. The design draws it as a rule sitting on the
            topbar's bottom edge.

            blend-gap: no 2px linear progress. ProgressBarV2's smallest linear height is
            unit[12] with a rounded fill (progressBarV2.light.tokens.ts:13-17), which cannot
            sit flush on the topbar edge. */}
        <div className="h-0.5 w-full" style={{ backgroundColor: colors.gray[150] }}>
          <div
            className="h-full"
            style={{
              width: `${((step + 1) / STEPS.length) * 100}%`,
              backgroundColor: colors.primary[500],
              transition: `width var(--flow-reveal) var(--flow-reveal-ease)`,
            }}
          />
        </div>
      </div>

      {/* One pane, full width beneath the bar, with its own actions under it. It used to be
          a flex row holding a single child — the remains of a split pane whose second half
          never arrived — which is why nothing here needs `flex-1` or `min-w-0` any more.

          min-h-0 stays and is load-bearing: it is what lets the scroller below actually
          scroll, since without it a flex child floors at its content height and the
          overflow escapes to the page. */}
      <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-auto" data-flow-content>
            {/* Keyed on the step so moving between them replays the arrival rather than
                cross-fading one set of questions into another. */}
            {/* Only the Fields step gets the layout dials. Mounting FieldsLayoutDials is what
                registers its panel, and leaving the step unmounts it and takes the panel away. */}
            {step === 2 ? <FieldsLayoutDials>{renderStep}</FieldsLayoutDials> : renderStep()}
          </div>

          <div
            className="shrink-0 border-t"
            style={{
              borderColor: colors.gray[200],
              backgroundColor: colors.gray[0],
              boxShadow: FOUNDATION_THEME.shadows.md,
            }}
          >
            {/* The same grid as the content, so Exit and the primary action sit on the
                column's own edges. The design draws this bar at 632px (node 4530:10452)
                while its content column is wider — inset from it on both sides, which reads as
                a mistake once the two are on screen together. Aligning them is the point of
                a single measure. */}
            <div className={COLUMN}>
              <div className="flex items-center justify-between py-6">
              {/* A ghost button (ghostButtonTokens, src/theme.ts): padded to the Back button's
                  height so the whole pill is clickable. Pulled 16px left so its label still
                  sits on the column edge, as the inline version did.
                  blend-gap: ButtonV2 sets `cursor: default` (ButtonV2/utils.ts) with no prop or
                  token to change it, so the pointer is set from a wrapper this file owns. */}
              <span className="-ml-4 flex [&_button]:cursor-pointer">
                <ThemeProvider componentTokens={ghostButtonTokens}>
                  <ButtonV2
                    buttonType={ButtonV2Type.SECONDARY}
                    subType={ButtonV2SubType.INLINE}
                    size={ButtonV2Size.LARGE}
                    text="Exit"
                    onClick={() => setConfirmingExit(true)}
                  />
                </ThemeProvider>
              </span>
              <div className="flex items-center gap-3">
                {step > 0 && (
                  <ButtonV2
                    buttonType={ButtonV2Type.SECONDARY}
                    size={ButtonV2Size.LARGE}
                    text="Back"
                    onClick={() => setStep(step - 1)}
                  />
                )}
                {/* Held only until the step is answered — except on an optional one, where
                    there is nothing to hold it for. On the final step there is nowhere
                    further to go, so it closes the flow instead.

                    `complete` is already true for an optional step today, so the guard is
                    belt-and-braces on purpose: it is what keeps this button enabled if
                    Filters ever grows an `isFiltersComplete` alongside its three siblings. */}
                <ButtonV2
                  buttonType={ButtonV2Type.PRIMARY}
                  size={ButtonV2Size.LARGE}
                  text={isLastStep ? SUBMIT_LABEL : skipping ? skipLabel : 'Continue'}
                  disabled={!optional && !complete}
                  onClick={() => (isLastStep ? navigate('/configurator') : setStep(step + 1))}
                />
              </div>
              </div>
            </div>
          </div>
      </div>

      <ExitFlowModal
        isOpen={confirmingExit}
        onCancel={() => setConfirmingExit(false)}
        onSaveDraft={leaveFlow}
        onDiscard={leaveFlow}
      />
    </div>
  )
}

export default CreateReportConfig
