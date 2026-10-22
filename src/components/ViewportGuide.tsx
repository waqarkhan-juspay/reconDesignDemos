import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import { useEffect, useState } from 'react'

const { colors } = FOUNDATION_THEME

/** A 15" MacBook's width. */
const TARGET = 1512
const WIDER = `(min-width: ${TARGET + 1}px)`

/**
 * A dev-only guide for sizing the browser by hand to a target width (1512px — a 15"
 * MacBook): a dashed line at the target's right edge whenever the window is wider, so there
 * is a mark to drag the window edge onto. (The width readout that sat beside it was removed
 * on 2026-10-07.)
 *
 * Inert to the pointer, so it never takes a click meant for the page. Toggled by
 * SHOW_VIEWPORT_GUIDE in src/dev-tools.ts.
 */
function ViewportGuide() {
  // Only crossing the target matters, so a media query's `change` — not every resize event.
  const [wider, setWider] = useState(() => window.matchMedia(WIDER).matches)

  useEffect(() => {
    const query = window.matchMedia(WIDER)
    const update = () => setWider(query.matches)
    query.addEventListener('change', update)
    return () => query.removeEventListener('change', update)
  }, [])

  if (!wider) return null
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-y-0 z-[2147483000]"
      style={{ left: TARGET - 1, borderLeft: `1px dashed ${colors.orange[500]}` }}
    />
  )
}

export default ViewportGuide
