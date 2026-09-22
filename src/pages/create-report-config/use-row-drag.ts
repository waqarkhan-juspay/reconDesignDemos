import { useCallback, useRef, useState } from 'react'

/**
 * Drag-to-reorder for a vertical list of equal-height rows, driven by a grip on each row.
 *
 * Written against pointer events rather than a library. `@dnd-kit` is on disk — Blend depends
 * on it and npm flattens it into node_modules — but it is not in this repo's package.json, so
 * importing it would be a phantom dependency: a build that works until Blend drops the dep or
 * npm nests it differently. Declaring it to reorder one list is a lot of surface for what the
 * three handlers below already do.
 *
 * The one requirement worth naming is speed. Rows reorder *as the pointer crosses a slot*,
 * not on release, and the dragged row follows the pointer with no easing in between, so the
 * list is always showing the order you would get if you let go now.
 *
 * Two things keep that fast:
 *
 * - **The transform is written straight to the element's style**, never through state. A
 *   pointermove fires per frame; a re-render per frame to move one row by a few pixels is
 *   work with nothing to show for it. Only the *reorder* goes through React — twice per slot
 *   crossed — and `draggingIndex`, which changes exactly twice per drag. Same reasoning as
 *   `syncTable` in FieldsStep, which writes its letter rail's transform the same way.
 * - **Slot geometry is measured once, at pointerdown.** The rows are equal height and the
 *   list does not resize mid-drag, so the slots a row can land in are fixed for the whole
 *   gesture. Re-measuring on every move would mean a layout flush per frame.
 */
type DragState = {
  pointerId: number
  /** Where the pointer went down, in client coordinates. */
  startY: number
  /** The slot the row started in — the transform is measured from this one. */
  startIndex: number
  /** Where the row is now. Moves as slots are crossed; the drag's live position. */
  index: number
  /** Each slot's top and height, in client coordinates, as measured at pointerdown. */
  slots: { top: number; height: number }[]
  /** The row element being dragged, so move and up do not have to find it again. */
  element: HTMLElement
}

export function useRowDrag(count: number, onMove: (from: number, to: number) => void) {
  const listRef = useRef<HTMLDivElement>(null)
  const drag = useRef<DragState | null>(null)

  /**
   * Only for styling — the lift and the stacking order. Deliberately the one piece of this
   * that renders: everything else about the drag is a transform.
   */
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  const finish = useCallback(() => {
    const state = drag.current
    if (!state) return
    drag.current = null
    state.element.style.transform = ''
    setDraggingIndex(null)
  }, [])

  const onPointerDown = useCallback(
    (index: number) => (event: React.PointerEvent<HTMLElement>) => {
      // Left button only. A right-click on the grip should open the context menu, and a
      // middle-click should do nothing rather than start a drag the user cannot see.
      if (event.button !== 0) return
      const list = listRef.current
      const element = list?.children[index]
      if (!list || !(element instanceof HTMLElement)) return

      const slots = [...list.children].map((row) => {
        const { top, height } = row.getBoundingClientRect()
        return { top, height }
      })

      drag.current = {
        pointerId: event.pointerId,
        startY: event.clientY,
        startIndex: index,
        index,
        slots,
        element,
      }
      setDraggingIndex(index)

      // Capture on the handle, so the drag survives the pointer leaving the row — which it
      // will, immediately, since the row moves out from under it.
      event.currentTarget.setPointerCapture(event.pointerId)
      event.preventDefault()
    },
    [],
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      const state = drag.current
      if (!state || event.pointerId !== state.pointerId) return

      const { slots, startIndex } = state
      const dy = event.clientY - state.startY
      const start = slots[startIndex]

      /**
       * Which slot the row is over, by where its middle now sits. The middle rather than the
       * top, so a row swaps when it is more than half way past its neighbour — dragging by
       * the top edge would swap a full row-height early and feel like it was leading you.
       */
      const middle = start.top + dy + start.height / 2
      let target = slots.length - 1
      for (let slot = 0; slot < slots.length; slot += 1) {
        if (middle < slots[slot].top + slots[slot].height) {
          target = slot
          break
        }
      }
      target = Math.max(0, Math.min(count - 1, target))

      if (target !== state.index) {
        onMove(state.index, target)
        state.index = target
        // The lift has to follow the row, not the slot it started in. `draggingIndex` is a
        // position — after a swap the row is somewhere else, and without this the shadow
        // stays on whichever row took its place.
        setDraggingIndex(target)
      }

      /**
       * Offset from the slot the row is *now* in, not from where it started. After a reorder
       * React has already moved the element into `state.index`'s slot, so a transform measured
       * from `startIndex` would jump it by a full row on every swap.
       */
      state.element.style.transform = `translateY(${start.top + dy - slots[state.index].top}px)`
    },
    [count, onMove],
  )

  const onKeyDown = useCallback(
    (index: number) => (event: React.KeyboardEvent<HTMLElement>) => {
      // The grip is a real control, so it answers the keyboard too — a drag handle that only
      // works with a mouse is a reorder only some people can do.
      const step = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0
      if (step === 0) return
      const target = index + step
      if (target < 0 || target >= count) return
      event.preventDefault()
      onMove(index, target)
      // Focus follows the row, not the slot: after moving down, the next ArrowDown should
      // keep moving the same row rather than the one that took its place.
      requestAnimationFrame(() => {
        const moved = listRef.current?.children[target]
        moved?.querySelector<HTMLElement>('[data-drag-handle]')?.focus()
      })
    },
    [count, onMove],
  )

  const handleProps = useCallback(
    (index: number) => ({
      'data-drag-handle': true,
      onPointerDown: onPointerDown(index),
      onPointerMove,
      onPointerUp: finish,
      onPointerCancel: finish,
      onKeyDown: onKeyDown(index),
      // Without this a touch drag scrolls the page instead of moving the row, and the
      // pointermove stream stops the moment the browser claims the gesture.
      style: { touchAction: 'none' as const },
    }),
    [finish, onKeyDown, onPointerDown, onPointerMove],
  )

  return { listRef, draggingIndex, handleProps }
}

/** Move one item within an array. Returns a new array; the input is untouched. */
export function moveItem<T>(items: T[], from: number, to: number): T[] {
  const next = [...items]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}
