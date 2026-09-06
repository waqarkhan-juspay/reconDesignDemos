import {
  AlertV2,
  AlertV2Type,
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  CardV2,
  CardV2Variant,
  FOUNDATION_THEME,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2Type,
} from '@juspay/blend-design-system'
import { Plus } from 'lucide-react'
import { useState } from 'react'
import { PrimitiveText, font } from './primitives'

function App() {
  const [count, setCount] = useState(0)

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center p-6"
      style={{ backgroundColor: FOUNDATION_THEME.colors.gray[50] }}
    >
      <main className="flex w-full max-w-xl flex-col gap-6">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-3">
            <PrimitiveText
              as="h1"
              {...font(FOUNDATION_THEME.font.size.heading.xl)}
              color={FOUNDATION_THEME.colors.gray[950]}
              fontWeight={FOUNDATION_THEME.font.weight[600]}
            >
              Blend design system
            </PrimitiveText>
            <TagV2
              text="0.0.37"
              size={TagV2Size.SM}
              type={TagV2Type.SUBTLE}
              color={TagV2Color.NEUTRAL}
            />
          </div>
          <PrimitiveText
            as="p"
            {...font(FOUNDATION_THEME.font.size.body.lg)}
            color={FOUNDATION_THEME.colors.gray[500]}
          >
            Vite and React, rendering one tree inside Blend&rsquo;s ThemeProvider.
          </PrimitiveText>
        </div>

        <AlertV2
          type={AlertV2Type.SUCCESS}
          heading="Wired up"
          description="Tokens, primitives, motion constants and the console filter are all in place."
        />

        <CardV2
          variant={CardV2Variant.OUTLINED}
          title="Counter"
          subtitle="A ButtonV2 holding React state, to prove the tree is live."
        >
          <div className="flex flex-wrap items-center gap-4">
            <PrimitiveText
              {...font(FOUNDATION_THEME.font.size.heading.lg)}
              color={FOUNDATION_THEME.colors.gray[900]}
              fontWeight={FOUNDATION_THEME.font.weight[600]}
            >
              {count}
            </PrimitiveText>
            <ButtonV2
              buttonType={ButtonV2Type.PRIMARY}
              size={ButtonV2Size.MEDIUM}
              text="Increment"
              leftSlot={{ slot: <Plus size={16} /> }}
              onClick={() => setCount((current) => current + 1)}
            />
          </div>
        </CardV2>
      </main>
    </div>
  )
}

export default App
