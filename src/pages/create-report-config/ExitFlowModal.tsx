import { useMemo, useSyncExternalStore } from 'react'
import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  ModalV2,
  ThemeProvider,
} from '@juspay/blend-design-system'
import { PrimitiveText, font } from '../../primitives'
import { dangerSecondaryButtonTokens } from '../../theme'
import { MODALV2_TOKENS } from '../../tokens/generated'

/**
 * Where Blend switches MODALV2_TOKENS from `sm` to `lg` — `useBreakPoints.ts:6-9`, which
 * `useResponsiveTokens` reads on every Blend component's behalf.
 */
const BREAKPOINT_LG = 1024

/**
 * Which half of MODALV2_TOKENS is live right now.
 *
 * Blend's own hook is not exported from the package root and lives in raw `lib/` TypeScript
 * that this app would need a second alias to reach (appendix A). The rule it applies is one
 * comparison, so it is restated here rather than imported — cheaper than the alias, and it
 * cannot drift silently because `npm run tokens:check` still watches the values themselves.
 *
 * `useSyncExternalStore` rather than state + an effect: the first paint reads the real
 * viewport instead of rendering `sm` and correcting itself a frame later.
 */
function useModalTokens() {
  const query = useMemo(
    () => window.matchMedia(`(min-width: ${BREAKPOINT_LG}px)`),
    [],
  )
  const breakpoint = useSyncExternalStore(
    (onChange) => {
      query.addEventListener('change', onChange)
      return () => query.removeEventListener('change', onChange)
    },
    () => (query.matches ? ('lg' as const) : ('sm' as const)),
  )
  return MODALV2_TOKENS[breakpoint]
}

/**
 * The one way out of the create flow — shared by the topbar logo and the footer's Exit, so
 * both doors ask the same question.
 *
 * Three answers, three weights, loudest on the right.
 *
 * **Save as draft** takes the primary. It is the only answer that loses nothing, so it is
 * the one to make easiest to reach.
 *
 * **Discard and exit** sits beside it as a danger secondary: outlined and red, not filled
 * and red. It should still say destructive — but a solid red button drawn louder than the
 * safe one beside it is an invitation, and the ✕, the backdrop and Cancel are all already
 * exits. Blend has no such weight (see `dangerSecondaryButtonTokens`, src/theme.ts).
 *
 * **Cancel** is quietest and sits apart on the left. Blend has no tertiary: `ButtonV2Type`
 * is primary / secondary / danger / success and nothing else, so the quietest thing it can
 * draw is secondary + INLINE — the borderless, fill-less button this flow already uses for
 * Exit, which makes the two read as the same kind of action.
 *
 * ModalV2's own actions stop at two (`primaryAction`/`secondaryAction`), hence
 * `customFooter`. Cancel is the one that sits outside the pair: "stay" is a different kind
 * of answer from the two that leave, and it should not sit between them.
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
  const modal = useModalTokens()

  return (
    <ModalV2
      isOpen={isOpen}
      onClose={onCancel}
      title="Leave report setup?"
      showCloseButton
      closeOnBackdropClick
      dimensions={{ width: 480 }}
      customFooter={
        // ModalV2 renders a custom footer bare (ModalV2.tsx:248-253) — `customFooter ??
        // <ModalV2Footer/>` means the footer Blend would have drawn never runs, and with it
        // goes every piece of chrome it owns. So this rebuilds ModalV2Footer's own Block
        // (ModalV2Footer.tsx:41-55) rather than only its padding: the divider above it, the
        // surface behind it and the two bottom corners are the footer's, not the body's.
        <div
          className="flex w-full items-center justify-between"
          style={{
            paddingTop: modal.footer.paddingTop,
            paddingRight: modal.footer.paddingRight,
            paddingBottom: modal.footer.paddingBottom,
            paddingLeft: modal.footer.paddingLeft,
            gap: modal.footer.gap,
            borderTop: modal.footer.borderTop,
            backgroundColor: modal.footer.backgroundColor,
            borderRadius: `0 0 ${modal.borderRadius} ${modal.borderRadius}`,
            flexShrink: 0,
          }}
        >
          <ButtonV2
            buttonType={ButtonV2Type.SECONDARY}
            subType={ButtonV2SubType.INLINE}
            size={ButtonV2Size.MEDIUM}
            text="Cancel"
            onClick={onCancel}
          />
          {/* The same token that spaces Blend's own secondary/primary pair, because that is
              exactly what this is — Cancel is what sits outside it. */}
          <div className="flex items-center" style={{ gap: modal.footer.gap }}>
            {/* Scoped: the remap turns `danger.default` into an outlined button, and every
                other red button in the app should keep its fill. */}
            <ThemeProvider componentTokens={dangerSecondaryButtonTokens}>
              <ButtonV2
                buttonType={ButtonV2Type.DANGER}
                size={ButtonV2Size.MEDIUM}
                text="Discard and exit"
                onClick={onDiscard}
              />
            </ThemeProvider>
            <ButtonV2
              buttonType={ButtonV2Type.PRIMARY}
              size={ButtonV2Size.MEDIUM}
              text="Save as draft"
              onClick={onSaveDraft}
            />
          </div>
        </div>
      }
    >
      {/* The explanation lives in the body rather than the header's `subtitle`: ModalV2
          pads its body whether or not it has children (ModalV2.tsx:206-220), so an empty
          one leaves a blank band between the two dividers. In the body it is the band —
          which is also the shape the design system's Modal shows, header rule, content,
          footer rule. */}
      <PrimitiveText as="p" {...font(FOUNDATION_THEME.font.size.body.md)} color={FOUNDATION_THEME.colors.gray[500]}>
        Your answers so far will be lost unless you save this report as a draft to finish
        later.
      </PrimitiveText>
    </ModalV2>
  )
}
