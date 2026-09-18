/**
 * The email block: a To field, and Cc and Bcc that arrive as links and open into fields.
 *
 * Lifted out of DeliveryStep so the detail sheet's Download panel can be the same control
 * rather than a second one that looks like it. Two copies of "type an address, press Enter,
 * it becomes a tag" would drift the first time either one was touched — and the rules here
 * are not obvious enough to re-derive: Cc opens above Bcc, an open field can be folded back
 * to its link, and the two links share a row only while both are closed.
 *
 * The fields themselves are RecipientsInput, which owns the tag mechanics.
 */

import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  ThemeProvider,
} from '@juspay/blend-design-system'
import { neutralLinkTokens } from '../../theme'
import { RecipientsInput } from './RecipientsInput'

export type EmailRecipients = {
  to: string[]
  /** `null` until the "Cc" link is pressed — the field only exists once asked for. */
  cc: string[] | null
  bcc: string[] | null
}

export function EmailRecipientFields({
  value,
  onChange,
  /** Whether To is marked required. The create flow cannot complete without it; a one-off
      download is the caller's call. */
  required = false,
}: {
  value: EmailRecipients
  onChange: (next: EmailRecipients) => void
  required?: boolean
}) {
  const { to, cc, bcc } = value

  /**
   * Cc and Bcc as links, on one row.
   *
   * Secondary + INLINE is Blend's borderless text button; the scoped ThemeProvider tints it
   * gray[500] (neutralLinkTokens, src/theme.ts).
   *
   * blend-gap: ButtonV2 hard-codes `cursor: default` and has no text-decoration token, so
   * the pointer and the hover underline that make these read as links come from the wrapper.
   */
  const links = (fields: ('Cc' | 'Bcc')[]) => (
    <ThemeProvider componentTokens={neutralLinkTokens}>
      <div className="flex items-center gap-4 [&_button]:cursor-pointer [&_button:hover_span]:underline [&_button:hover_span]:underline-offset-2">
        {fields.map((field) => (
          <ButtonV2
            key={field}
            buttonType={ButtonV2Type.SECONDARY}
            subType={ButtonV2SubType.INLINE}
            size={ButtonV2Size.SMALL}
            text={field}
            onClick={() => onChange({ ...value, ...(field === 'Cc' ? { cc: [] } : { bcc: [] }) })}
          />
        ))}
      </div>
    </ThemeProvider>
  )

  return (
    <div className="flex flex-col gap-3">
      <RecipientsInput
        label="To"
        required={required}
        recipients={to}
        onChange={(next) => onChange({ ...value, to: next })}
      />

      {/* Cc's slot, then Bcc's — each its link or its open field. So an open Cc pushes the
          Bcc link below it, and an open Bcc keeps the Cc link above it. Only while both are
          closed do the two links share a single row. */}
      {cc === null && bcc === null ? (
        links(['Cc', 'Bcc'])
      ) : (
        <>
          {cc === null ? (
            links(['Cc'])
          ) : (
            <div className="flow-question">
              <RecipientsInput
                label="Cc"
                recipients={cc}
                onChange={(next) => onChange({ ...value, cc: next })}
                // Folding it away drops what was typed, back to the "Cc" link.
                onRemove={() => onChange({ ...value, cc: null })}
              />
            </div>
          )}
          {bcc === null ? (
            links(['Bcc'])
          ) : (
            <div className="flow-question">
              <RecipientsInput
                label="Bcc"
                recipients={bcc}
                onChange={(next) => onChange({ ...value, bcc: next })}
                onRemove={() => onChange({ ...value, bcc: null })}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
