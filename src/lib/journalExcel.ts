import * as XLSX from 'xlsx'
import { all, one, persist, run } from './db'
import { num } from './format'
import type { ImportReport } from './types'

export type AccountSheetMeta = {
  sheet: string
  code: string
  name_fr: string
  name_ar: string
}

export const ACCOUNT_SHEETS: AccountSheetMeta[] = [
  {
    sheet: 'Caisse_Principale ESPECE (2)',
    code: 'CPELD_ESPECE',
    name_fr: 'Caisse espèces',
    name_ar: 'صندوق نقدي',
  },
  { sheet: 'CCP Bachir', code: 'CCP_BACHIR', name_fr: 'CCP', name_ar: 'حساب CCP' },
  { sheet: 'TPE', code: 'TPE', name_fr: 'TPE', name_ar: 'جهاز الدفع' },
  { sheet: 'Cheque', code: 'CHEQUE', name_fr: 'Chèques', name_ar: 'شيكات' },
]

export function accountSheetMeta(code: string): AccountSheetMeta | undefined {
  return ACCOUNT_SHEETS.find((s) => s.code === code)
}

export const JOURNAL_HEADERS = [
  'Date ',
  'Code',
  'Références',
  'Désignations',
  'Détails 01',
  'Détails 02',
  'Remarques',
  'Engagement',
  'Entrées',
  'Sorties',
  'Soldes',
] as const

const NATURE_ALIASES: Record<string, string> = {
  recettes: 'Recettes',
  recette: 'Recettes',
  frais: 'Frais',
  fournisseurs: 'Fournisseurs',
  associés: 'Associés',
  associes: 'Associés',
  transfert: 'Transfert',
  investissements: 'Investissements',
  emprunts: 'Emprunts',
  instances: 'Instances',
  décalages: 'Décalages',
  decalages: 'Décalages',
  'solde départ': 'Solde départ',
  'solde depart': 'Solde départ',
}

export function excelDate(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const z = (n: number) => String(n).padStart(2, '0')
    return `${v.getFullYear()}-${z(v.getMonth() + 1)}-${z(v.getDate())}`
  }
  if (typeof v === 'number' && v > 20000 && v < 80000) {
    const epoch = new Date(Date.UTC(1899, 11, 30))
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(v))
    return epoch.toISOString().slice(0, 10)
  }
  if (typeof v === 'string') {
    const s = v.trim()
    const m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/)
    if (m) {
      const d = m[1]!.padStart(2, '0')
      const mo = m[2]!.padStart(2, '0')
      return `${m[3]}-${mo}-${d}`
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  }
  return null
}

export function normNature(v: unknown): string {
  const raw = String(v ?? '').trim()
  if (!raw) return ''
  return NATURE_ALIASES[raw.toLowerCase()] ?? raw
}

export function cellStr(v: unknown): string | null {
  if (v == null || v === '') return null
  const s = String(v).trim()
  return s || null
}

function dailyCode(account: number, date: string, fallback: unknown): number {
  const n = num(fallback)
  if (n > 0) return n
  const row = one<{ n: number }>(
    'SELECT COALESCE(MAX(daily_code), 0) + 1 AS n FROM movements WHERE account_id = ? AND date = ?',
    [account, date],
  )
  return row?.n ?? 1
}

export function emptyImportReport(): ImportReport {
  return {
    accepted: 0,
    skipped: 0,
    flaggedDates: 0,
    unknownNatures: [],
    balances: [],
    messages: [],
  }
}

export type JournalTemplateMeta = { code: string; name_fr: string; name_ar: string }

/** Top rows (11) before the « Date » header row in legacy import sheets. */
export function journalMetaPrefixRows(meta?: JournalTemplateMeta): (string | number | null)[][] {
  const blankSummary = Array.from({ length: 11 }, () => Array(JOURNAL_HEADERS.length).fill(null))
  if (meta) {
    blankSummary[0] = ['Type de caisse / نوع الصندوق', meta.name_fr, meta.name_ar, null, null, null, null, null, null, null, null]
    blankSummary[1] = ['Code compte / رمز الصندوق', meta.code, null, null, null, null, null, null, null, null, null]
    blankSummary[2] = [
      'Données à partir de la ligne « Date » / البيانات من صف « Date »',
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
      null,
    ]
  }
  return blankSummary
}

export type JournalExportRow = {
  date: string
  daily_code: number
  nature: string
  designation: string | null
  detail1: string | null
  detail2: string | null
  remarks: string | null
  engagement: string | null
  entree: number
  sortie: number
  solde?: number
}

/** Legacy import sheet with account meta, header row, and movement lines (no example row). */
export function journalExportAoa(meta: JournalTemplateMeta, rows: JournalExportRow[]): (string | number | null)[][] {
  const aoa = journalMetaPrefixRows(meta)
  aoa.push([...JOURNAL_HEADERS])
  for (const r of rows) {
    aoa.push([
      r.date,
      r.daily_code,
      r.nature,
      r.designation,
      r.detail1,
      r.detail2,
      r.remarks,
      r.engagement,
      r.entree,
      r.sortie,
      r.solde ?? null,
    ])
  }
  return aoa
}

/** Excel sheet name for full import (legacy names when known). */
export function excelAccountSheetName(code: string, name_fr: string): string {
  const legacy = accountSheetMeta(code)
  if (legacy) return legacy.sheet
  const base = (name_fr.trim() || code).slice(0, 31)
  return base.replace(/[:\\/?*[\]]/g, '_')
}

/** Rows for legacy multi-sheet import template (header row at index 11, data from 12). */
export function journalTemplateAoa(meta?: JournalTemplateMeta): (string | number | null)[][] {
  const aoa = journalMetaPrefixRows(meta)
  aoa.push([...JOURNAL_HEADERS])
  aoa.push([
    '2025-01-15',
    1,
    'Recettes',
    'Exemple désignation',
    'Détail 01',
    null,
    'Ligne exemple — supprimer ou remplacer',
    null,
    10000,
    0,
    10000,
  ])
  return aoa
}

/** Bilingual Instructions sheet for Excel import templates (ignored by parsers). */
export function importInstructionsSheetAoa(opts: {
  mode: 'full' | 'journal' | 'report'
  journalAccount?: JournalTemplateMeta
  reportPeriod?: string
}): (string | number | null)[][] {
  const rows: (string | number | null)[][] = []
  const push = (fr: string, ar: string) => rows.push([fr, ar])
  const blank = () => rows.push([null, null])

  push('CaissePro — Guide import Excel', 'CaissePro — دليل استيراد Excel')
  blank()
  if (opts.mode === 'journal' && opts.journalAccount) {
    const m = opts.journalAccount
    push(
      `Modèle journal unique : feuille « Journal » → ${m.name_fr} (${m.code}).`,
      `نموذج دفتر واحد: ورقة « Journal » → ${m.name_ar} (${m.code}).`,
    )
    push(
      'Import depuis le Journal : ajoute les lignes au compte affiché (sans effacer le reste).',
      'الاستيراد من دفتر الصندوق: يضيف السطور للصندوق الحالي دون مسح باقي البيانات.',
    )
  } else if (opts.mode === 'report') {
    const period = opts.reportPeriod ?? ''
    push(
      `Export Rapports (synthèse + détails des opérations) — période : ${period}.`,
      `تصدير التقارير (ملخص + تفاصيل العمليات) — الفترة: ${period}.`,
    )
    push(
      'Feuille « Synthese » : agrégats par nature (informative ; ignorée à l’import).',
      'ورقة « Synthese » : تجميع حسب الطبيعة (للقراءة؛ لا تُستورد).',
    )
    push(
      'Feuilles par caisse : lignes journal importables (نوع الصندوق / code en tête de feuille).',
      'أوراق كل صندوق: سطور دفتر قابلة للاستيراد (نوع الصندوق / الرمز في أعلى الورقة).',
    )
    push(
      'Paramètres → Import : remplace toutes les écritures existantes (fichier entier, pas seule la période).',
      'الإعدادات → استيراد: يستبدل كل العمليات الحالية (الملف كاملًا، وليس فقط فترة التصدير).',
    )
    push(
      'Journal → Import : ajoute les lignes à la caisse ouverte (feuille reconnue par code / nom legacy).',
      'الدفتر → استيراد: يضيف السطور للصندوق المفتوح (ورقة معرّفة بالرمز / الاسم التقليدي).',
    )
    blank()
    push('Type de caisse — feuille Excel → code compte', 'نوع الصندوق — اسم الورقة → رمز الصندوق')
    for (const s of ACCOUNT_SHEETS) {
      push(`  ${s.sheet}  →  ${s.name_fr}  [${s.code}]`, `  ${s.sheet}  →  ${s.name_ar}  [${s.code}]`)
    }
  } else {
    push(
      'Modèle complet (Paramètres) : une feuille par caisse + Données, Créances, TRANSPORT.',
      'النموذج الكامل (الإعدادات): ورقة لكل صندوق + Données و Créances و TRANSPORT.',
    )
    push(
      'Import depuis Paramètres : remplace toutes les écritures existantes avant import.',
      'الاستيراد من الإعدادات: يستبدل كل العمليات الحالية قبل الاستيراد.',
    )
    blank()
    push('Type de caisse — feuille Excel → code compte', 'نوع الصندوق — اسم الورقة → رمز الصندوق')
    for (const s of ACCOUNT_SHEETS) {
      push(`  ${s.sheet}  →  ${s.name_fr}  [${s.code}]`, `  ${s.sheet}  →  ${s.name_ar}  [${s.code}]`)
    }
  }
  blank()
  push('Colonnes journal (ligne d’en-tête « Date »)', 'أعمدة الدفتر (صف العناوين « Date »)')
  const cols: [string, string][] = [
    ['Date — AAAA-MM-JJ ou JJ/MM/AAAA ou date Excel', 'Date — AAAA-MM-JJ أو JJ/MM/AAAA أو تاريخ Excel'],
    ['Code — numéro du jour (optionnel)', 'Code — رقم اليوم (اختياري)'],
    ['Références — nature (Recettes, Frais, Fournisseurs…)', 'Références — الطبيعة (Recettes, Frais…)'],
    ['Désignations, Détails 01/02, Remarques', 'Désignations, Détails 01/02, Remarques'],
    ['Engagement — texte libre', 'Engagement — نص حر'],
    ['Entrées — montant reçu ; Sorties — montant payé (un seul par ligne)', 'Entrées — مدخول ; Sorties — مصروف (واحد فقط)'],
    ['Soldes — ignoré à l’import (calculé dans l’app)', 'Soldes — يُتجاهل عند الاستيراد'],
  ]
  for (const [fr, ar] of cols) push(fr, ar)
  blank()
  push('Clôture du jour : les dates clôturées ne peuvent plus être modifiées dans le Journal.', 'إقفال اليوم: التواريخ المقفلة لا تُعدَّل من الدفتر.')
  push('Téléchargez le modèle depuis le Journal ou Paramètres avant de remplir.', 'نزّل النموذج من الدفتر أو الإعدادات قبل التعبئة.')
  return rows
}

type JournalRowInput = {
  date: unknown
  code: unknown
  nature: unknown
  designation: unknown
  detail1: unknown
  detail2: unknown
  remarks: unknown
  engagement: unknown
  entree: unknown
  sortie: unknown
}

function insertJournalRow(accId: number, row: JournalRowInput, report: ImportReport, known: Set<string>) {
  const nature = normNature(row.nature)
  const entree = num(row.entree)
  const sortie = num(row.sortie)
  const date = excelDate(row.date)
  const hasAmount = entree !== 0 || sortie !== 0
  if (!hasAmount && !nature && !cellStr(row.designation) && !cellStr(row.remarks)) {
    report.skipped++
    return 0
  }
  if (!hasAmount && !date && !nature) {
    report.skipped++
    return 0
  }
  if (date) {
    const y = Number(date.slice(0, 4))
    if (y < 2024 || y > 2027) report.flaggedDates++
  }
  if (nature && !known.has(nature)) {
    if (!report.unknownNatures.includes(nature)) report.unknownNatures.push(nature)
  }
  const useDate = date ?? '2025-01-01'
  run(
    `INSERT INTO movements (account_id, date, daily_code, nature, designation, detail1, detail2, remarks, engagement, entree, sortie, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      accId,
      useDate,
      dailyCode(accId, useDate, row.code),
      nature || 'Décalages',
      cellStr(row.designation),
      cellStr(row.detail1),
      cellStr(row.detail2),
      cellStr(row.remarks),
      cellStr(row.engagement),
      entree,
      sortie,
      new Date().toISOString(),
    ],
  )
  report.accepted++
  return entree - sortie
}

function isExportHeaderRow(row: (unknown | null)[]): boolean {
  const h = String(row[0] ?? '').trim()
  return h === 'Date' || h === 'Date '
}

function importLegacyAoaRows(rows: (unknown | null)[][], accId: number, report: ImportReport, known: Set<string>) {
  let start = 12
  for (let i = 0; i < Math.min(rows.length, 20); i++) {
    const row = rows[i] ?? []
    if (isExportHeaderRow(row)) {
      start = i + 1
      break
    }
  }
  let net = 0
  for (let i = start; i < rows.length; i++) {
    const r = rows[i] ?? []
    net += insertJournalRow(
      accId,
      {
        date: r[0],
        code: r[1],
        nature: r[2],
        designation: r[3],
        detail1: r[4],
        detail2: r[5],
        remarks: r[6],
        engagement: r[7],
        entree: r[8],
        sortie: r[9],
      },
      report,
      known,
    )
  }
  return net
}

function importExportJsonSheet(ws: XLSX.WorkSheet, accId: number, report: ImportReport, known: Set<string>) {
  const objects = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: true })
  let net = 0
  for (const row of objects) {
    net += insertJournalRow(
      accId,
      {
        date: row.Date ?? row['Date '],
        code: row.Code,
        nature: row.Références ?? row.References,
        designation: row.Désignations ?? row.Designations,
        detail1: row['Détails 01'] ?? row['Details 01'],
        detail2: row['Détails 02'] ?? row['Details 02'],
        remarks: row.Remarques,
        engagement: row.Engagement,
        entree: row.Entrées ?? row.Entrees,
        sortie: row.Sorties,
      },
      report,
      known,
    )
  }
  return net
}

function sheetLooksLikeExportJson(ws: XLSX.WorkSheet): boolean {
  const rows = XLSX.utils.sheet_to_json<(unknown | null)[]>(ws, { header: 1, raw: true, defval: null })
  const first = rows[0] ?? []
  return String(first[0] ?? '').trim() === 'Date'
}

/** Import journal lines from one worksheet into a single account (append, no wipe). */
export function importJournalWorksheet(
  ws: XLSX.WorkSheet,
  accountId: number,
  report: ImportReport,
  accountCode?: string,
): void {
  const known = new Set(all<{ name: string }>('SELECT name FROM categories WHERE level = 1').map((c) => c.name))
  const net = sheetLooksLikeExportJson(ws)
    ? importExportJsonSheet(ws, accountId, report, known)
    : importLegacyAoaRows(
        XLSX.utils.sheet_to_json<(unknown | null)[]>(ws, { header: 1, raw: true, defval: null }),
        accountId,
        report,
        known,
      )
  if (accountCode) report.balances.push({ account: accountCode, net })
}

export function pickJournalWorksheet(wb: XLSX.WorkBook, accountCode: string): XLSX.WorkSheet | null {
  if (wb.Sheets.Journal) return wb.Sheets.Journal
  const legacy = ACCOUNT_SHEETS.find((s) => s.code === accountCode)
  if (legacy?.sheet && wb.Sheets[legacy.sheet]) return wb.Sheets[legacy.sheet]
  const first = wb.SheetNames[0]
  return first ? wb.Sheets[first] ?? null : null
}

/** Parse an Excel file and append journal entries for the selected cash account. */
export function importJournalForAccount(buffer: ArrayBuffer, accountId: number): ImportReport {
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const report = emptyImportReport()
  const acc = one<{ code: string }>('SELECT code FROM accounts WHERE id = ?', [accountId])
  if (!acc) {
    report.messages.push('Compte introuvable.')
    return report
  }
  const ws = pickJournalWorksheet(wb, acc.code)
  if (!ws) {
    report.messages.push('Aucune feuille journal reconnue.')
    return report
  }
  importJournalWorksheet(ws, accountId, report, acc.code)
  persist()
  return report
}
