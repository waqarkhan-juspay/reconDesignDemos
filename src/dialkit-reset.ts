/**
 * A reset button beside every DialKit slider, putting that one slider back to its default.
 *
 * DialKit 2.0.0 draws its own panel and gives a control no slot, so this works on its markup:
 * it watches for `.dialkit-slider-wrapper` rows and adds a button to each. The panel's own
 * reset button (the section toolbar's) resets the whole panel; this is the one-slider version.
 *
 * Resolving a row to its control, from DialKit's markup alone:
 * - the panel is the nearest `.dialkit-folder` whose title is a registered panel's name
 *   (folders nested inside a panel are passed over on the way up);
 * - the control is that panel's slider whose label is the row's `aria-label`.
 *
 * The defaults are read from DialStore's `defaultValues` — private in its types, but the same
 * map its own `resetValues` reads (index.js:470). Nothing public exposes a single default.
 * If a DialKit upgrade renames it, `defaultOf` finds nothing and no button is drawn, so the
 * failure is a missing button rather than a wrong reset. Re-check on upgrade.
 *
 * Styling is in index.css, on DialKit's own variables so it follows the panel's theme.
 */

import { DialStore, type ControlMeta, type DialValue } from 'dialkit'

const ROW = '.dialkit-slider-wrapper'

/** lucide's rotate-ccw, inline: this is DOM, not React, so lucide-react cannot draw it. */
const ICON =
  '<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" ' +
  'stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
  '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>'

type Target = { panelId: string; path: string; label: string }

/**
 * Each panel's buttons, so a value change refreshes only the panel it happened in. Buttons
 * whose row DialKit has unmounted are dropped on the next refresh.
 */
const buttonsByPanel = new Map<string, Map<HTMLButtonElement, Target>>()

/** Rows that matched no slider — not retried on every mutation. */
const unresolved = new WeakSet<Element>()

function defaultOf({ panelId, path }: Target): DialValue | undefined {
  const defaults = (DialStore as unknown as { defaultValues?: Map<string, Record<string, DialValue>> })
    .defaultValues
  return defaults instanceof Map ? defaults.get(panelId)?.[path] : undefined
}

function findSlider(controls: ControlMeta[], label: string): ControlMeta | undefined {
  for (const control of controls) {
    if (control.type === 'slider' && control.label === label) return control
    const nested = control.children && findSlider(control.children, label)
    if (nested) return nested
  }
  return undefined
}

function resolve(row: Element): Target | null {
  const label = row.querySelector('[role="slider"]')?.getAttribute('aria-label')
  if (!label) return null
  const panels = DialStore.getPanels()
  for (let folder = row.closest('.dialkit-folder'); folder; ) {
    const title = folder.querySelector(':scope > .dialkit-folder-header .dialkit-folder-title')
    const panel = panels.find((p) => p.name === title?.textContent)
    if (panel) {
      const control = findSlider(panel.controls, label)
      return control ? { panelId: panel.id, path: control.path, label } : null
    }
    folder = folder.parentElement?.closest('.dialkit-folder') ?? null
  }
  return null
}

/** Muted and inert while each slider is already at its default. */
function refreshPanel(panelId: string) {
  const buttons = buttonsByPanel.get(panelId)
  buttons?.forEach((target, button) => {
    if (!button.isConnected) buttons.delete(button)
    else button.disabled = DialStore.getValue(panelId, target.path) === defaultOf(target)
  })
}

function attach(row: Element) {
  // By the button: a row that lost its button is given another.
  if (unresolved.has(row) || row.querySelector(':scope > .dialkit-slider-reset')) return
  const target = resolve(row)
  const fallback = target ? defaultOf(target) : undefined
  if (!target || fallback === undefined) {
    unresolved.add(row)
    return
  }

  const button = document.createElement('button')
  button.type = 'button'
  button.className = 'dialkit-slider-reset'
  button.innerHTML = ICON
  button.title = `Reset to ${String(fallback)}`
  button.setAttribute('aria-label', `Reset ${target.label} to default`)
  // Kept off the slider and the panel: either would read a press here as the start of a drag.
  button.addEventListener('pointerdown', (event) => event.stopPropagation())
  button.addEventListener('click', (event) => {
    event.stopPropagation()
    DialStore.updateValue(target.panelId, target.path, fallback)
  })
  row.append(button)

  // Value changes notify the panel's own listeners only, not the global ones.
  let buttons = buttonsByPanel.get(target.panelId)
  if (!buttons) {
    buttons = new Map()
    buttonsByPanel.set(target.panelId, buttons)
    DialStore.subscribe(target.panelId, () => refreshPanel(target.panelId))
  }
  buttons.set(button, target)
  refreshPanel(target.panelId)
}

/** One scan per frame, however many mutations land in it. */
let scheduled = false
function scheduleScan() {
  if (scheduled) return
  scheduled = true
  requestAnimationFrame(() => {
    scheduled = false
    document.querySelectorAll(ROW).forEach(attach)
  })
}

/**
 * Starts the watcher. The panel mounts and unmounts its rows as it opens, closes and
 * collapses folders, so rows are picked up as they appear rather than once at startup.
 * DialKit portals its panel to the body, so the body is the narrowest root that sees it.
 */
export function installDialKitReset() {
  scheduleScan()
  new MutationObserver(scheduleScan).observe(document.body, { childList: true, subtree: true })
}
