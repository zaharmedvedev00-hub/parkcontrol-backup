const SHEET_ID = '1BdBS2lLKb5Km2w_Bqcxi4GVS5q_BZ5-ruw5nc2u0Dm0'

export const ALL_GIDS = [
  2119731043, 265746799, 1786914141, 875120586, 161201515, 1605343076, 614872750, 91863974,
  681288130, 1520810561, 1093757521, 972009549, 624949989, 276596765, 205550048, 145824777,
  677755366, 1364682492, 320656259, 595216678, 179748354, 2053822111, 1083372305, 53934609,
  1265193052, 1269297523, 1332756018, 933372361, 25359567, 496283420, 1460966908, 1770698919,
  1848219774, 526358405, 387084116, 1080419162, 303401524, 1615829481, 1312020272, 2058750323,
  94986330, 1831852396, 312985610, 1247236094, 749512712, 561494872, 1351149484, 591686161,
  2010916176, 608903783, 166545385, 1553804696, 215623685, 487294156, 1875687866, 237522938,
  1083090021, 684188645, 826733150, 1101815441, 2135827853,
] as const

const ISSUE_HINTS = ['долив', 'то', 'резерв', 'короб', 'гидравл', 'редукт', 'двигат', 'мост', 'охлажд']
const RECEIPT_HINTS = ['поступ', 'приход', 'остаток', 'расход', 'конец', 'начало', 'факт', 'план']

export interface ImportedIssueRow {
  productName: string
  date: string
  quantity: number
  purpose?: string
  recipient?: string
  vehicleLabel?: string
  issuer?: string
  note?: string
  runHours?: string
  gid: number
}

export interface ImportedReceiptRow {
  productName: string
  date: string
  quantity: number
  documentNo?: string
  note?: string
  gid: number
}

export interface ImportedBalanceRow {
  productName: string
  receipt: number
  issue: number
  current: number
  gid: number
}

export interface ImportProgress {
  current: number
  total: number
  gid: number
  issuesFound: number
  receiptsFound: number
  balancesFound: number
}

export interface ImportResult {
  issues: ImportedIssueRow[]
  receipts: ImportedReceiptRow[]
  balances: ImportedBalanceRow[]
  processed: number
  matchedIssueSheets: number
  matchedBalanceSheets: number
}

type GvizCell = { v?: unknown; f?: string | null } | null
type GvizRow = { c?: GvizCell[] }
type GvizResponse = { table?: { rows?: GvizRow[] } }

function stripWrapper(text: string): string {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) return text
  return text.slice(start, end + 1)
}

function normalize(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function cellToString(cell: GvizCell): string {
  if (!cell) return ''
  if (typeof cell.f === 'string' && cell.f.trim()) return String(cell.f).trim()
  if (cell.v == null) return ''
  return String(cell.v).trim()
}

function parseDateCell(cell: GvizCell): string {
  if (!cell) return ''
  if (typeof cell.v === 'string') {
    const value = cell.v.trim()
    const gvizMatch = value.match(/^Date\((\d+),(\d+),(\d+)\)$/)
    if (gvizMatch) {
      const year = Number(gvizMatch[1])
      const month = Number(gvizMatch[2]) + 1
      const day = Number(gvizMatch[3])
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }

    const ruMatch = value.match(/^(\d{1,2})\.(\d{1,2})(?:\.(\d{2,4}))?$/)
    if (ruMatch) {
      const day = Number(ruMatch[1])
      const month = Number(ruMatch[2])
      const year = ruMatch[3] ? Number(ruMatch[3].length === 2 ? `20${ruMatch[3]}` : ruMatch[3]) : 2025
      return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    }

    const isoMatch = value.match(/^\d{4}-\d{2}-\d{2}$/)
    if (isoMatch) return value
  }
  return ''
}

function parseNumberCell(cell: GvizCell): number | null {
  if (!cell) return null
  if (typeof cell.v === 'number' && Number.isFinite(cell.v)) return cell.v
  const raw = cellToString(cell)
  if (!raw) return null
  const cleaned = raw.replace(/\s/g, '').replace(',', '.').replace(/[^0-9.-]/g, '')
  const numeric = Number(cleaned)
  return Number.isFinite(numeric) ? numeric : null
}

function fetchGvizSheet(gid: number): Promise<GvizResponse> {
  return fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?gid=${gid}&headers=0&tqx=out:json`)
    .then((response) => response.text())
    .then((text) => JSON.parse(stripWrapper(text)) as GvizResponse)
}

function extractVehicleLabel(rows: string[][]): string {
  for (const row of rows.slice(0, 5)) {
    const nonEmpty = row.map(normalize).filter(Boolean)
    if (!nonEmpty.length) continue
    const candidate = nonEmpty[0]
    if (
      candidate &&
      candidate !== 'Наименование' &&
      !candidate.toLowerCase().includes('механизатор') &&
      !candidate.toLowerCase().includes('заправочные объемы') &&
      !candidate.toLowerCase().includes('наименование узла')
    ) {
      return candidate
    }
  }
  return ''
}

function extractRunHours(rows: string[][]): string {
  for (const row of rows.slice(0, 15)) {
    const lower = row.map((cell) => normalize(cell).toLowerCase())
    const headerIndex = lower.findIndex((cell) => cell.includes('пробег') || cell.includes('моточас'))
    if (headerIndex !== -1) {
      const nextValue = normalize(row[headerIndex + 1] ?? '')
      if (nextValue) return nextValue
    }

    for (let index = 0; index < lower.length; index += 1) {
      const cell = lower[index]
      if (cell.includes('пробег') || cell.includes('моточас')) {
        const before = normalize(row[index - 1] ?? '')
        const after = normalize(row[index + 1] ?? '')
        if (after) return after
        if (before) return before
      }
    }
  }
  return ''
}

function parseIssueSheet(gid: number, rows: GvizRow[]): ImportedIssueRow[] {
  const textRows = rows.map((row) => (row.c ?? []).map(cellToString))
  const vehicleLabel = extractVehicleLabel(textRows)
  const runHours = extractRunHours(textRows)

  return rows
    .map((row) => {
      const cells = row.c ?? []
      const productName = normalize(cellToString(cells[0]))
      const date = parseDateCell(cells[1])
      const quantity = parseNumberCell(cells[2])
      const purpose = normalize(cellToString(cells[3]))
      const issuer = normalize(cellToString(cells[4]))
      const recipient = normalize(cellToString(cells[5]))
      const note = normalize(cellToString(cells[6]))

      if (!productName || !date || quantity == null || quantity <= 0) return null
      if (productName === 'Наименование') return null
      if (!purpose && !recipient) return null

      const combined = `${purpose} ${note}`.toLowerCase()
      const looksLikeIssue = ISSUE_HINTS.some((hint) => combined.includes(hint)) || Boolean(recipient)
      if (!looksLikeIssue) return null

      return {
        productName,
        date,
        quantity,
        purpose,
        recipient,
        vehicleLabel,
        issuer,
        note,
        runHours,
        gid,
      }
    })
    .filter(Boolean) as ImportedIssueRow[]
}

function detectBalanceColumns(header: string[]) {
  const columns = header.map((value) => value.toLowerCase())
  const productIndex = columns.findIndex((value) => value.includes('наимен'))
  const startIndex = columns.findIndex((value) => value.includes('начал'))
  const receiptIndex = columns.findIndex((value) => value.includes('приход'))
  const issueIndex = columns.findIndex((value) => value.includes('расход'))
  const endIndex = columns.findIndex((value) => value.includes('конец') || value.includes('остаток'))

  return { productIndex, startIndex, receiptIndex, issueIndex, endIndex }
}

function parseBalanceSheet(gid: number, rows: GvizRow[]) {
  const stringRows = rows.map((row) => (row.c ?? []).map(cellToString))
  const joinedHead = stringRows.slice(0, 6).flat().join(' ').toLowerCase()
  const hasBalanceNature = RECEIPT_HINTS.some((hint) => joinedHead.includes(hint))
  if (!hasBalanceNature) return { receipts: [] as ImportedReceiptRow[], balances: [] as ImportedBalanceRow[] }

  let headerIndex = -1
  for (let index = 0; index < stringRows.length; index += 1) {
    const row = stringRows[index].map((item) => item.toLowerCase())
    if (row.some((item) => item.includes('наимен')) && row.some((item) => item.includes('приход')) && row.some((item) => item.includes('расход'))) {
      headerIndex = index
      break
    }
  }

  if (headerIndex === -1) return { receipts: [] as ImportedReceiptRow[], balances: [] as ImportedBalanceRow[] }

  const { productIndex, startIndex, receiptIndex, issueIndex, endIndex } = detectBalanceColumns(stringRows[headerIndex])
  if (productIndex === -1 || receiptIndex === -1 || issueIndex === -1 || endIndex === -1) {
    return { receipts: [] as ImportedReceiptRow[], balances: [] as ImportedBalanceRow[] }
  }

  const balances: ImportedBalanceRow[] = []
  const receipts: ImportedReceiptRow[] = []

  for (let index = headerIndex + 1; index < rows.length; index += 1) {
    const cells = rows[index].c ?? []
    const name = normalize(cellToString(cells[productIndex]))
    if (!name) continue
    const receipt = parseNumberCell(cells[receiptIndex]) ?? 0
    const issue = parseNumberCell(cells[issueIndex]) ?? 0
    const current = parseNumberCell(cells[endIndex]) ?? 0
    const start = startIndex !== -1 ? parseNumberCell(cells[startIndex]) ?? 0 : 0

    if (!name || (!receipt && !issue && !current && !start)) continue

    balances.push({ productName: name, receipt, issue, current, gid })
    if (receipt > 0) {
      receipts.push({
        productName: name,
        date: '2025-01-01',
        quantity: receipt,
        note: `Исторический приход из сводного листа gid=${gid}`,
        gid,
      })
    }
  }

  return { receipts, balances }
}

export async function runOneTimeImport(onProgress?: (progress: ImportProgress) => void): Promise<ImportResult> {
  const issues: ImportedIssueRow[] = []
  const receipts: ImportedReceiptRow[] = []
  const balances: ImportedBalanceRow[] = []
  let matchedIssueSheets = 0
  let matchedBalanceSheets = 0

  for (let index = 0; index < ALL_GIDS.length; index += 1) {
    const gid = ALL_GIDS[index]
    try {
      const response = await fetchGvizSheet(gid)
      const rows = response.table?.rows ?? []
      const parsedIssues = parseIssueSheet(gid, rows)
      const parsedBalance = parseBalanceSheet(gid, rows)

      if (parsedIssues.length > 0) matchedIssueSheets += 1
      if (parsedBalance.balances.length > 0 || parsedBalance.receipts.length > 0) matchedBalanceSheets += 1

      issues.push(...parsedIssues)
      receipts.push(...parsedBalance.receipts)
      balances.push(...parsedBalance.balances)
    } catch {
      // silently skip failed sheets in one-time migration
    }

    onProgress?.({
      current: index + 1,
      total: ALL_GIDS.length,
      gid,
      issuesFound: issues.length,
      receiptsFound: receipts.length,
      balancesFound: balances.length,
    })
  }

  return {
    issues,
    receipts,
    balances,
    processed: ALL_GIDS.length,
    matchedIssueSheets,
    matchedBalanceSheets,
  }
}
