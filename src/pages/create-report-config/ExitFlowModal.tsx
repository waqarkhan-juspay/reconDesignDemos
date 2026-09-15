import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  ModalV2,
} from '@juspay/blend-design-system'
import { PrimitiveText, font } from '../../primitives'
import { MODALV2_TOKENS } from '../../tokens/generated'

/** Desktop footer spacing, as ModalV2Footer would have applied it. */
const FOOTER = MODALV2_TOKENS.lg.footer

/**
 * The one way out of the create flow — shared by the topbar logo and the footer's Exit, so
 * both doors ask the same question.
 *
 * Three answers, three weights: Discard is the destructive one and takes the red button;
 * Cancel is the safe default and takes the secondary; Save as draft is the quiet middle
 * path, a ghost. Blend has no ghost type — secondary + INLINE is the borderless, fill-less
 * button this flow already uses for Exit, so the two read as the same kind of action.
 *
 * ModalV2's own actions stop at two (`primaryAction`/`secondaryAction`), hence
 * `customFooter`. The draft sits apart on the left: it is the only answer that is not
 * "stay" or "leave", and it should not sit between them.
 */
export function ExitFlowModal({
  isOpen,
  onCancel,
  onSaveDraft,
  onDiscard,
}: {
  isOpen: boolean
  onCancel: () => void
  onSaveDraft: () => void
  onDiscard: () => void
}) {
  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onCancel}
      title="Leave report setup?"
      showCloseButton
      closeOnBackdropClick
      showDivider={false}
      dimensions={{ width: 480 }}
      customFooter={
        // ModalV2 renders a custom footer bare (ModalV2.tsx:249) — its padding lives in
        // ModalV2Footer, which is skipped — so the footer tokens are applied here.
        <div
          className="flex w-full items-center justify-between"
          style={{
            paddingTop: FOOTER.paddingTop,
            paddingRight: FOOTER.paddingRight,
            paddingBottom: FOOTER.paddingBottom,
            paddingLeft: FOOTER.paddingLeft,
            gap: FOOTER.gap,
          }}
        >
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            subType={ButtonV2SubType.INLINE}
            size={ButtonV2Size.MEDIUM}
            text="Save as draft"
            onClick={onSaveDraft}
          />
          <div className="flex items-center gap-3">
            <ButtonV2
              buttonType={ButtonV2Type.SECONDARY}
              size={ButtonV2Size.MEDIUM}
              text="Cancel"
              onClick={onCancel}
            />
            <ButtonV2
              buttonType={ButtonV2Type.DANGER}
              size={ButtonV2Size.MEDIUM}
              text="Discard and exit"
              onClick={onDiscard}
            />
          </div>
        </div>
      }
    >
      {/* The explanation lives in the body rather than the header's `subtitle`: ModalV2
          pads its body whether or not it has children, so an empty one left a blank band
          between the header and the actions. */}
      <PrimitiveText as="p" {...font(FOUNDATION_THEME.font.size.body.md)} color={FOUNDATION_THEME.colors.gray[500]}>
        Your answers so far will be lost unless you save this report as a draft to finish
        later.
      </PrimitiveText>
    </ModalV2>
  )
}
