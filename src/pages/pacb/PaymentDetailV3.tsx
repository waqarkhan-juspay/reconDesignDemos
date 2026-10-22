/**
 * The selected payment, in full — version 3 of the PACB Workflow's right-hand column (PACB
 * Figma 113:25022 collapsed, 113:28601 with Supporting File open, 113:29866 empty).
 *
 * A strip of three figures — Payment ID, Merchant UTR, Date — then one bordered accordion row
 * per artefact the payment needs: Payment file, Supporting File, Form 145/146, Transaction
 * Report and Merchant Payment Report. Each row leads with its own glyph in gray 400 until
 * that step is done, when the glyph turns into a filled green tick. The first row still to
 * do opens with the payment; the rest start collapsed.
 *
 * Inside each row is the detail cards' content (DetailCard.tsx) without their frame: the file
 * fields, the payment file's Download, the Form 145/146 upload. A step not yet done shows
 * only its PENDING status — the payment file with Generate Payment Info beside it.
 *
 * With no payment chosen, the panel shows the settlement's own figures instead — the empty
 * state's annotation asks for the selected settlement's hero metrics there.
 *
 * The rows reset whenever the payment changes: the sections are keyed on the payment ID, so
 * a new payment is a fresh, uncontrolled AccordionV2.
 */

import {
  AccordionV2,
  AccordionV2Item,
  AccordionV2Type,
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  FOUNDATION_THEME,
  TagV2Color,
  ThemeProvider,
} from '@juspay/blend-design-system'
import { memo, useMemo, useState, type ReactNode } from 'react'
import checkCircleFilledIcon from '../../assets/icons/check-circle-filled.svg'
import fileAttachmentIcon from '../../assets/icons/file-attachment-02.svg'
import fileDownloadIcon from '../../assets/icons/file-download-02.svg'
import paymentFileIcon from '../../assets/icons/file-05.svg'
import transactionReportIcon from '../../assets/icons/file-07.svg'
import reportIcon from '../../assets/icons/presentation-chart-02.svg'
import MaskIcon from '../../components/MaskIcon'
import { font, PrimitiveText } from '../../primitives'
import { paymentAccordionTokens } from '../../theme'
import { EMPTY } from './data'
import { DetailBody, DownloadButton, Field, FileFields, MonoValue, StampValue } from './DetailCard'
import { FormUploadCard } from './FormUploadCard'
import { istShortDate, istStamp, rupees } from './helpers'
import { HoverCopy, StatusTag } from './kit'
import { SettlementOverview } from './overview-panes'
import type { MerchantPayment } from './PaymentCard'
import type { Settlement } from './SettlementCard'
import { ReconDetailSheet } from './ReconDetailSheet'
import { paymentDetailOf, reconRowOf, type PaymentDetail } from './settlements'
import { seededForms, useFormUploads } from './use-form-uploads'

const { colors } = FOUNDATION_THEME

const SMALL = FOUNDATION_THEME.font.size.body.sm
const BODY = FOUNDATION_THEME.font.size.body.md
const ICON = 14

// ─── Parts ───────────────────────────────────────────────────────────────────────────────

/** One of the strip's figures: a small grey label over the value in semibold. */
function HeaderFigure({
  label,
  value,
  copyLabel,
}: {
  label: string
  value: string
  /** Names the value for the copy button. Without it the figure has no copy glyph. */
  copyLabel?: string
}) {
  const copyable = copyLabel && value && value !== EMPTY
  return (
    <div className="group/row flex min-w-0 flex-col justify-center gap-1">
      <PrimitiveText {...font(SMALL)} color={colors.gray[400]}>
        {label}
      </PrimitiveText>
      <div className="flex min-w-0 items-center gap-1">
        <PrimitiveText
          {...font(BODY)}
          color={colors.gray[700]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
          truncate
        >
          {value}
        </PrimitiveText>
        {copyable && <HoverCopy value={value} label={copyLabel} size={ICON} />}
      </div>
    </div>
  )
}

/**
 * The strip above the rows: the figures, then `action` at the far right. The figures sit in
 * equal 180px columns rather than at equal gaps, so their labels start at even intervals —
 * a gap would be measured from the end of each value, hover-only copy glyph included, and
 * read as uneven. A UTR and its glyph fit the column; anything longer truncates.
 */
function HeaderStrip({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 pt-2 pb-3">
      <div className="grid min-w-0 flex-1 grid-cols-[repeat(3,minmax(0,180px))] gap-x-6">
        {children}
      </div>
      {action}
    </div>
  )
}

type Section = {
  value: string
  title: string
  icon: string
  done: boolean
  body: ReactNode
}

/** PENDING reads as a neutral grey in these rows, not the module's orange. */
const PENDING_COLORS = { PENDING: TagV2Color.NEUTRAL }

/** A row body's grey PENDING status — what every step shows before its artefact exists. */
function PendingStatus() {
  return (
    <Field label="Status">
      <span className="flex">
        <StatusTag status="PENDING" colors={PENDING_COLORS} />
      </span>
    </Field>
  )
}

/**
 * The payment file before it exists: its status, and the button that makes it. The file's
 * name, UUID and dates are not shown — there is no file yet for them to describe.
 */
function PaymentFilePending({ onGenerate }: { onGenerate: () => void }) {
  return (
    <DetailBody>
      <PendingStatus />
      <span className="flex">
        <ButtonV2
          buttonType={ButtonV2Type.PRIMARY}
          size={ButtonV2Size.SMALL}
          text="Generate Payment Info"
          onClick={onGenerate}
        />
      </span>
    </DetailBody>
  )
}

/**
 * The Transaction Report row's body. Pending, only its status — there is no report yet to
 * describe. Generated, the report itself: its UUID, its date, and Download.
 */
function TransactionReportBody({
  payment,
  report,
}: {
  payment: MerchantPayment
  report: PaymentDetail['transactionReport']
}) {
  return (
    <DetailBody>
      {report.status === 'PENDING' ? (
        <PendingStatus />
      ) : (
        <>
          <Field label="File UUID">
            <MonoValue value={report.uuid} label="File UUID" />
          </Field>
          <Field label="Date">
            <StampValue iso={report.createdAt} />
          </Field>
          <DownloadButton
            name={`transaction_report_${payment.paymentId}.txt`}
            lines={[
              `Payment ID: ${payment.paymentId}`,
              `Report UUID: ${report.uuid}`,
              `Created: ${report.createdAt}`,
            ]}
          />
        </>
      )}
    </DetailBody>
  )
}

/** The MPR row's body: pending, its status; generated, only Download MPR. */
function MprBody({
  payment,
  report,
}: {
  payment: MerchantPayment
  report: PaymentDetail['report']
}) {
  return (
    <DetailBody>
      {report.status === 'PENDING' ? (
        <PendingStatus />
      ) : (
        <DownloadButton
          text="Download MPR"
          name={`mpr_${payment.paymentId}.txt`}
          lines={[
            `Payment ID: ${payment.paymentId}`,
            `Amount: ${payment.amount}`,
            `Created: ${report.createdAt}`,
          ]}
        />
      )}
    </DetailBody>
  )
}

function sectionsOf(
  payment: MerchantPayment,
  detail: PaymentDetail,
  uploads: ReturnType<typeof useFormUploads>,
  /** Whether the payment file is in — the data's, until Generate Payment Info makes it so. */
  fileReady: boolean,
  onGenerate: () => void,
): Section[] {
  return [
    {
      value: 'payment-file',
      title: 'Payment file',
      icon: paymentFileIcon,
      done: fileReady,
      body: fileReady ? (
        <DetailBody>
          <FileFields file={detail.paymentFile} />
          <DownloadButton
            name={detail.paymentFile.name}
            lines={[
              `Payment ID: ${payment.paymentId}`,
              `Entity ID: ${payment.entityId}`,
              `Amount: ${rupees(payment.amount)}`,
              `File UUID: ${detail.paymentFile.uuid}`,
              `Created: ${istStamp(detail.paymentFile.createdAt)} (IST)`,
              `Staged: ${istStamp(detail.paymentFile.stagedAt)} (IST)`,
            ]}
          />
        </DetailBody>
      ) : (
        <PaymentFilePending onGenerate={onGenerate} />
      ),
    },
    {
      value: 'supporting-file',
      title: 'Supporting File',
      icon: fileAttachmentIcon,
      done: detail.supportingAccepted,
      body: (
        <DetailBody>
          <FileFields file={detail.supportingFile} />
        </DetailBody>
      ),
    },
    {
      value: 'forms',
      title: 'Form 145/146',
      icon: fileDownloadIcon,
      // Live, so uploading the last form ticks the row, as it ticks the current stepper.
      done: Boolean(uploads.forms['145'] && uploads.forms['146']),
      body: (
        <FormUploadCard
          bare
          uploadFirst
          icon={fileDownloadIcon}
          fileId={detail.form145FileId}
          stagedAt={detail.paymentFile.stagedAt}
          {...uploads}
        />
      ),
    },
    {
      value: 'transaction-report',
      title: 'Transaction Report',
      icon: transactionReportIcon,
      done: detail.transactionReport.status === 'GENERATED',
      body: <TransactionReportBody payment={payment} report={detail.transactionReport} />,
    },
    {
      value: 'mpr',
      title: 'Merchant Payment Report (MPR)',
      icon: reportIcon,
      done: detail.report.status === 'GENERATED',
      body: <MprBody payment={payment} report={detail.report} />,
    },
  ]
}

/**
 * The row's leading glyph: its own icon in gray 400, or a filled green tick once the step is
 * done. The tick is two colours (a white check on green), so it is drawn as an image rather
 * than through MaskIcon, which would flatten it to one.
 */
function LeadIcon({ icon, done }: { icon: string; done: boolean }) {
  return done ? (
    <img src={checkCircleFilledIcon} alt="" width={ICON} height={ICON} className="block" />
  ) : (
    <MaskIcon src={icon} size={ICON} color={colors.gray[400]} />
  )
}

// ─── Panel ───────────────────────────────────────────────────────────────────────────────

/**
 * blend-gap: Blend has no detail-panel component. The strip is composed from PrimitiveText
 * and tokens; the rows are AccordionV2 (BORDER), retokened above to the design's item.
 */
// Memoised: its props are stable references (SETTLEMENTS and the paymentsOf cache), so a
// keystroke or a list click elsewhere on the page does not redraw the whole accordion.
export const PaymentDetailV3 = memo(function PaymentDetailV3({
  settlement,
  payment,
}: {
  settlement: Settlement
  payment: MerchantPayment | null
}) {
  // No payment chosen: the settlement's hero figures (113:29866's annotation), as the same
  // stat cards the period's Overview uses before a settlement is chosen.
  if (!payment) return <SettlementOverview settlement={settlement} />
  // Keyed, so the forms' upload state and the open rows start fresh for each payment.
  return <PaymentSections key={payment.paymentId} settlement={settlement} payment={payment} />
})

function PaymentSections({
  settlement,
  payment,
}: {
  settlement: Settlement
  payment: MerchantPayment
}) {
  const detail = useMemo(() => paymentDetailOf(settlement, payment), [settlement, payment])
  // Held here rather than in the forms row, so the row's tick sees uploads as they land.
  const uploads = useFormUploads(() => seededForms(detail))
  // Generate Payment Info fills the payment file in place: the row ticks and its details show.
  const [fileReady, setFileReady] = useState(detail.paymentFileReady)
  const sections = sectionsOf(payment, detail, uploads, fileReady, () => setFileReady(true))
  // A paid-out payment opens with every row expanded — nothing is left to do, so it is all
  // there to read. Otherwise the first step still to do opens, the done ones before it stay
  // closed. Fixed at open: finishing a step later does not move it.
  // Read once: the accordion is uncontrolled, and keyed per payment above.
  const defaultOpen =
    payment.status === 'SUCCESS'
      ? sections.map(({ value }) => value)
      : sections
          .filter(({ done }) => !done)
          .slice(0, 1)
          .map(({ value }) => value)
  const [detailsOpen, setDetailsOpen] = useState(false)
  // Built only once View details is pressed — most payments are never looked at that way.
  const reconRow = useMemo(
    () => (detailsOpen ? reconRowOf(settlement, payment, detail) : null),
    [detailsOpen, settlement, payment, detail],
  )
  return (
    // The strip stays put and only the rows scroll under it: it sits outside the scroller
    // rather than sticking inside it, so nothing has to paint behind it.
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-2 pt-2">
        <HeaderStrip
          action={
            // The payment as the Payment Info Generator's row, in that page's own sheet.
            <span className="flex shrink-0">
              <ButtonV2
                buttonType={ButtonV2Type.SECONDARY}
                size={ButtonV2Size.SMALL}
                text="View details"
                onClick={() => setDetailsOpen(true)}
              />
            </span>
          }
        >
          <HeaderFigure label="Payment ID" value={payment.paymentId} copyLabel="Payment ID" />
          <HeaderFigure label="Merchant UTR" value={detail.merchantUtr} copyLabel="Merchant UTR" />
          <HeaderFigure label="Creation Date" value={istShortDate(detail.paymentFile.createdAt)} />
        </HeaderStrip>
      </div>
      <ReconDetailSheet row={reconRow} onClose={() => setDetailsOpen(false)} />
      <div className="min-h-0 flex-1 overflow-y-auto p-2">
        <ThemeProvider componentTokens={paymentAccordionTokens}>
          <AccordionV2
            accordionType={AccordionV2Type.BORDER}
            // Rows open independently — opening one never closes another.
            isMultiple
            defaultValue={defaultOpen}
          >
            {sections.map(({ value, title, icon, done, body }) => (
              <AccordionV2Item
                key={value}
                value={value}
                title={title}
                leftSlot={<LeadIcon icon={icon} done={done} />}
              >
                {body}
              </AccordionV2Item>
            ))}
          </AccordionV2>
        </ThemeProvider>
      </div>
    </div>
  )
}
