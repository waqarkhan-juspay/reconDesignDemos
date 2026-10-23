/**
 * Form 145/146 for one payment file — PACB Figma, node 54:28019. Its states (no forms yet,
 * only 145, only 146, both) are not a prop; they fall out of which forms `forms` holds:
 *
 * - while either form is missing, the upload box shows, and a missing form's row carries a
 *   "No File Uploaded" tag;
 * - an uploaded form's row shows its file as a link, with Reupload and Delete;
 * - once both are in, the upload box goes.
 *
 * The upload box is Blend's UploadV2 — its default header is the design's own line, and it
 * brings the dashed box, the illustration slot, drag-and-drop and the Browse Files button.
 * It is kept empty: a file dropped on it is handed straight to `onUpload` and lands in a form
 * row, so the box never lists files of its own.
 */

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
  UploadV2,
  type UploadFileV2,
} from '@juspay/blend-design-system'
import { useRef } from 'react'
import formsIllustration from '../../assets/forms-145-146-fan-dots.svg'
import fileIcon from '../../assets/icons/file-02.svg'
import { font, PrimitiveText } from '../../primitives'
import { formActionTokens } from '../../theme'
import { DetailCard, Field, MonoValue, StampValue } from './DetailCard'

const { colors } = FOUNDATION_THEME

export type FormKind = '145' | '146'

export type UploadedForm = {
  name: string
  /** An object URL for a file uploaded in this session; demo files have none to open. */
  url?: string
}

const FORM_KINDS: { kind: FormKind; title: string }[] = [
  { kind: '145', title: 'Form 145 ⋅ CA Certificate' },
  { kind: '146', title: 'Form 146 ⋅ Remitter Declaration' },
]

const BODY = FOUNDATION_THEME.font.size.body.md

/**
 * One form's row. Uploaded: the file name as a link, then Reupload and Delete, always shown
 * (the design had them on hover only; made persistent on 2026-10-08). Missing: the neutral
 * "No File Uploaded" tag beside the title.
 */
function FormRow({
  title,
  form,
  onReupload,
  onDelete,
}: {
  title: string
  form?: UploadedForm
  onReupload: () => void
  onDelete: () => void
}) {
  const heading = (
    <PrimitiveText {...font(BODY)} color={colors.gray[500]}>
      {title}
    </PrimitiveText>
  )
  if (!form) {
    return (
      <div className="flex items-center gap-1">
        {heading}
        <TagV2
          text="No File Uploaded"
          type={TagV2Type.SUBTLE}
          size={TagV2Size.XS}
          subType={TagV2SubType.SQUARICAL}
          color={TagV2Color.NEUTRAL}
        />
      </div>
    )
  }
  return (
    <div className="flex flex-col gap-1">
      {heading}
      <div className="flex items-center gap-3">
        {/* Blend's link button, underlined as the design draws the file name. */}
        <span className="flex min-w-0 [&_[data-id]]:underline">
          <ButtonV2
            buttonType={ButtonV2Type.PRIMARY}
            subType={ButtonV2SubType.INLINE}
            size={ButtonV2Size.MEDIUM}
            text={form.name}
            onClick={() => form.url && window.open(form.url, '_blank', 'noopener')}
          />
        </span>
        {/* Ghost buttons (formActionTokens). The negative margin keeps the row at the
            text's height. */}
        <ThemeProvider componentTokens={formActionTokens}>
          <span className="-my-1 ml-3 flex items-center gap-1">
            <ButtonV2
              buttonType={ButtonV2Type.SECONDARY}
              subType={ButtonV2SubType.INLINE}
              size={ButtonV2Size.MEDIUM}
              text="Reupload"
              onClick={onReupload}
            />
            <ButtonV2
              buttonType={ButtonV2Type.SECONDARY}
              subType={ButtonV2SubType.INLINE}
              size={ButtonV2Size.MEDIUM}
              text="Delete"
              onClick={onDelete}
            />
          </span>
        </ThemeProvider>
      </div>
    </div>
  )
}

export function FormUploadCard({
  icon = fileIcon,
  fileId,
  stagedAt,
  forms,
  onUpload,
  onReplace,
  onDelete,
  bare = false,
  uploadFirst = false,
}: {
  /** The header glyph — file-02 on its own, file-download-02 in the payment detail panel. */
  icon?: string
  fileId: string
  /** ISO timestamp. */
  stagedAt: string
  forms: Partial<Record<FormKind, UploadedForm>>
  /** Files dropped on or browsed into the upload box — which form each is, is the caller's. */
  onUpload: (files: File[]) => void
  onReplace: (kind: FormKind, file: File) => void
  onDelete: (kind: FormKind) => void
  /** The body alone, for a host that draws its own frame — see DetailCard. */
  bare?: boolean
  /**
   * Version 3's step-by-step reading: until both forms are in, the card is the upload box —
   * no File ID or staging date, and the form rows only once one form has landed (they carry
   * its Reupload and Delete). With both in, it reads as it always has.
   */
  uploadFirst?: boolean
}) {
  const reuploadRef = useRef<HTMLInputElement>(null)
  const reuploadKind = useRef<FormKind | null>(null)
  const complete = FORM_KINDS.every(({ kind }) => forms[kind])
  const showMeta = complete || !uploadFirst
  const showRows = showMeta || FORM_KINDS.some(({ kind }) => forms[kind])

  return (
    <DetailCard icon={icon} title="Form 145/146" tall bare={bare}>
      {showMeta && (
        <>
          <Field label="File ID">
            <MonoValue value={fileId} label="File ID" />
          </Field>

          <Field label="Staging date">
            <StampValue iso={stagedAt} />
          </Field>
        </>
      )}

      {!complete && (
        <UploadV2
          label="Upload Form 145 and/or 146"
          description=".pdf only | Auto assigned in the backend"
          acceptedFileTypes={['.pdf']}
          multiple
          slot={<img src={formsIllustration} alt="" width={160} height={128} />}
          files={[]}
          onChange={(files: UploadFileV2[]) => {
            const valid = files.filter((f) => f.isValid !== false).map((f) => f.file)
            if (valid.length) onUpload(valid)
          }}
        />
      )}

      {showRows &&
        FORM_KINDS.map(({ kind, title }) => (
          <FormRow
            key={kind}
            title={title}
            form={forms[kind]}
            onReupload={() => {
              reuploadKind.current = kind
              reuploadRef.current?.click()
            }}
            onDelete={() => onDelete(kind)}
          />
        ))}

      {/* One picker for both rows' Reupload; which row asked is remembered above. */}
      <input
        ref={reuploadRef}
        type="file"
        accept=".pdf"
        hidden
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file && reuploadKind.current) onReplace(reuploadKind.current, file)
          event.target.value = ''
        }}
      />
    </DetailCard>
  )
}
