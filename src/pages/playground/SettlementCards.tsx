/**
 * Playground → Settlement Cards. Every state of the settlement card on its own,
 * Storybook-style, before it goes into the PACB Workflow page. Data is made up to hit each
 * state. Tabs at the top switch between version 3 (SettlementCardV3, node 112:25465) — the
 * newest, and the default — version 2 (SettlementCardV2, node 90:49804), the one the sandbox
 * uses, and version 1, kept for comparison. The tab is in the URL (`?version=2`), so a reload
 * or a shared link opens on the same one.
 */

import {
  FOUNDATION_THEME,
  TabsV2,
  TabsV2List,
  TabsV2Size,
  TabsV2Trigger,
  TabsV2Variant,
} from '@juspay/blend-design-system'
import { useState } from 'react'
import { useSearchParams } from 'react-router'
import { PacbPage, SectionTitle } from '../pacb/kit'
import { SettlementCard, type Settlement } from '../pacb/SettlementCard'
import { SettlementCardV2 } from '../pacb/SettlementCardV2'
import { SettlementCardV3 } from '../pacb/SettlementCardV3'
import { SHOW_FAILED } from '../pacb/settlements'
import { StoryFrame } from './StoryFrame'

const { colors } = FOUNDATION_THEME

/** The card's width in the design (node 33:28101). */
const CARD_WIDTH = 371
/** Version 3's width (node 112:25465). */
const CARD_WIDTH_V3 = 400

const SETTLED_AT = '2026-09-28T13:11:00Z' // 18:41 IST

type Story = { name: string; note: string; settlement: Settlement }

/** In the design's order. */
const ALL_STORIES: Story[] = [
  {
    name: 'All Successful',
    note: 'Moved to the OCA, and every merchant payment has gone out.',
    settlement: {
      settlementId: 'sid-b9385b2c4e7f8a1d09b941495',
      amount: 2723731.75,
      status: 'MOVED',
      utr: 'YESAP62706541892',
      settledAt: SETTLED_AT,
      merchantPayments: 9,
      pendingPayments: 0,
    },
  },
  {
    name: 'All Pending',
    note: 'Moved to the OCA, but no merchant payment has gone out yet.',
    settlement: {
      settlementId: 'sid-3d7364b1a9e2c5f80473150',
      amount: 943.11,
      status: 'MOVED',
      utr: 'YESAP62706541892',
      settledAt: SETTLED_AT,
      merchantPayments: 1,
      pendingPayments: 1,
    },
  },
  {
    name: 'Few Pending',
    note: 'Moved to the OCA; some merchant payments are out, the rest pending.',
    settlement: {
      settlementId: 'sid-3d7364b1a9e2c5f80473150',
      amount: 943.11,
      status: 'MOVED',
      utr: 'YESAP62706541892',
      settledAt: SETTLED_AT,
      merchantPayments: 9,
      pendingPayments: 3,
    },
  },
  {
    name: 'Awaiting OCA',
    note: 'Still in escrow. Merchant payments wait on the move, so no progress yet.',
    settlement: {
      settlementId: 'sid-b9385b2c4e7f8a1d09b941495',
      amount: 2723731.75,
      status: 'AWAITING_OCA',
      settledAt: SETTLED_AT,
      merchantPayments: 83,
    },
  },
  {
    name: 'Failed',
    note: 'The escrow → OCA movement failed; the reason replaces the UTR, the time turns red.',
    settlement: {
      settlementId: 'sid-b9385b2c4e7f8a1d09b941495',
      amount: 2723731.75,
      status: 'FAILED',
      failureReason: 'Failed due to lack of funds',
      settledAt: SETTLED_AT,
      merchantPayments: 9,
    },
  },
]

/** The Failed story stays out while failed settlements are hidden (SHOW_FAILED). */
const STORIES = ALL_STORIES.filter(
  ({ settlement }) => SHOW_FAILED || settlement.status !== 'FAILED',
)

/** Version 2's three tones, in the design's order — each shown at rest and selected. */
const V2_STORIES: Story[] = [
  {
    name: 'Success',
    note: 'Moved to the OCA, every merchant payment out. Green.',
    settlement: ALL_STORIES[0]!.settlement,
  },
  {
    name: 'In Progress',
    note: 'Moved to the OCA, some payments still pending. Yellow, dated like the green one.',
    settlement: { ...ALL_STORIES[2]!.settlement, merchantPayments: 12 },
  },
  {
    name: 'Pending',
    note: 'Still in escrow, so every payment waits on the move. Orange.',
    settlement: ALL_STORIES[3]!.settlement,
  },
  ...(SHOW_FAILED
    ? [
        {
          name: 'Failed',
          note: 'Not in the design — red, with the failure reason where the UTR goes.',
          settlement: ALL_STORIES[4]!.settlement,
        },
      ]
    : []),
]

/** Rest, hover and selected — the card's interaction states, on the All Successful data. */
const INTERACTIONS: { name: string; note: string; hover?: boolean; selected?: boolean }[] = [
  { name: 'Rest', note: 'Hairline in gray 50 — the card barely separates from the page.' },
  { name: 'Hover', note: 'Pinned on here. Live, it shows on a selectable card.', hover: true },
  { name: 'Selected', note: 'The active card. Wins over hover.', selected: true },
]

/**
 * As many frames across as fit: a frame is the 371px card plus 24px padding each side and
 * its 1px border, so a column never squeezes the card and wraps its date.
 */
const STORY_GRID = 'grid gap-6 grid-cols-[repeat(auto-fill,minmax(min(421px,100%),1fr))]'
/** The same for version 3's 400px card. */
const STORY_GRID_V3 = 'grid gap-6 grid-cols-[repeat(auto-fill,minmax(min(450px,100%),1fr))]'

const VERSIONS = [
  { value: '3', label: 'Version 3' },
  { value: '2', label: 'Version 2' },
  { value: '1', label: 'Version 1' },
]

function SettlementCards() {
  // The stacked lists are live: click a card (or Tab to it and press Enter) to select it.
  const [selected, setSelected] = useState<string | null>(STORIES[0]?.name ?? null)
  const [selectedV2, setSelectedV2] = useState<string | null>(V2_STORIES[0]?.name ?? null)
  const [selectedV3, setSelectedV3] = useState<string | null>(V2_STORIES[0]?.name ?? null)
  const [params, setParams] = useSearchParams()
  const version = VERSIONS.find(({ value }) => value === params.get('version'))?.value ?? '3'

  return (
    <PacbPage title="Settlement Cards">
      {/* `w-fit` around the tabs: TabsV2 sizes its list to fit, but wraps it in a full-width
          scroll box, so it is this box that lets the row centre them. */}
      <div className="flex justify-center">
        <div className="w-fit">
          <TabsV2
            variant={TabsV2Variant.BOXED}
            size={TabsV2Size.MD}
            fitContent
            value={version}
            onValueChange={(value) => setParams({ version: value }, { replace: true })}
          >
            <TabsV2List variant={TabsV2Variant.BOXED} size={TabsV2Size.MD}>
              {VERSIONS.map(({ value, label }) => (
                <TabsV2Trigger key={value} value={value} variant={TabsV2Variant.BOXED}>
                  {label}
                </TabsV2Trigger>
              ))}
            </TabsV2List>
          </TabsV2>
        </div>
      </div>

      {version === '3' ? (
        <>
          {/* Version 3 has the same tones as version 2, so it reuses its stories. */}
          <div className="flex flex-col gap-4">
            <SectionTitle>All states</SectionTitle>
            <div className={STORY_GRID_V3}>
              <StoryFrame
                width={CARD_WIDTH_V3}
                surface={colors.gray[0]}
                name="Stacked"
                note="Live — hover a card, click to select it. Hover and selected look the same."
                fullscreen
              >
                <div className="flex flex-col gap-0.5">
                  {V2_STORIES.map(({ name, settlement }) => (
                    <SettlementCardV3
                      key={name}
                      settlement={settlement}
                      selected={selectedV3 === name}
                      onSelect={() => setSelectedV3(name)}
                    />
                  ))}
                </div>
              </StoryFrame>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <SectionTitle>Each state</SectionTitle>
            <div className={STORY_GRID_V3}>
              {V2_STORIES.map(({ name, note, settlement }) => (
                <StoryFrame
                  key={name}
                  name={name}
                  note={note}
                  width={CARD_WIDTH_V3}
                  surface={colors.gray[0]}
                >
                  <div className="flex flex-col gap-3">
                    <SettlementCardV3 settlement={settlement} />
                    <SettlementCardV3 settlement={settlement} selected />
                  </div>
                </StoryFrame>
              ))}
            </div>
          </div>
        </>
      ) : version === '2' ? (
        <>
          {/* The stacked list on a row of its own, the three tones on the row under it —
              the same split as version 1's "All states" and "Each state". */}
          <div className="flex flex-col gap-4">
            <SectionTitle>All states</SectionTitle>
            <div className={STORY_GRID}>
              <StoryFrame
                width={CARD_WIDTH}
                name="Stacked"
                note="Live — hover a card, click to select it."
                fullscreen
              >
                <div className="flex flex-col gap-2">
                  {V2_STORIES.map(({ name, settlement }) => (
                    <SettlementCardV2
                      key={name}
                      settlement={settlement}
                      selected={selectedV2 === name}
                      onSelect={() => setSelectedV2(name)}
                    />
                  ))}
                </div>
              </StoryFrame>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <SectionTitle>Each state</SectionTitle>
            <div className={STORY_GRID}>
              {V2_STORIES.map(({ name, note, settlement }) => (
                <StoryFrame key={name} name={name} note={note} width={CARD_WIDTH}>
                  <div className="flex flex-col gap-3">
                    <SettlementCardV2 settlement={settlement} />
                    <SettlementCardV2 settlement={settlement} selected />
                  </div>
                </StoryFrame>
              ))}
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            <SectionTitle>All states</SectionTitle>
            <StoryFrame
              width={CARD_WIDTH}
              name="Stacked"
              note="The states in a list, as the design's component set lays them out. Live — hover a card, click to select it."
            >
              <div className="flex flex-col gap-2">
                {STORIES.map(({ name, settlement }) => (
                  <SettlementCard
                    key={name}
                    settlement={settlement}
                    selected={selected === name}
                    onSelect={() => setSelected(name)}
                  />
                ))}
              </div>
            </StoryFrame>
          </div>

          <div className="flex flex-col gap-4">
            <SectionTitle>Interaction</SectionTitle>
            <div className={STORY_GRID}>
              {INTERACTIONS.map(({ name, note, hover, selected: isSelected }) => (
                <StoryFrame key={name} name={name} note={note} width={CARD_WIDTH}>
                  <SettlementCard
                    settlement={STORIES[0]!.settlement}
                    previewHover={hover}
                    selected={isSelected}
                  />
                </StoryFrame>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <SectionTitle>Each state</SectionTitle>
            <div className={STORY_GRID}>
              {STORIES.map(({ name, note, settlement }) => (
                <StoryFrame key={name} name={name} note={note} width={CARD_WIDTH}>
                  <SettlementCard settlement={settlement} />
                </StoryFrame>
              ))}
            </div>
          </div>
        </>
      )}
    </PacbPage>
  )
}

export default SettlementCards
