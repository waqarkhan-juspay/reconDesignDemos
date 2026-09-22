/**
 * Plausible values for every field in the report vocabulary, three rows deep.
 *
 * Two screens draw a preview of the file a config will produce — the Fields step, where the
 * columns are being chosen, and the Review step, where they are read back — and both were
 * previously guessing at cell contents on their own. The Fields step was not even guessing:
 * it drew three empty rows, which said "a table" but not "your table".
 *
 * ## Why three rows, and why they differ
 *
 * Three is the smallest number that shows a column *varying*: two rows of `1100.000000` could
 * be a rendering bug, three reads as data. So every field here carries three values rather
 * than one repeated — except the ones that genuinely do not vary within a file, like the
 * merchant and the currency, where repeating is the honest answer.
 *
 * ## Lookup
 *
 * Keyed on the field name, matched case- and space-insensitively, because column titles are
 * free text the user can rename: having typed "merchant id", they still mean Merchant Id.
 * That is the same rule `isFieldSelected` uses in answers.ts, so a tag that lights up and a
 * column that fills with data can never disagree about what a title means.
 */

const normalise = (value: string) => value.trim().toLowerCase()

/** How many rows every field below supplies. Both previews draw exactly this many. */
export const SAMPLE_ROW_COUNT = 3

/**
 * The vocabulary: the transaction fields in FIELD_TAGS order (answers.ts), then the four
 * aggregates in a block of their own — see the comment beside them.
 *
 * The three rows tell one consistent story on purpose: one settled order, one refund, one
 * larger order, all for the same merchant across two days. So a reader who reads across a
 * row gets a record that makes sense, rather than five unrelated columns that happen to be
 * side by side — which is the whole difference between a preview and a placeholder.
 */
const SAMPLES: Record<string, readonly [string, string, string]> = {
  // The bank's reference for the credit — the other half of every match in this file, which
  // is why even the mismatched row has one: it was matched, and then disagreed on amount.
  // Sequential across the two rows that settled together, and apart for the one that did not.
  'Bank Reference Number': ['UTR0092841773', 'UTR0092841774', 'UTR0092847106'],
  Credit: ['1,100.00', '0.00', '2,450.75'],
  Debit: ['0.00', '860.50', '0.00'],
  Fee: ['12.98', '10.15', '28.92'],
  Gateway: ['PAYU', 'RAZORPAY', 'PAYU'],
  // "ID" is the row's own identifier in the source system, not a transaction reference —
  // short and opaque, which is what distinguishes it from Payment Entity Txn Id beside it.
  ID: ['8841207', '8841208', '8841209'],
  Label: ['Subscription', 'Refund', 'One-time'],
  // Constant down the column, and deliberately: one config belongs to one merchant, so a
  // varying merchant id here would misrepresent what the delivered file contains.
  'Merchant Id': ['Demo Merchant', 'Demo Merchant', 'Demo Merchant'],
  'Payment Entity Txn Id': ['19933239749', '19933239812', '19933240067'],
  // Upper case, like Gateway and Txn Type beside it: these are the source file's own values,
  // not prose. Three different instruments, because a column where every row said UPI would
  // not show that this is the field a report gets cut by.
  'Payment Method': ['UPI', 'CARD', 'NETBANKING'],
  'Recon Id': ['RCN0004821', 'RCN0004822', 'RCN0004823'],
  'Recon Secondary Status': ['Settled', 'Pending', 'Settled'],
  'Recon Secondary Sub Status': ['Bank confirmed', 'Awaiting bank file', 'Bank confirmed'],
  // The one mismatch in the set. A preview where every row reconciled says nothing about
  // what the report is for — the whole point of a recon file is the row that did not.
  'Recon Status': ['MATCHED', 'MISMATCHED', 'MATCHED'],
  'Recon Sub Status': ['Exact match', 'Amount mismatch', 'Exact match'],
  'Reconciled At': ['2026-09-15 11:02:14', '2026-09-15 11:04:38', '2026-09-16 09:17:05'],
  // The same figures as Debit, and necessarily so: the middle row is the refund, and the
  // money that left is the money that was refunded. Zero on the two order rows rather than a
  // blank, because a refund column on an order row is a real 0.00 and not a missing value.
  'Refund Amount': ['0.00', '860.50', '0.00'],
  // Txn amount less fee and tax, so a reader checking the arithmetic across a row finds it
  // holds. The mismatched row is the exception, which is why it is the mismatched one.
  'Settlement Amount': ['1,084.68', '848.52', '2,416.62'],
  'Settlement Currency': ['INR', 'INR', 'INR'],
  'Settlement Date': ['2026-09-16', '2026-09-16', '2026-09-17'],
  Tax: ['2.34', '1.83', '5.21'],
  // Six decimal places, matching the gateway files these reports are built from.
  'Txn Amount': ['1100.000000', '860.500000', '2450.750000'],
  'Txn Currency': ['INR', 'INR', 'INR'],
  'Txn Date': ['2026-09-15', '2026-09-15', '2026-09-16'],
  'Txn Type': ['ORDER', 'REFUND', 'ORDER'],

  // The four aggregates, grouped at the end rather than scattered alphabetically through the
  // list above, because what they share matters more than where their names sort: each one
  // describes a whole report rather than one transaction, so their three rows are three
  // *groups* (a report is grouped once a Group by rule is set) where every other field's are
  // three transactions.
  //
  // Held to the same bar as the rest of the file all the same: total less failures over total
  // gives the success rate on every row, and the amounts sit around the ~1,100 average that
  // the Txn Amount column shows, so a reader who checks the arithmetic finds it holds.
  'Failure Count': ['23', '51', '18'],
  'Success Rate': ['98.21%', '94.70%', '99.12%'],
  'Total Amount': ['1,412,480.00', '827,315.50', '2,290,640.75'],
  'Total Transactions': ['1,284', '963', '2,047'],
}

/** Resolved once, so every lookup is not re-lowercasing twenty-six keys. */
const BY_NORMALISED_NAME = new Map(
  Object.entries(SAMPLES).map(([name, values]) => [normalise(name), values]),
)

/**
 * What a column with no sample of its own shows.
 *
 * An em dash rather than a blank: a cell that renders empty reads as a value that failed to
 * load, where a dash reads as "this column has no example", which is what it is. A custom
 * column the user gave a default value to never reaches this — see `sampleFor`.
 */
export const SAMPLE_FALLBACK = '—'

/**
 * The value a column shows in row `index`.
 *
 * `fallback` is for a custom column: the Fields step lets you give one a default value, and
 * a column whose every row is that value is exactly what the file will contain — so the
 * preview shows it rather than a dash.
 */
export const sampleFor = (title: string, index: number, fallback?: string): string => {
  const values = BY_NORMALISED_NAME.get(normalise(title))
  if (values) return values[index % SAMPLE_ROW_COUNT]
  return fallback?.trim() || SAMPLE_FALLBACK
}
