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
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
  ThemeProvider,
  type ColumnDefinition,
} from '@juspay/blend-design-system'
import { ArrowLeft, History, Mail, Pencil, X } from 'lucide-react'
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
   * The name is the caller's because the two screens resolve the config's template against
   * different dates: the Email report panel against the range it asked for, a delivery against
   * the day it ran. The bytes are the same either way — this demo has one file.
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
   * What the Email report panel's own button hands `download`: the config's template resolved
   * against the range it asked for, which is what an actual delivery would be named. The end
   * of the range, not today — the file is *of* those days.
   */
  const downloadName = (target: ConfigRowFacts) => {
    const stamp = (range.endDate ?? range.startDate)
      .toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
      .replace(/\//g, '-')
    return `${fileNameFor(target).replace('{date:%d-%m-%Y}', stamp)}.csv`
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
                  /* Cancel as well as the back arrow, because the two are not the same
                     gesture: the arrow is "I have finished looking at this", the button is
                     the answer to the form's question. Both land back on the detail.

                     Email Report is SECONDARY like every other button in this sheet, so what
                     marks it as the action is its position and its disabled state, not a
                     fill. */
                  actions={
                    <>
                      <ButtonV2
                        buttonType={ButtonV2Type.SECONDARY}
                        size={ButtonV2Size.MEDIUM}
                        text="Cancel"
                        onClick={closeDownload}
                      />
                      <ButtonV2
                        buttonType={ButtonV2Type.SECONDARY}
                        size={ButtonV2Size.MEDIUM}
                        text="Email Report"
                        leftSlot={{ slot: <Mail size={16} /> }}
                        disabled={!canDownload(row, recipients)}
                        onClick={() => {
                          if (row) download(downloadName(row))
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
                  {/* The count sits here rather than on the Configuration card, because it
                      is a fact about the file: these are the columns the preview below is
                      showing. On the card it read as a property of the configuration list
                      it was heading, which it is not. */}
                  <div className="flex items-center justify-between gap-3">
                    <SectionHeading>Sample Output Preview</SectionHeading>
                    {/* TagV2 omits className (rule 2), and at its natural basis in a flex
                        row the label breaks after every word. */}
                    <span className="whitespace-nowrap">
                      <TagV2
                        text={`${fields.length} columns selected`}
                        color={TagV2Color.PRIMARY}
                        type={TagV2Type.SUBTLE}
                        size={TagV2Size.SM}
                        subType={TagV2SubType.SQUARICAL}
                      />
                    </span>
                  </div>
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

              Every one of them is SECONDARY. A primary is a recommendation, and this panel
              does not have one to make: you opened it to look something up, and History,
              Email Report and Edit are three equally reasonable things to do next. Order still
              carries the weight — Blend's own flex-end puts the trailing button where a
              dialog's confirm sits, so the two that only read data lead.

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
                <>
              <ButtonV2
                buttonType={ButtonV2Type.SECONDARY}
                size={ButtonV2Size.MEDIUM}
                text="History"
                leftSlot={{ slot: <History size={16} /> }}
                onClick={() => setHistoryFor(row?.id ?? null)}
              />
              {/* "Email Report" rather than "Download": the panel this opens asks which
                  days and who gets it, and refuses an email channel with nobody in To
                  (canDownload). Mail is the glyph the app already uses for the Email
                  delivery channel, in DELIVERY_CHANNELS and in the panel itself. */}
              <ButtonV2
                buttonType={ButtonV2Type.SECONDARY}
                size={ButtonV2Size.MEDIUM}
                text="Email Report"
                leftSlot={{ slot: <Mail size={16} /> }}
                onClick={() => setDownloadFor(row?.id ?? null)}
              />
              <ButtonV2
                buttonType={ButtonV2Type.SECONDARY}
                size={ButtonV2Size.MEDIUM}
                text="Edit"
                leftSlot={{ slot: <Pencil size={16} /> }}
                // Closing first, so the page behind is not left with a sheet over it mid-route
                // change — vaul's exit animation and a route swap racing each other is exactly
                // the intermittent failure rule 14 warns about.
                onClick={() => {
                  onClose()
                  navigate('/configurator/create')
                }}
              />
                </>
              )}
            </DrawerFooter>
            )}
          </DrawerContent>
        </DrawerPortal>
      </Drawer>

    </ThemeProvider>
  )
}
