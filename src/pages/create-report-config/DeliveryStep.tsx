import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  CheckboxV2,
  FOUNDATION_THEME,
  InputSizeV2,
  SelectorV2Size,
  SingleSelectV2,
  SingleSelectV2Size,
  SingleSelectV2Variant,
  TextInputV2,
  ThemeProvider,
} from '@juspay/blend-design-system'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { PrimitiveText, font } from '../../primitives'
import { neutralLinkTokens } from '../../theme'
import {
  DAYS_OF_MONTH,
  DAYS_OF_WEEK,
  DELIVERY_CHANNELS,
  EMAIL_CHANNEL,
  FREQUENCIES,
  MONTHLY,
  TIME_OPTIONS,
  TIMINGS,
  WEEKLY,
  type DeliveryAnswers,
} from './answers'
import { OptionCard, OptionRow, QuestionGroup } from './options'
import { RecipientsInput } from './RecipientsInput'

const { colors } = FOUNDATION_THEME

/**
 * The long menus (Time, Day of the month) show seven rows and scroll the rest. Measured from
 * the rendered MD menu: the search box and its padding take 38px, and each row 33px.
 * Re-measure if the select's size or Blend's menu tokens change.
 */
const MENU_VISIBLE_ROWS = 7
const MENU_MAX_HEIGHT = 38 + MENU_VISIBLE_ROWS * 33

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
  children,
}: {
  id: string
  icon: LucideIcon
  checked: boolean
  onToggle: () => void
  children?: ReactNode
}) {
  const expanded = checked && children !== undefined
  return (
    <div
      // Expanded, it spans two of the three tracks so its fields have room, and the next
      // channel flows on into the third column.
      className={`flex w-full min-w-0 flex-col gap-4 border px-4 pt-3 ${expanded ? 'col-span-2 pb-4' : 'pb-3'}`}
      style={{
        borderRadius: FOUNDATION_THEME.border.radius[8],
        borderColor: colors.gray[200],
        backgroundColor: colors.gray[0],
      }}
    >
      <div
        onClick={onToggle}
        className="flex cursor-pointer items-center justify-between"
      >
        <span className="flex items-center gap-2">
          <Icon size={16} color={colors.gray[600]} />
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
  const { name, frequency, timing, dayOfWeek, dayOfMonth, time, channels, emailTo, emailCc, emailBcc } =
    answers
  const [specifiedTime, immediately] = TIMINGS

  /**
   * Cc and Bcc each hold one slot under To — Cc's first — showing either its link or its
   * open field. So an open Cc pushes the Bcc link below it, and an open Bcc keeps the Cc
   * link above it. Only while both are closed do the two links share a single row.
   *
   * Secondary + INLINE is Blend's borderless text button; the scoped ThemeProvider tints it
   * gray[500] (neutralLinkTokens, src/theme.ts).
   *
   * blend-gap: ButtonV2 hard-codes `cursor: default` and has no text-decoration token, so
   * the pointer and the hover underline that make these read as links come from the wrapper.
   */
  const extraLinks = (fields: ('Cc' | 'Bcc')[]) => (
    <ThemeProvider componentTokens={neutralLinkTokens}>
      <div className="flex items-center gap-4 [&_button]:cursor-pointer [&_button:hover_span]:underline [&_button:hover_span]:underline-offset-2">
        {fields.map((field) => (
          <ButtonV2
            key={field}
            buttonType={ButtonV2Type.SECONDARY}
            subType={ButtonV2SubType.INLINE}
            size={ButtonV2Size.SMALL}
            text={field}
            onClick={() =>
              onChange({ ...answers, ...(field === 'Cc' ? { emailCc: [] } : { emailBcc: [] }) })
            }
          />
        ))}
      </div>
    </ThemeProvider>
  )

  /**
   * The step opens on its name alone, and the cadence question arrives once there is one —
   * the same one-question-at-a-time rhythm as the rest of the flow. Mounting the group is
   * what plays its `flow-question` entrance, so no animation is written here.
   *
   * `|| frequency !== null` keeps it up once it has been answered: clearing the name to
   * retype it would otherwise pull the cadence (and everything hanging off it) out from
   * under the user on the empty keystroke, then replay the entrance on the next one.
   * Before anything below is answered, hiding it again loses nothing.
   */
  const showCadence = name.trim() !== '' || frequency !== null

  return (
    <>
      <div className="w-[350px]">
        <TextInputV2
          label="Configuration Name"
          // The step cannot complete without a name (isDeliveryComplete), so the label says so.
          required
          placeholder="ex: Daily Recon Report"
          size={InputSizeV2.MD}
          value={name}
          onChange={(event) => onChange({ ...answers, name: event.target.value })}
        />
      </div>

      {showCadence && (
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
              onSelect={() =>
                onChange({
                  ...answers,
                  frequency: option.id,
                  dayOfWeek: option.id === WEEKLY ? dayOfWeek : null,
                  dayOfMonth: option.id === MONTHLY ? dayOfMonth : null,
                })
              }
            />
          ))}
        </OptionRow>

        {/* Revealed once there is a cadence. The name no longer needs checking here — this
            whole group only renders once it has one — and checking it again would make the
            row vanish mid-retype while the channels below it stayed.
            items-start, not stretch: the design keeps both cards at their natural height
            and hangs the time dropdown below the left one rather than inside the row. */}
        {frequency !== null && (
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
      </QuestionGroup>
      )}

      {timing !== null && (
        <QuestionGroup label="Delivery channel">
          {/* The same three tracks as the cadence and timing rows, so Email sits under Daily
              and SFTP under Weekly. items-start: ticking Email grows it by its To field
              without stretching SFTP beside it. */}
          <div className="grid grid-cols-3 items-start gap-4">
            {DELIVERY_CHANNELS.map(({ id, icon }) => (
              <ChannelCard
                key={id}
                id={id}
                icon={icon}
                checked={channels.includes(id)}
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
                  <div className="flex flex-col gap-3">
                    <RecipientsInput
                      label="To"
                      required
                      recipients={emailTo}
                      onChange={(next) => onChange({ ...answers, emailTo: next })}
                    />
                    {/* Cc's slot, then Bcc's — each its link or its field (see extraLinks). */}
                    {emailCc === null && emailBcc === null ? (
                      extraLinks(['Cc', 'Bcc'])
                    ) : (
                      <>
                        {emailCc === null ? (
                          extraLinks(['Cc'])
                        ) : (
                          <div className="flow-question">
                            <RecipientsInput
                              label="Cc"
                              recipients={emailCc}
                              onChange={(next) => onChange({ ...answers, emailCc: next })}
                              // Folding it away drops what was typed, back to the "Cc" link.
                              onRemove={() => onChange({ ...answers, emailCc: null })}
                            />
                          </div>
                        )}
                        {emailBcc === null ? (
                          extraLinks(['Bcc'])
                        ) : (
                          <div className="flow-question">
                            <RecipientsInput
                              label="Bcc"
                              recipients={emailBcc}
                              onChange={(next) => onChange({ ...answers, emailBcc: next })}
                              onRemove={() => onChange({ ...answers, emailBcc: null })}
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : undefined}
              </ChannelCard>
            ))}
          </div>
        </QuestionGroup>
      )}
    </>
  )
}
