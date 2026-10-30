import { Paperclip, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { cascadeOptions, natures } from '../../lib/cascade'
import { addDesignation, addDetail, addNature } from '../../lib/categories'
import { accountBalance, all, getCompany, getSetting, isDayClosed } from '../../lib/db'
import { exportJournalImportTemplate, exportMovementsExcel } from '../../lib/export'
import { importJournalForAccount } from '../../lib/importExcel'
import { formatDate, formatDzd, todayIso } from '../../lib/format'
import { t } from '../../lib/i18n'
import { deleteMovement, insertMovement, listMovements, updateMovement } from '../../lib/movements'
import { can } from '../../lib/permissions'
import type { Account, Attachment, Movement } from '../../lib/types'
import { ComboField } from '../../shared/ComboField'
import { PrintReport, PrintSection, PrintTable, printAmount, printDocument } from '../../shared/PrintReport'
import {
  Btn,
  Card,
  EmptyRow,
  Field,
  FilterBar,
  IconBtn,
  Modal,
  Money,
  PageHeader,
  StatCard,
  TableWrap,
  inputClass,
} from '../../shared/ui'
import { persist, run, lastId, audit } from '../../lib/db'

const emptyForm = {
  date: todayIso(),
  accountId: 1,
  nature: 'Frais',
  designation: '',
  detail1: '',
  detail2: '',
  remarks: '',
  engagement: '',
  amount: '',
  side: 'sortie' as 'entree' | 'sortie',
}

export function JournalPage() {
  const { lang, user, refresh, tick } = useApp()
  const accounts = all<Account>('SELECT * FROM accounts WHERE active = 1 ORDER BY sort_order')
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? 1)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [nature, setNature] = useState('')
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Movement | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [err, setErr] = useState('')
  const [attachFor, setAttachFor] = useState<number | null>(null)
  const [page, setPage] = useState(0)
  const pageSize = 80
  const importRef = useRef<HTMLInputElement>(null)
  const [importBusy, setImportBusy] = useState(false)
  const [importFlash, setImportFlash] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  const rows = useMemo(
    () => listMovements({ accountId, from: from || undefined, to: to || undefined, nature: nature || undefined, q: q || undefined }),
    [accountId, from, to, nature, q, tick],
  )
  const acc = accounts.find((a) => a.id === accountId)
  const solde = accountBalance(accountId)
  const filteredIn = rows.reduce((s, r) => s + Number(r.entree), 0)
  const filteredOut = rows.reduce((s, r) => s + Number(r.sortie), 0)
  const nats = natures()
  const cascade = cascadeOptions(form.nature, form.designation)
  const closed = isDayClosed(form.accountId, form.date)
  const allowNeg = getSetting('allow_negative', '1') === '1'
  const profile = getCompany()
  const accountName = acc ? (lang === 'ar' ? acc.name_ar : acc.name_fr) : '—'
  const orgName = lang === 'ar' ? profile.name_ar || profile.name_fr : profile.name_fr || profile.name_ar
  const periodValue =
    from && to
      ? `${formatDate(from, lang)} — ${formatDate(to, lang)}`
      : from
        ? `${t('from', lang)} ${formatDate(from, lang)}`
        : to
          ? `${t('to', lang)} ${formatDate(to, lang)}`
          : t('allDates', lang)
  const displayRows = useMemo(() => [...rows].reverse(), [rows])
  const pageCount = Math.max(1, Math.ceil(displayRows.length / pageSize))
  const pageSafe = Math.min(page, pageCount - 1)
  const pageRows = displayRows.slice(pageSafe * pageSize, pageSafe * pageSize + pageSize)

  const submit = () => {
    if (!user) return
    setErr('')
    const amount = Number(form.amount)
    if (!form.nature || !amount) {
      setErr(t('required', lang))
      return
    }
    const payload = {
      account_id: form.accountId,
      date: form.date,
      nature: form.nature,
      designation: form.designation,
      detail1: form.detail1,
      detail2: form.detail2,
      remarks: form.remarks,
      engagement: form.engagement,
      entree: form.side === 'entree' ? amount : 0,
      sortie: form.side === 'sortie' ? amount : 0,
    }
    const next = accountBalance(form.accountId) + payload.entree - payload.sortie
    if (!allowNeg && next < 0 && !window.confirm(t('negativeWarn', lang))) return
    try {
      if (editing) updateMovement(editing.id, payload, user.id, user.role)
      else insertMovement(payload, user.id)
      setOpen(false)
      setEditing(null)
      setForm({ ...emptyForm, date: form.date, accountId })
      refresh()
    } catch (e) {
      setErr(t((e as Error).message as 'required', lang) || (e as Error).message)
    }
  }

  return (
    <>
    <div className="screen-only space-y-6">
      <PageHeader
        title={t('journal', lang)}
        description={acc ? (lang === 'ar' ? acc.name_ar : acc.name_fr) : undefined}
        actions={
          <>
            {can(user, 'journal') && (
              <>
                <input
                  ref={importRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    e.target.value = ''
                    if (!f) return
                    setImportFlash(null)
                    setImportBusy(true)
                    void f
                      .arrayBuffer()
                      .then((buf) => importJournalForAccount(buf, accountId))
                      .then((report) => {
                        refresh()
                        if (report.accepted > 0) {
                          const extra =
                            report.skipped > 0 ? ` (${report.skipped} ${t('importSkipped', lang)})` : ''
                          setImportFlash({
                            tone: 'ok',
                            text: `${t('importOk', lang)} — ${report.accepted}${extra}`,
                          })
                        } else {
                          setImportFlash({ tone: 'err', text: t('importNone', lang) })
                        }
                      })
                      .catch(() => setImportFlash({ tone: 'err', text: t('importError', lang) }))
                      .finally(() => setImportBusy(false))
                  }}
                />
                <Btn
                  variant="outline"
                  size="sm"
                  disabled={importBusy}
                  onClick={() => importRef.current?.click()}
                >
                  {t('importExcel', lang)}
                </Btn>
                <Btn
                  variant="outline"
                  size="sm"
                  disabled={importBusy}
                  onClick={() => exportJournalImportTemplate(acc?.code ?? 'caisse')}
                >
                  {t('sampleImport', lang)}
                </Btn>
                <Link
                  to="/import-help"
                  className="inline-flex items-center rounded-lg border border-transparent px-2 py-1 text-sm font-medium text-teal-800 underline-offset-2 hover:underline"
                >
                  {t('importHelpLink', lang)}
                </Link>
              </>
            )}
            <Btn variant="outline" size="sm" onClick={() => exportMovementsExcel(rows, acc?.code ?? 'caisse')}>
              {t('exportExcel', lang)}
            </Btn>
            <Btn
              variant="outline"
              size="sm"
              onClick={() => printDocument([orgName, t('journal', lang), accountName].filter(Boolean).join(' - '))}
            >
              {t('pdfPreview', lang)}
            </Btn>
            {can(user, 'journal') && (
              <Btn
                onClick={() => {
                  setEditing(null)
                  setForm({ ...emptyForm, date: todayIso(), accountId })
                  setOpen(true)
                }}
              >
                {t('newMovement', lang)}
              </Btn>
            )}
          </>
        }
      />

      {importFlash && (
        <p
          className={`rounded-lg px-3 py-2 text-sm ${
            importFlash.tone === 'ok' ? 'bg-teal-50 text-teal-900' : 'bg-red-50 text-red-800'
          }`}
          role="status"
        >
          {importFlash.text}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label={t('solde', lang)} tone="brand" value={<Money value={solde} />} />
        <StatCard label={t('entree', lang)} tone="in" value={<Money value={filteredIn} tone="in" />} />
        <StatCard label={t('sortie', lang)} tone="out" value={<Money value={filteredOut} tone="out" />} />
        <StatCard label={t('total', lang)} value={rows.length} />
      </div>

      <FilterBar>
          <Field label={t('account', lang)}>
            <select
              className={inputClass}
              value={accountId}
              onChange={(e) => {
                setAccountId(Number(e.target.value))
                setPage(0)
              }}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {lang === 'ar' ? a.name_ar : a.name_fr}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('from', lang)}>
            <input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label={t('to', lang)}>
            <input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label={t('nature', lang)}>
            <select className={inputClass} value={nature} onChange={(e) => setNature(e.target.value)}>
              <option value="">{t('allNatures', lang)}</option>
              {nats.map((n) => (
                <option key={n.id}>{n.name}</option>
              ))}
            </select>
          </Field>
          <Field label={t('search', lang)}>
            <input className={inputClass} value={q} onChange={(e) => setQ(e.target.value)} placeholder="…" />
          </Field>
      </FilterBar>

      <Card className="print-sheet p-0" padding={false}>
        <TableWrap className="max-h-[calc(100vh-22rem)]">
          <table className="table-shell min-w-[1100px]">
            <thead>
              <tr>
                {[t('date', lang), t('code', lang), t('nature', lang), t('designation', lang), t('detail1', lang), t('detail2', lang), t('remarks', lang), t('entree', lang), t('sortie', lang), t('solde', lang), ''].map(
                  (h) => (
                    <th key={h} className={h === t('entree', lang) || h === t('sortie', lang) || h === t('solde', lang) ? 'text-end' : ''}>
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {pageRows.map((r) => (
                <tr key={r.id}>
                  <td className="whitespace-nowrap">{formatDate(r.date, lang)}</td>
                  <td>{r.daily_code}</td>
                  <td>{r.nature}</td>
                  <td>{r.designation}</td>
                  <td>{r.detail1}</td>
                  <td>{r.detail2}</td>
                  <td className="max-w-[180px] truncate" title={r.remarks ?? ''}>
                    {r.remarks}
                  </td>
                  <td className="text-end">{r.entree ? <Money value={r.entree} tone="in" /> : ''}</td>
                  <td className="text-end">{r.sortie ? <Money value={r.sortie} tone="out" /> : ''}</td>
                  <td className="text-end">
                    <Money value={r.solde} />
                  </td>
                  <td className="no-print">
                    <div className="flex items-center justify-end gap-0.5">
                      <IconBtn
                        title={t('edit', lang)}
                        tone="brand"
                        onClick={() => {
                        setEditing(r)
                        setForm({
                          date: r.date,
                          accountId: r.account_id,
                          nature: r.nature,
                          designation: r.designation ?? '',
                          detail1: r.detail1 ?? '',
                          detail2: r.detail2 ?? '',
                          remarks: r.remarks ?? '',
                          engagement: r.engagement ?? '',
                          amount: String(r.entree || r.sortie),
                          side: r.entree ? 'entree' : 'sortie',
                        })
                        setOpen(true)
                      }}
                      >
                        <Pencil size={15} />
                      </IconBtn>
                      <IconBtn
                        title={t('delete', lang)}
                        tone="danger"
                        onClick={() => {
                        if (!user || !window.confirm(t('confirmDelete', lang))) return
                        try {
                          deleteMovement(r.id, user.id, user.role)
                          refresh()
                        } catch (e) {
                          alert((e as Error).message)
                        }
                      }}
                      >
                        <Trash2 size={15} />
                      </IconBtn>
                      <IconBtn title={t('attachment', lang)} onClick={() => setAttachFor(r.id)}>
                        <Paperclip size={15} />
                      </IconBtn>
                    </div>
                  </td>
                </tr>
              ))}
              {!rows.length && <EmptyRow colSpan={11} message={t('noData', lang)} />}
            </tbody>
          </table>
        </TableWrap>
        {rows.length > pageSize && (
          <div className="no-print flex items-center justify-between border-t border-slate-100 px-4 py-3 text-xs text-slate-600">
            <span>
              {pageSafe * pageSize + 1}–{Math.min(rows.length, pageSafe * pageSize + pageSize)} / {rows.length}
            </span>
            <div className="flex gap-1">
              <Btn variant="outline" size="sm" disabled={pageSafe === 0} onClick={() => setPage(pageSafe - 1)}>
                ‹
              </Btn>
              <Btn variant="outline" size="sm" disabled={pageSafe >= pageCount - 1} onClick={() => setPage(pageSafe + 1)}>
                ›
              </Btn>
            </div>
          </div>
        )}
      </Card>

      {open && (
        <Modal
          wide
          title={editing ? t('edit', lang) : t('newMovement', lang)}
          onClose={() => setOpen(false)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setOpen(false)}>
                {t('cancel', lang)}
              </Btn>
              <Btn onClick={submit}>{t('save', lang)}</Btn>
            </>
          }
        >
          {closed && <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">{t('closed', lang)}</p>}
          <div className="grid gap-3 sm:grid-cols-2">
              <Field label={t('date', lang)}>
                <input type="date" className={inputClass} value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
              <Field label={t('accountType', lang)}>
                <select
                  className={inputClass}
                  value={form.accountId}
                  onChange={(e) => setForm({ ...form, accountId: Number(e.target.value) })}
                >
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {lang === 'ar' ? a.name_ar : a.name_fr}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('nature', lang)}>
                <ComboField
                  lang={lang}
                  value={form.nature}
                  options={nats.map((n) => n.name)}
                  allowAdd
                  onChange={(v) => setForm({ ...form, nature: v, designation: '', detail1: '', detail2: '' })}
                  onAdd={(name) => {
                    addNature(name)
                    refresh()
                  }}
                />
              </Field>
              <Field label={t('designation', lang)}>
                <ComboField
                  lang={lang}
                  value={form.designation}
                  options={cascade.designations}
                  allowEmpty
                  allowAdd
                  placeholder={t('choose', lang)}
                  onChange={(v) => setForm({ ...form, designation: v, detail1: '', detail2: '' })}
                  onAdd={(name) => {
                    addDesignation(form.nature, name)
                    refresh()
                  }}
                />
              </Field>
              <Field label={t('detail1', lang)}>
                <ComboField
                  lang={lang}
                  value={form.detail1}
                  options={cascade.detail1}
                  allowEmpty
                  allowAdd
                  placeholder={t('choose', lang)}
                  onChange={(v) => setForm({ ...form, detail1: v })}
                  onAdd={(name) => {
                    if (form.designation) addDetail(form.nature, form.designation, name)
                    refresh()
                  }}
                />
              </Field>
              <Field label={cascade.detail2.label ? t(cascade.detail2.label as 'collaborators', lang) : t('detail2', lang)}>
                <ComboField
                  lang={lang}
                  value={form.detail2}
                  options={cascade.detail2.values}
                  allowEmpty
                  allowAdd
                  placeholder={t('choose', lang)}
                  onChange={(v) => setForm({ ...form, detail2: v })}
                  onAdd={(name) => {
                    const kind =
                      cascade.detail2.label === 'fournisseurs'
                        ? 'fournisseur'
                        : cascade.detail2.label === 'associes'
                          ? 'associe'
                          : cascade.detail2.label === 'transporteurs'
                            ? 'transporteur'
                            : cascade.detail2.label === 'clients'
                              ? 'client'
                              : cascade.detail2.label === 'vehicles'
                                ? 'vehicle'
                                : 'collaborateur'
                    if (kind === 'vehicle') run('INSERT INTO vehicles (name) VALUES (?)', [name])
                    else run('INSERT INTO parties (kind, name) VALUES (?, ?)', [kind, name])
                    persist()
                    refresh()
                  }}
                />
              </Field>
              <Field label={t('amount', lang)}>
                <input className={inputClass} type="number" min="0" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
              </Field>
              <Field label={t('entree', lang) + ' / ' + t('sortie', lang)}>
                <select className={inputClass} value={form.side} onChange={(e) => setForm({ ...form, side: e.target.value as 'entree' | 'sortie' })}>
                  <option value="entree">{t('entree', lang)}</option>
                  <option value="sortie">{t('sortie', lang)}</option>
                </select>
              </Field>
              <Field label={t('remarks', lang)}>
                <input className={inputClass} value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
              </Field>
              <Field label={t('engagement', lang)}>
                <input className={inputClass} value={form.engagement} onChange={(e) => setForm({ ...form, engagement: e.target.value })} />
              </Field>
          </div>
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
        </Modal>
      )}

      {attachFor != null && (
        <AttachmentDialog
          movementId={attachFor}
          lang={lang}
          onClose={() => {
            setAttachFor(null)
            refresh()
          }}
        />
      )}
    </div>
    <PrintReport
      company={profile}
      lang={lang}
      title={t('journal', lang)}
      subtitle={accountName}
      kicker={profile.fiscal_year ? `${t('fiscalYear', lang)} ${profile.fiscal_year}` : t('journal', lang)}
      orientation="landscape"
      filters={[
        { label: t('account', lang), value: accountName },
        { label: t('period', lang), value: periodValue },
        { label: t('nature', lang), value: nature || t('allNatures', lang) },
        ...(q.trim() ? [{ label: t('search', lang), value: q.trim() }] : []),
      ]}
      kpis={[
        { label: t('solde', lang), value: formatDzd(solde), tone: 'brand' },
        { label: t('entree', lang), value: formatDzd(filteredIn), tone: 'in' },
        { label: t('sortie', lang), value: formatDzd(filteredOut), tone: 'out' },
        { label: t('total', lang), value: String(rows.length) },
      ]}
    >
      <PrintSection title={`${t('journal', lang)} — ${periodValue}`}>
        <PrintTable dense>
          <thead>
            <tr>
              <th>{t('date', lang)}</th>
              <th>{t('code', lang)}</th>
              <th>{t('nature', lang)}</th>
              <th>{t('designation', lang)}</th>
              <th>{t('detail1', lang)}</th>
              <th>{t('detail2', lang)}</th>
              <th>{t('remarks', lang)}</th>
              <th className="num">{t('entree', lang)}</th>
              <th className="num">{t('sortie', lang)}</th>
              <th className="num">{t('solde', lang)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="print-nowrap">{formatDate(r.date, lang)}</td>
                <td>{r.daily_code}</td>
                <td>{r.nature}</td>
                <td>{r.designation}</td>
                <td>{r.detail1}</td>
                <td>{r.detail2}</td>
                <td>{r.remarks}</td>
                <td>{printAmount(r.entree, 'in')}</td>
                <td>{printAmount(r.sortie, 'out')}</td>
                <td>{printAmount(r.solde, 'auto', false)}</td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={10} className="print-empty">
                  {t('noData', lang)}
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr>
                <td colSpan={7}>{t('total', lang)}</td>
                <td>{printAmount(filteredIn, 'in', false)}</td>
                <td>{printAmount(filteredOut, 'out', false)}</td>
                <td />
              </tr>
            </tfoot>
          )}
        </PrintTable>
      </PrintSection>
    </PrintReport>
    </>
  )
}

function AttachmentDialog({
  movementId,
  lang,
  onClose,
}: {
  movementId: number
  lang: 'fr' | 'ar'
  onClose: () => void
}) {
  const { user } = useApp()
  const files = all<Attachment>('SELECT * FROM attachments WHERE movement_id = ?', [movementId])
  return (
    <Modal
      title={t('attachment', lang)}
      onClose={onClose}
      footer={
        <Btn variant="ghost" onClick={onClose}>
          {t('cancel', lang)}
        </Btn>
      }
    >
      <input
        type="file"
        accept="image/*,.pdf"
        className="text-sm"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const reader = new FileReader()
          reader.onload = () => {
            run(
              'INSERT INTO attachments (movement_id, filename, mime, data_url, created_at) VALUES (?,?,?,?,?)',
              [movementId, file.name, file.type, String(reader.result), new Date().toISOString()],
            )
            audit(user?.id ?? null, 'create', 'attachment', lastId())
            persist()
            onClose()
          }
          reader.readAsDataURL(file)
        }}
      />
      <ul className="mt-4 space-y-2 text-sm">
        {files.map((f) => (
          <li key={f.id}>
            <a href={f.data_url} target="_blank" rel="noreferrer" className="font-medium text-teal-700 hover:underline">
              {f.filename}
            </a>
          </li>
        ))}
      </ul>
    </Modal>
  )
}
