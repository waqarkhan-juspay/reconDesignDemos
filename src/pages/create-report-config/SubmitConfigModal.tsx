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
import { useState, type FormEvent, type ReactNode } from 'react'
import { PrimitiveText, font } from '../../primitives'

const { colors } = FOUNDATION_THEME

/**
 * The last thing the flow asks: what the config is called, and what the delivered file is
 * called.
 *
 * Both are asked here rather than back in Delivery on purpose. Neither is a property of the
 * schedule or of the recipients — they name the artefact, and the artefact is not real until
 * you submit. Asking at submit also means the answers are given once, with the whole config
 * visible behind the scrim, rather than five steps before anyone knows what the report
 * contains.
 *
 * The config name comes first because the file name is derived from it: type a name and the
 * file name below fills itself in, which only reads as cause and effect in that order.
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

/**
 * A titled group of fields, and the hairline that separates one from the next.
 *
 * blend-gap: Blend 0.0.37 ships no form-section or divider component. CardV2 is the nearest
 * thing, but an outlined card around the file group would put the gray preview box inside a
 * second surface, and only one of the two groups is card-shaped — so both are composed here
 * from tokens instead, and the two stay symmetrical.
 *
 * A real <section> and <h3> rather than styled divs: the grouping is the point, and a screen
 * reader that only hears four labels in a row has not been told it.
 */
function FieldSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        {/* body.md, not body.sm: the scale's sm is 12px, which would set the group heading
            *smaller* than the 14px field labels underneath it and invert the hierarchy. At
            14px the step up is weight and colour instead. */}
        <PrimitiveText
          as="h3"
          {...font(FOUNDATION_THEME.font.size.body.md)}
          color={colors.gray[900]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          {title}
        </PrimitiveText>
        <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[500]}>
          {description}
        </PrimitiveText>
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </section>
  )
}

/** Decorative: the headings above already say where one group ends and the next begins. */
function SectionRule() {
  return (
    <div aria-hidden className="h-px w-full" style={{ backgroundColor: colors.gray[200] }} />
  )
}

export function SubmitConfigModal({
  isOpen,
  onClose,
  onSubmit,
}: {
  isOpen: boolean
  onClose: () => void
  /** Called with the config's name, the final file name and the chosen date pattern. */
  onSubmit: (config: { configName: string; fileName: string; dateFormat: string }) => void
}) {
  const [configName, setConfigName] = useState('')
  /**
   * `null` means "nobody has typed here yet", which is what lets the field follow the config
   * name while it is untouched and stop following it the moment it is edited. A plain string
   * seeded from the name above cannot tell those apart — it either never updates, or it
   * overwrites what the user typed.
   */
  const [typed, setTyped] = useState<string | null>(null)
  const [dateFormat, setDateFormat] = useState(DATE_FORMATS[0].value)

  const fileName = typed ?? slugify(configName)
  // Both names are required: the config cannot be saved nameless, and a blank slug would
  // deliver a file called nothing at all.
  const canSubmit = configName.trim() !== '' && fileName.trim() !== ''

  const close = () => {
    setConfigName('')
    setTyped(null)
    setDateFormat(DATE_FORMATS[0].value)
    onClose()
  }

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!canSubmit) return
    onSubmit({ configName: configName.trim(), fileName: fileName.trim(), dateFormat })
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
      // Echoes the "Review and submit" step it opens from, and the "Submit for approval"
      // button that opens it: the submit is still happening, and "Name" is the one thing
      // that changed. Carries the whole header now that there is no subtitle under it.
      title="Name and submit"
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
      {/* Two groups, because the modal asks two different questions that happen to both be
          names: what this config is called *in the app*, and what the file is called when it
          *leaves* it. Run flat, the four controls read as one four-part naming chore and the
          File name looks like a second attempt at the first field. */}
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <FieldSection
          title="Configuration"
          description="The name this report is saved and listed under."
        >
          <TextInputV2
            label="Configuration Name"
            required
            placeholder="ex: Daily Recon Report"
            size={InputSizeV2.MD}
            value={configName}
            autoFocus
            onChange={(event) => setConfigName(event.target.value)}
          />
        </FieldSection>

        <SectionRule />

        <FieldSection
          title="Delivered file"
          description="What each run is called when it arrives. Filled in from the name above until you change it."
        >
          <TextInputV2
            label="File name"
            placeholder="ex: daily_settlement_report"
            size={InputSizeV2.MD}
            value={fileName}
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

          {/* The answer to both questions at once, and the reason the preview belongs in this
              group rather than under the whole form: it resolves these two fields and nothing
              above them. Two fields that each look right can still combine into a filename
              nobody wanted, and this is the only place that shows the combination before it
              is committed. */}
          <div
            className="flex flex-col gap-1 px-4 py-3"
            style={{
              backgroundColor: colors.gray[50],
              borderRadius: FOUNDATION_THEME.border.radius[8],
            }}
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
        </FieldSection>

        {/* Lets Enter submit — a form with no submit control ignores Enter in some browsers. */}
        <button type="submit" hidden />
      </form>
    </ModalV2>
  )
}
