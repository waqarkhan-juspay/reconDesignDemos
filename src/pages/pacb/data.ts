/**
 * Demo data for the PACB Recon module.
 *
 * The five payments the screenshots show are the spine: the Workflow tabs, the MPR and the
 * Form 145/146 table are all views of the same five, so they are written once here and
 * every table derives its rows from them. Change a payment and every tab agrees.
 *
 * Payment Info Generator (once Recon Summary) and Escrow rows start with the rows the screenshots show verbatim, then pad
 * out to a second page deterministically, so pagination has something to do.
 *
 * Timestamps carry an explicit +05:30 because the product shows IST, and the tables label
 * them so.
 */

export const PURPOSE_CODE = 'S0802'
export const BUSINESS_TYPE = 'PA_CB_OUTWARD_NON_LRS'
/** The empty-cell mark the product uses — a hyphen, not an em dash. */
export const EMPTY = '-'

const ist = (date: string, time: string) => `${date}T${time}:00+05:30`

type FileRecord = { name: string; uuid: string; stagedAt: string; createdAt: string }

type Payment = {
  paymentId: string
  settlementId: string
  entityId: string
  lineOfBusiness: string
  amount: number
  adUtrNo: string
  paymentFile: FileRecord
  supportingFile: FileRecord
  form145FileId: string
  mprCreatedAt: string
}

/** The five payments the screenshots show, verbatim. */
const SCREENSHOT_PAYMENTS: Payment[] = [
  {
    paymentId: 'PS68OYWRVK',
    settlementId: 'sid-3e0bb9c89c5d4fa1920e98d2fe3bf41e',
    entityId: 'jpappx',
    lineOfBusiness: 'jpconx',
    amount: 14627.06,
    adUtrNo: 'YESAP62666526272',
    paymentFile: {
      name: 'JuspayA2_jpappx_23092026105650.txt.gpg',
      uuid: '9773916e-426a-4ca6-a14c-783a9b1203b1',
      stagedAt: ist('2026-09-28', '18:41'),
      createdAt: ist('2026-09-23', '16:26'),
    },
    supportingFile: {
      name: 'JuspayNonLRSSUP_PS68OYWRVK_jpappx_PACB_23092026162900.zip',
      uuid: 'c703a2c0-26f7-4cc8-aed7-3207efbb3920',
      stagedAt: ist('2026-09-28', '18:42'),
      createdAt: ist('2026-09-23', '16:29'),
    },
    form145FileId: 'a3ee3f29-cb70-4790-b0f6-d37cad6b0fc6',
    mprCreatedAt: ist('2026-09-23', '16:26'),
  },
  {
    paymentId: 'TYHTDW7OFC',
    settlementId: 'sid-2f99fa024136453faa274f35a7d0c93d',
    entityId: 'jpappx',
    lineOfBusiness: 'jpappx',
    amount: 2049027.54,
    adUtrNo: 'YESAP62666527630',
    paymentFile: {
      name: 'JuspayA2_jpappx_23092026104325.txt.gpg',
      uuid: 'a8f86ffb-36c5-4011-b24a-ed7d55867455',
      stagedAt: ist('2026-09-28', '18:51'),
      createdAt: ist('2026-09-23', '16:13'),
    },
    supportingFile: {
      name: 'JuspayNonLRSSUP_TYHTDW7OFC_jpappx_PACB_23092026161400.zip',
      uuid: 'bfe4e6d6-7f25-4ecf-9b40-519799fffa82',
      stagedAt: ist('2026-09-28', '18:52'),
      createdAt: ist('2026-09-23', '16:14'),
    },
    form145FileId: '76805acb-83c7-4654-9dff-17d626eb5d72',
    mprCreatedAt: ist('2026-09-23', '16:12'),
  },
  {
    paymentId: '4HCAAFZLT8',
    settlementId: 'sid-3d7364bfc6c0477091db9bbd57db7a50',
    entityId: 'jpswgx',
    lineOfBusiness: 'jpswgx',
    amount: 544.59,
    adUtrNo: 'YESAP62666007979',
    paymentFile: {
      name: 'JuspayA2_jpswgxjpswgx_22092026181418.txt.gpg',
      uuid: '269365f9-f196-49f1-bdbd-28e4e3ad817b',
      stagedAt: ist('2026-09-28', '16:31'),
      createdAt: ist('2026-09-22', '23:44'),
    },
    supportingFile: {
      name: 'JuspayNonLRSSUP_4HCAAFZLT8_jpswgxjpswgx_PACB_22092026234400.zip',
      uuid: '97baedf6-5022-4220-86b4-ec0db9c0c28a',
      stagedAt: ist('2026-09-28', '16:33'),
      createdAt: ist('2026-09-22', '23:44'),
    },
    form145FileId: 'e205ee64-58e1-426a-81d9-3112ee5fc8ea',
    mprCreatedAt: ist('2026-09-22', '23:40'),
  },
  {
    paymentId: 'R4I0QJULLT',
    settlementId: 'sid-3625ae398c27436a8724db87fb1ef64a',
    entityId: 'jpappx',
    lineOfBusiness: 'jpappx',
    amount: 2229763.46,
    adUtrNo: 'YESAP62666006050',
    paymentFile: {
      name: 'JuspayA2_jpappx_22092026175812.txt.gpg',
      uuid: '22fb4dba-7b70-48a5-b93b-346e30eabce4',
      stagedAt: ist('2026-09-28', '18:29'),
      createdAt: ist('2026-09-22', '23:28'),
    },
    supportingFile: {
      name: 'JuspayNonLRSSUP_R4I0QJULLT_jpappx_PACB_22092026232900.zip',
      uuid: '560f83d3-62b5-454e-a861-20c9dc64a6a2',
      stagedAt: ist('2026-09-28', '18:31'),
      createdAt: ist('2026-09-22', '23:29'),
    },
    form145FileId: '41708e96-8bea-4dd7-8842-28d1b9ad633d',
    mprCreatedAt: ist('2026-09-22', '23:24'),
  },
  {
    paymentId: 'QTZJGFMLIN',
    settlementId: 'sid-d86eb18fa6ea4fa3bbdc7e7e444933d7',
    entityId: 'jpappx',
    lineOfBusiness: 'jpconx',
    amount: 29526.9,
    adUtrNo: 'YESAP62666006108',
    paymentFile: {
      name: 'JuspayA2_jpappx_22092026174610.txt.gpg',
      uuid: '3da313a3-c253-4d74-8d78-f1a58b105388',
      stagedAt: ist('2026-09-28', '17:55'),
      createdAt: ist('2026-09-22', '23:16'),
    },
    supportingFile: {
      name: 'JuspayNonLRSSUP_QTZJGFMLIN_jpappx_PACB_22092026231700.zip',
      uuid: '29a021be-da06-4d10-ad4e-7780d3961341',
      stagedAt: ist('2026-09-28', '17:57'),
      createdAt: ist('2026-09-22', '23:17'),
    },
    form145FileId: '5e771bcc-fe2c-4bdf-94f9-a00a0299a2f0',
    mprCreatedAt: ist('2026-09-22', '23:13'),
  },
]

/**
 * Ten more, seeded so they are the same on every reload, dated within the Workflow's default
 * range (Sep 22–23) so they show without touching the picker. Shaped like the five above —
 * the same entities, file-name patterns and staging day — so nothing about them reads as
 * filler. The generator is local because the module's own (`seeded`, below) is declared
 * after this list is built.
 */
const seededPayments = (count: number): Payment[] => {
  let seed = 145
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) % 2 ** 32
    return seed / 2 ** 32
  }
  const from = (chars: string, length: number) =>
    Array.from({ length }, () => chars[Math.floor(rand() * chars.length)]).join('')
  const hex = (length: number) => from('0123456789abcdef', length)
  const uuid = () => `${hex(8)}-${hex(4)}-4${hex(3)}-${hex(4)}-${hex(12)}`
  const two = (n: number) => String(n).padStart(2, '0')
  const ENTITIES = [
    ['jpappx', 'jpconx'],
    ['jpappx', 'jpappx'],
    ['jpswgx', 'jpswgx'],
  ] as const
  return Array.from({ length: count }, () => {
    const [entityId, lineOfBusiness] = ENTITIES[Math.floor(rand() * ENTITIES.length)]
    const paymentId = from('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', 10)
    const day = rand() < 0.5 ? 22 : 23
    const hour = 10 + Math.floor(rand() * 13)
    const minute = Math.floor(rand() * 57)
    const date = `2026-09-${day}`
    const stamp = `${day}092026${two(hour)}${two(minute)}00`
    return {
      paymentId,
      settlementId: `sid-${hex(32)}`,
      entityId,
      lineOfBusiness,
      amount: Math.round((rand() < 0.35 ? rand() * 2_400_000 : rand() * 40_000) * 100) / 100,
      adUtrNo: `YESAP6266${from('0123456789', 7)}`,
      paymentFile: {
        name: `JuspayA2_${entityId}_${stamp}.txt.gpg`,
        uuid: uuid(),
        stagedAt: ist('2026-09-28', `${two(16 + Math.floor(rand() * 3))}:${two(Math.floor(rand() * 60))}`),
        createdAt: ist(date, `${two(hour)}:${two(minute)}`),
      },
      supportingFile: {
        name: `JuspayNonLRSSUP_${paymentId}_${entityId}_PACB_${stamp}.zip`,
        uuid: uuid(),
        stagedAt: ist('2026-09-28', `${two(16 + Math.floor(rand() * 3))}:${two(Math.floor(rand() * 60))}`),
        createdAt: ist(date, `${two(hour)}:${two(minute + 1 + Math.floor(rand() * 3))}`),
      },
      form145FileId: uuid(),
      mprCreatedAt: ist(date, `${two(hour)}:${two(Math.max(0, minute - 2))}`),
    }
  })
}

const PAYMENTS: Payment[] = [...SCREENSHOT_PAYMENTS, ...seededPayments(10)]

// ─── PACB Workflow ────────────────────────────────────────────────────────────────────────

/** A file's life: not made yet, made, then staged with the bank. */
export type FileStatus = 'PENDING' | 'CREATED' | 'STAGED'
/** Whether the payment the file carries went through. */
export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED'
export type SettlementStatus = 'PENDING' | 'SUCCESS'

/** A row of the "Generate … File" tables — the payment, and where its file has got to. */
export type GenerateRow = {
  paymentId: string
  settlementId: string
  entityId: string
  lineOfBusiness: string
  purposeCode: string
  merchantBusinessType: string
  settlementAmount: number
  fileStatus: FileStatus
  adUtrNo: string
  merchantUtrNo: string
  paymentStatus: PaymentStatus
  settledAt: string
  fileUuid: string
  createdAt: string
  /**
   * When this payment's *payment* file was made — on the Payment File tab the same moment as
   * Created At, on Supporting File the other file's. The empty mark until it exists.
   */
  paymentFileCreatedAt: string
}

/** A row of the "Stage … File" tables. */
export type StageRow = {
  fileUuid: string
  entityId: string
  purposeCode: string
  paymentId: string
  fileName: string
  stagingStatus: FileStatus
  stagedAt: string
  createdAt: string
}

/**
 * Where each payment's file has got to, and how the payment went — seeded so every state of
 * both status columns shows. Mixed, but only in ways that can happen: a payment succeeds or
 * fails only once its file is staged; before that it is pending.
 *
 *   STAGED  + SUCCESS · STAGED + FAILED · STAGED + PENDING · CREATED + PENDING · PENDING + PENDING
 *
 * Each file type reads the list from its own starting point, so the Payment File and
 * Supporting File tabs show different mixes for the same payments.
 */
const FILE_LIFECYCLE: { file: FileStatus; payment: PaymentStatus }[] = [
  { file: 'STAGED', payment: 'SUCCESS' },
  { file: 'STAGED', payment: 'FAILED' },
  { file: 'CREATED', payment: 'PENDING' },
  { file: 'STAGED', payment: 'PENDING' },
  { file: 'PENDING', payment: 'PENDING' },
]

const lifecycle = (i: number, offset: number) =>
  FILE_LIFECYCLE[(i + offset) % FILE_LIFECYCLE.length]

const generateRows = (file: (p: Payment) => FileRecord, offset: number): GenerateRow[] =>
  PAYMENTS.map((p, i) => {
    const { file: fileStatus, payment: paymentStatus } = lifecycle(i, offset)
    return {
      paymentId: p.paymentId,
      settlementId: p.settlementId,
      entityId: p.entityId,
      lineOfBusiness: p.lineOfBusiness,
      purposeCode: PURPOSE_CODE,
      merchantBusinessType: BUSINESS_TYPE,
      settlementAmount: p.amount,
      fileStatus,
      adUtrNo: p.adUtrNo,
      merchantUtrNo: EMPTY,
      paymentStatus,
      settledAt: EMPTY,
      // A pending file has not been made yet, so it has no UUID to join a staged file on.
      fileUuid: fileStatus === 'PENDING' ? EMPTY : file(p).uuid,
      createdAt: file(p).createdAt,
      // The payment file's own life is the Payment File tab's, read from offset 0.
      paymentFileCreatedAt:
        lifecycle(i, 0).file === 'PENDING' ? EMPTY : p.paymentFile.createdAt,
    }
  })

/** A file record for every payment whose file exists — created or staged. */
const stageRows = (file: (p: Payment) => FileRecord, offset: number): StageRow[] =>
  PAYMENTS.flatMap((p, i) => {
    const status = lifecycle(i, offset).file
    if (status === 'PENDING') return []
    return [
      {
        fileUuid: file(p).uuid,
        entityId: p.entityId,
        purposeCode: PURPOSE_CODE,
        paymentId: p.paymentId,
        fileName: file(p).name,
        stagingStatus: status,
        // Made but not handed to the bank yet: no staging time.
        stagedAt: status === 'STAGED' ? file(p).stagedAt : EMPTY,
        createdAt: file(p).createdAt,
      },
    ]
  })

export const PAYMENT_FILE_GENERATE = generateRows((p) => p.paymentFile, 0)
export const PAYMENT_FILE_STAGE = stageRows((p) => p.paymentFile, 0)
export const SUPPORTING_FILE_GENERATE = generateRows((p) => p.supportingFile, 2)
export const SUPPORTING_FILE_STAGE = stageRows((p) => p.supportingFile, 2)

/**
 * One row per payment, with the file it was staged as joined on: the Generate table's row,
 * plus the Stage table's fields for the same File Uuid. A payment not staged yet keeps the
 * empty mark in those columns. The Workflow file tabs' table, and its row detail sheet.
 */
export type FileRow = GenerateRow & Pick<StageRow, 'fileName' | 'stagedAt'>

export type FormRow = {
  paymentId: string
  entityId: string
  purposeCode: string
  supportingFileStatus: FileStatus
  form145Status: FileStatus
  /** null while the 146 has not been produced — the column shows an empty mark. */
  form146Status: FileStatus | null
  form145FileId: string
  form146FileId: string
  stagedAt: string
  createdAt: string
}

export const FORM_ROWS: FormRow[] = PAYMENTS.map((p) => ({
  paymentId: p.paymentId,
  entityId: p.entityId,
  purposeCode: PURPOSE_CODE,
  supportingFileStatus: 'STAGED',
  form145Status: 'STAGED',
  form146Status: null,
  form145FileId: p.form145FileId,
  form146FileId: EMPTY,
  stagedAt: p.supportingFile.stagedAt,
  createdAt: p.supportingFile.createdAt,
}))

export type MprRow = {
  paymentId: string
  entityId: string
  lineOfBusiness: string
  purposeCode: string
  adUtrNo: string
  merchantUtrNo: string
  mprStatus: 'PENDING' | 'GENERATED'
  settlementAmount: number
  settlementId: string
  createdAt: string
}

export const MPR_ROWS: MprRow[] = PAYMENTS.map((p) => ({
  paymentId: p.paymentId,
  entityId: p.entityId,
  lineOfBusiness: p.lineOfBusiness,
  purposeCode: PURPOSE_CODE,
  adUtrNo: p.adUtrNo,
  merchantUtrNo: EMPTY,
  mprStatus: 'PENDING',
  settlementAmount: p.amount,
  settlementId: p.settlementId,
  createdAt: p.mprCreatedAt,
}))

// ─── Transaction Report ──────────────────────────────────────────────────────────────────

/**
 * The bank's transaction report, as the screenshot shows it: each report file the bank
 * sends, and the transactions inside it matched back to our payments. These are the bank's
 * own references, so they are not drawn from PAYMENTS.
 */
export type ReportStatus = 'SUCCESS' | 'FAILED'

export type TransactionReportRow = {
  paymentId: string
  settlementDate: string
  fileUuid: string
  entityId: string
  utr: string
  settlementAmount: number
  originalCurrency: string
  exchangeRate: number
  originalAmount: number
  transactionType: string
  updationStatus: ReportStatus
  createdAt: string
  processedAt: string
}

export const TRANSACTION_REPORT_ROWS: TransactionReportRow[] = [
  {
    paymentId: '86N8FB406N',
    settlementDate: ist('2026-09-21', '11:00'),
    fileUuid: 'eb8e2d4c-b635-11f1-9023-37d32ac43b13',
    entityId: 'jpswgx',
    utr: '3716060456',
    settlementAmount: 546.36,
    originalCurrency: 'USD',
    exchangeRate: 95.882,
    originalAmount: 5.7,
    transactionType: 'ORDER',
    updationStatus: 'SUCCESS',
    createdAt: ist('2026-09-22', '09:02'),
    processedAt: ist('2026-09-22', '09:02'),
  },
  {
    paymentId: '77LZBC6MFC',
    settlementDate: ist('2026-09-21', '11:00'),
    fileUuid: 'eb8e2d4c-b635-11f1-9023-37d32ac43b13',
    entityId: 'jpytbx',
    utr: '3716060566',
    settlementAmount: 427.55,
    originalCurrency: 'USD',
    exchangeRate: 95.857,
    originalAmount: 4.46,
    transactionType: 'ORDER',
    updationStatus: 'SUCCESS',
    createdAt: ist('2026-09-22', '09:02'),
    processedAt: ist('2026-09-22', '09:02'),
  },
]

export type ReportFileRow = {
  fileUuid: string
  fileName: string
  fileStatus: ReportStatus
  createdAt: string
  /** The empty mark until the bank's file has been read — a FAILED file never is. */
  processedAt: string
}

export const REPORT_FILE_ROWS: ReportFileRow[] = [
  {
    fileUuid: '15d74272-b6ff-11f1-9145-a1833cd92d03',
    fileName: 'Juspay_STMT_202609222235.csv',
    fileStatus: 'FAILED',
    createdAt: ist('2026-09-23', '09:02'),
    processedAt: EMPTY,
  },
  {
    fileUuid: 'eb8e2d4c-b635-11f1-9023-37d32ac43b13',
    fileName: 'Juspay_STMT_202609212235.csv',
    fileStatus: 'SUCCESS',
    createdAt: ist('2026-09-22', '09:02'),
    // 2026-09-22T03:32:02Z in the screenshot — the same instant, written in IST like the rest.
    processedAt: ist('2026-09-22', '09:02'),
  },
]

/**
 * Payments still waiting for a report line, per the screenshot's Pending tile. The report
 * carries no row for them yet, so there is nothing to count — the figure is the product's.
 */
export const TRANSACTION_REPORT_PENDING = 5

// ─── Generated rows for the two paginated pages ──────────────────────────────────────────

/** A small seeded generator, so padded rows are the same on every reload. */
const seeded = (seed: number) => () => {
  seed = (seed * 1664525 + 1013904223) % 2 ** 32
  return seed / 2 ** 32
}

const hex = (rand: () => number, length: number) =>
  Array.from({ length }, () => Math.floor(rand() * 16).toString(16)).join('')

const uuid = (rand: () => number) =>
  `${hex(rand, 8)}-${hex(rand, 4)}-4${hex(rand, 3)}-${hex(rand, 4)}-${hex(rand, 12)}`

const pick = <T,>(rand: () => number, items: readonly T[]) =>
  items[Math.floor(rand() * items.length)]

const pad = (n: number) => String(n).padStart(2, '0')

// ─── Payment Info Generator (the screenshots' "Recon Summary") ──────────────────────────────

export type PiStatus = 'HOLD' | 'READY' | 'GENERATED'

export type ReconRow = {
  /** Row identity. Recon IDs repeat — one recon covers several entities — so not that. */
  rowId: string
  reconId: string
  paymentId: string
  entityId: string
  lineOfBusiness: string
  purposeCode: string
  businessType: string
  paymentEntity: string
  piStatus: PiStatus
  settlementAmount: number
  adUtrNo: string
  merchantUtrNo: string
  settlementId: string
  createdAt: string
  updatedAt: string
} & SettlementComponents

/**
 * What a settlement is made of. The amounts net to the settlement exactly:
 *
 *   settlement = order − refund − chargeback − dispute − fee − tax − surcharge − hold + release
 *
 * so the detail sheet can show one row's parts and the breakdown modal can total them, and
 * both agree with the Settlement Amount column and the stat card.
 */
export type SettlementComponents = {
  orderAmount: number
  refundAmount: number
  chargebackAmount: number
  disputeAmount: number
  feeAmount: number
  taxAmount: number
  surchargeAmount: number
  holdAmount: number
  releaseAmount: number
  orderCount: number
  refundCount: number
}

const r3 = (n: number) => Math.round(n * 1000) / 1000

/**
 * Splits a settlement into parts with the shape the product's breakdown shows: refunds on
 * some settlements, a 0.35% fee on every order amount, 18% tax on the fee, the rest zero.
 */
function componentsOf(settlement: number, rand: () => number): SettlementComponents {
  const refundRate = rand() < 0.5 ? 0 : rand() * 0.15
  const feeRate = 0.0035
  const grossOrder = settlement / (1 - refundRate - feeRate * 1.18)
  const refundAmount = r3(grossOrder * refundRate)
  const feeAmount = r3(grossOrder * feeRate)
  const taxAmount = r3(feeAmount * 0.18)
  return {
    orderAmount: r3(settlement + refundAmount + feeAmount + taxAmount),
    refundAmount,
    chargebackAmount: 0,
    disputeAmount: 0,
    feeAmount,
    taxAmount,
    surchargeAmount: 0,
    holdAmount: 0,
    releaseAmount: 0,
    // Roughly one order per ₹150 and one refund per ₹400 — enough for the counts to look
    // like the product's (21,123 orders against 422 refunds).
    orderCount: Math.max(1, Math.round(grossOrder / 150)),
    refundCount: refundAmount ? Math.max(1, Math.round(refundAmount / 400)) : 0,
  }
}

const PAYMENT_ENTITY = 'yes_biz_77367ac0'

type ReconBase = Omit<ReconRow, 'rowId' | 'updatedAt' | keyof SettlementComponents>

const RECON_SHOWN: ReconBase[] = [
  ['6d634d0c-a477-4525-8376-ee3d09c07d50', 'jpappx', 'jpconx', 26874.302, ist('2026-09-29', '12:14')],
  ['6d634d0c-a477-4525-8376-ee3d09c07d50', 'jpappx', 'jpappx', 2243751.871, ist('2026-09-29', '12:14')],
  ['6d634d0c-a477-4525-8376-ee3d09c07d50', 'jpytbx', EMPTY, 158.537, ist('2026-09-29', '12:14')],
  ['6d634d0c-a477-4525-8376-ee3d09c07d50', 'jpswgx', 'jpswgx', 58.664, ist('2026-09-29', '12:14')],
  ['b405e06a-98a6-4c05-93db-b73e7443542e', 'jpappx', 'jpappx', 2566571.342, ist('2026-09-28', '13:02')],
].map(([reconId, entityId, lineOfBusiness, settlementAmount, createdAt]) => ({
  reconId: reconId as string,
  paymentId: EMPTY,
  entityId: entityId as string,
  lineOfBusiness: lineOfBusiness as string,
  purposeCode: PURPOSE_CODE,
  businessType: BUSINESS_TYPE,
  paymentEntity: PAYMENT_ENTITY,
  piStatus: 'HOLD',
  settlementAmount: settlementAmount as number,
  adUtrNo: EMPTY,
  merchantUtrNo: EMPTY,
  settlementId: EMPTY,
  createdAt: createdAt as string,
}))

const ENTITIES = [
  ['jpappx', 'jpappx'],
  ['jpappx', 'jpconx'],
  ['jpswgx', 'jpswgx'],
  ['jpytbx', EMPTY],
] as const

function padRecon(count: number): ReconBase[] {
  const rand = seeded(7)
  const rows: ReconBase[] = []
  let reconId = uuid(rand)
  for (let i = 0; i < count; i++) {
    // Runs of 2–4 rows share a recon, as the first page does.
    if (i % 3 === 0) reconId = uuid(rand)
    const [entityId, lineOfBusiness] = pick(rand, ENTITIES)
    const day = 22 + Math.floor(rand() * 7)
    rows.push({
      reconId,
      paymentId: EMPTY,
      entityId,
      lineOfBusiness,
      purposeCode: PURPOSE_CODE,
      businessType: BUSINESS_TYPE,
      paymentEntity: PAYMENT_ENTITY,
      piStatus: 'HOLD',
      // Mostly small, occasionally a large settlement — the shape of the real page.
      settlementAmount: Math.round((rand() < 0.3 ? rand() * 2_600_000 : rand() * 30_000) * 1000) / 1000,
      adUtrNo: EMPTY,
      merchantUtrNo: EMPTY,
      settlementId: EMPTY,
      createdAt: ist(`2026-09-${pad(day)}`, `${pad(10 + Math.floor(rand() * 12))}:${pad(Math.floor(rand() * 60))}`),
    })
  }
  return rows
}

const componentRand = seeded(19)

export const RECON_ROWS: ReconRow[] = [...RECON_SHOWN, ...padRecon(25)].map((row, i) => ({
  ...row,
  ...componentsOf(row.settlementAmount, componentRand),
  rowId: `recon-${i}`,
  updatedAt: row.createdAt,
}))

/**
 * The rows of the Settlement Breakdown modal, in the product's order. `count` names the
 * component that carries a count; the rest show the empty mark.
 */
export const BREAKDOWN_CATEGORIES: {
  label: string
  amount: keyof SettlementComponents
  count?: keyof SettlementComponents
  /** How the component enters the settlement — see the formula on SettlementComponents. */
  sign: 1 | -1
}[] = [
  { label: 'Order', amount: 'orderAmount', count: 'orderCount', sign: 1 },
  { label: 'Refund', amount: 'refundAmount', count: 'refundCount', sign: -1 },
  { label: 'Chargeback', amount: 'chargebackAmount', sign: -1 },
  { label: 'Dispute', amount: 'disputeAmount', sign: -1 },
  { label: 'Fee', amount: 'feeAmount', sign: -1 },
  { label: 'Tax', amount: 'taxAmount', sign: -1 },
  { label: 'Surcharge', amount: 'surchargeAmount', sign: -1 },
  { label: 'Hold', amount: 'holdAmount', sign: -1 },
  { label: 'Release', amount: 'releaseAmount', sign: 1 },
]

// ─── Escrow to OCA Fund Movement ─────────────────────────────────────────────────────────

export type EscrowRow = {
  settlementId: string
  entityId: string
  settlementAmount: number
  settlementStatus: SettlementStatus
  utrNo: string
  createdBy: string
  approvedBy: string
  settledAt: string
}

const ESCROW_SHOWN: EscrowRow[] = (
  [
    ['sid-b9385b6f08bd4089b6a7ab3f6b941495', 998.75, 'YESAP62716445181', 'hyperpg_pragati_katiyar', 'hyperpg_sushmitha', ist('2026-09-28', '16:04')],
    ['sid-359403e731c142dfa6e00fcb637821b5', 27931.19, 'YESAP62716444307', 'hyperpg_pragati_katiyar', 'hyperpg_sushmitha', ist('2026-09-28', '16:05')],
    ['sid-9a0dbea41a6448a5b49cf1733bc8d738', 2183871.18, 'YESAP62716445084', 'hyperpg_pragati_katiyar', 'hyperpg_sushmitha', ist('2026-09-28', '16:04')],
    ['sid-0bc71e848d4e4e9f8008eaa2cf3418da', 27210.45, 'YESAP62706541892', 'hyperpg_naveen_a', 'hyperpg_sushmitha', ist('2026-09-27', '19:46')],
    ['sid-f799b9a4a0044ee8bab42ae8894aa16c', 2167009.13, 'YESAP62706541805', 'hyperpg_naveen_a', 'hyperpg_sushmitha', ist('2026-09-27', '19:45')],
    ['sid-5146022693604174afa8fb5dc31b9aa2', 98.82, 'YESAP62696650254', 'hyperpg_naveen_a', 'hyperpg_sushmitha', ist('2026-09-26', '20:15')],
    ['sid-ded95769b6ec47d7a333a5b44450d5db', 20553.92, 'YESAP62696651066', 'hyperpg_naveen_a', 'hyperpg_sushmitha', ist('2026-09-26', '20:15')],
    ['sid-f83172d9d2224fcbb1d8ed88f53c4546', 2087513.43, 'YESAP62696651128', 'hyperpg_naveen_a', 'hyperpg_sushmitha', ist('2026-09-26', '20:15')],
    ['sid-4c2a5a37259043c585bf763896c601ba', 2014429.3, 'YESAP62686908654', 'hyperpg_naveen_a', 'hyperpg_garima_suryavanshi', ist('2026-09-25', '20:06')],
    ['sid-a9c5838e3d374157be0885bab591f26e', 24329.97, 'YESAP62686908750', 'hyperpg_naveen_a', 'hyperpg_garima_suryavanshi', ist('2026-09-25', '20:07')],
  ] as const
).map(([settlementId, settlementAmount, utrNo, createdBy, approvedBy, settledAt]) => ({
  settlementId,
  entityId: 'AD_CITI',
  settlementAmount,
  settlementStatus: 'SUCCESS',
  utrNo,
  createdBy,
  approvedBy,
  settledAt,
}))

function padEscrow(count: number): EscrowRow[] {
  const rand = seeded(11)
  return Array.from({ length: count }, (_, i) => ({
    settlementId: `sid-${hex(rand, 32)}`,
    entityId: 'AD_CITI',
    settlementAmount: Math.round((rand() < 0.4 ? rand() * 2_200_000 : rand() * 30_000) * 100) / 100,
    settlementStatus: 'SUCCESS' as const,
    utrNo: `YESAP626${String(76000000 + Math.floor(rand() * 999999)).padStart(8, '0')}`,
    createdBy: 'hyperpg_naveen_a',
    approvedBy: i % 2 ? 'hyperpg_sushmitha' : 'hyperpg_garima_suryavanshi',
    settledAt: ist(`2026-09-${pad(22 + (i % 3))}`, `${pad(19 + (i % 3))}:${pad(Math.floor(rand() * 60))}`),
  }))
}

export const ESCROW_ROWS: EscrowRow[] = [...ESCROW_SHOWN, ...padEscrow(6)]
