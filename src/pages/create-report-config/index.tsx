import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  SnackbarV2Position,
  SnackbarV2Variant,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
  ThemeProvider,
  TopbarV2,
  addSnackbarV2,
} from '@juspay/blend-design-system'
import { ArrowLeft } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { FEEDBACK_EASING, FEEDBACK_MS, PAGE_EASING, PAGE_MS } from '../../motion'
import { PrimitiveText, font } from '../../primitives'
import { ghostButtonTokens } from '../../theme'
import { DeliveryStep } from './DeliveryStep'
import { ExitFlowModal } from './ExitFlowModal'
import { SubmitConfigModal } from './SubmitConfigModal'
import { FieldsStep } from './FieldsStep'
import { FieldsLayoutDials, type FieldsLayout } from './fields-layout'
import { FlowDials, type FlowVersion } from './flow-layout'
import { GroupingStep } from './GroupingStep'
import { FiltersStep } from './FiltersStep'
import { ReviewStep } from './ReviewStep'
import { SetupStep } from './SetupStep'
import { StepRail } from './StepRail'
import {
  EMPTY_DELIVERY,
  EMPTY_FIELDS,
  EMPTY_FILTERS,
  EMPTY_SETUP,
  hasAnyFilter,
  hasAnyGrouping,
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
/**
 * Identity for a step, so nothing downstream depends on its position. Flow version 2 inserts
 * Grouping in the middle of this list (flow-layout.tsx), which shifts every index after it —
 * the reason `step`, `confirmed` and the completeness checks below are all keyed on the id.
 */
export type StepId = 'setup' | 'delivery' | 'grouping' | 'fields' | 'filters' | 'review'

const ALL_STEPS: {
  id: StepId
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
    id: 'setup',
    label: 'Setup',
    // Node 4542:17104.
    title: 'Set up your report',
    description:
      'Pick a report type, choose which records to include, and decide how the data is presented.',
  },
  {
    id: 'delivery',
    label: 'Delivery',
    title: 'Delivery and scheduling',
    // Walks the step's own questions in order: how often, then the channels.
    description: 'Set how often the report runs, and choose where it gets delivered.',
  },
  {
    id: 'grouping',
    label: 'Grouping',
    title: 'Group your report',
    // Says what a grouping *does* rather than what it is: the answer the user is weighing is
    // what one row of the delivered file ends up meaning.
    description:
      'Pick the fields to summarise by. Each one you pick becomes a column, and the report keeps one row per combination.',
    skipLabel: 'Skip grouping',
  },
  {
    id: 'fields',
    label: 'Fields',
    title: 'Customise your fields',
    // Rewritten in review, replacing node 4457:15485's two sentences.
    description: 'Arrange, rename or add a custom column field.',
  },
  {
    id: 'filters',
    label: 'Filters',
    title: 'Choose which rows to filter out',
    description: 'Only the rows matching your conditions are written to the report',
    tag: 'Optional',
    skipLabel: 'Skip filters',
  },
  {
    id: 'review',
    label: 'Review',
    title: 'Review and submit',
    description: 'Take a moment to review your entire configuration file before submitting.',
  },
]

/**
 * The primary action on the final step. Longer than the step's own label on purpose — it is
 * named for what it does to the config, not for the step it sits on.
 *
 * "Proceed for Submission" rather than the design's "Submit for approval" (node 4530:10456):
 * the click does not submit anything, it opens SubmitConfigModal for the two names the
 * config still needs. A button that says "Submit" and then asks a question has misread its
 * own consequence.
 */
const SUBMIT_LABEL = 'Proceed for Submission'


/**
 * Measure for a step's description.
 *
 * 480 was measured against the Fields step's old two-sentence description, to put one
 * sentence on each line. Its current one-liner fits well inside it, so nothing depends on the
 * exact number any more — re-measure if a step's copy grows long enough to wrap.
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

/**
 * Space held clear down the left of the flow for the step rail, which is positioned rather
 * than laid out (`.flow-rail` in index.css). `.flow-grid` reads it as the minimum width of
 * its left gutter, so the content column stays centred while the window is wide enough for
 * that, and gives ground on the left before it gives any to the rail.
 *
 * 160 = the rail's 28px inset, its 106px measured width, and enough air after it that the
 * Fields step's 1200px measure (fields-layout.tsx) does not end up butted against it.
 */
const RAIL_GUTTER = { '--flow-rail-gutter': '160px' } as CSSProperties

/**
 * The bar holds one thing: the way back. Where a step breadcrumb used to sit in the middle,
 * the vertical StepRail beside the content says the same thing with room for state per step
 * (node 4853:101733).
 *
 * No logo and no status icons, unlike AppShell's bar. This is a takeover (see ReportFlow
 * below) — the flow is one decision at a time, and app chrome is an offer of somewhere else
 * to be. A way *back* is the exception: an exit you chose is not a distraction, and a
 * takeover with no visible way out is a trap. One labelled exit says it better than an
 * unlabelled logo that did the same thing without admitting it.
 */
function TopbarContent({ onExit }: { onExit: () => void }) {
  return (
    /*
     * The same `.flow-grid` the steps below use, so the title lands on the content column's
     * own left edge rather than near it — one definition of where that edge is, not two.
     *
     * `-mx-8` cancels TopbarV2's own 32px of horizontal padding (topbarV2 tokens) so this
     * grid resolves against the full window width, exactly as the content grid does. Without
     * it the two agree only while both gutters are above their floor: below 1344px the bar's
     * grid hits its floor 64px of window earlier than the content's, and the title would sit
     * 32px right of the heading under it at every width below that.
     *
     * `flow-topbar-grid` raises this grid's left floor to the back button's own width — see
     * index.css for what that trades away on a narrow window.
     */
    <div className="flow-grid flow-topbar-grid -mx-8 w-auto items-center">
      {/* One of the flow's two exits — the footer's "Exit" is the other — and the only one
          that says where it goes. It routes through onExit: this discards every answer so
          far, and a labelled button that did it silently would be the worse of the two.

          The arrow inherits currentColor rather than being tinted (rule 11): in a button slot
          the glyph and the label are one thing.

          blend-gap: ButtonV2 sets `cursor: default` (ButtonV2/utils.ts) with no prop or token
          to change it, so the pointer comes from a wrapper this file owns — same as the
          footer's Exit. */}
      <span className="flow-topbar-back flex pl-8 [&_button]:cursor-pointer">
        <ButtonV2
          buttonType={ButtonV2Type.SECONDARY}
          subType={ButtonV2SubType.INLINE}
          size={ButtonV2Size.MEDIUM}
          text="Return to Report Config"
          leftSlot={{ slot: <ArrowLeft size={16} /> }}
          onClick={onExit}
        />
      </span>

      {/* What you are in, named once. The steps below each say what *this* step asks; none
          of them says what the whole thing is for, and the bar had nothing but a way out. */}
      <PrimitiveText
        as="h1"
        {...font(FOUNDATION_THEME.font.size.body.lg)}
        color={colors.gray[700]}
        fontWeight={FOUNDATION_THEME.font.weight[600]}
      >
        New report configuration
      </PrimitiveText>
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
function ReportFlow({ flowVersion }: { flowVersion: FlowVersion }) {
  const navigate = useNavigate()

  const [setup, setSetup] = useState<SetupAnswers>(EMPTY_SETUP)

  /**
   * Whether the report groups its records at all — Setup's third question, which offers
   * "Grouped records" and "Transaction level records" (REPORT_FORMATS in report-config.ts).
   *
   * This is the flow's own branch, and it is read in three places from here: whether Grouping
   * is a step, whether a column can be given an aggregation, and — through `changeSetup`
   * below — whether a grouping that was already chosen survives.
   */
  const groupsRecords = setup.format === 'Aggregated'

  /**
   * The steps this flow actually walks. Version 1 is the shipped five; version 2 adds
   * Grouping, which ALL_STEPS carries in its natural position (flow-layout.tsx) — but only
   * for a report that is grouped.
   *
   * Conditional rather than always present, because Setup has already asked. A step offering
   * to group a transaction-level report is asking a question whose answer the user gave two
   * steps ago, and the honest thing to do with an answer is act on it rather than ask again
   * with a Skip button attached. `format` is null until Setup is answered, so the flow opens
   * on the five and grows the sixth the moment "Grouped records" is picked.
   */
  const STEPS =
    flowVersion === 'v2' && groupsRecords
      ? ALL_STEPS
      : ALL_STEPS.filter(({ id }) => id !== 'grouping')

  /**
   * Which step is showing, by id rather than index: switching flow version changes what
   * index 2 means, and a stored index would silently move the user to a different step.
   */
  const [stepId, setStepId] = useState<StepId>('setup')
  // A step that the current version does not have — i.e. Grouping, after switching back to
  // version 1 while standing on it. Fields is where that question goes in version 1.
  const step = Math.max(0, STEPS.findIndex(({ id }) => id === stepId))
  const current = STEPS[step]
  const setStep = (next: number) => setStepId(STEPS[next].id)
  /**
   * The steps the user has committed — walked up to and clicked the primary action on. This
   * is what the rail ticks off (StepRail.tsx).
   *
   * A Set rather than a high-water mark because the rail lets you jump to any step, so the
   * committed steps are not necessarily a prefix of the flow: jump straight to Filters,
   * commit it, and Setup and Delivery are still untouched behind you.
   */
  const [confirmed, setConfirmed] = useState<ReadonlySet<StepId>>(() => new Set())
  const [delivery, setDelivery] = useState<DeliveryAnswers>(EMPTY_DELIVERY)
  const [fields, setFields] = useState<FieldsAnswers>(EMPTY_FIELDS)
  const [filters, setFilters] = useState<FiltersAnswers>(EMPTY_FILTERS)
  const [confirmingExit, setConfirmingExit] = useState(false)
  /** The Fields step's "Add custom column" modal — its button sits in the heading row below. */
  const [addingColumn, setAddingColumn] = useState(false)

  /**
   * Setup's answers, plus the one thing answering Setup can invalidate.
   *
   * Turning a report back to transaction level takes the grouping with it. A `groupBy` the
   * flow no longer has a step for would keep steering the Fields step from off-screen — the
   * purple chips, the "Grouped by" row, the aggregations — with nothing on the page left to
   * say why, and it would ride out to Review and into the delivered config.
   *
   * The *columns* those levels created stay, which is the rule GroupingStep already states
   * for unpicking a single badge: grouping by a field guarantees it is a column; ungrouping
   * says nothing about whether it should stay one. This is that rule applied to all of them
   * at once, so the two cannot disagree.
   */
  const changeSetup = (next: SetupAnswers) => {
    setSetup(next)
    if (next.format !== 'Aggregated') {
      setFields((current) => (current.groupBy?.length ? { ...current, groupBy: [] } : current))
    }
  }

  /**
   * Both exits land on the Configurator. There is no draft store yet, so "Save as draft"
   * leaves the same way Discard does — the choice is recorded in the UI, not persisted.
   * When drafts exist, this is the one place that writes one.
   */
  const leaveFlow = () => {
    setConfirmingExit(false)
    navigate('/configurator')
  }

  const { title, description, tag, skipLabel } = current
  const isLastStep = step === STEPS.length - 1

  /** Whether the submit dialog is up. Only ever set from the last step's primary action. */
  const [submitting, setSubmitting] = useState(false)

  /**
   * Whether a step has actually been answered. Gates Continue below, and lets the rail take a
   * tick back off a step whose answers have since been cleared — but the tick itself is
   * earned by committing the step, not by this (StepRail.tsx).
   *
   * Grouping and Filters each count as answered once there is one level or one rule to carry
   * forward, which is also what flips their primary action off "Skip". Review has no questions
   * of its own, so it is never ticked: the flow ends by submitting it, not by completing it.
   *
   * A switch over the id rather than an array by position, so inserting Grouping into the
   * middle of the flow cannot quietly hand one step another's answer.
   */
  const answeredFor = (id: StepId) => {
    switch (id) {
      case 'setup':
        return isSetupComplete(setup)
      case 'delivery':
        return isDeliveryComplete(delivery)
      case 'grouping':
        return hasAnyGrouping(fields)
      case 'fields':
        return isFieldsComplete(fields)
      case 'filters':
        return hasAnyFilter(filters)
      case 'review':
        return false
    }
  }

  /**
   * Grouping and Filters are the steps nothing has to be answered on, so their primary action
   * is not
   * quite the button the other steps get: it never disables, and while the step is still
   * untouched it says what clicking it will actually do.
   *
   * "Continue" over an optional step nobody has touched claims something was configured.
   * "Skip filters" is a promise about the click, and it stops being true the moment there
   * is a filter to carry forward — which is why the label flips back rather than staying a
   * skip for the rest of the step. Grouping works the same way.
   */
  const optional = skipLabel !== undefined
  const skipping = optional && !answeredFor(current.id)

  /**
   * The same steps read as a gate on Continue, which is a looser question: a step with
   * nothing to answer cannot hold the flow up, so it is complete by definition. That is the
   * one place this differs from `stepAnswered` above, and why the two are separate lists.
   *
   * Review is that case too, and needs saying explicitly: `answeredFor` returns false for it
   * so the rail never ticks the step you are standing on, and without `isLastStep` here that
   * false would also disable Submit — permanently, since nothing on Review can flip it.
   */
  const complete = skipLabel !== undefined || isLastStep || answeredFor(current.id)

  /**
   * One step's heading and body. A function rather than inline JSX so the Fields step can
   * render it inside FieldsLayoutDials, which hands back the spacing and layout version its
   * dial panel is set to. Every other step calls it with nothing and keeps the defaults: the
   * inline row-gap is absent, and the heading's custom property falls back to 8px.
   */
  const renderStep = (layout?: FieldsLayout) => (
    // Setup follows node 4541:16282, which sets its sections 24px apart; the other steps
    // keep the 32px rhythm their own frames were drawn at.
    <div key={current.id} className={`${COLUMN} flow-question ${current.id === 'setup' ? 'gap-y-6' : 'gap-y-8'} pt-8 pb-12`}
      style={layout?.style}
      data-layout={layout?.wide ? 'wide' : undefined}
      /* The column organiser is the one step body that should fit the window rather than
         grow past it — it carries two lists of its own, and a page scroll that moves the
         chrome away from them is the wrong scroll. `data-fill` makes this grid exactly as
         tall as the pane it scrolls in (index.css), which is what gives the organiser a
         definite height to cap itself against. Every other step stays content-height. */
      data-fill={current.id === 'fields' && layout?.version === 'v8' ? '' : undefined}
    >
      {/* Every step's heading sits on the content column's left edge, Fields
          included. Node 4457:15485 draws that heading flush with its table's left
          edge instead, which the old per-step width reproduced — but the table is
          now the one thing that breaks out of the column, so the two no longer
          meet. Deliberate: a heading that moved with its step's widest element is
          exactly the jumping this grid removes. */}
      {/* 4px between title and standfirst — node 4542:17173's gap. The Fields dials can
          still override it through the custom property. */}
      {/* The heading, with the step's own action — Fields' "Add custom column" — pushed to
          the far right of the same row. */}
      <div className="flex items-end justify-between gap-4">
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
      </div>

      {current.id === 'setup' && <SetupStep answers={setup} onChange={changeSetup} />}
      {current.id === 'delivery' && <DeliveryStep answers={delivery} onChange={setDelivery} />}
      {current.id === 'grouping' && <GroupingStep answers={fields} onChange={setFields} />}
      {current.id === 'fields' && (
        <FieldsStep
          answers={fields}
          onChange={setFields}
          aggregated={groupsRecords}
          version={layout?.version}
          addingColumn={addingColumn}
          onAddingColumnChange={setAddingColumn}
        />
      )}
      {current.id === 'filters' && <FiltersStep answers={filters} onChange={setFilters} />}
      {current.id === 'review' && (
        <ReviewStep setup={setup} delivery={delivery} fields={fields} filters={filters} />
      )}
    </div>
  )

  return (
    <div
      className="flex h-screen flex-col"
      style={{ ...MOTION, ...RAIL_GUTTER, backgroundColor: colors.gray[0] }}
    >
      {/* No progress rule under the bar any more: it said "three of five" and nothing else,
          which is the one thing the rail now says per step, with the state of each. */}
      <div className="shrink-0">
        <TopbarV2 topbar={<TopbarContent onExit={() => setConfirmingExit(true)} />} />
      </div>

      {/* One pane, full width beneath the bar, with its own actions under it. It used to be
          a flex row holding a single child — the remains of a split pane whose second half
          never arrived — which is why nothing here needs `flex-1` or `min-w-0` any more.

          min-h-0 stays and is load-bearing: it is what lets the scroller below actually
          scroll, since without it a flex child floors at its content height and the
          overflow escapes to the page. */}
      <div className="relative flex min-h-0 flex-1 flex-col">
          {/* Before the scroller in the DOM, so the rail is the first thing a keyboard reaches
              under the bar — it is navigation, and it sits above the questions on screen.
              `.flow-rail` (index.css) takes it out of flow into the content column's left
              gutter, which `--flow-rail-gutter` on the root above keeps clear for it. */}
          <nav className="flow-rail" aria-label="Report setup steps">
            <StepRail
              steps={STEPS.map(({ id, label, skipLabel }) => ({
                label,
                optional: skipLabel !== undefined,
                answered: answeredFor(id),
                confirmed: confirmed.has(id),
              }))}
              current={step}
              onNavigate={setStep}
            />
          </nav>

          <div className="flex-1 overflow-auto" data-flow-content>
            {/* Keyed on the step so moving between them replays the arrival rather than
                cross-fading one set of questions into another. */}
            {/* Only the Fields step gets the layout dials. Mounting FieldsLayoutDials is what
                registers its panel, and leaving the step unmounts it and takes the panel away. */}
            {current.id === 'fields' ? (
              <FieldsLayoutDials>{renderStep}</FieldsLayoutDials>
            ) : (
              renderStep()
            )}
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
                  onClick={() => {
                    if (isLastStep) {
                      // One more question before the flow closes — see SubmitConfigModal.
                      setSubmitting(true)
                      return
                    }
                    // Committing the step is what ticks it on the rail. Back does not undo
                    // it: you answered those questions, and walking back to look at them
                    // does not unanswer them. Clearing a required answer does — that is
                    // `answered`'s job over in statusOf.
                    setConfirmed((prev) => new Set(prev).add(current.id))
                    setStep(step + 1)
                  }}
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

      {/* Submit asks for the config and file names, then leaves — which is why its primary
          reads "Submit and Exit" rather than "Submit". There is nothing behind this modal to
          come back to: the config is made, and the flow's job is done. */}
      <SubmitConfigModal
        isOpen={submitting}
        onClose={() => setSubmitting(false)}
        onSubmit={() => {
          // Raised before leaving: the one SnackbarV2 host is mounted at the app root
          // (main.tsx), outside the routes, so the toast outlives this page and lands on the
          // Configurator the flow returns to.
          //
          // Bottom right, overriding the host's bottom-left. The host sits left because the
          // detail sheet covers the right; nothing is open over the Configurator when this
          // toast arrives, so it takes the usual corner.
          addSnackbarV2({
            header: 'Submitted successfully',
            variant: SnackbarV2Variant.SUCCESS,
            position: SnackbarV2Position.BOTTOM_RIGHT,
          })
          navigate('/configurator')
        }}
      />
    </div>
  )
}

/**
 * The dial panel wraps the whole flow rather than one step, because what it changes is the
 * step list itself — see flow-layout.tsx.
 */
function CreateReportConfig() {
  return <FlowDials>{(version) => <ReportFlow flowVersion={version} />}</FlowDials>
}

export default CreateReportConfig
