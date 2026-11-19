/**
 * Playground → Fee Card Explained. Every part of a fee ticket, named and defined.
 *
 * Written for someone meeting the card for the first time — a reviewer, a new engineer, a
 * merchant-ops reader — so it defines the payments vocabulary as well as the layout.
 *
 * Every specimen is the **real component** from ../fee/tags.tsx rendered with real data, not
 * a picture of one. That is the point: if the ticket changes, this page changes with it, and
 * a definition that has drifted from the thing it describes shows up here immediately.
 *
 * blend-gap: Blend 0.0.37 has no definition-list or glossary component. A term-and-meaning
 * pair is `<dl>`/`<dt>`/`<dd>` in HTML — semantically a description list, not a table — so it
 * is composed here on PrimitiveText rather than forced into `DataTable`.
 */

import { FOUNDATION_THEME, TagV2Size } from '@juspay/blend-design-system'
import type { ReactNode } from 'react'
import { font, PrimitiveText } from '../../primitives'
import { METHODS, PSPS, type MethodId, type PspId } from '../fee/brands'
import { FEE_RULES, MODE_HINT, lastTouched, type FeeMode, type FeeStatus } from '../fee/data'
import { FeeTicket } from '../fee/FeeTicket'
import { NeutralTag, RuleFoot, RuleHeader, StatusTag, TagRow } from '../fee/tags'
import { HAIRLINE, PANEL_STYLE } from '../pacb/helpers'
import { PacbPage, SectionTitle } from '../pacb/kit'
import { StoryFrame } from './StoryFrame'

const { colors } = FOUNDATION_THEME

/** The ticket's width in the design (Figma 2268:7289). */
const CARD_WIDTH = 653

/** The ticket this page takes apart. Card MDR carries every optional part at once. */
const RULE = FEE_RULES.find((rule) => rule.id === 'card-mdr')!

/** A rule with five acquirers and two methods — the one that shows both overflow counts. */
const WALLET = FEE_RULES.find((rule) => rule.id === 'wallet-pay-later')!

// ─── Page furniture ──────────────────────────────────────────────────────────────────────

/** One explained part: the real thing on the left, what it is on the right. */
function Part({
  specimen,
  name,
  holds,
  children,
}: {
  specimen: ReactNode
  name: string
  /** The field behind it, or the rule that decides it. */
  holds: string
  children: ReactNode
}) {
  return (
    <div
      className="flex flex-col gap-3 py-4 md:flex-row md:items-start md:gap-6"
      style={{ borderTop: HAIRLINE }}
    >
      {/* The specimen sits on the stub's own tint so a white-on-white part is still visible. */}
      <div
        className="flex w-full shrink-0 items-center justify-center overflow-hidden rounded-lg p-3 md:w-[260px]"
        style={{ backgroundColor: colors.gray[25] }}
      >
        {specimen}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <PrimitiveText
            as="h3"
            {...font(FOUNDATION_THEME.font.size.body.md)}
            color={colors.gray[700]}
            fontWeight={FOUNDATION_THEME.font.weight[600]}
          >
            {name}
          </PrimitiveText>
          <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.xs)} color={colors.gray[500]}>
            {holds}
          </PrimitiveText>
        </div>
        <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[500]}>
          {children}
        </PrimitiveText>
      </div>
    </div>
  )
}

/** A block of parts under one heading. */
function Anatomy({ title, blurb, children }: { title: string; blurb: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <SectionTitle>{title}</SectionTitle>
      <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[500]}>
        {blurb}
      </PrimitiveText>
      <div className="mt-2 flex flex-col">{children}</div>
    </div>
  )
}

/** A term and what it means. */
function Term({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1 py-3 sm:flex-row sm:gap-6" style={{ borderTop: HAIRLINE }}>
      <PrimitiveText
        as="span"
        {...font(FOUNDATION_THEME.font.size.body.sm)}
        color={colors.gray[700]}
        fontWeight={FOUNDATION_THEME.font.weight[600]}
        // Wide enough for "Cardless EMI" without wrapping; the meaning takes the rest.
        style={{ width: 150, flexShrink: 0 }}
      >
        {term}
      </PrimitiveText>
      <PrimitiveText
        as="span"
        {...font(FOUNDATION_THEME.font.size.body.sm)}
        color={colors.gray[500]}
      >
        {children}
      </PrimitiveText>
    </div>
  )
}

function Glossary({ title, blurb, children }: { title: string; blurb: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <SectionTitle>{title}</SectionTitle>
      <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.sm)} color={colors.gray[500]}>
        {blurb}
      </PrimitiveText>
      <dl className="mt-2 flex flex-col">{children}</dl>
    </div>
  )
}

/** A panel of swatches — every value a field can take, with the tag that draws it. */
function Values({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col overflow-hidden" style={PANEL_STYLE}>
      {children}
    </div>
  )
}

function Value({ swatch, name, children }: { swatch: ReactNode; name: string; children: ReactNode }) {
  return (
    <div
      className="flex flex-col gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
      style={{ borderTop: HAIRLINE }}
    >
      <span className="flex w-[150px] shrink-0 items-center">{swatch}</span>
      <PrimitiveText
        as="span"
        {...font(FOUNDATION_THEME.font.size.body.sm)}
        color={colors.gray[500]}
      >
        <PrimitiveText
          as="span"
          {...font(FOUNDATION_THEME.font.size.body.sm)}
          color={colors.gray[700]}
        >
          {name}
        </PrimitiveText>{' '}
        — {children}
      </PrimitiveText>
    </div>
  )
}

// ─── Specimens ───────────────────────────────────────────────────────────────────────────

/** The stub's three lines, lifted out of FeeTicket so the page shows the real thing. */
function StubSpecimen({ rate, caption, mode }: { rate?: string; caption?: string; mode?: FeeMode }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      {rate && (
        <PrimitiveText {...font(FOUNDATION_THEME.font.size.heading.md)} color={colors.gray[700]}>
          {rate}
        </PrimitiveText>
      )}
      {caption && (
        <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.xs)} color={colors.gray[500]}>
          {caption}
        </PrimitiveText>
      )}
      {mode && <NeutralTag text={mode} />}
    </div>
  )
}

const STATUS_MEANING: Record<FeeStatus, string> = {
  Active: 'live now, and charging. The only status that takes money.',
  Draft: 'written but never submitted. Nobody has reviewed it and it charges nothing.',
  'Pending approval': 'submitted and waiting on a sign-off. It charges nothing until approved.',
  Expired: 'its end date has passed. It charged until then, and the history stays.',
  Scheduled: 'approved, with a start date still in the future.',
  Inactive: 'switched off by hand. Unlike Expired, it could be switched back on.',
}

const MODE_MEANING: Record<FeeMode, string> = {
  Net: 'taken out of the payout. The merchant receives the amount minus the fee.',
  Gross: 'charged on the full transaction amount, and billed separately from the payout.',
  Surcharge: 'added on top at checkout, so the payer covers it rather than the merchant.',
}

const PSP_IDS = Object.keys(PSPS) as PspId[]
const METHOD_IDS = Object.keys(METHODS) as MethodId[]

/** What each instrument is, in a line. Keyed by the same ids the card renders. */
const METHOD_COPY: Record<MethodId, string> = {
  upi: 'Unified Payments Interface — a real-time bank-to-bank transfer, the default way to pay in India.',
  'upi-lite': 'A low-value UPI wallet held on the phone, so small payments clear without a PIN or a bank round trip.',
  'credit-card': 'A card drawing on a credit line. The most expensive instrument to accept, which is why MDR rules single it out.',
  'debit-card': 'A card drawing on the cardholder’s own balance. Cheaper to accept than credit, and capped by regulation on small amounts.',
  'net-banking': 'A redirect to the payer’s bank to authorise the transfer there. Usually a flat fee rather than a percentage.',
  wallet: 'A stored balance held with a provider such as Paytm or PhonePe, spent without touching a bank.',
  'pay-later': 'A short credit line settled at the end of the month. The merchant is paid now; the payer settles later.',
  'card-emi': 'A card payment the issuer splits into monthly instalments, at the issuer’s own tenure.',
  'cardless-emi': 'The same instalments without a card, on a credit line the lender grants at checkout.',
  all: 'The rule covers every instrument, so no individual tags are drawn.',
}

// ─── The page ────────────────────────────────────────────────────────────────────────────

export default function FeeCardExplained() {
  return (
    <PacbPage title="Fee Card Explained">
      <StoryFrame
        name="The ticket"
        note="One pricing rule, as the Fee page draws it. Everything below is a part of this."
        width={CARD_WIDTH}
        fullscreen
      >
        <FeeTicket rule={RULE} />
      </StoryFrame>

      <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.md)} color={colors.gray[500]}>
        A fee ticket answers four questions in one row: what it charges, what it is called and
        whether it is live, what it applies to, and when. The shape is a receipt — a stub on
        the left with the number, a perforation, and the detail beside it.
      </PrimitiveText>

      <Anatomy
        title="The stub"
        blurb="The tinted column on the left. It holds the number you came to read, and nothing else."
      >
        <Part
          specimen={<StubSpecimen rate={RULE.rate} />}
          name="Rate"
          holds="rule.rate"
        >
          What the rule charges. It can be a percentage (0.5%), a flat amount (₹500), both
          together (₹3 + 1.8% means three rupees plus 1.8% of the transaction), or a range
          where the rule is banded by amount (0–0.6%). The card never computes it — it shows
          the rule as configured.
        </Part>
        <Part
          specimen={<StubSpecimen caption={RULE.rateCaption} />}
          name="Rate caption"
          holds="rule.rateCaption — optional"
        >
          The floor and ceiling on the fee itself, not on the transaction. “₹10–₹500” means a
          1.8% charge is never collected below ₹10 nor above ₹500, however large the payment.
          “≤ ₹100” is a cap with no floor, “≥ ₹25” a floor with no cap. A flat fee has no
          caption, because a fixed amount cannot exceed itself.
        </Part>
        <Part
          specimen={<StubSpecimen mode={RULE.mode} />}
          name="Mode tag"
          holds="rule.mode — Net, Gross or Surcharge"
        >
          Who pays the fee and how it is collected. The three values are set out below. It
          sits in the stub because it qualifies the number directly above it: the same 1.8%
          means different money depending which of the three it is.
        </Part>
      </Anatomy>

      <Values>
        {(Object.keys(MODE_MEANING) as FeeMode[]).map((mode) => (
          <Value key={mode} swatch={<NeutralTag text={mode} />} name={MODE_HINT[mode]}>
            {MODE_MEANING[mode]}
          </Value>
        ))}
      </Values>

      <Anatomy
        title="The body"
        blurb="Everything to the right of the perforation: what the rule is, and what it covers."
      >
        <Part
          specimen={<RuleHeader rule={RULE} />}
          name="Name, status and menu"
          holds="rule.name, rule.status"
        >
          The name is the merchant-facing label and is the only free text on the card; it
          truncates rather than wrapping, so the row height stays fixed down a list. The status
          tag beside it says whether the rule is charging — the six values are below. The ⋮
          menu holds the row’s actions (edit, duplicate, deactivate).
        </Part>
        <Part
          specimen={
            <PrimitiveText
              {...font(FOUNDATION_THEME.font.size.body.sm)}
              color={colors.gray[500]}
            >
              {RULE.description}
            </PrimitiveText>
          }
          name="Scope line"
          holds="rule.description"
        >
          One line on which payments the rule applies to — the condition, in words. “Successful
          Visa, Mastercard and RuPay payments” excludes failed ones; “Payments above ₹10,000”
          is a threshold. Where the tags below say <em>what instrument</em>, this says
          <em> which payments</em>.
        </Part>
        <Part
          specimen={<TagRow rule={{ ...RULE, methods: [] }} />}
          name="Acquirer chips"
          holds="rule.psps"
        >
          Which payment service providers the rule covers, as their logos — a rule can be
          priced differently per acquirer. They overlap because the row is a set, not a
          sequence: the order means nothing. Three fit; beyond that you see two and a count, so
          five acquirers read as two logos and “+3”. A rule covering every acquirer says “All
          PSPs” instead, since there is no list worth drawing.
        </Part>
        <Part
          specimen={<TagRow rule={{ ...RULE, psps: [] }} />}
          name="Method tags"
          holds="rule.methods"
        >
          Which payment instruments it covers. These keep their names rather than going to
          icons alone, because a glyph cannot tell a credit card from a debit card. Two fit;
          a third becomes “+1”. The full list of instruments is in the glossary below.
        </Part>
        <Part
          specimen={<TagRow rule={WALLET} />}
          name="Both rows together, overflowing"
          holds="Wallet and Pay Later Fee"
        >
          Acquirers first, then methods, wrapping as one row. This rule has five acquirers and
          two methods, so it shows both caps at once — the “+3” belongs to the logos before it,
          and the tags after it are the instruments.
        </Part>
        <Part
          specimen={<RuleFoot lead={RULE.effective} rule={RULE} />}
          name="Footer"
          holds="rule.effective, rule.when, rule.who"
        >
          When the rule applies, on the left. An arrow (“01 Nov 2026 →”) means it starts then
          and has no end date; a range (“01 Apr 2026 – 31 Mar 2027”) means it stops. On the
          right, who last changed it and when — provenance, there to be found rather than read,
          which is why it is the smallest type on the card. “System” appears where nobody
          touched it and a date simply passed.
        </Part>
      </Anatomy>

      <Values>
        {(Object.keys(STATUS_MEANING) as FeeStatus[]).map((status) => (
          <Value
            key={status}
            swatch={<StatusTag status={status} size={TagV2Size.SM} />}
            name={status}
          >
            {STATUS_MEANING[status]}
          </Value>
        ))}
      </Values>

      <Glossary
        title="The words"
        blurb="Payments vocabulary that appears on the card or in the rules behind it."
      >
        <Term term="MDR">
          Merchant Discount Rate — the headline fee a merchant pays on a card transaction,
          usually a percentage, often with a flat component. “Card MDR” is the rule that sets
          it.
        </Term>
        <Term term="PSP">
          Payment Service Provider, used here interchangeably with acquirer: the company that
          processes the payment. {PSP_IDS.map((id) => PSPS[id].name).join(', ')}.
        </Term>
        <Term term="Settlement">
          The payout that moves money to the merchant. A Net fee is deducted from it; a Gross
          fee is billed outside it.
        </Term>
        <Term term="Slab">
          A rule priced in bands by transaction amount — ₹1–200 at one rate, ₹200–400 at
          another. The stub shows the span across all bands rather than any one of them.
        </Term>
        <Term term="Chargeback">
          A payment the cardholder disputes and the bank reverses. The fee is charged per
          dispute, win or lose, which is why its rule is a flat amount.
        </Term>
        <Term term="Failed auth">
          An authorisation the bank declined. Some acquirers charge for the attempt, so the
          rule covers payments that never succeeded — the one case where a fee applies to a
          transaction the merchant was not paid for.
        </Term>
        <Term term="Cross-border">
          A payment where the card was issued outside India. It costs the acquirer more, so it
          is usually priced as its own rule.
        </Term>
      </Glossary>

      <Glossary
        title="The instruments"
        blurb="Every value a method tag can take, as the card draws it."
      >
        {METHOD_IDS.map((id) => (
          <Term key={id} term={METHODS[id].name}>
            {METHOD_COPY[id]}
          </Term>
        ))}
      </Glossary>

      <PrimitiveText {...font(FOUNDATION_THEME.font.size.body.xs)} color={colors.gray[500]}>
        Every specimen above is the live component rendered with real data from
        src/pages/fee/data.ts — not a screenshot. Change the ticket and this page changes with
        it. Last touched on this rule: {lastTouched(RULE)}.
      </PrimitiveText>
    </PacbPage>
  )
}
