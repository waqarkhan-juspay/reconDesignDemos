/**
 * Dials for Playground → Fee Locator (FeeLocator.tsx).
 *
 * `version` is the switch between two rails over the same stream, so they can be compared on
 * the same cards rather than described:
 *
 * `v1` — the whole tree, down to the charges themselves. Every card has a row of its own, so
 *   the lit line ends on the exact charge you are reading.
 * `v2` — the tree without its leaves. The cards already name their charge in their titles and
 *   the stream's section heads name the group, so the rail stops at the group (`UPI · 2`) and
 *   is half as tall — short enough for both roots to sit on one screen with less scrolling.
 *
 * Persisted under a stable key, the same bargain every other dial panel in the app makes
 * (../fee/fee-layout.ts).
 */

import { useDialKitController } from 'dialkit'
import { SHOW_DIALKIT } from '../../dev-tools'

export type LocatorVersion = 'v1' | 'v2'

const VERSIONS: { value: LocatorVersion; label: string }[] = [
  { value: 'v1', label: 'Version 1 — Every charge' },
  { value: 'v2', label: 'Version 2 — Groups only' },
]

/** The newest, so the change asked for is what the page opens on; v1 is a click away. */
const DEFAULT_VERSION: LocatorVersion = 'v2'

const PANEL_ID = 'fee-locator-layout'
const PERSIST_KEY = 'dialkit:fee-locator-layout'

const DIALS = {
  version: { type: 'select' as const, options: VERSIONS, default: DEFAULT_VERSION },
}

export function useLocatorDials(): { version: LocatorVersion } {
  const { values } = useDialKitController('Fee Locator', DIALS, {
    id: PANEL_ID,
    persist: { key: PERSIST_KEY },
  })
  // With the dials hidden nothing can change the stored value, so it falls back to the
  // default rather than pinning a browser to whatever it last chose.
  if (!SHOW_DIALKIT) return { version: DEFAULT_VERSION }
  const stored = values.version
  return {
    version: VERSIONS.some(({ value }) => value === stored)
      ? (stored as LocatorVersion)
      : DEFAULT_VERSION,
  }
}
