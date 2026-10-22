import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2SubType,
  ButtonV2Type,
  FOUNDATION_THEME,
  ThemeProvider,
} from '@juspay/blend-design-system'
import { Maximize2, Minimize2 } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { font, PrimitiveText } from '../../primitives'
import { ghostIconTokens } from '../../theme'

const { colors } = FOUNDATION_THEME

/**
 * One Playground story: a name, what state it shows, and the component on a canvas at the
 * width the design draws it.
 *
 * `fullscreen` adds a toggle at the canvas's top right that lays the canvas over the whole
 * window, the component still at its design width, centred. Esc or the toggle brings it
 * back. A fixed overlay rather than the Fullscreen API, which embedded
 * browsers (the desktop app's preview pane among them) refuse without saying so.
 *
 * blend-gap: Blend has no story/specimen frame; this is a Tailwind box on the card tokens.
 */
export function StoryFrame({
  name,
  note,
  width,
  fullscreen = false,
  surface = colors.gray[25],
  children,
}: {
  name: string
  note: string
  /** The component's width in the design, in px. */
  width: number
  /** Offer the full-screen toggle. */
  fullscreen?: boolean
  /** The canvas fill — white for a component that draws its hover as a grey fill. */
  surface?: string
  children: ReactNode
}) {
  const [isFull, setIsFull] = useState(false)
  useEffect(() => {
    if (!isFull) return
    const close = (event: KeyboardEvent) => event.key === 'Escape' && setIsFull(false)
    document.addEventListener('keydown', close)
    return () => document.removeEventListener('keydown', close)
  }, [isFull])

  return (
    <section aria-label={name} className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <PrimitiveText
          as="h3"
          {...font(FOUNDATION_THEME.font.size.body.md)}
          color={colors.gray[800]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          {name}
        </PrimitiveText>
        <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[500]}>
          {note}
        </PrimitiveText>
      </div>
      <div
        // Full screen it covers the window — above the sidebar and topbar — scrolls on its
        // own, and centres the cards down the screen as well.
        className={`flex justify-center p-6 ${isFull ? 'fixed inset-0 z-50 items-center overflow-y-auto' : 'relative'}`}
        style={{
          background: surface,
          border: isFull ? 'none' : `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[150]}`,
          borderRadius: isFull ? 0 : FOUNDATION_THEME.border.radius[12],
        }}
      >
        {fullscreen && (
          // Full screen, clear of DialKit's button, which takes the window's top-right corner.
          <div className={`absolute z-20 ${isFull ? 'top-4 right-20' : 'top-2 right-2'}`}>
            <ThemeProvider componentTokens={ghostIconTokens}>
              <ButtonV2
                buttonType={ButtonV2Type.SECONDARY}
                subType={ButtonV2SubType.INLINE}
                size={ButtonV2Size.SMALL}
                leftSlot={{
                  slot: isFull ? <Minimize2 size={14} /> : <Maximize2 size={14} />,
                  maxHeight: 14,
                }}
                aria-label={isFull ? 'Exit full screen' : `Show ${name} full screen`}
                onClick={() => setIsFull((full) => !full)}
              />
            </ThemeProvider>
          </div>
        )}
        <div style={{ width, maxWidth: '100%' }}>{children}</div>
      </div>
    </section>
  )
}
