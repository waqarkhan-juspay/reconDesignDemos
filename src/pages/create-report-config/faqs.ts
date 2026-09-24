import type { StepId } from '.'

/**
 * The questions the flow's help button answers — see FaqLauncher.
 *
 * **Per step, not one list.** The panel shows only the questions about the step on screen: a
 * user on Delivery wants to know where a Slack channel ID lives, not how Data Transform signs
 * an amount, and every question about six pages at once is a manual rather than help. Keyed
 * by `StepId`, so every step must have an entry — a new step without its questions fails to
 * typecheck rather than opening an empty panel.
 *
 * Every answer describes what this flow actually does, not what a report config could do in
 * general: an FAQ that promises a behaviour the page does not have is worse than no FAQ. So
 * when a step changes, its answers change with it — which is why they live beside the steps
 * rather than in the component that draws them.
 *
 * `id` is the accordion's value — stable, so an answer can be linked to or opened by default
 * without depending on its wording. Unique across the whole record, not just within a step.
 */
export type Faq = { id: string; question: string; answer: string }

export const FAQS: Record<StepId, Faq[]> = {
  setup: [
    {
      id: 'report-types',
      question: 'What is the difference between a Reconciliation and a Source File report?',
      answer:
        'A Reconciliation report matches your internal records against gateway and bank settlement files, so you can catch mismatches and missing entries. A Source File report carries the data from a single source file, simplified or in full, with no matching.',
    },
    {
      id: 'record-scope',
      question: 'Which records do All, Reconciled and Unreconciled include?',
      answer:
        'All records includes every record, whether it reconciled or not. Reconciled keeps only the records that matched, and Unreconciled keeps only the ones that did not.',
    },
    {
      id: 'detail-level',
      question: 'Should I pick Transaction level or Grouped records?',
      answer:
        'Transaction level gives every record its own row, with no totals — best for audits and looking up specific records. Grouped records gives one row per group, such as a gateway or payment method, with totals, and adds a Grouping step where you choose the fields to group by.',
    },
    {
      id: 'setup-continue',
      question: 'Why can I not continue?',
      answer:
        'Setup needs all three answers: the report type, which records to include, and how much detail you need. Each question appears once the one above it is answered.',
    },
  ],

  delivery: [
    {
      id: 'delivery-time',
      question: 'When will my report be delivered?',
      answer:
        'Pick Daily, Weekly or Monthly, then either a set time or Immediately. Immediately sends the report once reconciliation processing is complete, typically within 15 minutes, rather than at a fixed time.',
    },
    {
      id: 'delivery-channels',
      question: 'Can I send the report to more than one place?',
      answer:
        'Yes. Tick as many delivery channels as you need, and fill in the details each one asks for — recipients for Email, a channel ID for Slack.',
    },
    {
      id: 'slack-channel',
      question: 'Where do I find my Slack channel ID?',
      answer:
        'Open the channel in Slack and view its details. The channel ID is at the bottom of the details panel, and starts with a C.',
    },
  ],

  grouping: [
    {
      id: 'grouping-what',
      question: 'What does grouping do to my report?',
      answer:
        'Instead of one row per record, the report keeps one row per combination of the fields you group by — one per gateway and payment method, say — and every other column is rolled up across that group.',
    },
    {
      id: 'grouping-order',
      question: 'Does the order of the fields matter?',
      answer:
        'Yes. The first field is the outermost group and each one after it splits the group above, so grouping by Gateway then Txn Type reads differently from Txn Type then Gateway.',
    },
    {
      id: 'grouping-columns',
      question: 'What happens to a field I group by?',
      answer:
        'It becomes a column, marked Grouped by on the Fields step. Removing it from the grouping later leaves the column in place, so you decide separately whether to keep it.',
    },
  ],

  fields: [
    {
      id: 'organise-columns',
      question: 'How do I reorder, rename, duplicate or remove columns?',
      answer:
        "Drag a column by its handle — the dots and the letter beside them — to reorder it. Double-click a column's name, or use its pencil, to rename it; a renamed column shows an info icon beside its name, and hovering it shows the field its data comes from. Open a column's menu (⋮) to duplicate it, or to transform a date or amount. Remove a column with its ✕, or by unticking its field in the list on the left.",
    },
    {
      id: 'custom-column',
      question: 'What is a custom column?',
      answer:
        'A column you name yourself, with a value you set that every row carries — useful for tagging a report with a region or a batch reference. It is marked Custom, stays in the field list after you remove it, and cannot be renamed, since its name is the field.',
    },
    {
      id: 'data-transform',
      question: 'What does Data Transform do?',
      answer:
        "It changes how a date or amount column is written into the report. For a date, pick the order its day, month and year are written in — the format shows beside the column's name. For an amount, set rules that decide whether a value is written as positive or negative, such as making refunds and chargebacks negative. Open it from the column's menu.",
    },
    {
      id: 'aggregations',
      question: 'What do COUNT, SUM, AVERAGE, MIN and MAX mean on a column?',
      answer:
        'In a grouped report, each column is rolled up across the rows in its group. COUNT counts them, SUM adds them up, AVERAGE takes the mean, and MIN and MAX take the smallest and largest. Only the ones that make sense for a field are offered — dates, for example, can be counted or given their earliest and latest.',
    },
  ],

  filters: [
    {
      id: 'filters-optional',
      question: 'Do I have to add filters?',
      answer:
        'No. Without filters the report includes every record in the scope you chose on Setup. Skip the step, or add conditions to narrow the report down.',
    },
    {
      id: 'filters-combine',
      question: 'How do several conditions work together?',
      answer:
        'They are joined with AND: a row is written to the report only if it matches every condition.',
    },
    {
      id: 'filters-conditions',
      question: 'What is the difference between "equal to" and "in"?',
      answer:
        '"equal to" matches one value. "in" matches any of several values you pick, and "not in" excludes all of them. "is null" and "is not null" check whether the field has a value at all, so they need no value.',
    },
  ],

  review: [
    {
      id: 'review-change',
      question: 'Can I still change something?',
      answer:
        'Yes. Use Back, or pick any step in the list on the left. Your answers on every step are kept, so you can move between steps without losing anything.',
    },
    {
      id: 'review-submit',
      question: 'What happens when I submit?',
      answer:
        "You name the configuration and the file it delivers, and pick the date format that goes into the file's name, so each delivery is a file of its own. Submitting saves the configuration, and the report goes out on the schedule you set.",
    },
  ],
}
