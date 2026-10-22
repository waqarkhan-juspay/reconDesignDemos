/**
 * Playground → Form 145/146. The four states of FormUploadCard from PACB Figma node 54:28019,
 * each a live card that starts in its state: drop or browse a PDF, reupload, delete, and the
 * card moves between states the way the real one would.
 *
 * "Auto assigned in the backend" is mocked — see use-form-uploads.ts.
 */

import { FormUploadCard, type UploadedForm } from '../pacb/FormUploadCard'
import { PacbPage, SectionTitle } from '../pacb/kit'
import { useFormUploads, type Forms } from '../pacb/use-form-uploads'
import { StoryFrame } from './StoryFrame'

/** The card's width in the design. */
const CARD_WIDTH = 628

/** The design's own values, from data.ts's first payment where they overlap. */
const FILE_ID = 'a3ee3f29-cb70-4790-b0f6-d37cad6b0fc6'
const STAGED_AT = '2026-09-28T18:41:00+05:30'
const FORM_145: UploadedForm = { name: 'AAACJ1234K_260928000654321.pdf' }
const FORM_146: UploadedForm = { name: 'AAACJ1234K_26800123456.pdf' }

function LiveFormCard({ initial }: { initial: Forms }) {
  return <FormUploadCard fileId={FILE_ID} stagedAt={STAGED_AT} {...useFormUploads(initial)} />
}

type Story = { name: string; note: string; forms: Forms }

/** In the design's order. */
const STORIES: Story[] = [
  {
    name: 'No forms uploaded yet',
    note: 'The upload box, and both forms tagged No File Uploaded.',
    forms: {},
  },
  {
    name: 'Only Form 146 uploaded',
    note: 'Form 146 shows its file; the box stays for Form 145.',
    forms: { '146': FORM_146 },
  },
  {
    name: 'Only Form 145 uploaded',
    note: 'Form 145 shows its file; the box stays for Form 146.',
    forms: { '145': FORM_145 },
  },
  {
    name: 'All files uploaded',
    note: 'Both forms in — the upload box goes. Each form keeps Reupload and Delete beside it.',
    forms: { '145': FORM_145, '146': FORM_146 },
  },
]

function FormUploads() {
  return (
    <PacbPage title="Form 145/146">
      <div className="flex flex-col gap-4">
        <SectionTitle>Each state</SectionTitle>
        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
          {STORIES.map(({ name, note, forms }) => (
            <StoryFrame key={name} name={name} note={note} width={CARD_WIDTH}>
              <LiveFormCard initial={forms} />
            </StoryFrame>
          ))}
        </div>
      </div>
    </PacbPage>
  )
}

export default FormUploads
