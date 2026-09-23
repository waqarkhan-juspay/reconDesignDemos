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
 * The hairline between the form's two halves.
 *
 * blend-gap: Blend 0.0.37 ships no divider component. CardV2 is the nearest thing, but an
 * outlined card around the file group would put the gray preview box inside a second
 * surface — so this is a 1px rule on a token colour instead.
 *
 * It carries the whole division now that neither group has a heading, and the gap either
 * side of it is the other half of that job. `aria-hidden` because a rule is not a landmark:
 * what a screen reader gets is the four field labels, in order, which is what they are.
 */
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
  /**
   * `''` until an option is picked. Every field in this modal opens empty on its placeholder —
   * a pre-picked format is an answer nobody gave, and it would ship unread.
   */
  const [dateFormat, setDateFormat] = useState('')

  const fileName = typed ?? slugify(configName)
  // All three are required: the config cannot be saved nameless, a blank slug would deliver
  // a file called nothing at all, and "No date in the file name" is an option to pick rather
  // than what an unanswered select means.
  const canSubmit = configName.trim() !== '' && fileName.trim() !== '' && dateFormat !== ''

  const close = () => {
    setConfigName('')
    setTyped(null)
    setDateFormat('')
    onClose()
  }

  const submit = (event?: FormEvent) => {
    event?.preventDefault()
    if (!canSubmit) return
    onSubmit({ configName: configName.trim(), fileName: fileName.trim(), dateFormat })
    close()
  }

  /**
   * What a delivered file will actually be called — the field and the format, resolved. `null`
   * until both are answered: half a filename (`report_.csv`, or a name missing the date it
   * will carry) would preview a file that will never be delivered.
   */
  const preview =
    fileName.trim() !== '' && dateFormat !== ''
      ? `${fileName.trim()}${dateFormat === 'none' ? '' : `_${EXAMPLES[dateFormat] ?? ''}`}.csv`
      : null

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
      {/* The modal asks two different questions that happen to both be names: what this
          config is called *in the app*, and what the file is called when it *leaves* it. Run
          flat, the controls read as one naming chore and the delivered file's name looks
          like a second attempt at the first field — so the rule, and the word "Delivered" in
          that label, keep them apart.

          The first group carries no heading of its own. One field, whose own label already
          says "Configuration Name", under a dialog already titled "Name and submit": a
          "Configuration" heading over it was the same word a third time, and a heading with
          one control under it is a group of one. The second earns its heading — two controls,
          and a sentence that is true of both of them rather than of either. */}
      <form className="flex flex-col gap-5" onSubmit={submit}>
        <TextInputV2
          label="Configuration Name"
          required
          placeholder="ex: Daily Recon Report"
          size={InputSizeV2.MD}
          value={configName}
          autoFocus
          onChange={(event) => setConfigName(event.target.value)}
        />

        <SectionRule />

        <div className="flex flex-col gap-4">
          <TextInputV2
            // "Delivered", not just "File name": the group heading that used to carry that
            // word is gone, so the label is the only thing left saying *which* file this
            // names — the one that arrives, rather than anything about the config itself.
            label="Delivered File Name"
            placeholder="ex: daily_settlement_report"
            size={InputSizeV2.MD}
            value={fileName}
            onChange={(event) => setTyped(event.target.value)}
          />

          <SingleSelectV2
            label="Date format"
            // No sublabel. Where the date lands, and that each run is therefore a separate
            // file, is the one thing the preview box below already answers — in this config's
            // own name, with today's date in it, updating as the option changes. A sentence
            // saying the same thing in general terms directly above a worked example of it is
            // the example read twice, and the weaker of the two readings.
            //
            // Required: it opens empty, and `canSubmit` holds until it is answered.
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
            {/* The box stays while it has nothing to show, so the modal does not grow when the
                last answer lands; until then it holds a placeholder, in placeholder grey. */}
            {preview ? (
              <PrimitiveText
                {...font(FOUNDATION_THEME.font.size.body.md)}
                color={colors.gray[700]}
                fontWeight={FOUNDATION_THEME.font.weight[600]}
              >
                {preview}
              </PrimitiveText>
            ) : (
              <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[400]}>
                Add a file name and date format to preview it
              </PrimitiveText>
            )}
          </div>
        </div>

        {/* Lets Enter submit — a form with no submit control ignores Enter in some browsers. */}
        <button type="submit" hidden />
      </form>
    </ModalV2>
  )
}
