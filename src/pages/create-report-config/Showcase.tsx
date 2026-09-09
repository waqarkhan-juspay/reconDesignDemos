import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import { useCallback, useEffect, useState } from 'react'
import heroImage from '../../assets/hero.png'
import { PrimitiveText, font } from '../../primitives'
import type { ReportCategory } from '../../report-config'
import { ReconciliationAnimation } from './ReconciliationAnimation'

const { colors } = FOUNDATION_THEME

/**
 * How long a slide holds before the next takes over.
 *
 * Deliberately not in src/motion.ts: rule 14 covers the durations the app *animates* on, and
 * this is a dwell — how long something sits still. The cross-fade itself does read from
 * there, through the --flow-reveal custom property set on the flow root.
 */
const DWELL_MS = 5000

/** The category whose choice the animation illustrates. */
const RECONCILIATION: ReportCategory = 'Reconciliation'

type Slide = {
  id: string
  title: string
  description: string
  /**
   * What the slide draws above its copy: a still at `width`, or the reconciliation
   * animation, which sizes itself and needs to be told when to play.
   */
  art: { kind: 'image'; src: string; width?: number } | { kind: 'reconciliation' }
}

/**
 * The slides every step shows.
 *
 * ⚠️ Both point at the same asset. src/assets holds one illustration (hero.png) and one
 * photograph, so there is no second image to give slide two — drop the real artwork in and
 * swap the `image` field here.
 */
const SLIDES: Slide[] = [
  {
    id: 'reconcile',
    art: { kind: 'image', src: heroImage },
    title: 'Reports that reconcile themselves',
    description:
      'Match internal records against gateway and bank settlement files, and have the mismatches surfaced before anyone has to go looking for them.',
  },
  {
    id: 'deliver',
    art: { kind: 'image', src: heroImage },
    title: 'Delivered where your team already works',
    description:
      'Schedule the run once and every report lands on email or SFTP afterwards, in the shape your finance stack already reads.',
  },
]

/**
 * Setup opens on the reconciliation animation, because Setup is where the
 * reconciliation-or-file-summary choice is made and this is what that choice means: two
 * systems, the same three orders, and one of them that does not agree.
 *
 * The copy is the animation's own, from `reconciliation-animation-2x.html`. The source card
 * carried it inside itself, under the illustration; here it goes in the slide's title and
 * description instead, because a slide that rendered both would stack two titles and two
 * descriptions. Neither line was animated in the source, so nothing is lost by lifting them
 * out of the drawing.
 */
const SETUP_SLIDES: Slide[] = [
  {
    id: 'match',
    art: { kind: 'reconciliation' },
    title: 'Reconciliation',
    description:
      'Compare records across System A and System B. Matching records are marked as matched; ' +
      'differences are flagged with the exact gap.',
  },
  ...SLIDES,
]

const slidesFor = (step: number) => (step === 0 ? SETUP_SLIDES : SLIDES)

/**
 * The 40% companion panel beside the create flow.
 *
 * blend-gap: Blend 0.0.37 ships no carousel — `grep -o "declare const [A-Za-z0-9_]*"` over
 * dist/main.d.ts turns up nothing of the kind, and the nearest thing (`Directory`) is a nav
 * tree. So the rotation is written here from Block-free primitives and tokens.
 *
 * A keyframe on a keyed element rather than a transition between two states (rule 14): the
 * slide is *remounted* when the index changes, so it starts at `from` whenever the frame
 * lands instead of racing React's commit.
 */
export function Showcase({
  step,
  category,
}: {
  step: number
  /** The Setup answer. Reselecting Reconciliation is what replays the animation. */
  category: ReportCategory | null
}) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  const slides = slidesFor(step)

  /**
   * Back to the first slide when the step changes. Not tidiness — Setup's list is one longer
   * than every other step's, so an index left alone reads past the end on Back.
   *
   * Adjusted during render rather than from an effect (rule 14's objection to the same
   * shape): React re-runs the body before committing, so `index` is already 0 in this
   * render. An effect would paint one frame of the wrong slide first, and on Back that
   * frame is `undefined`.
   */
  const [renderedStep, setRenderedStep] = useState(step)
  if (renderedStep !== step) {
    setRenderedStep(step)
    setIndex(0)
  }

  /**
   * `index` is still the old step's value for the remainder of this pass — setting state
   * during render makes React re-run the body, but only once this one has *returned*, and
   * Setup's list is one longer than the rest, so reading `slides[index]` straight would
   * hand the markup below an undefined slide on the way from Setup to Delivery.
   */
  const activeIndex = renderedStep === step ? index : 0

  /**
   * The animation plays once and then holds. Two things have to be true at the same time,
   * and they pull in opposite directions:
   *
   *  - it must not replay every time the carousel comes back around to slide one, which it
   *    would if playing were simply tied to mounting;
   *  - it must replay when the user picks Reconciliation again having gone to File Summary
   *    and back, which is the one moment the drawing is worth watching a second time.
   *
   * So a token counts the times the answer has *arrived* at Reconciliation, and a ref
   * remembers which token has been played. The carousel rotating changes neither.
   */
  const [playToken, setPlayToken] = useState(0)
  const [renderedCategory, setRenderedCategory] = useState(category)
  if (renderedCategory !== category) {
    setRenderedCategory(category)
    if (category === RECONCILIATION) setPlayToken((token) => token + 1)
  }

  const [playedToken, setPlayedToken] = useState<number | null>(null)
  const markPlayed = useCallback(() => setPlayedToken(playToken), [playToken])

  useEffect(() => {
    if (paused) return
    // Keyed on `index` as well, so choosing a slide by hand restarts the dwell rather than
    // leaving the new slide to inherit whatever was left of the old one's.
    const timer = setTimeout(() => setIndex((current) => (current + 1) % slides.length), DWELL_MS)
    return () => clearTimeout(timer)
  }, [index, paused, slides.length])

  const slide = slides[activeIndex]

  return (
    <aside
      aria-roledescription="carousel"
      aria-label="What this report can do"
      // Hover and focus hold the panel still: rotating copy out from under someone who has
      // started reading it is the whole failure mode of an auto-carousel.
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="flex w-[40%] shrink-0 flex-col items-center justify-center gap-10 border-l px-12"
      style={{ backgroundColor: colors.gray[25], borderColor: colors.gray[150] }}
    >
      <div key={slide.id} className="showcase-slide flex flex-col items-center gap-8">
        {/* Fixed box, so a slide whose artwork is a different shape does not shunt the copy
            up and down as the panel rotates. */}
        <div className="flex h-[280px] w-full items-center justify-center">
          {slide.art.kind === 'reconciliation' ? (
            // Keyed on the token so a second arrival at Reconciliation is a fresh mount and
            // the keyframes start from the beginning (rule 14), rather than a class added to
            // an element already sitting at the end of them.
            <ReconciliationAnimation
              key={playToken}
              play={playedToken !== playToken}
              onPlayed={markPlayed}
            />
          ) : (
            <img
              src={slide.art.src}
              alt=""
              style={{ width: slide.art.width ?? 264 }}
              className="block max-h-[280px] max-w-full object-contain"
            />
          )}
        </div>

        <div className="flex flex-col items-center gap-3">
          <PrimitiveText
            as="h2"
            {...font(FOUNDATION_THEME.font.size.heading.sm)}
            fontWeight={FOUNDATION_THEME.font.weight[600]}
            color={colors.gray[700]}
            textAlign="center"
          >
            {slide.title}
          </PrimitiveText>
          <PrimitiveText
            {...font(FOUNDATION_THEME.font.size.body.md)}
            color={colors.gray[500]}
            textAlign="center"
          >
            {slide.description}
          </PrimitiveText>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {slides.map(({ id, title }, dot) => (
          <button
            key={id}
            type="button"
            aria-label={title}
            aria-current={dot === activeIndex}
            onClick={() => setIndex(dot)}
            className="size-2 cursor-pointer rounded-full border-none p-0"
            style={{
              backgroundColor: dot === activeIndex ? colors.primary[500] : colors.gray[200],
              transition: 'background-color var(--flow-feedback) var(--flow-feedback-ease)',
            }}
          />
        ))}
      </div>
    </aside>
  )
}
