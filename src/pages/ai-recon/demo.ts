/**
 * AI Recon's walkthrough, stepped with the arrow keys: → takes the next step, ← takes it back.
 *
 * Each step drives the page through the same handlers a click or a message would, so what
 * the room sees is the real thing, at its real pace. Going back is the page's own business —
 * it keeps what things looked like before each step and puts that back (index.tsx).
 */
import type { Card, ChatMessage, FileContext, RecommendationItem } from './assistant'
import { isComplete, type Operation } from './operations'

/** What a step can see and do on the page. */
export type DemoControls = {
  messages: ChatMessage[]
  files: FileContext[]
  canRun: boolean
  /** Back to an empty page: no files, only the greeting. */
  reset: () => void
  upload: (files: File[]) => void
  openReason: (cardId: string, itemId: string) => void
  applyRecommended: (cardId: string, items: RecommendationItem[]) => void
  send: (text: string) => void
  applyStep: (cardId: string, fileId: string, op: Operation) => void
  run: () => void
}

/**
 * One step. False when the page isn't ready for it yet — a reply still on its way — so the
 * key does nothing and the next press tries again.
 */
type DemoStep = (controls: DemoControls) => boolean | Promise<boolean>

/** Served from public/, so the walkthrough needs nothing on the presenter's machine. */
const DEMO_FILES = ['source_merchant_transactions.csv', 'target_gateway_settlement.csv']

const demoFiles = () =>
  Promise.all(
    DEMO_FILES.map(async (name) => {
      const response = await fetch(`${import.meta.env.BASE_URL}ai-recon-demo/${name}`)
      return new File([await response.blob()], name, { type: 'text/csv' })
    }),
  )

/** The newest card of a kind that is still waiting on the user. */
function openCard<T extends Card['type']>(messages: ChatMessage[], type: T) {
  return messages
    .flatMap((message) => message.cards ?? [])
    .filter((card): card is Extract<Card, { type: T }> => card.type === type && 'state' in card && card.state === 'open')
    .at(-1)
}

export const DEMO_STEPS: DemoStep[] = [
  // Both files in: each is read and shown, the base is picked, and steps are proposed.
  async ({ reset, upload }) => {
    reset()
    upload(await demoFiles())
    return true
  },
  // The evidence behind the first proposal, under its name.
  ({ messages, openReason }) => {
    const card = openCard(messages, 'recommend')
    if (!card) return false
    openReason(card.id, card.items[0].id)
    return true
  },
  // Apply the ones it is sure of — the ones ticked.
  ({ messages, applyRecommended }) => {
    const card = openCard(messages, 'recommend')
    if (!card) return false
    applyRecommended(
      card.id,
      card.items.filter((item) => item.confidence === 'high'),
    )
    return true
  },
  // A change asked for in words comes back as a card to check.
  ({ send }) => {
    send('Format Requested On as DD/MM/YYYY in the target')
    return true
  },
  ({ messages, files, applyStep }) => {
    const card = openCard(messages, 'step')
    const columns = files.find((file) => file.id === card?.fileId)?.columns
    if (!card?.fileId || !columns || !isComplete(card.op, columns)) return false
    applyStep(card.id, card.fileId, card.op)
    return true
  },
  ({ canRun, run }) => {
    if (!canRun) return false
    run()
    return true
  },
  ({ send }) => {
    send('Which columns did you match on?')
    return true
  },
]

/**
 * Whether an arrow key is the walkthrough's: not while typing, not inside a menu or list that
 * uses arrows itself, and not with a modifier held.
 */
export function isDemoKey(event: WindowEventMap['keydown']) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return false
  if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return false
  const target = event.target
  return !(
    target instanceof HTMLElement &&
    (target.isContentEditable || target.closest('input, textarea, select, [role="menu"], [role="listbox"]'))
  )
}
