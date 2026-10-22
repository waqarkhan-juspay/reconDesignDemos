/**
 * The side sheet a PACB table row opens — the frame only. Each table supplies its own detail
 * (ReconDetailSheet, FileDetailSheet), so the module has one sheet, not one per table that
 * happen to match.
 *
 * Blend's side drawer as the design system draws it: V1 `Drawer` (DrawerV2 is vaul with no
 * styling at all), floating 16px in from the window's edges with all four corners at its 16px
 * radius, on Blend's own 20px padding. The header is ModalV2's: the title at body.lg/600 in
 * gray[700], the ✕ at the far right. A title naming an ID can copy it on hover (`copy`). The
 * `.config-sheet-*` classes draw the header and footer rules and the ✕'s hover.
 */

import {
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
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
import { pacbSheetTokens } from '../../theme'
import { EMPTY } from './data'
import { money } from './helpers'
import { HoverCopy } from './kit'

const { colors } = FOUNDATION_THEME

/** Blend's drawer offset tokens, applied on every side — see DrawerContent below. */
const INSET = String(FOUNDATION_THEME.unit[16])

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
  copy,
  width = SHEET_WIDTH,
  footer,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  /** A value in the title to copy from a glyph beside it, shown on hover. */
  copy?: { value: string; label: string }
  /** px, or any CSS length — a view that needs the room (a table) widens the sheet. */
  width?: number | string
  /** Pinned under the scrolling body, behind a hairline. */
  footer?: ReactNode
  children: ReactNode
}) {
  return (
    // Scoped for the same reason as the Configurator's sheet: an 8px gap inside each
    // KeyValuePairV2, without moving every mobile select panel Blend opens.
    <ThemeProvider componentTokens={pacbSheetTokens}>
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
            width={width}
            maxWidth="100vw"
            showHandle={false}
            // Blend floats a right drawer only when one of these is set (DrawerBase:
            // `hasOffset`), and rounds all four corners only with `offSet` — at "0" it adds
            // the radius and no margin.
            mobileOffset={{ top: INSET, bottom: INSET, right: INSET }}
            offSet="0"
            aria-label={title}
            style={SHEET_VARS}
          >
            <DrawerHeader className="config-sheet-header">
              <div className="flex items-center justify-between gap-3">
                <div className="group/row flex min-w-0 items-center gap-2">
                  <DrawerTitle className="min-w-0">
                    <PrimitiveText
                      as="span"
                      {...font(FOUNDATION_THEME.font.size.body.lg)}
                      color={colors.gray[700]}
                      fontWeight={FOUNDATION_THEME.font.weight[600]}
                    >
                      {title}
                    </PrimitiveText>
                  </DrawerTitle>
                  {copy && <HoverCopy value={copy.value} label={copy.label} size={14} />}
                </div>
                {/* blend-gap: no glyph-only button in Blend — the Configurator sheet's ✕. */}
                <DrawerClose
                  aria-label={`Close ${title.toLowerCase()}`}
                  className="config-sheet-close"
                >
                  <X size={16} color={colors.gray[500]} />
                </DrawerClose>
              </div>
            </DrawerHeader>

            <DrawerBody direction="right">{children}</DrawerBody>
            {footer && (
              <DrawerFooter direction="right" className="config-sheet-footer">
                {footer}
              </DrawerFooter>
            )}
          </DrawerContent>
        </DrawerPortal>
      </Drawer>
    </ThemeProvider>
  )
}
