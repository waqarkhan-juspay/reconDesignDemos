import { useEffect } from 'react'

/**
 * Opens every nested sidebar menu (PACB Recon, …) when it first appears — the PACB branch
 * keeps them all open by default (2026-10-07). After that they are the user's: a menu someone
 * collapses stays collapsed.
 *
 * Why the DOM and not a prop: Blend's plain Directory renderer gives each NavItem its own
 * `useState(false)` (Directory/NavItem.tsx:297) and never reads `defaultExpandedItems`. Only
 * its virtualized renderer does (VirtualizedDirectory.tsx:260-263), and that one draws the
 * rows differently — labels drift, the hierarchy lines go. So this presses each collapsed
 * menu's own toggle once, which is exactly what a click does.
 *
 * Watched with a MutationObserver because SidebarV2 mounts its nav more than once (desktop
 * panel, hover-peek, mobile drawer), and each mount starts collapsed again. An element is
 * opened at most once, so a user's collapse is never undone.
 */
const TOGGLE = 'button[data-element="sidebar-sub-section"][aria-expanded="false"]'

export function useOpenNestedMenus(labels: string[]) {
  const key = labels.join('\n')

  useEffect(() => {
    const wanted = new Set(key.split('\n').filter(Boolean))
    const opened = new WeakSet<Element>()
    const open = (button: HTMLButtonElement) => {
      if (opened.has(button) || !wanted.has(button.getAttribute('aria-label') ?? '')) return
      opened.add(button)
      button.click()
    }
    const openIn = (root: ParentNode) =>
      root.querySelectorAll<HTMLButtonElement>(TOGGLE).forEach(open)

    openIn(document)
    // Only what was just added can hold a new toggle, so only that is searched — the node
    // itself and what is inside it, not its parent (a popover's parent is <body>).
    const observer = new MutationObserver((records) =>
      records.forEach(({ addedNodes }) =>
        addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return
          if (node instanceof HTMLButtonElement && node.matches(TOGGLE)) open(node)
          openIn(node)
        }),
      ),
    )
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [key])
}
