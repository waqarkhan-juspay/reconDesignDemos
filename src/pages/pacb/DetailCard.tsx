/**
 * The PACB detail cards' shared parts — Overview, Payment file, Supporting file, Form
 * 145/146, Merchant Payment Report (PACB Figma node 44:13275). Every one is the same shell: a
 * grey header with a 14px glyph and a title, then a body of label-over-value fields.
 *
 * blend-gap: Blend's CardV2 has no header slot for an icon-and-title bar on a gray[25] band,
 * and its padding tokens are global — so the shell is composed here on the card tokens.
 */

import { ButtonV2, ButtonV2Size, ButtonV2Type, FOUNDATION_THEME } from '@juspay/blend-design-system'
import type { ReactNode } from 'react'
import downloadIcon from '../../assets/icons/download-01.svg'
import MaskIcon from '../../components/MaskIcon'
import { font, PrimitiveText } from '../../primitives'
import { EMPTY } from './data'
import { downloadText, HAIRLINE, istStamp, PANEL_STYLE } from './helpers'
import { HoverCopy } from './kit'
import type { PaymentFileRecord } from './settlements'

const { colors } = FOUNDATION_THEME

const BODY = FOUNDATION_THEME.font.size.body.md

export function DetailCard({
  icon,
  title,
  tall = false,
  action,
  bare = false,
  children,
}: {
  /** A Figma glyph, drawn through MaskIcon. */
  icon: string
  title: string
  /**
   * The Form 145/146 header is 62px, not 44: the design keeps room there for an action
   * button. The others have none.
   */
  tall?: boolean
  /** A button at the header's right, as Payment file's Download. Makes the header tall. */
  action?: ReactNode
  /**
   * The body alone, with no frame or header — for a host that draws its own, as Version 3's
   * accordion rows do (DetailBody).
   */
  bare?: boolean
  children: ReactNode
}) {
  if (bare) return <DetailBody>{children}</DetailBody>
  return (
    <section
      aria-label={title}
      className="flex w-full flex-col overflow-hidden"
      style={{ ...PANEL_STYLE, boxShadow: FOUNDATION_THEME.shadows.sm }}
    >
      <header
        className={`flex items-center justify-between gap-3 px-4 ${tall || action ? 'h-[62px]' : 'py-3'}`}
        style={{ background: colors.gray[25], borderBottom: HAIRLINE }}
      >
        <div className="flex min-w-0 items-center gap-2">
          <MaskIcon src={icon} size={14} color={colors.gray[600]} />
          <PrimitiveText
            as="h2"
            {...font(BODY)}
            color={colors.gray[700]}
            fontWeight={FOUNDATION_THEME.font.weight[600]}
          >
            {title}
          </PrimitiveText>
        </div>
        {action}
      </header>
      <DetailBody>{children}</DetailBody>
    </section>
  )
}

/** A card's body: fields 24px apart, 40 in from the sides, 24 above and below. */
export function DetailBody({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-6 px-10 py-6">{children}</div>
}

/** A payment file's or supporting file's fields: name, UUID, then the two dates. */
export function FileFields({ file }: { file: PaymentFileRecord }) {
  return (
    <>
      <Field label="File Name">
        <MonoValue value={file.name} label="File name" />
      </Field>
      <Field label="File UUID">
        <MonoValue value={file.uuid} label="File UUID" />
      </Field>
      <FieldColumns
        left={
          <Field label="Creation date">
            <StampValue iso={file.createdAt} />
          </Field>
        }
        right={
          <Field label="Staging date">
            <StampValue iso={file.stagedAt} />
          </Field>
        }
      />
    </>
  )
}

/**
 * Download for a demo artefact — a plain-text stand-in under the artefact's own name, since
 * the demo has no real PACB file to hand over.
 */
export function DownloadButton({
  text = 'Download',
  name,
  lines,
}: {
  text?: string
  /** The saved file's name. */
  name: string
  lines: string[]
}) {
  return (
    <span className="flex shrink-0">
      <ButtonV2
        buttonType={ButtonV2Type.SECONDARY}
        size={ButtonV2Size.SMALL}
        text={text}
        rightSlot={{ slot: <MaskIcon src={downloadIcon} size={14} />, maxHeight: 14 }}
        onClick={() => downloadText(lines, name)}
      />
    </span>
  )
}

/** A label over its value. */
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <PrimitiveText {...font(BODY)} color={colors.gray[500]}>
        {label}
      </PrimitiveText>
      {children}
    </div>
  )
}

/** Plain body text as a value. */
export function TextValue({ children }: { children: ReactNode }) {
  return (
    <PrimitiveText {...font(BODY)} color={colors.gray[700]}>
      {children}
    </PrimitiveText>
  )
}

/**
 * An ID, UUID, UTR or file name: monospaced, as the design sets them, with the copy glyph
 * beside it on hover. An empty value is the dash alone — nothing to copy.
 */
export function MonoValue({ value, label }: { value: string; label: string }) {
  if (!value || value === EMPTY) return <TextValue>{EMPTY}</TextValue>
  return (
    <div className="group/row flex min-w-0 items-center gap-1">
      <PrimitiveText
        {...font(FOUNDATION_THEME.font.size.code.lg)}
        fontFamily="var(--font-mono)"
        fontWeight={FOUNDATION_THEME.font.weight[400]}
        color={colors.gray[700]}
        truncate
      >
        {value}
      </PrimitiveText>
      <HoverCopy value={value} label={label} size={14} />
    </div>
  )
}

/** "28th Sep 2026 ⋅ 18:41 (IST)", the zone in gray[400] as the design has it. */
export function StampValue({ iso }: { iso: string }) {
  return (
    <TextValue>
      {istStamp(iso)} <span style={{ color: colors.gray[400] }}>(IST)</span>
    </TextValue>
  )
}

/**
 * Two columns of fields, the left one 233px wide — the grid every card body uses. Fields run
 * down each column 24px apart.
 */
export function FieldColumns({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <div className="flex items-start gap-0">
      <div className="flex w-[233px] shrink-0 flex-col gap-6">{left}</div>
      <div className="flex min-w-0 flex-1 flex-col gap-6">{right}</div>
    </div>
  )
}
