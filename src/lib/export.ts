import * as XLSX from 'xlsx'
import { all, exportSqlite, getCompany, one } from './db'
import { formatDzd } from './format'
import {
  ACCOUNT_SHEETS,
  accountSheetMeta,
  excelAccountSheetName,
  importInstructionsSheetAoa,
  journalExportAoa,
  journalTemplateAoa,
  type JournalTemplateMeta,
} from './journalExcel'
import { listMovements } from './movements'
import type { Movement } from './types'

function buildDonneesSheet(company: ReturnType<typeof getCompany>) {
  const rows: (string | number | null)[][] = Array.from({ length: 20 }, () => Array(12).fill(null))
  rows[0] = ['Nom entreprise', null, 'Année', null, "Date Début d'année"]
  rows[1] = [
    company.name_fr || company.name_ar || "Nom de l'entreprise",
    null,
    company.fiscal_year || '2025',
    null,
    company.fiscal_start || '2025-01-01',
  ]
  rows[3] = ['Frais', null, 'Recettes', null, 'Fournisseurs', null, 'Associés', null, 'Instances', null, 'Nom_Fournisseur']
  rows[14] = [null, null, null, null, null, null, null, null, null, null, 'Fournisseur exemple']
  return XLSX.utils.aoa_to_sheet(rows)
}

function buildCreancesSheet() {
  const rows: (string | number | null)[][] = [
    [null, null, null, null, null, null],
    ['Créances clients (modèle import)', null, null, null, null, null],
    [null, 'Débit', 'Crédit', 'Solde', 'Date de facturation', 'Notes'],
    ['Client exemple', 0, 0, 0, null, 'Ligne exemple'],
  ]
  return XLSX.utils.aoa_to_sheet(rows)
}

function buildTransportSheet() {
  const rows: (string | number | null)[][] = [
    ['DATE', 'TOTAL', null, 'DATE', 'TOTAL', null, 'DATE', 'TOTAL', null, 'DATE', 'TOTAL', null],
    [null, null, null, null, null, null, null, null, null, null, null, null],
    ['2025-01-10', 1500, null, null, null, null, null, null, null, null, null, null],
  ]
  return XLSX.utils.aoa_to_sheet(rows)
}

function journalMetaForCode(accountCode: string): JournalTemplateMeta {
  const fromSheet = accountSheetMeta(accountCode)
  if (fromSheet) return { code: fromSheet.code, name_fr: fromSheet.name_fr, name_ar: fromSheet.name_ar }
  const row = one<{ code: string; name_fr: string; name_ar: string }>(
    'SELECT code, name_fr, name_ar FROM accounts WHERE code = ?',
    [accountCode],
  )
  if (row) return row
  return { code: accountCode, name_fr: accountCode, name_ar: accountCode }
}

/** Single-sheet journal template for the current account (same columns as bulk import parser). */
export function exportJournalImportTemplate(accountCode: string) {
  const meta = journalMetaForCode(accountCode)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(importInstructionsSheetAoa({ mode: 'journal', journalAccount: meta })), 'Instructions')
  const ws = XLSX.utils.aoa_to_sheet(journalTemplateAoa(meta))
  XLSX.utils.book_append_sheet(wb, ws, 'Journal')
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  downloadBlob(
    `CaissePro-journal-${accountCode}-modele.xlsx`,
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  )
}

export function exportImportTemplate() {
  const company = getCompany()
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(importInstructionsSheetAoa({ mode: 'full' })), 'Instructions')
  XLSX.utils.book_append_sheet(wb, buildDonneesSheet(company), 'Données')
  for (const { sheet, code, name_fr, name_ar } of ACCOUNT_SHEETS) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(journalTemplateAoa({ code, name_fr, name_ar })),
      sheet,
    )
  }
  XLSX.utils.book_append_sheet(wb, buildCreancesSheet(), 'Creances modele import')
  XLSX.utils.book_append_sheet(wb, buildTransportSheet(), 'TRANSPORT')
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  downloadBlob(
    'CaissePro-import-modele.xlsx',
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  )
}

export function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function exportMovementsExcel(rows: (Movement & { solde?: number })[], accountName: string) {
  const company = getCompany()
  const data = rows.map((r) => ({
    Date: r.date,
    Code: r.daily_code,
    Références: r.nature,
    Désignations: r.designation,
    'Détails 01': r.detail1,
    'Détails 02': r.detail2,
    Remarques: r.remarks,
    Engagement: r.engagement,
    Entrées: r.entree,
    Sorties: r.sortie,
    Soldes: r.solde,
  }))
  const wb = XLSX.utils.book_new()
  const ws = XLSX.utils.json_to_sheet(data)
  XLSX.utils.book_append_sheet(wb, ws, 'Journal')
  const title = XLSX.utils.aoa_to_sheet([
    [company.name_fr || company.name_ar, accountName],
    [`Export CaissePro ${new Date().toISOString().slice(0, 10)}`],
  ])
  XLSX.utils.book_append_sheet(wb, title, 'Entete')
  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  downloadBlob(`CaissePro-${accountName}.xlsx`, new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }))
}

export async function downloadBackup() {
  const bytes = await exportSqlite()
  const copy = new Uint8Array(bytes.byteLength)
  copy.set(bytes)
  downloadBlob(`caissepro-backup-${new Date().toISOString().slice(0, 10)}.db`, new Blob([copy]))
}

export function monthlySynthesis(year: string, month?: string) {
  const prefix = month && month.length >= 7 ? month : `${year}%`
  return all<{ nature: string; designation: string; month: string; entree: number; sortie: number }>(
    `SELECT nature, IFNULL(designation,'') AS designation, substr(date,1,7) AS month,
            SUM(entree) AS entree, SUM(sortie) AS sortie
     FROM movements
     WHERE date LIKE ?
     GROUP BY nature, designation, month
     ORDER BY nature, designation, month`,
    [month ? `${month}%` : prefix],
  )
}

function reportPeriodBounds(year: string, month?: string) {
  if (month && month.length >= 7) {
    const [y, m] = month.split('-').map(Number)
    const lastDay = new Date(y!, m!, 0).getDate()
    return {
      from: `${month}-01`,
      to: `${month}-${String(lastDay).padStart(2, '0')}`,
      label: month,
      reportPeriod: month,
    }
  }
  return {
    from: `${year}-01-01`,
    to: `${year}-12-31`,
    label: year,
    reportPeriod: `${year} (${year}-01-01 → ${year}-12-31)`,
  }
}

function uniqueWorksheetName(base: string, used: Set<string>): string {
  const sanitized = base.slice(0, 31).replace(/[:\\/?*[\]]/g, '_') || 'Sheet'
  if (!used.has(sanitized)) {
    used.add(sanitized)
    return sanitized
  }
  for (let i = 2; i < 100; i++) {
    const suffix = `_${i}`
    const candidate = `${sanitized.slice(0, 31 - suffix.length)}${suffix}`
    if (!used.has(candidate)) {
      used.add(candidate)
      return candidate
    }
  }
  const fallback = `Sheet_${used.size}`
  used.add(fallback)
  return fallback
}

export function exportSynthesisExcel(year: string, month?: string) {
  const company = getCompany()
  const { from, to, label, reportPeriod } = reportPeriodBounds(year, month)
  const rows = monthlySynthesis(year, month)
  const wb = XLSX.utils.book_new()
  const reserved = new Set<string>()

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet(importInstructionsSheetAoa({ mode: 'report', reportPeriod })),
    uniqueWorksheetName('Instructions', reserved),
  )
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.aoa_to_sheet([
      [company.name_fr || company.name_ar, `Synthèse ${label}`],
      [`CaissePro ${new Date().toISOString().slice(0, 10)}`],
      [
        'Détails opérations / تفاصيل العمليات',
        `Période ${reportPeriod} — feuilles caisses ci-dessous, format réimportable.`,
      ],
    ]),
    uniqueWorksheetName('Entete', reserved),
  )
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), uniqueWorksheetName('Synthese', reserved))

  const accounts = all<{ id: number; code: string; name_fr: string; name_ar: string }>(
    'SELECT id, code, name_fr, name_ar FROM accounts WHERE active = 1 ORDER BY sort_order',
  )
  for (const acc of accounts) {
    const movements = listMovements({ accountId: acc.id, from, to })
    if (!movements.length) continue
    const meta: JournalTemplateMeta = { code: acc.code, name_fr: acc.name_fr, name_ar: acc.name_ar }
    const sheetName = uniqueWorksheetName(excelAccountSheetName(acc.code, acc.name_fr), reserved)
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(journalExportAoa(meta, movements)), sheetName)
  }

  const out = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  downloadBlob(
    `CaissePro-synthese-${label}.xlsx`,
    new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
  )
}

export function natureTotals(accountId?: number) {
  const sql = accountId
    ? `SELECT nature, SUM(entree) e, SUM(sortie) s FROM movements WHERE account_id = ? GROUP BY nature`
    : `SELECT nature, SUM(entree) e, SUM(sortie) s FROM movements GROUP BY nature`
  return all<{ nature: string; e: number; s: number }>(sql, accountId ? [accountId] : [])
}

export { formatDzd }
