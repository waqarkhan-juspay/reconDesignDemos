import { useEffect, useRef } from 'react'

/**
 * ⌘K / Ctrl+K focuses the page's search — the PACB Workflow's views share one shortcut.
 * Returns the ref to put on the search input.
 */
export function useSearchShortcut() {
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
  return ref
}
