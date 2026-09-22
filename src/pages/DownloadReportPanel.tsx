/**
 * The detail sheet's second screen — what the Download button opens.
 *
 * A view inside the sheet rather than a dialog over it. The sheet is already a panel about
 * one config; asking "which days, and who gets it" is a step within that, not a new context,
 * and a modal over a drawer is two layers of overlay for one question. It also sidesteps a
 * real defect: ModalV2 always portals to `#blend-modal-portal` on <body> (ModalV2.tsx:263),
 * which vaul's modal mode marks `aria-hidden` when the sheet opens — so a dialog launched
 * from in here would be on screen, focusable, and invisible to a screen reader.
 *
 * ## Blend notes
 *
 * **The picker is V1 `DateRangePicker`, and it has to be.** There is no V2. The installed
 * 0.0.37 ships exactly one date component (`lib/components/DateRangePicker`), it has no
 * `*V2` pair in `v1TokenReplacementMap`, and AGENTS.md rule 4 lists it among the components
 * where V1 is the correct answer rather than a regression. It brings V1 `TextInput`,
 * `Button`, `Popover` and `Tag` with it — all rendered inside it, none reachable from here.
 *
 * **The email block is the create flow's own** (EmailRecipientFields), so an address is
 * entered here exactly as it is in step 2: type, Enter, it becomes a removable tag, with Cc
 * and Bcc arriving as links. What is dropped is the checkbox that gates the card there —
 * choosing the channel is the config's decision, already made, and this screen only asks who
 * this one file goes to.
 */

import {
  DateFormatPreset,
  DateRangePicker,
  DateRangePickerSize,
  FOUNDATION_THEME,
  type DateRange,
} from '@juspay/blend-design-system'
import { Mail, Server, Webhook } from 'lucide-react'
import type { ReactNode } from 'react'
import slackLogo from '../assets/slack-logo.jpg'
import { DEMO_TODAY, type ConfigRowFacts } from '../config-detail'
import {
  EmailRecipientFields,
  type EmailRecipients,
} from './create-report-config/EmailRecipients'
import { PrimitiveText, font } from '../primitives'

const { colors } = FOUNDATION_THEME

/** How far back the default range reaches. A week is the span a spot-check is usually of. */
const DEFAULT_RANGE_DAYS = 7

const daysBefore = (date: Date, days: number) => {
  const out = new Date(date)
  out.setUTCDate(out.getUTCDate() - days)
  return out
}

export const defaultRange = (): DateRange => ({
  startDate: daysBefore(DEMO_TODAY, DEFAULT_RANGE_DAYS),
  endDate: new Date(DEMO_TODAY),
})

export const NO_RECIPIENTS: EmailRecipients = { to: [], cc: null, bcc: null }

/**
 * "Sep 10, 2026 → Sep 17, 2026".
 *
 * A custom formatter rather than one of the presets because none of them is this: LONG_RANGE
 * is "Sep 10 2026 - Sep 17 2026", with no comma after the day and a hyphen between the ends.
 * `DateFormatPreset.CUSTOM` is the documented way in — the picker only calls `customFormat`
 * when the preset says CUSTOM (DateRangePicker/utils.ts:2689).
 */
const day = (date: Date) =>
  date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  })

const RANGE_FORMAT = {
  preset: DateFormatPreset.CUSTOM,
  customFormat: ({ startDate, endDate }: DateRange) =>
    endDate ? `${day(startDate)} ⟶ ${day(endDate)}` : day(startDate),
}

/**
 * What the delivery card says, by the config's own channel.
 *
 * Driven by the row rather than hard-coded to Email: a Slack config whose download panel says
 * "Email" is telling you something untrue about where the file goes. The recipient fields
 * belong to Email alone — a Slack post and a webhook call have one destination each, and it
 * is the one the config already holds, so there is nothing here to fill in.
 *
 * The glyphs are the create flow's (DELIVERY_CHANNELS, answers.ts): 16px at gray[600] beside
 * the name, and Slack's brand mark at 24 with a 4px radius — so a channel looks the same
 * whether you are setting it up or reading it back.
 */
type ChannelCopy = { icon: ReactNode; description: string; recipients: boolean }

const GLYPH = 16

const CHANNELS: Record<string, ChannelCopy> = {
  Email: {
    icon: <Mail size={GLYPH} color={colors.gray[600]} />,
    description: 'The generated report will be sent to the designated recipients.',
    recipients: true,
  },
  Slack: {
    // Decorative: the name beside it already says which channel this is.
    icon: (
      <img
        src={slackLogo}
        alt=""
        className="size-6 shrink-0 object-contain"
        style={{ borderRadius: FOUNDATION_THEME.border.radius[4] }}
      />
    ),
    description: 'The generated report will be posted to this config’s Slack channel.',
    recipients: false,
  },
  Webhook: {
    icon: <Webhook size={GLYPH} color={colors.gray[600]} />,
    description: 'The generated report will be delivered to this config’s webhook endpoint.',
    recipients: false,
  },
  SFTP: {
    icon: <Server size={GLYPH} color={colors.gray[600]} />,
    description: 'The generated report will be dropped on this config’s SFTP path.',
    recipients: false,
  },
}

/** Whether the panel has enough to act on — an email with nobody to send it to is not one. */
export const canDownload = (row: ConfigRowFacts | null, recipients: EmailRecipients) =>
  !(CHANNELS[row?.channel ?? '']?.recipients ?? true) || recipients.to.length > 0

/**
 * One bordered box, drawn like the create flow's channel cards (DeliveryStep's ChannelCard):
 * a hairline at radius 8 on white, with 16px of side padding. Both sections here are cards
 * rather than bare stacks, so the two questions read as two things to answer rather than as
 * one run of controls under a heading.
 */
function PanelCard({
  icon,
  title,
  description,
  children,
}: {
  /** The channel's mark, where it has one. The date card is a heading on its own. */
  icon?: ReactNode
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section
      className="flex w-full min-w-0 flex-col gap-3 border px-4 pt-3 pb-4"
      style={{
        borderRadius: FOUNDATION_THEME.border.radius[8],
        borderColor: colors.gray[200],
        backgroundColor: colors.gray[0],
      }}
    >
      <div className="flex flex-col gap-1">
        {/* min-h-6 is the Slack logo's 24px, held by both cards so a glyph card and a logo
            card start their first line at the same height — the same rule ChannelCard uses. */}
        <span className="flex min-h-6 items-center gap-2">
          {icon}
          <PrimitiveText
            as="h3"
            {...font(FOUNDATION_THEME.font.size.body.md)}
            color={colors.gray[700]}
            fontWeight={FOUNDATION_THEME.font.weight[600]}
          >
            {title}
          </PrimitiveText>
        </span>
        <PrimitiveText
          as="p"
          {...font(FOUNDATION_THEME.font.size.body.md)}
          color={colors.gray[500]}
        >
          {description}
        </PrimitiveText>
      </div>
      {children}
    </section>
  )
}

export function DownloadReportPanel({
  row,
  range,
  onRangeChange,
  recipients,
  onRecipientsChange,
  actions,
}: {
  row: ConfigRowFacts | null
  range: DateRange
  onRangeChange: (next: DateRange) => void
  recipients: EmailRecipients
  onRecipientsChange: (next: EmailRecipients) => void
  /**
   * Cancel and Send, rendered at the end of this screen's stack rather than in the sheet's
   * DrawerFooter.
   *
   * A slot rather than callbacks: the sheet still owns what the two buttons *do* — closing
   * this screen, and sending the file — and all this screen decides is where they sit. It
   * keeps the whole footer/no-footer choice in one file (ConfigDetailSheet), instead of
   * splitting one decision across two.
   *
   * They belong here because the other two screens' footers are chrome over a body that
   * scrolls under them, and this one's buttons are the end of a form: the last thing after
   * the range and the recipients, reached by scrolling to the end of the questions rather
   * than parked below them.
   */
  actions?: ReactNode
}) {
  const channel = CHANNELS[row?.channel ?? ''] ?? CHANNELS.Email

  return (
    <div className="flex flex-col gap-4">
      <PanelCard title="Date range" description="The file will cover the days in this range.">
        <DateRangePicker
          value={range}
          onChange={onRangeChange}
          size={DateRangePickerSize.MEDIUM}
          formatConfig={RANGE_FORMAT}
          // A report covers days, not minutes — the time columns would be two more controls
          // answering a question nobody asked of a daily file.
          showDateTimePicker={false}
          // Off, so the trigger is one pill rather than a preset select bolted to a range.
          // The presets are still inside the calendar the pill opens; what this drops is the
          // second control beside it, which made one question look like two.
          showPresets={false}
          // Nothing past today exists to export yet.
          maxDate={new Date(DEMO_TODAY)}
          disableFutureDates
        />
      </PanelCard>

      <PanelCard
        icon={channel.icon}
        title={row?.channel ?? 'Email'}
        description={channel.description}
      >
        {channel.recipients && (
          <EmailRecipientFields value={recipients} onChange={onRecipientsChange} />
        )}
      </PanelCard>

      {/* flex-end and 12px, which is what Blend's DrawerFooter laid these out with — the
          buttons moved out of the chrome, not out of the design. No rule above them: the
          16px the stack already keeps between cards is the same gap, and a line here would
          be drawing a footer back in by hand. */}
      {actions && <div className="flex items-center justify-end gap-3">{actions}</div>}
    </div>
  )
}
