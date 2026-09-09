import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import { useEffect, useState, type CSSProperties } from 'react'

const { colors } = FOUNDATION_THEME

/**
 * The reconciliation explainer, ported from `reconciliation-animation-2x.html`.
 *
 * The source was a 1MB self-unpacking bundle — a manifest of base64 InterDisplay TTFs plus
 * an inlined HTML template. None of that survives the port and none of it should: the fonts
 * are the ones this app already renders in, and a megabyte of iframe to draw 440x204px of
 * illustration would cost more than the rest of the page put together. What is transcribed
 * is the markup, the choreography, and the palette.
 *
 * Colours come from FOUNDATION_THEME rather than the source's hex literals (rule 1). The
 * mapping is exact for every grey and green — the animation was drawn against Blend's own
 * ramps — and near-exact for the two it took from elsewhere: #dc2626 became red[600] and
 * #4ade80 became green[300].
 *
 * The choreography lives in index.css, because keyframes cannot be expressed as inline
 * styles. Structure stays inline: it is a transcription of one drawing, not a system.
 */

/** Every animated element's base styles ARE its settled state — see index.css. */
const MONO = "'SF Mono', ui-monospace, monospace"

/**
 * Blend types a colour token as `CSSObject['color']`, which includes `undefined`. Inline
 * styles take that as-is; an SVG `stroke` attribute wants a plain string.
 */
const stroke = (token: CSSProperties['color']) => String(token)

const SHEET_WIDTH = 190
const STAGE_WIDTH = 440
const STAGE_HEIGHT = 160

const card: CSSProperties = {
  marginTop: 6,
  backgroundColor: colors.gray[0],
  border: `1px solid ${colors.gray[200]}`,
  borderRadius: 8,
  overflow: 'hidden',
  boxShadow: '0 2px 4px rgba(14,18,27,.05)',
}

const sheetLabel: CSSProperties = {
  height: 16,
  fontSize: 11,
  fontWeight: 600,
  letterSpacing: '0.05em',
  color: colors.gray[500],
}

const colGrid: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '22px 1fr 1fr',
  alignItems: 'center',
}

const letterRow: CSSProperties = {
  ...colGrid,
  height: 20,
  backgroundColor: colors.gray[100],
  borderBottom: `1px solid ${colors.gray[200]}`,
  fontSize: 9,
  fontWeight: 600,
  color: colors.gray[500],
  textAlign: 'center',
  fontFamily: MONO,
}

const headerRow: CSSProperties = {
  ...colGrid,
  height: 26,
  borderBottom: `1px solid ${colors.gray[200]}`,
  backgroundColor: colors.gray[25],
  fontSize: 10,
  fontWeight: 600,
  color: colors.gray[600],
}

const dataRow = (last = false): CSSProperties => ({
  ...colGrid,
  position: 'relative',
  height: 30,
  borderBottom: last ? undefined : `1px solid ${colors.gray[150]}`,
  fontSize: 10,
  fontFamily: MONO,
})

const gutterCell: CSSProperties = {
  position: 'relative',
  backgroundColor: colors.gray[100],
  borderRight: `1px solid ${colors.gray[200]}`,
  height: '100%',
  textAlign: 'center',
  lineHeight: '29px',
  color: colors.gray[500],
}

const badge: CSSProperties = {
  position: 'absolute',
  left: 207,
  width: 26,
  height: 26,
  borderRadius: 9999,
  color: colors.gray[0],
  fontSize: 13,
  fontWeight: 600,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  // The ring is the stage's own background, punched around the badge so the connector
  // line reads as passing behind it rather than into it.
  boxShadow: `0 0 0 4px ${colors.gray[25]}`,
}

const pill: CSSProperties = {
  height: 30,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  backgroundColor: colors.gray[900],
  color: colors.gray[0],
  borderRadius: 8,
  padding: '0 13px',
  fontSize: 11,
  fontWeight: 600,
}

const dot = (color: CSSProperties['backgroundColor']): CSSProperties => ({
  width: 6,
  height: 6,
  borderRadius: 9999,
  backgroundColor: color,
})

/** One row of a sheet. The tint behind it is what the highlight keyframes fade in. */
function Row({
  index,
  order,
  amount,
  highlight,
  tint,
  last,
}: {
  index: number
  order: string
  amount: string
  /** Class the highlight keyframe hangs off — see index.css. */
  highlight: string
  tint: CSSProperties['backgroundColor']
  last?: boolean
}) {
  return (
    <div style={dataRow(last)}>
      <div className={highlight} style={{ position: 'absolute', inset: 0, backgroundColor: tint }} />
      <div style={gutterCell}>{index}</div>
      <div
        style={{
          position: 'relative',
          padding: '0 7px',
          color: colors.gray[600],
          borderRight: `1px solid ${colors.gray[150]}`,
        }}
      >
        {order}
      </div>
      <div
        style={{ position: 'relative', padding: '0 7px', textAlign: 'right', color: colors.gray[800] }}
      >
        {amount}
      </div>
    </div>
  )
}

function Sheet({
  label,
  align,
  className,
  valueHeader,
  thirdAmount,
}: {
  label: string
  align: 'left' | 'right'
  className: string
  valueHeader: string
  /** The two systems agree on rows 1 and 2 and disagree on row 3 — that is the whole point. */
  thirdAmount: string
}) {
  return (
    <div
      className={className}
      style={{ position: 'absolute', [align]: 0, top: 0, width: SHEET_WIDTH }}
    >
      <div style={{ ...sheetLabel, textAlign: align }}>{label}</div>
      <div style={card}>
        <div style={letterRow}>
          <div style={{ borderRight: `1px solid ${colors.gray[200]}`, height: '100%' }} />
          <div style={{ borderRight: `1px solid ${colors.gray[200]}`, height: '100%', lineHeight: '19px' }}>
            A
          </div>
          <div style={{ lineHeight: '19px' }}>B</div>
        </div>
        <div style={headerRow}>
          <div
            style={{
              backgroundColor: colors.gray[100],
              borderRight: `1px solid ${colors.gray[200]}`,
              height: '100%',
            }}
          />
          <div style={{ padding: '0 7px', borderRight: `1px solid ${colors.gray[150]}` }}>
            order_id
          </div>
          <div style={{ padding: '0 7px', textAlign: 'right' }}>{valueHeader}</div>
        </div>
        <Row index={1} order="ORD-8841" amount="12,252" highlight="recon-hl-1" tint={colors.green[50]} />
        <Row index={2} order="ORD-8842" amount="2,360" highlight="recon-hl-2" tint={colors.green[50]} />
        <Row
          index={3}
          order="ORD-8843"
          amount={thirdAmount}
          highlight="recon-hl-3"
          tint={colors.red[50]}
          last
        />
      </div>
    </div>
  )
}

export function ReconciliationAnimation({
  play,
  onPlayed,
}: {
  /** Attaches the keyframes. False renders the same drawing already settled. */
  play: boolean
  onPlayed: () => void
}) {
  /**
   * Latched at mount, not read live. Reporting back flips `play` to false on the very next
   * render, and stripping the class off an element mid-animation would kill it a frame in.
   * A genuine replay arrives as a new `key` from the parent, which is a fresh mount and so
   * a fresh latch.
   */
  const [playing] = useState(play)

  useEffect(() => {
    if (playing) onPlayed()
  }, [playing, onPlayed])

  return (
    <div
      className={`recon-anim${playing ? ' recon-anim--play' : ''}`}
      style={{ width: STAGE_WIDTH, display: 'flex', flexDirection: 'column', alignItems: 'center' }}
      aria-hidden
    >
      <div style={{ position: 'relative', width: STAGE_WIDTH, height: STAGE_HEIGHT }}>
        <Sheet
          label="SYSTEM A"
          align="left"
          className="recon-sheet-a"
          valueHeader="amount"
          thirdAmount="1,080"
        />
        <Sheet
          label="SYSTEM B"
          align="right"
          className="recon-sheet-b"
          valueHeader="settled"
          thirdAmount="980"
        />

        {/* The connectors. `strokeDasharray` is the line's own length, so animating
            dashoffset from it to 0 draws the line left to right. */}
        <svg
          width={STAGE_WIDTH}
          height={STAGE_HEIGHT}
          viewBox={`0 0 ${STAGE_WIDTH} ${STAGE_HEIGHT}`}
          fill="none"
          style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
        >
          <path
            className="recon-draw-1"
            d="M191 84 L249 84"
            stroke={stroke(colors.green[600])}
            strokeWidth="1.5"
            strokeDasharray="60"
          />
          <path
            className="recon-draw-2"
            d="M191 114 L249 114"
            stroke={stroke(colors.green[600])}
            strokeWidth="1.5"
            strokeDasharray="60"
          />
          <path
            className="recon-draw-3"
            d="M191 144 L249 144"
            stroke={stroke(colors.red[600])}
            strokeWidth="1.5"
            strokeDasharray="60"
          />
        </svg>

        <div className="recon-badge-1" style={{ ...badge, top: 71, backgroundColor: colors.green[600] }}>
          ✓
        </div>
        <div className="recon-badge-2" style={{ ...badge, top: 101, backgroundColor: colors.green[600] }}>
          ✓
        </div>
        <div
          className="recon-badge-3"
          style={{ ...badge, top: 131, backgroundColor: colors.red[600], fontSize: 12 }}
        >
          ✕
        </div>
      </div>

      <div
        className="recon-flag"
        style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 8 }}
      >
        <div style={pill}>
          <span style={dot(colors.green[300])} />
          2 of 3 records matched
        </div>
        <div style={pill}>
          <span style={dot(colors.red[400])} />
          1 of 3 records didn&rsquo;t match
        </div>
      </div>
    </div>
  )
}
