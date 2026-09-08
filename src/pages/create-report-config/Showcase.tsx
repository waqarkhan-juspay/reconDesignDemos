import { FOUNDATION_THEME } from '@juspay/blend-design-system'
import { useEffect, useState } from 'react'
import heroImage from '../../assets/hero.png'
import { PrimitiveText, font } from '../../primitives'

const { colors } = FOUNDATION_THEME

/**
 * How long a slide holds before the next takes over.
 *
 * Deliberately not in src/motion.ts: rule 14 covers the durations the app *animates* on, and
 * this is a dwell — how long something sits still. The cross-fade itself does read from
 * there, through the --flow-reveal custom property set on the flow root.
 */
const DWELL_MS = 5000

/**
 * The panel's slides.
 *
 * ⚠️ Both point at the same asset. src/assets holds exactly one illustration (hero.png) and
 * one photograph, so there is no second image to give slide two — drop the real artwork in
 * and swap the `image` field here.
 */
const SLIDES = [
  {
    id: 'reconcile',
    image: heroImage,
    title: 'Reports that reconcile themselves',
    description:
      'Match internal records against gateway and bank settlement files, and have the mismatches surfaced before anyone has to go looking for them.',
  },
  {
    id: 'deliver',
    image: heroImage,
    title: 'Delivered where your team already works',
    description:
      'Schedule the run once and every report lands on email or SFTP afterwards, in the shape your finance stack already reads.',
  },
]

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
export function Showcase() {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    if (paused) return
    // Keyed on `index` as well, so choosing a slide by hand restarts the dwell rather than
    // leaving the new slide to inherit whatever was left of the old one's.
    const timer = setTimeout(() => setIndex((current) => (current + 1) % SLIDES.length), DWELL_MS)
    return () => clearTimeout(timer)
  }, [index, paused])

  const slide = SLIDES[index]

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
          <img src={slide.image} alt="" className="block max-h-[280px] w-[264px] object-contain" />
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
        {SLIDES.map(({ id, title }, dot) => (
          <button
            key={id}
            type="button"
            aria-label={title}
            aria-current={dot === index}
            onClick={() => setIndex(dot)}
            className="size-2 cursor-pointer rounded-full border-none p-0"
            style={{
              backgroundColor: dot === index ? colors.primary[500] : colors.gray[200],
              transition: 'background-color var(--flow-feedback) var(--flow-feedback-ease)',
            }}
          />
        ))}
      </div>
    </aside>
  )
}
