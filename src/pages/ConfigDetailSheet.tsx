/**
 * The report config detail sheet — what opens when you click a row in the Configurator.
 *
 * A right-hand side sheet rather than a modal, deliberately: this is a *reference* view. You
 * open it to check what a config does, and the table you were reading stays visible beside
 * it, which is the whole reason not to use a dialog that covers the page.
 *
 * ## Two things worth knowing before editing this
 *
 * **1. This is Blend's V1 `Drawer`, and that is on purpose.** `DrawerV2` exists and rule 4
 * says V2 first — but DrawerV2 (DrawerV2.tsx) is a pass-through to vaul with *no styling at
 * all*: no overlay colour, no radius, no padding, no tokens, not one. Using it would mean
 * hand-drawing the entire panel from Block + tokens, which is a rule 13 escape hatch for a
 * component Blend already ships finished. V1 `Drawer` is tokenised (drawer.tokens.ts) and
 * takes `direction="right"` as a real side sheet. The cost is one line in the console —
 * `[Blend] Drawer is a v1 component` — which is the honest trade and is noted in the
 * baseline. Revisit the day DrawerV2 ships tokens.
 *
 * **2. The key/value rows are `KeyValuePairV2`, not hand-built.** Blend has a component for
 * exactly this (keyValuePairV2.light.tokens.ts: key gray[500]/400, value gray[700]/500), so
 * the sheet's whole job is choosing between its two layouts per row — see `Field` below.
 */

import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  DataTable,
  Drawer,
  DrawerBody,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerOverlay,
  DrawerPortal,
  DrawerTitle,
  ColumnType,
  FOUNDATION_THEME,
  SnackbarV2Variant,
  addSnackbarV2,
  ThemeProvider,
  type ColumnDefinition,
} from '@juspay/blend-design-system'
import { ArrowLeft, X } from 'lucide-react'
import { useMemo, useState, type CSSProperties } from 'react'
import { useNavigate } from 'react-router'
import { FEEDBACK_EASING, MICRO_MS } from '../motion'
import {
  detailRowsFor,
  fieldsFor,
  fileNameFor,
  filtersFor,
  runsFor,
  sampleRowsFor,
  type ConfigRowFacts,
  type RunRow,
} from '../config-detail'
import {
  ConfigSummaryCard,
  ConfigSummaryChipRow,
  ConfigSummaryRow,
  summaryChip,
} from '../config-summary'
import { DeliveryHistoryPanel } from './DeliveryHistoryPanel'
import {
  DownloadReportPanel,
  canDownload,
  defaultRange,
  deliveryNotice,
  NO_RECIPIENTS,
} from './DownloadReportPanel'
import { detailSheetTokens } from '../theme'
import { PrimitiveText, font } from '../primitives'

const { colors } = FOUNDATION_THEME

/**
 * 600, not Blend's 400 default.
 *
 * The widest thing in here is a key/value row, and at 400 the value column lands at ~180px —
 * narrow enough that "Monthly · 19th · 17:15 IST" wraps to three lines and the sheet becomes
 * a column of ragged fragments. 600 leaves the value column ~368px after the key's 168, which
 * puts every scalar on one line and drops the metrics list from three wrapped lines to two.
 *
 * The ceiling is the preview: past roughly this width the sheet starts covering the table's
 * own values on a laptop, and the table staying readable beside it is the reason this is a
 * sheet and not a modal.
 */
const SHEET_WIDTH = 600

/**
 * Everything index.css needs and cannot reach for itself — the key column's width, and the
 * close button's radius, hover fill and timing.
 *
 * Handed in as custom properties rather than written into the stylesheet, so every value
 * stays on FOUNDATION_THEME and src/motion.ts (rules 1 and 14) and the stylesheet keeps no
 * second copy of a token.
 *
 * The header's and the footer's hairlines are the only two lines this sheet draws, and they
 * are the same line for the same reason: the body scrolls *under* both, so a gap cannot say
 * where the chrome ends and the content begins — it moves with the content. Everywhere
 * inside the body, space does the grouping — which is also why the Email report screen, whose
 * buttons scroll with its cards, draws only the header's.
 */
const SHEET_VARS = {
  // Already px-suffixed strings in the foundation (border.tokens.ts), unlike the type scale.
  '--sheet-radius': FOUNDATION_THEME.border.radius[8],
  '--sheet-hover': colors.gray[50],
  '--sheet-border': `1px solid ${colors.gray[200]}`,
  '--sheet-micro': `${MICRO_MS}ms`,
  '--sheet-ease': FEEDBACK_EASING,
} as CSSProperties

/**
 * A section heading — "Configuration Details", "Sample Output Preview".
 *
 * blend-gap: Blend has no section-heading component, so this is a rule 13 composition of
 * PrimitiveText on a token. body.lg at 600, which is the weight rule 10 gives every heading;
 * the `fontWeight` prop sits *after* the `font()` spread, which is what lets it win.
 */
function SectionHeading({ children }: { children: string }) {
  return (
    <PrimitiveText
      as="h3"
      {...font(FOUNDATION_THEME.font.size.body.lg)}
      color={colors.gray[700]}
      fontWeight={FOUNDATION_THEME.font.weight[600]}
    >
      {children}
    </PrimitiveText>
  )
}

export function ConfigDetailSheet({
  row,
  onClose,
}: {
  /** The row whose detail is showing, or null when the sheet is closed. */
  row: ConfigRowFacts | null
  onClose: () => void
}) {
  /**
   * Held across renders so the sheet does not recompute its whole contents on every parent
   * render — and keyed on the row's identity, which is the only thing that changes it.
   *
   * `row` is null while closed, and the hooks still have to run, so each memo guards rather
   * than the component returning early.
   */
  const detailRows = useMemo(() => (row ? detailRowsFor(row) : []), [row])
  const fields = useMemo(() => (row ? fieldsFor(row) : []), [row])
  const sampleRows = useMemo(() => (row ? sampleRowsFor(row) : []), [row])
  const runs = useMemo(() => (row ? runsFor(row) : []), [row])

  /**
   * The list-valued facts, read from their own derivations.
   *
   * `detailRowsFor` deliberately does not carry these — they are sets, and the card draws
   * them as chips rather than as one joined string. See config-detail.ts for why.
   */
  const filterRule = row ? filtersFor(row) : ''
  const template = row ? fileNameFor(row) : ''

  const navigate = useNavigate()

  /**
   * Which config's delivery history is open, rather than a plain boolean.
   *
   * Storing the id means "is the history showing" is *derived* from the row on screen, so
   * opening a second config drops you back on its detail without anything having to reset it
   * — no effect, no cascading render, and no frame where the panel shows one config's name
   * over another config's deliveries.
   */
  const [historyFor, setHistoryFor] = useState<string | null>(null)
  const showHistory = row !== null && historyFor === row.id

  /**
   * Download the preview as a CSV, named by the config's own File Name Template.
   *
   * Real rather than a stub: the sheet already holds the fields, the rows and the template,
   * so the file it hands you is the one the rest of the panel describes — which is also the
   * only way the "File Name Template" row above can be checked.
   */
  /**
   * Which of the sheet's two screens is showing, and the answers the second one collects.
   *
   * The screen is stored as the open row's id rather than a boolean, for the same reason
   * `historyFor` is: opening a different config drops you back on its detail rather than
   * leaving you on an Email report panel that has quietly changed which report it is about.
   */
  const [downloadFor, setDownloadFor] = useState<string | null>(null)
  const downloading = row !== null && downloadFor === row.id
  const [range, setRange] = useState(defaultRange)
  const [recipients, setRecipients] = useState(NO_RECIPIENTS)

  /**
   * Whether the Email report screen has been answered well enough to act on — an email
   * channel with nobody in To cannot be sent, and any other channel has nothing to ask for.
   *
   * Named once here rather than called twice in the JSX below, because it now decides two
   * things about the same button: whether it is enabled, and whether it is the primary.
   */
  const submittable = canDownload(row, recipients)

  /** Back to the detail, discarding the request — it was a one-off, not a saved setting. */
  const closeDownload = () => {
    setDownloadFor(null)
    setRange(defaultRange())
    setRecipients(NO_RECIPIENTS)
  }

  /**
   * The corner control's job whenever a second screen is showing. Both are cleared rather
   * than whichever one is open, so there is no ordering to get wrong the day a third screen
   * is added — leaving a screen means leaving all of them.
   */
  const goBack = () => {
    closeDownload()
    setHistoryFor(null)
  }

  /**
   * Hand over a CSV of the preview rows, under whichever name the caller is promising.
   *
   * One caller now: the Deliveries screen, where each row is a file that has already been
   * sent and the name it went out under is a fact rather than a guess. The Email report
   * screen used to call this too, and does not any more — Submit requests a delivery, so
   * there is nothing for it to hand over yet.
   *
   * The name stays the caller's rather than being derived here, because a delivery is named
   * for the day it ran and only the row knows that.
   */
  const download = (fileName: string) => {
    if (!row) return
    // Quote every cell and double any quote inside it — the RFC 4180 rule. Field names here
    // have no commas today, but a field added later that does would otherwise shift a column.
    const escape = (cell: string) => `"${cell.replace(/"/g, '""')}"`
    const csv = [fields, ...sampleRows.map((sample) => fields.map((f) => String(sample[f])))]
      .map((cells) => cells.map(escape).join(','))
      .join('\r\n')

    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    URL.revokeObjectURL(url)
  }

  /**
   * The preview table's columns — one per field, in the config's own column order, so the
   * preview is a picture of the file rather than a generic table.
   *
   * `field` is the field *name* because that is also the key `sampleRowsFor` writes, so no
   * mapping table has to be kept between the two.
   */
  const sampleColumns = useMemo<ColumnDefinition<Record<string, unknown>>[]>(
    () =>
      fields.map((name) => ({
        field: name,
        header: name,
        type: ColumnType.TEXT,
        // Nothing in a preview is sortable: it is three illustrative rows, and offering to
        // sort them implies they are the data.
        isSortable: false,
        minWidth: '0px',
        maxWidth: 'none',
      })),
    [fields],
  )

  return (
    /*
     * The sheet's own spacing, scoped to it.
     *
     * `detailSheetTokens` moves two Blend values — the drawer's 20px content padding to 24,
     * and KeyValuePairV2's 4px vertical gap to 8 — and nothing else. A nested ThemeProvider
     * rather than the app-wide one because DRAWER is also every mobile select panel Blend
     * opens (SingleSelectDrawer and friends), which want the bottom-sheet inset they were
     * drawn with. useResponsiveTokens reads ThemeContext, and context crosses a portal, so
     * this reaches DrawerContent inside DrawerPortal.
     */
    <ThemeProvider componentTokens={detailSheetTokens}>
      <Drawer
        open={row !== null}
        // vaul reports both directions; only the close needs handling, since nothing but this
        // component opens it.
        //
        // `goBack` as well as `onClose`, so the sheet is put away on its first screen: the
        // second screens are where you went during one visit, not a setting, and reopening
        // the same row onto its Deliveries list would answer a question nobody had asked
        // yet. The row is already null by the time the exit animation runs, so the swap is
        // not something you can see.
        onOpenChange={(open) => {
          if (!open) {
            onClose()
            goBack()
          }
        }}
        direction="right"
        // A side sheet is not draggable — it has no handle and no snap points, and leaving drag
        // on means a stray swipe across the content dismisses a panel the user was reading.
        disableDrag
      >
        <DrawerPortal>
          <DrawerOverlay />
          <DrawerContent
            direction="right"
            width={SHEET_WIDTH}
            maxWidth={SHEET_WIDTH}
            showHandle={false}
            aria-label={row ? `${row.configurationName} configuration details` : undefined}
            // DrawerContent is one of the few Blend components that does take `style` — it
            // passes it straight through (DrawerBase.tsx:506) — which is what lets the tokens
            // above reach the stylesheet from the sheet's own root.
            style={SHEET_VARS}
          >
            {/* Blend's DrawerHeader draws the padding and the background; the row inside it is
              ours, because the design puts the close button on the header's right and Blend
              offers no slot for one.

              The class carries only the bottom rule — Blend's header tokens have no border
              slot, the same gap DrawerFooter has, and `className` is the opening both of them
              leave. Colour comes from --sheet-border, so the two hairlines cannot drift. */}
            <DrawerHeader className="config-sheet-header">
              {/* The ✕ leads, and the title follows it on the same line.

                On the left because this sheet slides in from the right: the control that
                sends it back is then on the side it came from, and it is also the first thing
                in reading order — which is the same place Tab reaches first, so pointer and
                keyboard agree without a tabIndex. `items-center`, not `items-start`, because
                the header is now one line of text rather than a stacked block. */}
              <div className="flex items-center gap-3">
                {/* blend-gap: Blend has no icon-button component whose only content is a glyph
                  — ButtonV2 always lays out a text label — so the ✕ is a DrawerClose with the
                  same 16px glyph ModalV2 uses, on a token hover surface. DrawerClose is the
                  button; `asChild` is not used, so this is one element, not two. */}
                {/* On a second screen the same slot holds a back arrow instead: the control
                    in the corner should undo the last thing you did, and on the Email report or
                    Deliveries screen that is arriving here, not opening the sheet. A plain
                    button, not a DrawerClose — this one does not dismiss the drawer. */}
                {downloading || showHistory ? (
                  <button
                    type="button"
                    aria-label="Back to configuration details"
                    className="config-sheet-close"
                    onClick={goBack}
                  >
                    <ArrowLeft size={16} color={colors.gray[500]} />
                  </button>
                ) : (
                  <DrawerClose
                    aria-label="Close configuration details"
                    className="config-sheet-close"
                  >
                    <X size={16} color={colors.gray[500]} />
                  </DrawerClose>
                )}

                {/* DrawerTitle renders vaul's <h2> and styles only `font-weight: 600`,
                  inheriting its size from the drawer — so the type token is applied to a
                  span inside it rather than left to chance. `min-w-0` so a long
                  configuration name shortens rather than pushing the ✕ off the edge. */}
                <DrawerTitle className="min-w-0">
                  <PrimitiveText
                    as="span"
                    {...font(FOUNDATION_THEME.font.size.heading.sm)}
                    color={colors.gray[900]}
                    fontWeight={FOUNDATION_THEME.font.weight[600]}
                  >
                    {downloading
                      ? 'Email report'
                      : showHistory
                        ? 'Report deliveries'
                        : (row?.configurationName ?? '')}
                  </PrimitiveText>
                </DrawerTitle>
              </div>
            </DrawerHeader>

            {/* `direction` is what gives the body the drawer's own bottom radius on the correct
              corner (getDrawerBorderRadius) — without it a right-hand sheet rounds the
              bottom-left, which is the corner against the page. `hasFooter` drops that radius
              again whenever the footer is the element sitting on it — every screen but the
              Email report one, where the body runs to the bottom of the sheet and wants the
              corner back. */}
            <DrawerBody direction="right" hasFooter={!downloading}>
              {downloading ? (
                <DownloadReportPanel
                  row={row}
                  range={range}
                  onRangeChange={setRange}
                  recipients={recipients}
                  onRecipientsChange={setRecipients}
                  /* Both at the trailing edge, Cancel then Submit — the order a dialog puts
                     them in, with the confirming button last where the eye finishes.

                     Cancel as well as the back arrow, because the two are not the same
                     gesture: the arrow is "I have finished looking at this", the button is
                     the answer to the form's question. Both land back on the detail.

                     Submit earns its fill rather than being handed one. Until the form is
                     answerable it is a disabled SECONDARY — present, so you can see what
                     completing the form gets you, but making no claim. The moment
                     `canDownload` turns true it becomes the PRIMARY, and the colour arriving
                     *is* the message that the form is now complete. A fill that had been
                     there all along could not say that.

                     No icon: the envelope named the channel back when the label did too, and
                     the channel's own mark is already on the card above this row. Beside
                     "Submit" it would be decorating a word it does not explain. */
                  actions={
                    <>
                      <ButtonV2
                        buttonType={ButtonV2Type.SECONDARY}
                        size={ButtonV2Size.MEDIUM}
                        text="Cancel"
                        onClick={closeDownload}
                      />
                      <ButtonV2
                        buttonType={
                          submittable ? ButtonV2Type.PRIMARY : ButtonV2Type.SECONDARY
                        }
                        size={ButtonV2Size.MEDIUM}
                        text="Submit"
                        disabled={!submittable}
                        onClick={() => {
                          /* Nothing is handed over here. Submit *requests* a report — the
                             notice below is the whole of what happens now, and the file
                             arrives by the channel the config names, minutes later. Handing
                             the browser a CSV on the same click said the opposite of the
                             sentence next to it.

                             The panel closes on this click too, so the notice is the only
                             thing left saying the request was taken — it outlives the screen
                             that raised it, which is the whole reason it is a snackbar and
                             not a line in the panel. SUCCESS because the request landed;
                             what it promises has not happened yet, and the copy says so.

                             6s rather than Blend's default 4: two sentences, one of which is
                             a number the reader is meant to keep. */
                          addSnackbarV2({
                            ...deliveryNotice(row, recipients),
                            variant: SnackbarV2Variant.SUCCESS,
                            duration: 6000,
                          })
                          closeDownload()
                        }}
                      />
                    </>
                  }
                />
              ) : showHistory ? (
                <DeliveryHistoryPanel
                  row={row}
                  runs={runs}
                  // Each delivery hands over its own filename, so what arrives is the file
                  // named in the row you pressed rather than one stamped today.
                  onDownload={(run: RunRow) => download(run.fileName)}
                />
              ) : (
              /* 32px between sections, which is 2x the 16px each heading keeps from its own
                content — the ratio that lets space alone say where a section ends, with no
                rule to draw (better-layout: group with space, not lines). */
              <div className="config-sheet-body flex flex-col gap-8">
                {/* The same card the create flow's Review step draws, from the same
                    component — so one config reads back identically whether you are about to
                    submit it or looking it up months later. It brings its own heading, which
                    is why this section has none of its own.

                    A narrower label column than the Review step's 240px: that card has a page
                    to spread across, this one has 552px inside a 600px panel, and 168 is what
                    the longest key here needs. */}
                <ConfigSummaryCard title="Configuration" keyColumn="168px">
                  {detailRows.map((detail) => (
                    <ConfigSummaryRow key={detail.key} label={detail.key} value={detail.value} />
                  ))}

                  {/* The list-valued rows become chips rather than one comma-joined sentence.
                      A sentence of column names cannot be counted and gives no edge between
                      one name and the next; chips do both.

                      There is no separate "Metrics" row any more: it listed the same field
                      names as Columns, unnumbered, so the sheet asked you to read one list
                      twice and work out that it was one list. */}
                  <ConfigSummaryChipRow label="Filters" empty={filterRule ? undefined : 'None'}>
                    {filterRule ? summaryChip(filterRule) : null}
                  </ConfigSummaryChipRow>

                  <ConfigSummaryChipRow label={`Columns · ${fields.length}`}>
                    {fields.map((name, index) => summaryChip(`${index + 1} · ${name}`, name))}
                  </ConfigSummaryChipRow>

                  <ConfigSummaryRow label="File name template" value={template} />
                </ConfigSummaryCard>

                <section className="flex flex-col gap-4">
                  {/* No column count beside the heading: the Configuration card's
                      "Columns · N" row already says it, one scroll up. */}
                  <SectionHeading>Sample Output Preview</SectionHeading>
                  {/* Three rows and no chrome: the footer, toolbar and column manager all
                    describe a set you can act on, and this is an illustration. */}
                  <div className="config-sheet-preview">
                    <DataTable
                      data={sampleRows}
                      columns={sampleColumns}
                      idField="id"
                      showHeader={false}
                      showToolbar={false}
                      showFooter={false}
                      enableColumnManager={false}
                      enableColumnReordering={false}
                      enableFiltering={false}
                    />
                  </div>
                </section>

              </div>
              )}
            </DrawerBody>

            {/* On the detail and Deliveries screens the actions live in a footer rather than
              beside the title, for two reasons. Blend's DrawerFooter is chrome: it sits
              outside the scrolling body, so the three controls stay reachable however far
              down the preview you have read — which is better-layout's rule about never
              parking an action past a scroll edge. And a labelled button says what it does,
              where three icons at the top of a reference panel would have to be guessed at
              or hovered.

              The row has one weight per job. Download Report is the only one that produces
              something you keep, so it is the PRIMARY; History and Edit both leave you inside
              the app looking at more of it, so they stay SECONDARY. Three outlined buttons
              asked you to choose between three equal things, which was never true of them.

              The Email report screen has no footer at all. Its two buttons are the end of a
              form rather than chrome over a reference panel, so they scroll with the
              questions they answer — see DownloadReportPanel's `actions`. A footer kept for
              symmetry would still draw its hairline under a screen with nothing left to put
              above it. */}
            {!downloading && (
            <DrawerFooter direction="right" className="config-sheet-footer">
              {showHistory ? (
                /* One button, and it is the back arrow's twin — the same reason Cancel sits
                   under the cards on the Email report screen. Nothing here is a decision, so
                   there is nothing else for a footer to offer; an empty footer would still
                   draw its hairline and read as a row of controls that failed to render. */
                <ButtonV2
                  buttonType={ButtonV2Type.SECONDARY}
                  size={ButtonV2Size.MEDIUM}
                  text="Back to details"
                  leftSlot={{ slot: <ArrowLeft size={16} /> }}
                  onClick={goBack}
                />
              ) : (
                /* A row of my own, full width, so the footer's own flex-end has a single
                   child to align and stops deciding the distribution. DrawerFooter sets
                   justifyContent="flex-end" *before* it spreads props (DrawerBase.tsx:709)
                   and DrawerFooterProps has no slot to override it, so the alternative was a
                   CSS rule outspecifying a styled-components class that wins on source order
                   (rule 12) — a wrapper I own is the cheaper answer. gap-3 is the same 12px
                   Blend was already putting between the buttons. */
                /* blend-gap: ButtonV2 sets `cursor: default` on every enabled button
                   (ButtonV2/utils.ts:269) with no prop or token that reaches it, so the
                   pointer is set from this wrapper — the same escape hatch the create flow's
                   footer uses. */
                <div className="flex w-full items-center justify-between [&_button]:cursor-pointer">
                  {/* It still opens the Email report screen, which asks for a date range and
                      who receives it. The label on the way in changed; the screen behind it
                      did not. */}
                  <ButtonV2
                    buttonType={ButtonV2Type.PRIMARY}
                    size={ButtonV2Size.MEDIUM}
                    text="Download Report"
                    onClick={() => setDownloadFor(row?.id ?? null)}
                  />
                  {/* Outlined secondaries, and 12px apart — Blend's own DrawerFooter gap,
                      kept now that the row draws its own.

                      No icons, though: a glyph is worth its width when it labels the only
                      thing in reach, and beside the primary's fill these two were spending it
                      competing for the eye. The words already say it. */}
                  <div className="flex items-center gap-3">
                    <ButtonV2
                      buttonType={ButtonV2Type.SECONDARY}
                      size={ButtonV2Size.MEDIUM}
                      text="History"
                      onClick={() => setHistoryFor(row?.id ?? null)}
                    />
                    <ButtonV2
                      buttonType={ButtonV2Type.SECONDARY}
                      size={ButtonV2Size.MEDIUM}
                      text="Edit"
                      // Closing first, so the page behind is not left with a sheet over it
                      // mid-route change — vaul's exit animation and a route swap racing each
                      // other is exactly the intermittent failure rule 14 warns about.
                      onClick={() => {
                        onClose()
                        navigate('/configurator/create')
                      }}
                    />
                  </div>
                </div>
              )}
            </DrawerFooter>
            )}
          </DrawerContent>
        </DrawerPortal>
      </Drawer>

    </ThemeProvider>
  )
}
