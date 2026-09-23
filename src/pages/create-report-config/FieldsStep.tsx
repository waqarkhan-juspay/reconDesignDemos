import { AddCustomColumnModal } from './AddCustomColumnModal'
import { ColumnOrganiser } from './ColumnOrganiser'
import {
  fieldOf,
  isVocabularyField,
  newFieldColumn,
  sameField,
  type FieldsAnswers,
} from './answers'

/**
 * The Fields step — the column organiser (node 4911:111609): the field vocabulary as a
 * searchable column on the left, the chosen columns as reorderable cards on the right. See
 * ColumnOrganiser.tsx for the step itself; this file owns the "Add custom column" modal the
 * organiser's header button opens.
 */
export function FieldsStep({
  answers,
  onChange,
  aggregated = false,
  addingColumn,
  onAddingColumnChange,
}: {
  answers: FieldsAnswers
  onChange: (next: FieldsAnswers) => void
  /**
   * Whether the report groups its records — Setup's "Grouped records" (index.tsx). The
   * organiser reads it to decide whether a column can be given an aggregation at all; see
   * ColumnOrganiser.
   */
  aggregated?: boolean
  /** Whether the "Add custom column" modal is open. */
  addingColumn: boolean
  onAddingColumnChange: (open: boolean) => void
}) {
  const { columns } = answers

  /**
   * Every custom field the report knows: the ones remembered in `customFields`, plus any column
   * whose field is not in the vocabulary. One entry per name, matched case-insensitively.
   *
   * Keyed on `fieldOf`, not on the title, so a renamed column still counts as its own field
   * rather than minting a second one under its new name.
   */
  const customTags = [
    ...answers.customFields,
    ...columns
      .filter((column) => !isVocabularyField(fieldOf(column)))
      .map((column) => ({ title: fieldOf(column), defaultValue: column.defaultValue })),
  ].filter(
    (field, index, all) => all.findIndex((other) => sameField(other.title, field.title)) === index,
  )

  return (
    /* `min-h-0`: this is the filling row of a `[data-fill]` grid (index.tsx), and a grid
       item's default `min-height: auto` would refuse to shrink below its content — the
       organiser's cap would then have nothing to bind against. */
    <div className="flex min-h-0 w-full flex-col">
      <ColumnOrganiser
        answers={answers}
        onChange={onChange}
        aggregated={aggregated}
        onAddCustomColumn={() => onAddingColumnChange(true)}
      />
      <AddCustomColumnModal
        isOpen={addingColumn}
        onClose={() => onAddingColumnChange(false)}
        onAdd={({ title, defaultValue }) =>
          onChange({
            ...answers,
            // Remembered as a field, so its chip survives the column being removed later. A
            // name that is already a field just adds the column.
            customFields:
              isVocabularyField(title) || customTags.some((field) => sameField(field.title, title))
                ? answers.customFields
                : [...answers.customFields, { title, defaultValue }],
            columns: [...columns, newFieldColumn(title, defaultValue)],
          })
        }
      />
    </div>
  )
}
