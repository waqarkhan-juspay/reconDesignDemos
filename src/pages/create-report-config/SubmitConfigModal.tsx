import {
  ButtonV2Size,
  ButtonV2Type,
  FOUNDATION_THEME,
  InputSizeV2,
  ModalV2,
  SingleSelectV2,
  SingleSelectV2Size,
  SingleSelectV2Variant,
  TextInputV2,
} from '@juspay/blend-design-system'
import { useState, type FormEvent } from 'react'
import { PrimitiveText, font } from '../../primitives'

const { colors } = FOUNDATION_THEME

/**
 * The last thing the flow asks: what the delivered file is called.
 *
 * It is asked here rather than back in Delivery on purpose. A filename is not a property of
 * the schedule or of the recipients — it is a property of the artefact, and the artefact is
 * not real until you submit. Asking at submit also means the answer is given once, with the
 * whole config visible behind the scrim, rather than five steps before anyone knows what the
 * report contains.
 */

/**
 * The date suffixes a delivered file can carry, in the flow's own placeholder syntax.
 *
 * `%d-%m-%Y` and friends are strftime, which is what the rest of the app already writes
 * (`fileNameFor` in config-detail.ts emits `{date:%d-%m-%Y}`), so a template chosen here is
 * one the Configurator can read back without translation.
 *
 * `label` carries a worked example rather than the pattern: nobody picks a date format by
 * reading `%d-%m-%Y`, and everybody recognises `17-09-2026`.
 */
const DATE_FORMATS = [
  { value: '%d-%m-%Y', label: 'DD-MM-YYYY (17-09-2026)' },
  { value: '%Y-%m-%d', label: 'YYYY-MM-DD (2026-09-17)' },
  { value: '%d%m%Y', label: 'DDMMYYYY (17092026)' },
  { value: '%b-%Y', label: 'MON-YYYY (Sep-2026)' },
  // Last, and explicitly an option rather than an empty row: a config that delivers to a
  // folder keyed by date does not want the date in the name twice.
  { value: 'none', label: 'No date in the file name' },
]

/** The example each option's label promises, so the preview agrees with the menu. */
const EXAMPLES: Record<string, string> = {
  '%d-%m-%Y': '17-09-2026',
  '%Y-%m-%d': '2026-09-17',
  '%d%m%Y': '17092026',
  '%b-%Y': 'Sep-2026',
}

/**
 * A configuration name turned into something a filesystem will accept.
 *
 * Same rule as `fileNameFor` in config-detail.ts — lowercase, runs of anything unsafe
 * collapsed to one underscore, no leading or trailing separator — so the name this modal
 * suggests is the name the detail sheet will show back.
 */
export const slugify = (name: string) =>
  name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')

export function SubmitConfigModal({
  isOpen,
  configName,
  onClose,
  onSubmit,
}: {
  isOpen: boolean
  /** The config's name, used to seed the file name so the field is never blank. */
  configName: string
  onClose: () => void
  /** Called with the final file name and the chosen date pattern, then the flow closes. */
  onSubmit: (file: { fileName: string; dateFormat: string }) => void
}) {
  /**
   * `null` means "nobody has typed here yet", which is what lets the field follow the config
   * name while it is untouched and stop following it the moment it is edited. A plain string
   * seeded from a prop cannot tell those apart — it either never updates, or it overwrites
   * what the user typed.
   */
  const [typed, setTyped] = useState<string | null>(null)
  const [dateFormat, setDateFormat] = useState(DATE_FORMATS[0].value)

  const fileName = typed ?? slugify(configName)
  const canSubmit = fileName.trim() !== ''

  const close = () => {
    setTyped(null)
    setDateFormat(DATE_FORMATS[0].value)
    onClose()
  }

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!canSubmit) return
    onSubmit({ fileName: fileName.trim(), dateFormat })
    close()
  }

  /** What a delivered file will actually be called — the field and the format, resolved. */
  const preview = `${fileName.trim() || 'report'}${
    dateFormat === 'none' ? '' : `_${EXAMPLES[dateFormat] ?? ''}`
  }.csv`

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={close}
      title="Name the delivered file"
      subtitle="Every run of this report is delivered under this name."
      showCloseButton
      // Not dismissible by backdrop: this is the last gate before a config is submitted, and
      // a stray click outside should not read as "no, don't".
      closeOnBackdropClick={false}
      dimensions={{ width: 520 }}
      primaryAction={{
        buttonType: ButtonV2Type.PRIMARY,
        size: ButtonV2Size.MEDIUM,
        text: 'Submit and Exit',
        disabled: !canSubmit,
        onClick: () => submit(),
      }}
      secondaryAction={{
        buttonType: ButtonV2Type.SECONDARY,
        size: ButtonV2Size.MEDIUM,
        text: 'Cancel',
        onClick: close,
      }}
    >
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <TextInputV2
          label="File name"
          placeholder="ex: daily_settlement_report"
          size={InputSizeV2.MD}
          value={fileName}
          autoFocus
          onChange={(event) => setTyped(event.target.value)}
        />

        <SingleSelectV2
          label="Date format"
          // The date is appended, not substituted, so the label says where it lands — a user
          // who reads only the label still knows what the file will be called.
          subLabel="Appended to the file name, so each run is a separate file."
          required
          triggerDimensions={{ width: '100%' }}
          placeholder="Select a date format"
          size={SingleSelectV2Size.MD}
          variant={SingleSelectV2Variant.CONTAINER}
          items={[{ items: DATE_FORMATS }]}
          selected={dateFormat}
          onSelect={setDateFormat}
        />

        {/* The answer to both questions at once. Two fields that each look right can still
            combine into a filename nobody wanted, and this is the only place that shows the
            combination before it is committed. */}
        <div
          className="flex flex-col gap-1 rounded-[8px] px-4 py-3"
          style={{ backgroundColor: colors.gray[50] }}
        >
          <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[500]}>
            Files will be delivered as
          </PrimitiveText>
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.body.md)}
            color={colors.gray[700]}
            fontWeight={FOUNDATION_THEME.font.weight[600]}
          >
            {preview}
          </PrimitiveText>
        </div>

        {/* Lets Enter submit — a form with no submit control ignores Enter in some browsers. */}
        <button type="submit" hidden />
      </form>
    </ModalV2>
  )
}
