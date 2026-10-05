import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import { PrimitiveText, font } from '../../primitives'

const { colors } = FOUNDATION_THEME

/**
 * Placeholder for a PACB Recon page that has not been designed yet: the page title and
 * nothing under it. Same frame and heading as the Configurator, so the pages read as one
 * app while they are filled in.
 */
function PacbPage({ title }: { title: string }) {
  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col px-6 pt-6">
      <PrimitiveText
        as="h1"
        {...font(FOUNDATION_THEME.font.size.heading.md)}
        color={colors.gray[700]}
        fontWeight={FOUNDATION_THEME.font.weight[600]}
      >
        {title}
      </PrimitiveText>
    </div>
  )
}

export default PacbPage
