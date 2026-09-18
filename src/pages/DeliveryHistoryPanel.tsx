/**
 * The detail sheet's third screen — what the History button opens.
 *
 * A view inside the sheet rather than a dialog over it, for the same reasons the Download
 * panel is one (see DownloadReportPanel): the sheet is already a panel about one config, and
 * "what did it actually send" is a question within that. It replaced an expanding section at
 * the bottom of the detail, which had the run list waiting below a preview table nobody had
 * scrolled to.
 *
 * ## What is drawn, and what is not
 *
 * The design lays this out as a four-column table — report, generated on, channel, action.
 * At 552px of sheet the four columns leave a filename about 180px wide, so every row would
 * be an ellipsis, and the header row would be four labels over a five-row list. So the
 * columns are folded into a row apiece: the filename on its own line, and the rest of the
 * facts under it in the order the design reads them. Nothing is dropped.
 *
 * blend-gap: Blend has no list or list-row component — `DataTable` is the nearest thing and
 * it is a table, which is the shape this is deliberately not. So the row is a rule 13
 * composition of PrimitiveText on tokens, with a real ButtonV2 and TagV2 doing the two
 * things that are components.
 */

import {
  ButtonV2,
  ButtonV2Size,
  ButtonV2Type,
  FOUNDATION_THEME,
  TagV2,
  TagV2Color,
  TagV2Size,
  TagV2SubType,
  TagV2Type,
} from '@juspay/blend-design-system'
import { Download, FileSpreadsheet } from 'lucide-react'
import type { ConfigRowFacts, RunRow } from '../config-detail'
import { PrimitiveText, font } from '../primitives'

const { colors } = FOUNDATION_THEME

/** The glyph tile's side, and the icon inside it. 40/16 is the design's proportion. */
const TILE = 40
const GLYPH = 16

function DeliveryRow({
  run,
  channel,
  onDownload,
}: {
  run: RunRow
  /** The config's channel, shown per row: a delivery is a fact about where *it* went. */
  channel: string
  onDownload: () => void
}) {
  const delivered = run.status !== 'Failed'

  return (
    <li
      className="flex items-center gap-3 px-4 py-3"
      // The divider between rows, drawn on every row but the first (:first-child in
      // index.css would need a class; a border-top on all and none on the first is the same
      // line with no stylesheet involved — see the `[&:first-child]` reset below).
      style={{ borderTop: `1px solid ${colors.gray[200]}` }}
    >
      <span
        className="grid shrink-0 place-items-center"
        style={{
          width: TILE,
          height: TILE,
          borderRadius: FOUNDATION_THEME.border.radius[8],
          backgroundColor: colors.gray[50],
        }}
      >
        <FileSpreadsheet size={GLYPH} color={colors.gray[500]} />
      </span>

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        {/* The filename is the one thing here that can outrun its column, and breaking it
            mid-word would make a generated name unreadable — so it truncates, with the whole
            of it on the element's title for anyone who needs the rest. */}
        <div className="min-w-0 truncate" title={run.fileName}>
          <PrimitiveText
            as="span"
            {...font(FOUNDATION_THEME.font.size.body.md)}
            color={colors.gray[700]}
          >
            {run.fileName}
          </PrimitiveText>
        </div>
        <PrimitiveText
          as="p"
          {...font(FOUNDATION_THEME.font.size.body.sm)}
          color={colors.gray[500]}
        >
          {`${run.generatedOn} · ${run.at} · ${channel}`}
        </PrimitiveText>
      </div>

      {/* A failed run has no file, so the slot that would hold its Download says why there
          is nothing to press instead of offering a button that cannot do anything. */}
      {delivered ? (
        <ButtonV2
          buttonType={ButtonV2Type.SECONDARY}
          size={ButtonV2Size.SMALL}
          text="Download"
          leftSlot={{ slot: <Download size={GLYPH} /> }}
          onClick={onDownload}
        />
      ) : (
        <TagV2
          text="Failed"
          color={TagV2Color.ERROR}
          type={TagV2Type.SUBTLE}
          size={TagV2Size.SM}
          subType={TagV2SubType.SQUARICAL}
        />
      )}
    </li>
  )
}

export function DeliveryHistoryPanel({
  row,
  runs,
  onDownload,
}: {
  row: ConfigRowFacts | null
  runs: RunRow[]
  onDownload: (run: RunRow) => void
}) {
  return (
    <div className="flex flex-col gap-4">
      {/* The design's subtitle: which config these belong to, and how far back they go. It
          sits here rather than in the sheet header, which holds one line and is holding the
          screen's name. */}
      <PrimitiveText
        as="p"
        {...font(FOUNDATION_THEME.font.size.body.md)}
        color={colors.gray[500]}
      >
        {`${row?.configurationName ?? ''} · Last ${runs.length} deliveries`}
      </PrimitiveText>

      <ul
        className="flex w-full min-w-0 flex-col overflow-hidden border [&>li:first-child]:border-t-0"
        style={{
          borderRadius: FOUNDATION_THEME.border.radius[8],
          borderColor: colors.gray[200],
          backgroundColor: colors.gray[0],
        }}
      >
        {runs.map((run) => (
          <DeliveryRow
            key={run.id}
            run={run}
            channel={row?.channel ?? ''}
            onDownload={() => onDownload(run)}
          />
        ))}
      </ul>
    </div>
  )
}
