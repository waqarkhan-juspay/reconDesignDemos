import { useCallback, useEffect, useLayoutEffect, useRef } from 'react'
import fileSummaryAnimation from '../../assets/create new config-step-1/animation-file-summary-animated.svg?raw'
import reconciliationAnimation from '../../assets/create new config-step-1/animation-reconciliation-animated.svg?raw'
import {
  REPORT_CATEGORIES,
  REPORT_FORMATS,
  sourceTypesFor,
  type ReportCategory,
} from '../../report-config'
import type { SetupAnswers } from './answers'
import { OptionCard, OptionRow, QuestionGroup, SelectableCard } from './options'

/**
 * The illustration above each category card. The design draws static placeholders
 * (`reconciliation-static`, `file-summary-static`); these are the animated replacements.
 *
 * Imported as markup (`?raw`) and inlined, not referenced from an `<img>`: they animate with
 * SMIL, and an `<img>` gives script no handle on an SVG's timeline — it would loop forever.
 * Inlined, the `<svg>` element's own pauseAnimations / setCurrentTime / unpauseAnimations
 * are what play it once and stop.
 *
 * Their ids (rA, rB, w1–w4 and src, rep1, rep2) do not collide, so both can share the page.
 */
const CATEGORY_ANIMATIONS: Record<ReportCategory, string> = {
  Reconciliation: reconciliationAnimation,
  'File Summary': fileSummaryAnimation,
}

/**
 * How long one play-through runs before it is stopped.
 *
 * Both files loop on a 6s timeline, but their motion ends at keyTime 0.6583 (≈3.95s) and the
 * rest is a hold on the finished frame — so 4s is the whole animation without the wait.
 * Re-check against the keyTimes if the artwork changes.
 */
const PLAY_MS = 4000

/**
 * Plays an inlined SMIL illustration once, on request.
 *
 * At rest the timeline is paused at 0, which in both files is the finished drawing (every
 * `values` list starts on its end state) — so a card that is not playing shows the complete
 * picture, not a blank or a mid-frame. `play` restarts from 0, runs PLAY_MS, and parks at 0
 * again. A play already in progress is left alone rather than restarted, so a pointer
 * wandering in and out of a card cannot stutter it.
 */
function useIllustrationPlayer(markup: string) {
  const hostRef = useRef<HTMLDivElement>(null)
  const timer = useRef<number | undefined>(undefined)

  const svg = () => hostRef.current?.querySelector('svg') ?? null

  /**
   * The markup is written here, not through `dangerouslySetInnerHTML`. Rendered by React,
   * selecting a card re-inserted both SVGs — and a freshly inserted SVG starts its timeline
   * immediately, so both illustrations played in unison on every click. Owning the insertion
   * means React never replaces the node, and pausing sits in the same effect as the
   * insertion, so a node can never exist here un-paused.
   *
   * Layout effect, so the timeline is stopped before the first paint rather than a frame in.
   */
  useLayoutEffect(() => {
    const host = hostRef.current
    if (!host) return
    host.innerHTML = markup
    const element = svg()
    element?.pauseAnimations()
    element?.setCurrentTime(0)
    return () => {
      window.clearTimeout(timer.current)
      // Reset, not just cleared: StrictMode re-runs this effect, and a stale id would make
      // every later `play` think one is still running.
      timer.current = undefined
    }
  }, [markup])

  const play = useCallback(() => {
    const element = svg()
    if (!element || timer.current !== undefined) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    element.setCurrentTime(0)
    element.unpauseAnimations()
    timer.current = window.setTimeout(() => {
      element.pauseAnimations()
      element.setCurrentTime(0)
      timer.current = undefined
    }, PLAY_MS)
  }, [])

  return { hostRef, play }
}

/**
 * Step 1 — three questions, each revealed by the answer above it. The second is scoped by
 * the first: Reconciliation is asked which records to include, File Summary which file.
 */
export function SetupStep({
  answers,
  onChange,
}: {
  answers: SetupAnswers
  onChange: (next: SetupAnswers) => void
}) {
  const { category, sourceType, format } = answers

  const players: Record<ReportCategory, ReturnType<typeof useIllustrationPlayer>> = {
    Reconciliation: useIllustrationPlayer(CATEGORY_ANIMATIONS.Reconciliation),
    'File Summary': useIllustrationPlayer(CATEGORY_ANIMATIONS['File Summary']),
  }

  /**
   * On arrival, each illustration plays once, in reading order: Reconciliation, then Source
   * File as the first one settles. After that they only move on hover.
   *
   * A card that is already chosen — coming Back to this step — is skipped: a selected card
   * does not animate. Read once on mount on purpose; this is the arrival, not a reaction.
   */
  const initialCategory = useRef(category)
  useEffect(() => {
    const [first, second] = REPORT_CATEGORIES.map(({ id }) => id)
    const playUnlessChosen = (id: ReportCategory) => {
      if (initialCategory.current !== id) players[id].play()
    }
    playUnlessChosen(first)
    const next = window.setTimeout(() => playUnlessChosen(second), PLAY_MS)
    return () => window.clearTimeout(next)
    // Mount only — `players` is a fresh object each render, but its `play`s are stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Source / Type is scoped by category, so an answer from the other branch cannot survive
  // the switch; format follows it out because the flow re-reveals from that point.
  const chooseCategory = (next: ReportCategory) =>
    onChange({ category: next, sourceType: null, format: null })
  const chooseSourceType = (next: string) =>
    onChange({ ...answers, sourceType: next, format: null })

  return (
    <>
      {/* No label: the step heading is the question, and the cards sit directly under it.
          16px under the intro rather than the 32px between sections (node 4541:16687),
          which the step grid's row gap cannot express on its own. */}
      <div className="flow-question -mt-4">
        <OptionRow>
          {REPORT_CATEGORIES.map((option) => {
            const selected = category === option.id
            return (
              <SelectableCard
                key={option.id}
                title={option.title}
                description={option.description}
                selected={selected}
                dimmed={category !== null && !selected}
                onSelect={() => chooseCategory(option.id)}
                // Hover replays it once — never on the chosen card, which stays still.
                onPointerEnter={selected ? undefined : players[option.id].play}
                media={
                  // 472×202 in the design; the SVG's viewBox is 784×336, the same shape
                  // within a pixel, so scaling it to the card's width needs no crop. Empty
                  // here on purpose — the player writes the SVG in (useIllustrationPlayer).
                  // The aspect ratio holds the space before that first layout effect.
                  <div
                    ref={players[option.id].hostRef}
                    aria-hidden
                    className="w-full [&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
                    style={{ aspectRatio: '784 / 336' }}
                  />
                }
              />
            )
          })}
        </OptionRow>
      </div>

      {category !== null && (
        // Keyed on the category so switching branches replays the reveal rather than
        // swapping the cards underneath a group that is already on screen.
        <QuestionGroup key={category} label="Which records should the report include?">
          <OptionRow>
            {sourceTypesFor(category).map((option) => (
              <OptionCard
                key={option.id}
                option={option}
                selected={sourceType === option.id}
                dimmed={sourceType !== null && sourceType !== option.id}
                onSelect={() => chooseSourceType(option.id)}
              />
            ))}
          </OptionRow>
        </QuestionGroup>
      )}

      {category !== null && sourceType !== null && (
        <QuestionGroup key={`${category}/${sourceType}`} label="How much detail do you need?">
          <OptionRow>
            {REPORT_FORMATS.map((option) => (
              <OptionCard
                key={option.id}
                option={option}
                selected={format === option.id}
                dimmed={format !== null && format !== option.id}
                onSelect={() => onChange({ ...answers, format: option.id })}
              />
            ))}
          </OptionRow>
        </QuestionGroup>
      )}
    </>
  )
}
