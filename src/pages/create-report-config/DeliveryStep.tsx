import {
  CheckboxV2,
  FOUNDATION_THEME,
  InputSizeV2,
  SelectorV2Size,
  SingleSelectV2,
  SingleSelectV2Size,
  SingleSelectV2Variant,
  TextInputV2,
} from '@juspay/blend-design-system'
import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { PrimitiveText, font } from '../../primitives'
import {
  DELIVERY_CHANNELS,
  EMAIL_CHANNEL,
  FREQUENCIES,
  TIME_OPTIONS,
  TIMINGS,
  type DeliveryAnswers,
} from './answers'
import { OptionCard, OptionRow, QuestionGroup } from './options'

const { colors } = FOUNDATION_THEME

/**
 * A delivery channel — icon, name, and a checkbox at the far right (node 4418:6400).
 *
 * Deliberately not an OptionCard: channels are a multi-select, so the selected border and
 * the corner badge would both be wrong, and dimming the unticked ones would work against
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
      className={`flex w-[385px] flex-col gap-4 border px-4 pt-3 ${expanded ? 'pb-4' : 'pb-3'}`}
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
  const { name, frequency, timing, time, channels, emailTo } = answers
  const [specifiedTime, immediately] = TIMINGS

  return (
    <>
      <div className="w-[350px]">
        <TextInputV2
          label="Configuration Name"
          placeholder="Search"
          size={InputSizeV2.MD}
          value={name}
          onChange={(event) => onChange({ ...answers, name: event.target.value })}
        />
      </div>

      <QuestionGroup label="How often?">
        <OptionRow>
          {FREQUENCIES.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              selected={frequency === option.id}
              dimmed={frequency !== null && frequency !== option.id}
              onSelect={() => onChange({ ...answers, frequency: option.id })}
            />
          ))}
        </OptionRow>

        {/* Revealed once the config has a name and a cadence — the two things above it.
            items-start, not stretch: the design keeps both cards at their natural height
            and hangs the time dropdown below the left one rather than inside the row. */}
        {name.trim() !== '' && frequency !== null && (
          <div className="flow-question flex items-start gap-4">
            <div className="flex w-[291px] shrink-0 flex-col gap-4">
              <OptionCard
                option={specifiedTime}
                selected={timing === specifiedTime.id}
                dimmed={timing !== null && timing !== specifiedTime.id}
                onSelect={() => onChange({ ...answers, timing: specifiedTime.id })}
              />
              {/* An input belonging to one answer rather than a section of its own: a time
                  to send at is meaningless under "Immediately". */}
              {timing === specifiedTime.id && (
                <div className="flow-question">
                  <SingleSelectV2
                    placeholder="Select a time"
                    size={SingleSelectV2Size.MD}
                    variant={SingleSelectV2Variant.CONTAINER}
                    items={[{ items: TIME_OPTIONS }]}
                    selected={time}
                    onSelect={(next) => onChange({ ...answers, time: next })}
                  />
                </div>
              )}
            </div>
            <div className="flex-1">
              <OptionCard
                option={immediately}
                selected={timing === immediately.id}
                dimmed={timing !== null && timing !== immediately.id}
                onSelect={() => onChange({ ...answers, timing: immediately.id })}
              />
            </div>
          </div>
        )}
      </QuestionGroup>

      {timing !== null && (
        <QuestionGroup label="Delivery channel">
          <div className="flex flex-col gap-4">
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
                  <TextInputV2
                    label="To"
                    required
                    placeholder="name@company.com"
                    size={InputSizeV2.MD}
                    value={emailTo}
                    onChange={(event) => onChange({ ...answers, emailTo: event.target.value })}
                  />
                ) : undefined}
              </ChannelCard>
            ))}
          </div>
        </QuestionGroup>
      )}
    </>
  )
}
