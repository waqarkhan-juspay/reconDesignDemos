import {
  REPORT_CATEGORIES,
  REPORT_FORMATS,
  sourceTypesFor,
  type ReportCategory,
} from '../../report-config'
import type { SetupAnswers } from './answers'
import { OptionCard, OptionRow, QuestionGroup } from './options'

/**
 * Step 1 — three questions, each revealed by the answer above it. The second is scoped by
 * the first: Reconciliation is asked what it should contain, File Summary which file.
 */
export function SetupStep({
  answers,
  onChange,
}: {
  answers: SetupAnswers
  onChange: (next: SetupAnswers) => void
}) {
  const { category, sourceType, format } = answers

  // Source / Type is scoped by category, so an answer from the other branch cannot survive
  // the switch; format follows it out because the flow re-reveals from that point.
  const chooseCategory = (next: ReportCategory) =>
    onChange({ category: next, sourceType: null, format: null })
  const chooseSourceType = (next: string) =>
    onChange({ ...answers, sourceType: next, format: null })

  return (
    <>
      <QuestionGroup label="Choose a report category">
        <OptionRow>
          {REPORT_CATEGORIES.map((option) => (
            <OptionCard
              key={option.id}
              option={option}
              selected={category === option.id}
              dimmed={category !== null && category !== option.id}
              onSelect={() => chooseCategory(option.id)}
            />
          ))}
        </OptionRow>
      </QuestionGroup>

      {category !== null && (
        // Keyed on the category so switching branches replays the reveal rather than
        // swapping the cards underneath a group that is already on screen.
        <QuestionGroup key={category} label="What it should contain?">
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
        <QuestionGroup key={`${category}/${sourceType}`} label="Desired format?">
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
