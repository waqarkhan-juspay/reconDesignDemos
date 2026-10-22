/**
 * Live upload state for a FormUploadCard — the Playground's stories and the payment detail
 * panel both drive the card with this, so it moves between its states the same way in both.
 *
 * "Auto assigned in the backend" is mocked: a file whose name says 145 or 146 goes to that
 * form, anything else fills whichever form is still missing (145 first).
 */

import { useEffect, useRef, useState } from 'react'
import type { FormKind, UploadedForm } from './FormUploadCard'
import type { PaymentDetail } from './settlements'

export type Forms = Partial<Record<FormKind, UploadedForm>>

/** The forms a payment opens with, named the way PACB names them. */
export function seededForms(detail: PaymentDetail): Forms {
  const seeded = (kind: FormKind): UploadedForm => ({
    name: `${detail.paymentFile.name.split('_')[1] ?? 'FORM'}_${kind}_${detail.form145FileId.slice(0, 8)}.pdf`,
  })
  return Object.fromEntries(detail.formsUploaded.map((kind) => [kind, seeded(kind)]))
}

/** Where the mocked backend puts a file — see the note at the top. */
function assign(forms: Forms, name: string): FormKind | null {
  if (/146/.test(name)) return '146'
  if (/145/.test(name)) return '145'
  if (!forms['145']) return '145'
  if (!forms['146']) return '146'
  return null
}

/** `forms` plus the card's three handlers, ready to spread onto FormUploadCard. */
export function useFormUploads(initial: Forms | (() => Forms)) {
  const [forms, setForms] = useState<Forms>(initial)

  // Object URLs for files picked here are released when the card goes.
  const urls = useRef<string[]>([])
  useEffect(() => () => urls.current.forEach((url) => URL.revokeObjectURL(url)), [])
  const toForm = (file: File): UploadedForm => {
    const url = URL.createObjectURL(file)
    urls.current.push(url)
    return { name: file.name, url }
  }

  return {
    forms,
    onUpload: (files: File[]) =>
      setForms((current) =>
        files.reduce<Forms>((next, file) => {
          const kind = assign(next, file.name)
          return kind ? { ...next, [kind]: toForm(file) } : next
        }, current),
      ),
    onReplace: (kind: FormKind, file: File) =>
      setForms((current) => ({ ...current, [kind]: toForm(file) })),
    onDelete: (kind: FormKind) =>
      setForms((current) => {
        const next = { ...current }
        delete next[kind]
        return next
      }),
  }
}
