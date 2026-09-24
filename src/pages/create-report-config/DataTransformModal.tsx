import {
  ButtonV2Size,
  ButtonV2Type,
  FOUNDATION_THEME,
  ModalV2,
  SingleSelectV2,
  SingleSelectV2Size,
  SingleSelectV2Variant,
  ThemeProvider,
} from '@juspay/blend-design-system'
import { ArrowRightLeft } from 'lucide-react'
import { useState } from 'react'
import { PrimitiveText, font } from '../../primitives'
import {
  DATE_ORDERS,
  SOURCE_DATE_FORMAT,
  dateFormatLabel,
  isSignRuleBlank,
  isSignRuleComplete,
  newSignRule,
  normaliseTransform,
  reformatDate,
  type DataTransform,
  type DateOrder,
  type TransformKind,
  type SignRules,
} from './answers'
import type { DataTransformLayout } from './data-transform-layout'
import { SignRulesEditor } from './SignRulesEditor'

const { colors } = FOUNDATION_THEME

/** The date every preview line rewrites — one fixed example, so a change of format is the
    only thing that moves between two previews. The date is 31 December, so no two parts can be
    mistaken for each other: 31 cannot be a month, and 12 is not the day. */
const SAMPLE_DATE = '31-12-2026'

/** The preview strip's text — 14px, the same size as the hint above it. */
const PREVIEW = font(FOUNDATION_THEME.font.size.body.md)

/** The preview's glyph — 16px sits on the 20px line of 14px text. */
const PREVIEW_ICON = 16

/**
 * blend-gap: no before/after preview. A gray[50] strip with the transform's glyph, the
 * example value, "to", and what the file would carry instead — so the answer is read as a
 * value, not as a pattern.
 */
function Preview({ from, to, layout }: { from: string; to: string; layout: DataTransformLayout }) {
  return (
    <div
      className="flex items-center"
      style={{
        gap: layout.previewIconGap,
        padding: `${layout.previewPaddingY}px ${layout.previewPaddingX}px`,
        backgroundColor: colors.gray[50],
        border: `${FOUNDATION_THEME.border.width[1]} solid ${colors.gray[150]}`,
        borderRadius: FOUNDATION_THEME.border.radius[8],
      }}
    >
      {/* The Data Transform glyph from the row menu, in the space an "e.g." used to take — so the
          strip reads as what the transform does to a value. Decoration: the two values read the
          same without it, so it is hidden from assistive tech — gray[500] all the same, which
          clears the 3:1 a meaningful glyph would need on this strip (4.2:1). */}
      <ArrowRightLeft
        size={PREVIEW_ICON}
        color={colors.gray[500]}
        aria-hidden
        className="shrink-0"
      />
      {/* The values sit in a group of their own, so the icon's gap and the gap between the
          values are two dials — the icon stands a little apart from the sentence it labels. */}
      {/* Contrast on the gray[50] strip, against WCAG AA's 4.5:1 for 14px text: gray[600] is
          6.6:1. gray[500] (4.2:1) and gray[400] (2.5:1) both fail here — the strip is a shade
          darker than the white they pass or nearly pass on. The hierarchy comes from the result
          instead: gray[900] and 600 weight, with "to" at 400 so it reads as the joining word. */}
      <div className="flex items-center" style={{ gap: layout.previewItemGap }}>
        <PrimitiveText {...PREVIEW} color={colors.gray[600]}>
          {from}
        </PrimitiveText>
        <PrimitiveText
          {...PREVIEW}
          color={colors.gray[600]}
          fontWeight={FOUNDATION_THEME.font.weight[400]}
        >
          to
        </PrimitiveText>
        <PrimitiveText
          {...PREVIEW}
          color={colors.gray[900]}
          fontWeight={FOUNDATION_THEME.font.weight[600]}
        >
          {to}
        </PrimitiveText>
      </div>
    </div>
  )
}

/**
 * "Data Transform" — how one column's values are rewritten on the way into the file.
 *
 * One question, picked by the column's `kind` (`transformKindOf`): a date column is asked the
 * format its DD-MM-YYYY values are written in (every order of day, month and year, kept
 * hyphenated); an amount column is given an if / else-if chain deciding which rows are written
 * positive and which negative (SignRulesEditor). Neither is asked the other's question — a sign on a date or a format on an
 * amount means nothing. Both start at "as received", and Apply stores only what moved away
 * from it (`normaliseTransform`), so opening the modal and applying it unchanged leaves the
 * column unmarked.
 *
 * Edits are a draft until Apply: Cancel, ✕ and the backdrop all leave the column as it was.
 */
export function DataTransformModal({
  isOpen,
  columnTitle,
  kind,
  transform,
  layout,
  onClose,
  onApply,
}: {
  layout: DataTransformLayout
  isOpen: boolean
  columnTitle: string
  /** Undefined only while no column is being transformed — the modal is closed then. */
  kind: TransformKind | undefined
  transform: DataTransform | undefined
  onClose: () => void
  onApply: (transform: DataTransform | undefined) => void
}) {
  // Undefined until a format is picked, so the select shows its placeholder rather than
  // claiming DD-MM-YYYY was chosen — the hint under it already says dates arrive that way.
  const [order, setOrder] = useState<DateOrder | undefined>(undefined)
  const [signs, setSigns] = useState<SignRules>({ rules: [] })

  // Reseed the draft from the column each time the modal opens — React's adjust-state-while-
  // rendering, so the first frame already shows the column's own answers.
  const [wasOpen, setWasOpen] = useState(false)
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      setOrder(transform?.date?.order)
      // A column with no logic yet opens on one IF, already asking about Txn Type — the
      // question most amount columns want answered first.
      setSigns(
        transform?.signs && transform.signs.rules.length > 0
          ? transform.signs
          : { rules: [newSignRule()], otherwise: transform?.signs?.otherwise },
      )
    }
  }

  const format = { order: order ?? SOURCE_DATE_FORMAT.order }

  // A rule added and never touched is dropped rather than stored; one filled in part way
  // holds Apply until it is finished or deleted, so half a condition is never saved as logic.
  const keptRules = signs.rules.filter((rule) => !isSignRuleBlank(rule))
  const signsReady = keptRules.every(isSignRuleComplete)

  return (
    // Scoped to the modal: the dials' header, body and footer paddings are MODALV2 tokens.
    <ThemeProvider componentTokens={layout.tokens}>
      <ModalV2
        isOpen={isOpen}
        onClose={onClose}
        title="Data Transform"
        subtitle={`How should "${columnTitle}" be written in the report?`}
        showCloseButton
        closeOnBackdropClick
        // The rule grid is four answers across; a date is one.
        dimensions={{ width: kind === 'AMOUNT' ? 880 : 520 }}
        secondaryAction={{
          buttonType: ButtonV2Type.SECONDARY,
          size: ButtonV2Size.MEDIUM,
          text: 'Cancel',
          onClick: onClose,
        }}
        primaryAction={{
          buttonType: ButtonV2Type.PRIMARY,
          size: ButtonV2Size.MEDIUM,
          text: 'Apply',
          disabled: kind === 'AMOUNT' && !signsReady,
          onClick: () => {
            // Only the half this column is asked, so a stray answer can never ride along.
            onApply(
              normaliseTransform(
                kind === 'DATE' ? { date: format } : { signs: { ...signs, rules: keptRules } },
              ),
            )
            onClose()
          },
        }}
      >
        {kind === 'DATE' && (
          // No Section heading: the select's own label names the question, and its hint says
          // where dates start — a heading and description above would say both again.
          <div className="flex flex-col" style={{ gap: layout.controlsToPreview }}>
            {/* Every date keeps the hyphen it arrives with; only the order of day, month and
                year is a choice. */}
            <SingleSelectV2
              label="Date Format"
              triggerDimensions={{ width: '100%' }}
              hintText={`Currently the date arrives as ${dateFormatLabel(SOURCE_DATE_FORMAT)}`}
              placeholder="Select a format"
              size={SingleSelectV2Size.MD}
              variant={SingleSelectV2Variant.CONTAINER}
              items={[
                {
                  items: DATE_ORDERS.map((value) => ({
                    value,
                    label: dateFormatLabel({ order: value }),
                  })),
                },
              ]}
              selected={order ?? ''}
              onSelect={(value) => setOrder(value as DateOrder)}
            />
            <Preview from={SAMPLE_DATE} to={reformatDate(SAMPLE_DATE, format)} layout={layout} />
          </div>
        )}

        {kind === 'AMOUNT' && <SignRulesEditor value={signs} layout={layout} onChange={setSigns} />}
      </ModalV2>
    </ThemeProvider>
  )
}
