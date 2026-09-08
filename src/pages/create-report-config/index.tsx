import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  TopbarV2,
} from '@juspay/blend-design-system'
import { CaretRight } from '@phosphor-icons/react'
import { Fragment, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import tenantLogo from '../../assets/icons/tenant-logo.svg'
import { TopbarStatusIcons } from '../../layout/topbar'
import { FEEDBACK_EASING, FEEDBACK_MS, PAGE_EASING, PAGE_MS } from '../../motion'
import { PrimitiveText, font } from '../../primitives'
import { DeliveryStep } from './DeliveryStep'
import { FieldsStep } from './FieldsStep'
import { SetupStep } from './SetupStep'
import { Showcase } from './Showcase'
import {
  EMPTY_DELIVERY,
  EMPTY_FIELDS,
  EMPTY_SETUP,
  isDeliveryComplete,
  isFieldsComplete,
  isSetupComplete,
  type DeliveryAnswers,
  type FieldsAnswers,
  type SetupAnswers,
} from './answers'

const { colors } = FOUNDATION_THEME

/**
 * The five steps of the create flow, with the heading each one carries.
 *
 * `wide` marks a step whose content is not the flow's 632px column: Fields draws a 1100px
 * table, so it takes the whole screen — heading centred over the table, and no showcase
 * panel beside it, because 60% of the viewport cannot hold the table without scrolling most
 * of it out of sight.
 *
 * Filters and Submit have no design yet — they are named here so the breadcrumb and the
 * progress bar read correctly, and they render a placeholder rather than blocking the flow.
 * The design draws the bar at 288px of 1440 on Setup, 576px on Delivery and 864px on
 * Fields: one, two and three fifths of these five.
 */
const STEPS = [
  { label: 'Setup', title: 'Setup your report file' },
  { label: 'Delivery', title: 'Delivery and scheduling' },
  { label: 'Fields', title: 'Customize your column fields', wide: true },
  { label: 'Filters', title: 'Filters' },
  { label: 'Submit', title: 'Submit' },
]

/** Index of the last step that has a design. */
const LAST_BUILT_STEP = 2

/**
 * The flow's own content column — the design centres a 632px column under the bar.
 *
 * A max-width rather than a fixed one, because the column now lives inside the 60% pane
 * rather than the whole screen: below roughly a 1050px viewport that pane is narrower than
 * 632 and a fixed width would simply overflow it.
 */
const COLUMN = 'mx-auto w-full max-w-[632px] px-6'

/**
 * Fields is wider: a centred table that scrolls rather than growing. 1158 less the 24px
 * gutters is 1110, which is FieldsStep's TABLE_MAX_WIDTH — so the column gives the table
 * exactly the width it asks for, and the heading centres over exactly that.
 */
const WIDE_COLUMN = 'mx-auto w-full max-w-[1158px] px-6'

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

/** Steps already passed stay dark alongside the current one; only what is ahead is grey. */
function StepBreadcrumb({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-2">
      {STEPS.map(({ label }, index) => (
        <Fragment key={label}>
          {index > 0 && <CaretRight size={16} color={colors.gray[400]} />}
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.body.lg)}
            color={index <= step ? colors.gray[700] : colors.gray[400]}
          >
            {label}
          </PrimitiveText>
        </Fragment>
      ))}
    </div>
  )
}

function TopbarContent({ step }: { step: number }) {
  return (
    <div className="flex w-full items-center justify-between">
      <div className="flex size-8 items-center justify-center overflow-clip rounded-[6.4px]">
        <img src={tenantLogo} alt="" className="block size-[18px]" />
      </div>
      <StepBreadcrumb step={step} />
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

  const { title, wide } = STEPS[step]
  const isLastStep = step === STEPS.length - 1

  // Steps past the built ones have nothing to answer, so they never hold the flow up.
  const complete =
    step === 0
      ? isSetupComplete(setup)
      : step === 1
        ? isDeliveryComplete(delivery)
        : step === 2
          ? isFieldsComplete(fields)
          : true

  return (
    <div
      className="flex h-screen flex-col"
      style={{ ...MOTION, backgroundColor: colors.gray[0] }}
    >
      <div className="shrink-0">
        <TopbarV2 topbar={<TopbarContent step={step} />} />
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

      {/* 60 / 40 beneath the bar: the flow on the left with its own actions under it, the
          showcase panel full-bleed to the bottom of the screen on the right. A wide step
          takes the whole width and drops the panel entirely. min-h-0 is what lets the left
          column's scroller actually scroll — without it a flex child floors at its content
          height and the overflow escapes to the page. */}
      <div className="flex min-h-0 flex-1">
        <div
          className={`flex min-w-0 shrink-0 flex-col ${wide ? 'w-full' : 'w-[60%]'}`}
        >
          <div className="flex-1 overflow-auto" data-flow-content>
            {/* Keyed on the step so moving between them replays the arrival rather than
                cross-fading one set of questions into another. */}
            <div
              key={step}
              className={`${wide ? WIDE_COLUMN : COLUMN} flow-question flex flex-col gap-8 pt-24 pb-12`}
            >
              {/* Fields centres its heading over the table; the column-width steps left-align.
                  Passed as a prop, not a wrapper class: PrimitiveText defaults textAlign to
                  'left' and writes it into its own styles (PrimitiveText.tsx:102,116), so an
                  inherited text-align never reaches it. */}
              <PrimitiveText
                as="h1"
                {...font(FOUNDATION_THEME.font.size.heading.lg)}
                color={colors.gray[700]}
                textAlign={wide ? 'center' : 'left'}
              >
                {title}
              </PrimitiveText>

              {step === 0 && <SetupStep answers={setup} onChange={setSetup} />}
              {step === 1 && <DeliveryStep answers={delivery} onChange={setDelivery} />}
              {step === 2 && <FieldsStep answers={fields} onChange={setFields} />}
              {step > LAST_BUILT_STEP && (
                // Scaffold, not design: this step is named in the breadcrumb but has no Figma
                // yet. Drawn plainly so it cannot be mistaken for the real thing, and so the
                // flow still walks end to end.
                <PrimitiveText
                  {...font(FOUNDATION_THEME.font.size.body.md)}
                  color={colors.gray[400]}
                >
                  This step has not been designed yet.
                </PrimitiveText>
              )}
            </div>
          </div>

          <div
            className="shrink-0 border-t"
            style={{
              borderColor: colors.gray[200],
              backgroundColor: colors.gray[0],
              boxShadow: FOUNDATION_THEME.shadows.md,
            }}
          >
            <div className={`${COLUMN} flex items-center justify-between px-1 py-6`}>
              <ButtonV2
                buttonType={ButtonV2Type.SECONDARY}
                subType={ButtonV2SubType.INLINE}
                size={ButtonV2Size.LARGE}
                text="Exit"
                onClick={() => navigate('/configurator')}
              />
              <div className="flex items-center gap-3">
                {step > 0 && (
                  <ButtonV2
                    buttonType={ButtonV2Type.SECONDARY}
                    size={ButtonV2Size.LARGE}
                    text="Back"
                    onClick={() => setStep(step - 1)}
                  />
                )}
                {/* Held only until the step is answered. On the final step there is nowhere
                    further to go, so it closes the flow instead. */}
                <ButtonV2
                  buttonType={ButtonV2Type.PRIMARY}
                  size={ButtonV2Size.LARGE}
                  text={isLastStep ? 'Submit' : 'Continue'}
                  disabled={!complete}
                  onClick={() => (isLastStep ? navigate('/configurator') : setStep(step + 1))}
                />
              </div>
            </div>
          </div>
        </div>

        {!wide && <Showcase />}
      </div>
    </div>
  )
}

export default CreateReportConfig
