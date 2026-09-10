import { TruncatedTextWithTooltipV2 } from '@juspay/blend-design-system'

/**
 * How much of the tail to hold back. Twelve characters is an extension plus the
 * discriminator in front of it — `_2026-09.csv`, `-v3.xlsx` — which is the part that tells
 * two exports of the same report apart, and the whole reason to truncate at this end.
 */
const DEFAULT_TAIL_CHARS = 12

/**
 * Text that loses its middle instead of its end.
 *
 * // blend-gap: Blend truncates at the end only. Every TEXT cell goes through
 * TruncatedTextWithTooltip, whose span is a plain `text-overflow: ellipsis`, so the tail is
 * always what goes. On a filename that is the wrong end to drop — the extension and
 * whatever sits in front of it are exactly what distinguishes one export from the next.
 *
 * Nothing here measures a width. The string is cut once and laid out as two flex items: the
 * head may shrink and carries the ellipsis, the tail never shrinks. The browser does the
 * truncating itself, at whatever width the column happens to be, and redoes it on resize
 * without a re-render — which matters in a table whose columns size to their content.
 *
 * The head is Blend's own `TruncatedTextWithTooltipV2` rather than a bare span, so the
 * hover behaviour stays the one the rest of the table has: it measures, so the tooltip
 * appears only when something is genuinely hidden, and `tooltipContent` lets it carry the
 * whole name while `text` holds only the part it is drawing.
 */
export function MiddleTruncate({
  text,
  tailChars = DEFAULT_TAIL_CHARS,
}: {
  text: string
  tailChars?: number
}) {
  // Below twice the tail there is no middle worth losing: the tail would be most of the
  // string, and since the tail is the part that cannot shrink, it is the head that would
  // disappear instead. Short values take Blend's ordinary end truncation — which is also
  // what every other column does, so nothing looks special that isn't.
  if (text.length <= tailChars * 2) {
    return <TruncatedTextWithTooltipV2 text={text} />
  }

  return (
    <span style={{ display: 'flex', alignItems: 'baseline', width: '100%', minWidth: 0 }}>
      <TruncatedTextWithTooltipV2
        text={text.slice(0, text.length - tailChars)}
        tooltipContent={text}
        // `width` and `maxWidth` are overrides, not additions: the component ships
        // `width: 100%`, which as a flex-basis would reserve the whole column for the head
        // and strand the tail against the right edge even when the name is short. `auto`
        // makes the basis the text's own width, so the tail sits against it and the head
        // gives ground only once there is no room left.
        style={{ width: 'auto', maxWidth: '100%', flex: '0 1 auto', minWidth: 0 }}
      />
      {/* `pre` so a split landing on a space keeps it — otherwise the two halves close up
          and the name reads as one word it never was. */}
      <span style={{ flex: '0 0 auto', whiteSpace: 'pre' }}>
        {text.slice(text.length - tailChars)}
      </span>
    </span>
  )
}
