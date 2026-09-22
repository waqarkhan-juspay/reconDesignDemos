import {
  AvatarV2,
  AvatarV2Shape,
  AvatarV2Size,
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  InputSizeV2,
  MultiValueInputV2,
  PopoverV2,
  PopoverV2Align,
  PopoverV2Side,
  TagShape,
  TagSize,
  TagVariant,
  ThemeProvider,
} from '@juspay/blend-design-system'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { PrimitiveText, font } from '../../primitives'
import { neutralLinkTokens } from '../../theme'
import { isEmailAddress } from './answers'

const { colors } = FOUNDATION_THEME

/**
 * An email recipient list: type an address, confirm it with Enter (or by clicking the
 * suggestion card), and it becomes a removable tag inside the field.
 *
 * The field is Blend's MultiValueInputV2, which already owns the tag mechanics — Enter calls
 * `onTagAdd`, Backspace on an empty draft removes the last tag, each tag has its own ✕.
 *
 * The card under it is PopoverV2 with no heading or actions, which Blend renders as an
 * unpadded custom surface (PopoverV2.tsx:81). It opens only once the draft matches
 * `isEmailAddress`, and shows what Enter will add.
 *
 * blend-gap: PopoverV2 is a Radix popover that moves focus into its content on open and
 * exposes no `onOpenAutoFocus` to stop it, so typing the first character would pull focus
 * out of the field. Two things keep the field usable: the whole input is the popover's
 * trigger — Radix ignores focus and clicks on the trigger when deciding whether to close
 * (react-popover PopoverContentNonModal `onInteractOutside`) — and focus is handed straight
 * back to the input each time the card opens.
 */
export function RecipientsInput({
  label,
  required,
  recipients,
  onChange,
  onRemove,
}: {
  label: string
  required?: boolean
  recipients: string[]
  onChange: (next: string[]) => void
  /** Shows a ✕ beside the field that folds it away — Cc and Bcc, which were opt-in. */
  onRemove?: () => void
}) {
  const [draft, setDraft] = useState('')
  const [invalid, setInvalid] = useState(false)
  // Escape or a click elsewhere closes the card for the current draft; typing reopens it.
  const [dismissed, setDismissed] = useState(false)
  const [width, setWidth] = useState<number>()
  const hostRef = useRef<HTMLDivElement>(null)

  const trimmed = draft.trim()
  // Only a complete-looking address earns the card — a half-typed one has nothing to confirm.
  const open = isEmailAddress(trimmed) && !dismissed

  useEffect(() => {
    if (!open) return
    setWidth(hostRef.current?.getBoundingClientRect().width)
    // After Radix's own mount focus has run — see blend-gap above.
    const frame = requestAnimationFrame(() => hostRef.current?.querySelector('input')?.focus())
    return () => cancelAnimationFrame(frame)
  }, [open])

  const add = (value: string) => {
    const email = value.trim()
    if (!isEmailAddress(email)) {
      setInvalid(true)
      return
    }
    if (!recipients.includes(email)) onChange([...recipients, email])
    setDraft('')
    setInvalid(false)
    hostRef.current?.querySelector('input')?.focus()
  }

  const field = (
    <PopoverV2
      open={open}
      // Only closing is taken from Radix. Opening is the draft's decision, so a click into
      // the field (which Radix reads as a trigger click) never shows an empty card.
      onOpenChange={(next) => {
        if (!next) setDismissed(true)
      }}
      side={PopoverV2Side.BOTTOM}
      align={PopoverV2Align.START}
      sideOffset={4}
      width={width}
      // PopoverV2 otherwise caps itself at 400px, narrower than the two-column Email card.
      maxWidth={width}
      trigger={
        <div ref={hostRef} className="min-w-0">
          <MultiValueInputV2
            label={label}
            required={required}
            placeholder={recipients.length === 0 ? 'name@company.com' : undefined}
            size={InputSizeV2.MD}
            value={draft}
            onChange={(next) => {
              setDismissed(false)
              setInvalid(false)
              // A pasted or typed "a@x.com, b@y.com" becomes tags; the last, unfinished piece
              // stays as the draft. MultiValueInputV2 only ever splits on Enter.
              const pieces = next.split(/[,;]/)
              if (pieces.length > 1) {
                const rest = pieces.pop() ?? ''
                const found = pieces.map((piece) => piece.trim()).filter(Boolean)
                const valid = found.filter(isEmailAddress)
                const added = valid.filter((email, i) => !recipients.includes(email) && valid.indexOf(email) === i)
                if (added.length) onChange([...recipients, ...added])
                const bad = found.filter((piece) => !isEmailAddress(piece))
                setDraft(bad.length ? [...bad, rest.trim()].filter(Boolean).join(', ') : rest.trimStart())
                if (bad.length) setInvalid(true)
                return
              }
              setDraft(next)
            }}
            // Figma "Multi Value Input Field / web" (4848:47012): SUBTLE · XS · SQUARICAL, and
            // Tag's own default colour, PRIMARY — MultiValueInputV2 exposes no colour key.
            tags={{
              value: recipients,
              size: TagSize.XS,
              shape: TagShape.SQUARICAL,
              variant: TagVariant.SUBTLE,
            }}
            onTagAdd={add}
            onTagRemove={(email) => onChange(recipients.filter((recipient) => recipient !== email))}
            error={invalid}
            errorMessage={invalid ? 'Enter a valid email address' : undefined}
          />
        </div>
      }
    >
      {/* Not tabbable: the keyboard path is Enter in the field, and a focusable row here
          would be what Radix moves focus to on open. */}
      <div
        role="option"
        aria-selected
        tabIndex={-1}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => add(draft)}
        className="flex w-full min-w-0 cursor-pointer items-center gap-3 px-3 py-3"
        style={{
          backgroundColor: colors.gray[50],
          borderRadius: FOUNDATION_THEME.border.radius[8],
        }}
      >
        <AvatarV2
          fallbackText={trimmed.charAt(0).toUpperCase()}
          size={AvatarV2Size.MD}
          shape={AvatarV2Shape.CIRCULAR}
        />
        <span className="flex min-w-0 flex-col">
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.body.md)}
            color={colors.gray[700]}
            fontWeight={FOUNDATION_THEME.font.weight[600]}
            truncate
          >
            {trimmed}
          </PrimitiveText>
          <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[500]}>
            Press Enter to add
          </PrimitiveText>
        </span>
      </div>
    </PopoverV2>
  )

  if (!onRemove) return field

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">{field}</div>
      {/* On the field's row: the label is 20px + an 8px gap above it, and the button is
          centred on the MD field's box (36px, measured). Secondary + INLINE is the
          borderless button; neutralLinkTokens tints it gray[500] like the "Cc" link it
          collapses back to. */}
      {/* blend-gap: ButtonV2 hard-codes `cursor: default` (ButtonV2/utils.ts) — pointer set here. */}
      <div className="mt-7 flex h-9 shrink-0 items-center [&_button]:cursor-pointer">
        <ThemeProvider componentTokens={neutralLinkTokens}>
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            subType={ButtonV2SubType.INLINE}
            size={ButtonV2Size.SMALL}
            leftSlot={{ slot: <X size={16} aria-hidden /> }}
            aria-label={`Remove ${label}`}
            onClick={onRemove}
          />
        </ThemeProvider>
      </div>
    </div>
  )
}
