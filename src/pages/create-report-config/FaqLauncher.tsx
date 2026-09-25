import {
  AccordionV2,
  AccordionV2Item,
  AccordionV2Type,
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  PopoverV2,
  PopoverV2Align,
  PopoverV2Side,
  ThemeProvider,
} from '@juspay/blend-design-system'
import { CircleHelp, X } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { FEEDBACK_EASING, FEEDBACK_MS } from '../../motion'
import { PrimitiveText, font } from '../../primitives'
import { FAQ_INSET, FAQ_LIST_GUTTER, FAQ_PANEL_PADDING, faqLauncherTokens } from '../../theme'
import type { StepId } from '.'
import { FAQS } from './faqs'

const { colors } = FOUNDATION_THEME

/** The glyph inside the round button — 20, a size up from the rows' 16, as the one control
    floating over the page rather than sitting in a line of them. */
const ICON_SIZE = 20

/**
 * The panel's width. Wide enough that most questions sit on one line and an answer reads as a
 * paragraph rather than a column of three-word lines; narrow enough to leave the content
 * column it floats over visible beside it.
 */
const PANEL_WIDTH = 400

/**
 * How tall the list of questions may grow before it scrolls: its own cap, or the room Radix
 * measures above the button less the heading's, whichever is smaller — so on a short window
 * the panel scrolls inside itself rather than running off the top of the screen.
 *
 * blend-gap: PopoverV2's `maxHeight` is a number of pixels applied to the whole surface, and
 * the surface does not scroll — content past it is clipped. The scroll lives on a wrapper this
 * file owns instead, which is also what keeps the heading and ✕ still while the list moves.
 */
const LIST_MAX_HEIGHT = 'min(480px, calc(var(--radix-popover-content-available-height) - 96px))'

/**
 * The flow's help — a floating action button in the bottom-right corner that opens every FAQ
 * about the step on screen — see faqs.ts for why they are per step.
 *
 * All Blend: the button is ButtonV2 (secondary, icon-only, made round by faqLauncherTokens), the
 * panel is PopoverV2 with its own heading and close button, and each question is an
 * AccordionV2 item. PopoverV2 already turns into a bottom drawer on phones
 * (`useDrawerOnMobile`, its default), which is the right shape there and costs nothing here.
 *
 * A popover rather than a side drawer or a modal: it is anchored to the thing that opened it,
 * so the page stays visible and the answer can be read beside the question it is about. One
 * question open at a time — the list is for scanning, and several open answers turn it back
 * into a page.
 *
 * Placement is the caller's (see the flow's index.tsx), which knows what the corner has to
 * stay clear of.
 */
export function FaqLauncher({ step }: { step: StepId }) {
  const [open, setOpen] = useState(false)

  return (
    // blend-gap: ButtonV2 hard-codes `cursor: default` (ButtonV2/utils.ts:269), so the pointer
    // is set from a wrapper this file owns.
    //
    // blend-gap: the lift is on that wrapper too. ButtonV2 reads its `shadow` token only for
    // `:active` (ButtonV2/utils.ts:239), so no token can give it a resting shadow. The popover
    // portals out of this span, leaving the button its only content — so a round wrapper with
    // `shadows.lg` (0.07, DESIGN.md's ceiling) casts exactly the button's shadow.
    //
    // The ThemeProvider wraps the whole popover rather than just the button, because Radix's
    // `Trigger asChild` has to be handed the button itself — anything between them becomes the
    // trigger instead, and takes the button's aria-expanded with it. faqLauncherTokens only
    // touches secondary LARGE icon-only buttons (this one), borderless accordions (the list)
    // and md popover headings (this panel's), so nothing else under it moves.
    <span
      className="flex [&_button]:cursor-pointer"
      style={{
        borderRadius: FOUNDATION_THEME.border.radius.full,
        boxShadow: FOUNDATION_THEME.shadows.lg,
      }}
    >
      <ThemeProvider componentTokens={faqLauncherTokens}>
        <PopoverV2
          open={open}
          onOpenChange={setOpen}
          heading="Frequently asked questions"
          showCloseButton
          side={PopoverV2Side.TOP}
          align={PopoverV2Align.END}
          sideOffset={12}
          width={PANEL_WIDTH}
          maxWidth={PANEL_WIDTH}
          trigger={
            <ButtonV2
              buttonType={ButtonV2Type.SECONDARY}
              subType={ButtonV2SubType.ICON_ONLY}
              size={ButtonV2Size.LARGE}
              // The ✕ while open, so the button that opened the panel visibly closes it too.
              leftSlot={{
                slot: open ? <X size={ICON_SIZE} /> : <CircleHelp size={ICON_SIZE} />,
              }}
              aria-label={open ? 'Close FAQs' : 'Open FAQs'}
              title="FAQs"
            />
          }
        >
          {/* The header's bottom stroke is this list's top edge. blend-gap: PopoverV2 has no
              token for a line under its header (popoverV2.tokens.types.ts), and the header is
              Blend's markup — so the line goes on the one box after it that this file owns.

              The negative margin undoes the surface's side padding (FAQ_PANEL_PADDING), so the
              stroke runs edge to edge like a divider rather than stopping short of the corners.
              The list then pads itself back in by FAQ_LIST_GUTTER, so nothing it fills touches
              the panel's edge, and the trigger's FAQ_INSET lands each question on the heading's
              keyline (theme.ts).

              The open question, and its answer, sit on gray[50] — one card, Blend's own 8px
              item radius, so it is plain which answer belongs to which question as the list
              scrolls. Between questions, a gray[150] hairline on the text's keyline. Both, and
              the chevron's own column, are `.faq-list` in index.css, fed by the variables here. */}
          <div
            className="faq-list overflow-y-auto"
            style={
              {
                maxHeight: LIST_MAX_HEIGHT,
                marginInline: -FAQ_PANEL_PADDING,
                padding: `${FOUNDATION_THEME.unit[8]} ${FAQ_LIST_GUTTER}px`,
                borderTop: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[200]}`,
                '--faq-open-bg': colors.gray[50],
                '--faq-divider': colors.gray[150],
                '--faq-divider-width': FOUNDATION_THEME.border.width[1],
                '--faq-inset': `${FAQ_INSET}px`,
                '--faq-ms': `${FEEDBACK_MS}ms`,
                '--faq-ease': FEEDBACK_EASING,
                // The question's line height — theme.ts sets its title to `body.md`.
                '--faq-line': `${FOUNDATION_THEME.font.size.body.md.lineHeight}px`,
              } as CSSProperties
            }
          >
            <AccordionV2 accordionType={AccordionV2Type.NO_BORDER}>
              {FAQS[step].map(({ id, question, answer }) => (
                <AccordionV2Item key={id} value={id} title={question}>
                  {/* The answer on the question's keyline — FAQ_INSET is the trigger's side padding
                      too (theme.ts). blend-gap: AccordionV2 pads its trigger from a token and its
                      content not at all, so the answer's inset is set here. 16 under it, the
                      trigger's own vertical padding, so the next question's separator is as far
                      from the answer as the answer is from its question.

                      `body.md` whole — Blend's 14px with its own 20px leading. The question is
                      `body.md` too (theme.ts); only the weight differs, 600 over 400. */}
                  <PrimitiveText
                    as="p"
                    {...font(FOUNDATION_THEME.font.size.body.md)}
                    fontWeight={FOUNDATION_THEME.font.weight[400]}
                    color={colors.gray[700]}
                    style={{ padding: `0 ${FAQ_INSET}px ${FOUNDATION_THEME.unit[16]}` }}
                  >
                    {answer}
                  </PrimitiveText>
                </AccordionV2Item>
              ))}
            </AccordionV2>
          </div>
        </PopoverV2>
      </ThemeProvider>
    </span>
  )
}
