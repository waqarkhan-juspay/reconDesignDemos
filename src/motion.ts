/**
 * Every duration and curve the app animates on, in one place. See rule 14.
 */

/**
 * Overlay motion — modals, sheets, anything over a scrim.
 *
 * Copied from Blend's `ModalV2/modalAnimationV2.tsx:3-5`, which is the one set of values we
 * cannot change: it styles ModalV2 through styled-components and exports only
 * ANIMATION_DURATION. Re-check them if Blend's modal timing ever moves.
 */
export const OVERLAY_MS = 300
/** Entering. Slow out of the gate, so the panel reads as arriving rather than being thrown. */
export const OVERLAY_IN = 'cubic-bezier(0.16, 0, 0.3, 1)'
/** Leaving. Gentler than the entry — a dismissal should not snap away from you. */
export const OVERLAY_OUT = 'cubic-bezier(0.25, 0.46, 0.45, 0.94)'

/**
 * Page and step arrivals. Shorter than an overlay because nothing has to be dismissed: it is
 * the page you asked for, and the animation says it changed.
 */
export const PAGE_MS = 260
export const PAGE_EASING = 'cubic-bezier(0.23, 1, 0.32, 1)'

/**
 * Feedback inside a page — a result arriving, a row ticking over, a control acknowledging a
 * press. ease-out-cubic: everything here is an element *entering*, and ease-out puts the
 * acceleration at the start, which reads as responsive rather than played at you.
 */
export const FEEDBACK_MS = 200
export const MICRO_MS = 150
export const FEEDBACK_EASING = 'cubic-bezier(0.215, 0.61, 0.355, 1)'
