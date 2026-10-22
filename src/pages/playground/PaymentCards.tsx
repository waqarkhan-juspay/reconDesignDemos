/**
 * Playground → Payment Card. Every state of PaymentCard on its own, Storybook-style, before it
 * goes into a page. Data is the PACB demo's own payments where it can be (PS68OYWRVK is
 * the first one data.ts carries); the second status is made up to show it.
 */

import { useState } from 'react'
import { PacbPage, SectionTitle } from '../pacb/kit'
import { PaymentCard, type MerchantPayment } from '../pacb/PaymentCard'
import { StoryFrame } from './StoryFrame'

/** The row's width in the design (node 28:7747). */
const CARD_WIDTH = 408

type Story = { name: string; note: string; payment: MerchantPayment }

const STORIES: Story[] = [
  {
    name: 'Success',
    note: 'The payment reached the merchant. The design draws this one.',
    payment: {
      paymentId: 'PS68OYWRVK',
      amount: 1500.5,
      entityId: 'jpappx',
      lineOfBusiness: 'jpconx',
      status: 'SUCCESS',
    },
  },
  {
    name: 'Pending',
    note: 'Sent, not yet confirmed by the bank. In the design (node 52:16567).',
    payment: {
      paymentId: 'TYHTDW7OFC',
      amount: 2049027.54,
      entityId: 'jpappx',
      lineOfBusiness: 'jpappx',
      status: 'PENDING',
    },
  },
]

/** Rest, hover and selected — hover and selected are one look in the design. */
const INTERACTIONS: { name: string; note: string; hover?: boolean; selected?: boolean }[] = [
  { name: 'Rest', note: 'White fill.' },
  {
    name: 'Hover',
    note: 'Fill turns the selection grey. Pinned on here; live, it shows on a selectable row.',
    hover: true,
  },
  {
    name: 'Selected',
    note: 'The same fill as hover — the design makes them one state.',
    selected: true,
  },
]

function PaymentCards() {
  // The stacked list is live: click a row (or Tab to it and press Enter) to select it.
  const [selected, setSelected] = useState<string | null>(STORIES[0]?.name ?? null)

  return (
    <PacbPage title="Payment Card">
      <div className="flex flex-col gap-4">
        <SectionTitle>In a list</SectionTitle>
        <StoryFrame
          name="Stacked"
          note="Rows sit flush, divided by their own bottom hairline. Live — hover a row, click to select it."
          width={CARD_WIDTH}
        >
          <div className="flex flex-col">
            {STORIES.map(({ name, payment }) => (
              <PaymentCard
                key={name}
                payment={payment}
                selected={selected === name}
                onSelect={() => setSelected(name)}
              />
            ))}
          </div>
        </StoryFrame>
      </div>

      <div className="flex flex-col gap-4">
        <SectionTitle>Interaction</SectionTitle>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {INTERACTIONS.map(({ name, note, hover, selected: isSelected }) => (
            <StoryFrame key={name} name={name} note={note} width={CARD_WIDTH}>
              <PaymentCard
                payment={STORIES[1]!.payment}
                previewHover={hover}
                selected={isSelected}
              />
            </StoryFrame>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <SectionTitle>Each state</SectionTitle>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {STORIES.map(({ name, note, payment }) => (
            <StoryFrame key={name} name={name} note={note} width={CARD_WIDTH}>
              <PaymentCard payment={payment} />
            </StoryFrame>
          ))}
        </div>
      </div>
    </PacbPage>
  )
}

export default PaymentCards
