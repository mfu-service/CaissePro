import * as XLSX from 'xlsx'
import { all, lastId, one, persist, run } from './db'
import { num } from './format'
import {
  ACCOUNT_SHEETS,
  cellStr,
  excelDate,
  importJournalWorksheet,
} from './journalExcel'
import type { ImportReport } from './types'

export { ACCOUNT_SHEETS }

function accountId(code: string): number {
  return one<{ id: number }>('SELECT id FROM accounts WHERE code = ?', [code])!.id
}

function ensureParty(kind: string, name: string) {
  const existing = one('SELECT id FROM parties WHERE kind = ? AND name = ?', [kind, name])
  if (!existing) run('INSERT INTO parties (kind, name) VALUES (?, ?)', [kind, name])
}

function importJournal(wb: XLSX.WorkBook, report: ImportReport) {
  for (const { sheet, code } of ACCOUNT_SHEETS) {
    const ws = wb.Sheets[sheet]
    if (!ws) {
      report.messages.push(`Feuille absente: ${sheet}`)
      continue
    }
    const accId = accountId(code)
    importJournalWorksheet(ws, accId, report, code)
  }
}

function importDonnees(wb: XLSX.WorkBook, report: ImportReport) {
  const ws = wb.Sheets['Données']
  if (!ws) return
  const name = ws['A2']?.v
  const year = ws['C2']?.v
  const start = excelDate(ws['E2']?.v)
  if (name && String(name).trim()) {
    const current = one<{ value: string }>('SELECT value FROM settings WHERE key = ?', ['name_fr'])
    if (!current?.value || current.value === "Nom de l'entreprise") {
      run('UPDATE settings SET value = ? WHERE key = ?', [String(name).trim(), 'name_fr'])
      report.messages.push(`Nom importé: ${String(name).trim()}`)
    }
  }
  if (year) run('UPDATE settings SET value = ? WHERE key = ?', [String(year), 'fiscal_year'])
  if (start) run('UPDATE settings SET value = ? WHERE key = ?', [start, 'fiscal_start'])

  const rows = XLSX.utils.sheet_to_json<(unknown | null)[]>(ws, { header: 1, raw: true, defval: null })
  for (let i = 14; i < 33; i++) {
    const nameF = cellStr(rows[i]?.[10])
    if (nameF) ensureParty('fournisseur', nameF)
  }
}

function importCreances(wb: XLSX.WorkBook) {
  const name = wb.SheetNames.find((n) => n.toLowerCase().includes('creance'))
  if (!name) return
  const ws = wb.Sheets[name]
  if (!ws) return
  const rows = XLSX.utils.sheet_to_json<(unknown | null)[]>(ws, { header: 1, raw: true, defval: null })
  for (let i = 3; i < rows.length; i++) {
    const r = rows[i] ?? []
    const client = cellStr(r[0])
    if (!client || client.toLowerCase() === 'total') continue
    const debit = num(r[1])
    const credit = num(r[2])
    ensureParty('client', client)
    const party = one<{ id: number }>('SELECT id FROM parties WHERE kind = ? AND name = ?', ['client', client])
    run(
      'INSERT INTO receivables (party_id, client_name, debit, credit, status, invoice_date, phone, notes) VALUES (?,?,?,?,?,?,?,?)',
      [party?.id ?? null, client, debit, credit, cellStr(r[4]), null, cellStr(r[4]), cellStr(r[5])],
    )
  }
}

function importTransport(wb: XLSX.WorkBook) {
  const ws = wb.Sheets['TRANSPORT']
  if (!ws) return
  const rows = XLSX.utils.sheet_to_json<(unknown | null)[]>(ws, { header: 1, raw: true, defval: null })
  const pairs = [
    [0, 1],
    [3, 4],
    [6, 7],
    [9, 10],
    [12, 13],
  ]
  for (let i = 2; i < rows.length; i++) {
    const r = rows[i] ?? []
    for (const [di, ai] of pairs) {
      const date = excelDate(r[di])
      const amount = num(r[ai])
      if (!date || !amount) continue
      run(
        'INSERT INTO transport_entries (date, amount, notes) VALUES (?, ?, ?)',
        [date, amount, 'Import feuille TRANSPORT'],
      )
    }
  }
}

export async function importWorkbook(buffer: ArrayBuffer): Promise<ImportReport> {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const report: ImportReport = {
    accepted: 0,
    skipped: 0,
    flaggedDates: 0,
    unknownNatures: [],
    balances: [],
    messages: [],
  }
  const existing = one<{ n: number }>('SELECT COUNT(*) AS n FROM movements')
  if ((existing?.n ?? 0) > 0) {
    run('DELETE FROM attachments')
    run('DELETE FROM movements')
    run('DELETE FROM receivables')
    run('DELETE FROM transport_entries')
    report.messages.push('Anciennes écritures remplacées.')
  }
  importDonnees(wb, report)
  importJournal(wb, report)
  importCreances(wb)
  importTransport(wb)
  persist()
  return report
}

export function expectedBalances() {
  return {
    CPELD_ESPECE: 3950920,
    CCP_BACHIR: 213461.15,
  }
}

export { importJournalForAccount } from './journalExcel'
export { lastId }
