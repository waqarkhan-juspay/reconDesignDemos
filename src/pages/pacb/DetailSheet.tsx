/**
 * The side sheet a PACB table row opens — the frame only: a right-hand drawer, a ✕ and a
 * title over the row's detail. Each table supplies its own detail (ReconDetailSheet,
 * FileDetailSheet), so the module has one sheet, not one per table that happen to match.
 *
 * Built the way the Configurator's sheet is (src/pages/ConfigDetailSheet.tsx), for the same
 * reasons: V1 `Drawer` because DrawerV2 ships no styling at all, and the same
 * `.config-sheet-*` classes for the header rule and the ✕.
 */

import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  FOUNDATION_THEME,
  ThemeProvider,
} from '@juspay/blend-design-system'
import { X } from 'lucide-react'
import type { CSSProperties, ReactNode } from 'react'
import { ConfigSummaryRow } from '../../config-summary'
import { FEEDBACK_EASING, MICRO_MS } from '../../motion'
import { PrimitiveText, font } from '../../primitives'
import { detailSheetTokens } from '../../theme'
import { EMPTY } from './data'
import { money } from './helpers'

const { colors } = FOUNDATION_THEME

/**
 * The Configurator sheet's width. One column of label/value rows needs far less than a
 * three-across grid, and 600 still fits a 36-character ID beside its label.
 */
const SHEET_WIDTH = 600

/** The custom properties `.config-sheet-*` in index.css read — see ConfigDetailSheet. */
const SHEET_VARS = {
  '--sheet-radius': FOUNDATION_THEME.border.radius[8],
  '--sheet-hover': colors.gray[50],
  '--sheet-border': `1px solid ${colors.gray[200]}`,
  '--sheet-micro': `${MICRO_MS}ms`,
  '--sheet-ease': FEEDBACK_EASING,
} as CSSProperties

/** A value that is an answer, or the empty mark drawn at the muted colour. */
export const SheetRow = ({ label, value }: { label: string; value: string }) => (
  <ConfigSummaryRow label={label} value={value} muted={value === EMPTY} />
)

/** Money as the tables show it — ₹, at least two decimals. */
export const SheetMoney = ({ label, value }: { label: string; value: number }) => (
  <ConfigSummaryRow label={label} value={`₹${money(value)}`} />
)

export function DetailSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  return (
    // Scoped for the same reason as the Configurator's sheet: 24px drawer padding and an 8px
    // gap inside each KeyValuePairV2, without moving every mobile select panel Blend opens.
    <ThemeProvider componentTokens={detailSheetTokens}>
      <Drawer
        open={open}
        onOpenChange={(next) => {
          if (!next) onClose()
        }}
        direction="right"
        // A side sheet has no handle; a stray swipe across it should not dismiss it.
        disableDrag
      >
        <DrawerPortal>
          <DrawerOverlay />
          <DrawerContent
            direction="right"
            width={SHEET_WIDTH}
            maxWidth="100vw"
            showHandle={false}
            aria-label={title}
            style={SHEET_VARS}
          >
            <DrawerHeader className="config-sheet-header">
              <div className="flex items-center gap-3">
                {/* blend-gap: no glyph-only button in Blend — same ✕ as the Configurator's sheet. */}
                <DrawerClose aria-label={`Close ${title.toLowerCase()}`} className="config-sheet-close">
                  <X size={16} color={colors.gray[500]} />
                </DrawerClose>
                <DrawerTitle className="min-w-0">
                  <PrimitiveText
                    as="span"
                    {...font(FOUNDATION_THEME.font.size.heading.sm)}
                    color={colors.gray[900]}
                    fontWeight={FOUNDATION_THEME.font.weight[600]}
                  >
                    {title}
                  </PrimitiveText>
                </DrawerTitle>
              </div>
            </DrawerHeader>

            <DrawerBody direction="right">{children}</DrawerBody>
          </DrawerContent>
        </DrawerPortal>
      </Drawer>
    </ThemeProvider>
  )
}
