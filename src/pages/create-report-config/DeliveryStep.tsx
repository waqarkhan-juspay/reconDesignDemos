import {
  AlertV2,
  AlertV2ActionPosition,
  AlertV2SubType,
  AlertV2Type,
  CheckboxV2,
  FOUNDATION_THEME,
  SelectorV2Size,
  SingleSelectV2,
  SingleSelectV2Size,
  SingleSelectV2Variant,
  UnitInput,
  UnitInputSize,
  UnitPosition,
} from '@juspay/blend-design-system'
import { Info, type LucideIcon } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { PrimitiveText, font } from '../../primitives'
import {
  DAILY,
  DAYS_OF_MONTH,
  DAYS_OF_WEEK,
  DELIVERY_CHANNELS,
  EMAIL_CHANNEL,
  FREQUENCIES,
  MONTHLY,
  SFTP_CHANNEL,
  SLACK_CHANNEL,
  SPECIFIED_TIME,
  TIME_OPTIONS,
  TIMINGS,
  WEEKLY,
  scheduleNoteFor,
  type DeliveryAnswers,
} from './answers'
import { OptionCard, OptionRow, QuestionGroup } from './options'
import { EmailRecipientFields } from './EmailRecipients'

const { colors } = FOUNDATION_THEME

/**
 * The long menus (Time, Day of the month) show seven rows and scroll the rest. Measured from
 * the rendered MD menu: the search box and its padding take 38px, and each row 33px.
 * Re-measure if the select's size or Blend's menu tokens change.
 *
 * Both measurements are Blend's own and neither is on the 4px grid, so the sum (269) is
 * rounded UP to it. Up, not down: 268 clips the seventh row and defeats the constant, while
 * 272 costs 3px of empty space below it. Rounding here rather than editing the operands
 * keeps them honest as measurements for whoever re-measures next.
 */
const MENU_VISIBLE_ROWS = 7
const MENU_SEARCH_HEIGHT = 38
const MENU_ROW_HEIGHT = 33
const MENU_MAX_HEIGHT =
  Math.ceil((MENU_SEARCH_HEIGHT + MENU_VISIBLE_ROWS * MENU_ROW_HEIGHT) / 4) * 4

/**
 * A delivery channel — icon, name, and a checkbox at the far right (node 4418:6400).
 *
 * Deliberately not an OptionCard: channels are a multi-select, so the selected border and
 * its show-on-select checkbox would both be wrong, and dimming the unticked ones would work against
 * the point of a list you can add to. The design keeps every card on gray[200] whether or
 * not it is ticked, which is what says "more than one is fine here".
 *
 * The whole header row toggles rather than just the 14px box; the checkbox's own wrapper
 * stops propagation so a direct click does not toggle twice. Keyboard users reach the
 * CheckboxV2 itself, which is a real focusable control.
 */
function ChannelCard({
  id,
  icon: Icon,
  checked,
  onToggle,
  wide = false,
  children,
}: {
  /**
   * Span two of the three tracks, open or closed. Email's recipient fields need the room;
   * Slack's single channel name does not, so it keeps one column (node 4850:101697).
   */
  wide?: boolean
  id: string
  /** A lucide glyph, or an image src for a brand logo (see DELIVERY_CHANNELS). */
  icon: LucideIcon | string
  checked: boolean
  onToggle: () => void
  children?: ReactNode
}) {
  const expanded = checked && children !== undefined
  return (
    <div
      // A wide card spans two of the three tracks whether or not it is open, so ticking it
      // grows it downward only rather than also sideways.
      className={`flex w-full min-w-0 flex-col gap-4 border px-4 pt-3 ${wide ? 'col-span-2' : ''} ${expanded ? 'pb-4' : 'pb-3'}`}
      style={{
        borderRadius: FOUNDATION_THEME.border.radius[8],
        borderColor: colors.gray[200],
        backgroundColor: colors.gray[0],
      }}
    >
      {/* min-h-6 is the logo's 24px, held by every card so a glyph card and a logo card
          sharing a row come out the same height. */}
      <div
        onClick={onToggle}
        className="flex min-h-6 cursor-pointer items-center justify-between"
      >
        <span className="flex items-center gap-2">
          {typeof Icon === 'string' ? (
            // A brand logo, at the design's 24px with a 4px radius (node 4850:101710).
            // Decorative: the name beside it already says which channel this is.
            <img
              src={Icon}
              alt=""
              className="size-6 shrink-0 object-contain"
              style={{ borderRadius: FOUNDATION_THEME.border.radius[4] }}
            />
          ) : (
            <Icon size={16} color={colors.gray[600]} />
          )}
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.body.md)}
            color={colors.gray[700]}
            fontWeight={FOUNDATION_THEME.font.weight[600]}
          >
            {id}
          </PrimitiveText>
        </span>
        <span onClick={(event) => event.stopPropagation()}>
          <CheckboxV2
            checked={checked}
            onCheckedChange={onToggle}
            size={SelectorV2Size.SM}
            aria-label={id}
          />
        </span>
      </div>
      {expanded && <div className="flow-question">{children}</div>}
    </div>
  )
}

export function DeliveryStep({
  answers,
  onChange,
}: {
  answers: DeliveryAnswers
  onChange: (next: DeliveryAnswers) => void
}) {
  const {
    frequency,
    timing,
    dayOfWeek,
    dayOfMonth,
    time,
    channels,
    emailTo,
    emailCc,
    emailBcc,
    slackChannel,
  } = answers
  const [specifiedTime, immediately] = TIMINGS

  /**
   * The schedule sentence, and the one the user has closed.
   *
   * Dismissal is held as the note's own text rather than as a boolean, so closing it settles
   * *that* sentence and nothing else: change the day, the time or the cadence and the new
   * sentence is a different string, so it arrives. Otherwise a single ✕ early in the step
   * would silence every schedule the user went on to try.
   */
  const note = scheduleNoteFor(answers)
  const [dismissed, setDismissed] = useState<string | null>(null)

  return (
    <>
      {/* The cadence is the step's opening question — the configuration name it used to
          open on is asked at submit now, in SubmitConfigModal. */}
      <QuestionGroup label="How often?">
        <OptionRow>
          {FREQUENCIES.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              selected={frequency === option.id}
              dimmed={frequency !== null && frequency !== option.id}
              // Leaving a cadence drops its day, so a stale Monday or 15th cannot ride
              // along on another cadence and resurface if the first is picked again.
              //
              // Weekly and Monthly are never asked the timing question (see SPECIFIED_TIME
              // in answers.ts), so picking one answers it on their behalf — the step's
              // remaining questions, and isDeliveryComplete, both read `timing` and would
              // otherwise stall on a question that is not on screen.
              onSelect={() =>
                onChange({
                  ...answers,
                  frequency: option.id,
                  dayOfWeek: option.id === WEEKLY ? dayOfWeek : null,
                  dayOfMonth: option.id === MONTHLY ? dayOfMonth : null,
                  timing: option.id === DAILY ? timing : SPECIFIED_TIME,
                })
              }
            />
          ))}
        </OptionRow>
      </QuestionGroup>

      {/* When it goes out: the timing cards (Daily only), then the day and time. One
          question, so its rows sit 16px apart — the gap between cards in a row, so they read
          as one grid — and the section as a whole is the step grid's 32px from its
          neighbours. Weekly and Monthly are answered a specified time on the user's behalf
          (see onSelect above), so any cadence opens it. */}
      {frequency !== null && (
        <QuestionGroup label="When should it be sent?">
        {/* 16px under the heading when the section opens on the day and time selects (Weekly,
            Monthly) — QuestionGroup's 8px suits a row of cards, but above the selects' own
            labels it stacks two lines of text with nothing to tell them apart. Daily opens on
            the timing cards and keeps the 8px, the same as "How often?" above it. */}
        <div className={`flex flex-col gap-4 ${frequency === DAILY ? '' : 'pt-2'}`}>
        {/* Revealed once the cadence is Daily, and only then.

            Weekly and Monthly skip this row entirely rather than showing it with one card
            disabled: "as soon as recon completes" is a daily answer wearing a weekly label,
            and a cadence that cannot take it should not have to explain why. They go
            straight to the day and time below.
            items-start, not stretch: the design keeps both cards at their natural height
            and hangs the time dropdown below the left one rather than inside the row. */}
        {frequency === DAILY && (
          // The same three tracks as the cadence row above (OptionRow: equal columns, 16px
          // gap), so Specified Time sits exactly under Daily and Immediately under Weekly.
          // items-start keeps each card at its own height rather than matching its neighbour.
          <div className="flow-question grid grid-cols-3 items-start gap-4">
            <OptionCard
              option={specifiedTime}
              selected={timing === specifiedTime.id}
              dimmed={timing !== null && timing !== specifiedTime.id}
              onSelect={() => onChange({ ...answers, timing: specifiedTime.id })}
            />
            <OptionCard
              option={immediately}
              selected={timing === immediately.id}
              dimmed={timing !== null && timing !== immediately.id}
              onSelect={() => onChange({ ...answers, timing: immediately.id })}
            />
          </div>
        )}

        {/* When it goes out — only under a specified time, which is meaningless beside
            "Immediately". Weekly and Monthly also ask which day, and the time sits beside it
            so the pair reads as one answer: "Monday at 9:00 AM", "15th at 9:00 AM".

            blend-gap: no time picker, and no combined day-and-time input. The published
            0.0.37 ships neither (TimePicker exists only on GitHub — rule 3), and its one
            date component, DateRangePicker, picks calendar dates rather than a recurring
            weekday or day of the month. So both halves are SingleSelectV2s.

            Held inside the Specified Time card's column — the first of the same three tracks
            the cards use — split into equal halves.

            Keyed on the cadence, so switching Daily → Weekly replays the reveal as the day
            select arrives rather than snapping it in beside the time. */}
        {frequency !== null && timing === specifiedTime.id && (
          <div key={frequency} className="flow-question grid grid-cols-3 gap-4">
          <div className="grid grid-cols-2 items-start gap-4">
            {frequency === WEEKLY && (
              <div className="min-w-0">
                <SingleSelectV2
                  label="Day of week"
                  required
                  triggerDimensions={{ width: '100%' }}
                  placeholder="Select a day"
                  size={SingleSelectV2Size.MD}
                  variant={SingleSelectV2Variant.CONTAINER}
                  items={[{ items: DAYS_OF_WEEK }]}
                  selected={dayOfWeek ?? ''}
                  onSelect={(next) => onChange({ ...answers, dayOfWeek: next })}
                />
              </div>
            )}
            {frequency === MONTHLY && (
              <div className="min-w-0">
                <SingleSelectV2
                  label="Day of the month"
                  required
                  triggerDimensions={{ width: '100%' }}
                  placeholder="Select a day"
                  search={{ show: true, placeholder: 'Search day' }}
                  menuDimensions={{ maxHeight: MENU_MAX_HEIGHT }}
                  size={SingleSelectV2Size.MD}
                  variant={SingleSelectV2Variant.CONTAINER}
                  items={[{ items: DAYS_OF_MONTH }]}
                  selected={dayOfMonth ?? ''}
                  onSelect={(next) => onChange({ ...answers, dayOfMonth: next })}
                />
              </div>
            )}
            <div className="min-w-0">
                <SingleSelectV2
                  label="Time"
                  required
                  triggerDimensions={{ width: '100%' }}
                  placeholder="Select a time"
                  search={{ show: true, placeholder: 'Search time' }}
                  menuDimensions={{ maxHeight: MENU_MAX_HEIGHT }}
                  size={SingleSelectV2Size.MD}
                  variant={SingleSelectV2Variant.CONTAINER}
                  items={[{ items: TIME_OPTIONS }]}
                  selected={time}
                  onSelect={(next) => onChange({ ...answers, time: next })}
                />
            </div>
          </div>
          </div>
        )}

        {/* The schedule read back as a sentence, once it is answerable.

            It says the one thing the controls above it cannot: which stretch of data the
            file covers. A cadence, a day and a time are three answers; "covering the 1st to
            the last day of the month" is what they add up to, and getting that wrong is the
            mistake this step exists to prevent.

            Closable, because it is a confirmation rather than a warning — there is nothing
            to act on once it has been read, and the user may be several attempts into
            choosing a schedule. Keyed on the sentence so a new schedule plays its own
            entrance rather than swapping the text inside a box that is already there. */}
        {note !== null && note !== dismissed && (
          <div key={note} className="flow-question">
            <AlertV2
              type={AlertV2Type.PRIMARY}
              subType={AlertV2SubType.SUBTLE}
              // AlertV2 draws no icon of its own — the slot is the only way to one, and
              // without it the sentence starts hard against the alert's left padding.
              slot={{ slot: <Info size={16} /> }}
              description={note}
              closeButton={{ show: true, onClick: () => setDismissed(note) }}
              width="100%"
              // AlertV2 caps itself at 900px (alertV2.light.tokens.ts:10) and this step is
              // wider than that, so without this the alert stops ~60px short of the cards
              // above it and reads as a box that failed to fill its row.
              maxWidth="100%"
            />
          </div>
        )}
        </div>
        </QuestionGroup>
      )}

      {timing !== null && (
        <QuestionGroup label="Delivery channel">
          {/* Email on a row of its own, then Slack and SFTP on the next. Each row is the same
              three tracks as the cadence and timing rows, so the cards line up under Daily
              and Weekly. Two grids rather than one: in a single grid a collapsed Email would
              let SFTP flow up beside it. items-start: ticking Email grows it by its To field
              without stretching anything beside it. */}
          <div className="flex flex-col gap-4">
          {[
            DELIVERY_CHANNELS.filter(({ id }) => id === EMAIL_CHANNEL),
            DELIVERY_CHANNELS.filter(({ id }) => id !== EMAIL_CHANNEL),
          ].map((row) => (
          <div key={row[0].id} className="grid grid-cols-3 items-start gap-4">
            {row.map(({ id, icon }) => (
              <ChannelCard
                key={id}
                id={id}
                icon={icon}
                checked={channels.includes(id)}
                wide={id === EMAIL_CHANNEL}
                onToggle={() =>
                  onChange({
                    ...answers,
                    channels: channels.includes(id)
                      ? channels.filter((channel) => channel !== id)
                      : [...channels, id],
                  })
                }
              >
                {id === EMAIL_CHANNEL ? (
                  // Shared with the detail sheet's Download panel — see EmailRecipients.
                  <EmailRecipientFields
                    required
                    value={{ to: emailTo, cc: emailCc, bcc: emailBcc }}
                    onChange={({ to, cc, bcc }) =>
                      onChange({ ...answers, emailTo: to, emailCc: cc, emailBcc: bcc })
                    }
                  />
                ) : id === SFTP_CHANNEL ? (
                  // The prototype has no SFTP configurations to look up, so this always shows
                  // the not-yet-set-up case: delivery via SFTP needs one before it can run.
                  //
                  // The action opens the Configurator in a new tab rather than navigating:
                  // leaving this flow would throw away everything answered so far.
                  <AlertV2
                    type={AlertV2Type.ERROR}
                    subType={AlertV2SubType.SUBTLE}
                    // Kept to two lines in a one-column card.
                    description="No SFTP configuration found. Set one up to use SFTP."
                    actions={{
                      position: AlertV2ActionPosition.BOTTOM,
                      primaryAction: {
                        text: 'Click here to configure',
                        onClick: () => window.open('/configurator', '_blank', 'noopener'),
                      },
                    }}
                    // Dismissing it would not set anything up, so there is nothing to close —
                    // AlertV2 shows its ✕ unless told otherwise (AlertV2.tsx:261).
                    closeButton={{ show: false }}
                    width="100%"
                    // AlertV2's token floor is 300px (alertV2.light.tokens.ts:11), wider than
                    // a one-column card's 275px content box, so it would run past the border.
                    // A string, not 0: AlertV2 falls back with `minWidth || token`
                    // (AlertV2.tsx:295), so a numeric 0 is ignored.
                    minWidth="0px"
                  />
                ) : id === SLACK_CHANNEL ? (
                  // Node 4850:101705 — a "Unit Input Field": the `#` sits in Blend's fixed
                  // unit box on the left, so it reads as part of the name without being typed.
                  //
                  // blend-gap: UnitInput is V1-only (no V2 pair) and hard-codes
                  // `type="number"` (UnitInput.tsx:273), typing `value` as a number to match.
                  // It spreads the rest of its props after that (:369), so `type="text"` here
                  // wins, and the string value is cast through its number type. TextInputV2
                  // cannot draw the unit box — its slots are inset inside the border.
                  <UnitInput
                    label="Channel ID"
                    required
                    size={UnitInputSize.MEDIUM}
                    unit="#"
                    unitPosition={UnitPosition.LEFT}
                    type="text"
                    // The shape Slack assigns: a type letter (C for a public channel, G for a
                    // private one) and uppercase alphanumerics. Found under the channel's
                    // details, and as the last segment of its app.slack.com URL.
                    placeholder="ex: C08KX4R2QHN"
                    hintText="Find it at the bottom of the channel’s details in Slack"
                    value={slackChannel as unknown as number}
                    // The box already draws the `#`, so a pasted "#channel" drops its own.
                    onChange={(event) =>
                      onChange({ ...answers, slackChannel: event.target.value.replace(/^#+/, '') })
                    }
                  />
                ) : undefined}
              </ChannelCard>
            ))}
          </div>
          ))}
          </div>
        </QuestionGroup>
      )}
    </>
  )
}
