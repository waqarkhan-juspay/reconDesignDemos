/**
 * The Playground — a Storybook-style corner of the app where components are built and shown
 * in every state on their own, before they go into a page. The sidebar
 * (src/layout/navigation.tsx) and the router (src/router.tsx) both read this list, the same
 * bargain as PACB_ROUTES.
 *
 * `label` is also the sidebar item's identity — keep them unique across the whole nav.
 */
const PLAYGROUND_BASE_PATH = '/playground'

type PlaygroundRoute = { label: string; path: string; description: string }

export const PLAYGROUND_ROUTES: PlaygroundRoute[] = [
  {
    label: 'Settlement Cards',
    path: `${PLAYGROUND_BASE_PATH}/settlement-cards`,
    description: 'The settlement card in every state, before it goes into the workflow.',
  },
  {
    label: 'Payment Card',
    path: `${PLAYGROUND_BASE_PATH}/payment-card`,
    description: 'The merchant payment row in every state, before it goes into the workflow.',
  },
  {
    label: 'Form 145/146',
    path: `${PLAYGROUND_BASE_PATH}/form-145-146`,
    description: 'The Form 145/146 upload card, from empty to both forms in.',
  },
]
