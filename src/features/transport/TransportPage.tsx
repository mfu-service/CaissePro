import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { all, persist, run } from '../../lib/db'
import { todayIso } from '../../lib/format'
import { t } from '../../lib/i18n'
import { insertMovement } from '../../lib/movements'
import { partiesOf } from '../../lib/cascade'
import type { Account, TransportEntry } from '../../lib/types'
import { Btn, Card, CardHeader, Field, Money, PageHeader, StatCard, TableWrap, inputClass } from '../../shared/ui'

export function TransportPage() {
  const { lang, user, refresh, tick } = useApp()
  const rows = all<TransportEntry>('SELECT * FROM transport_entries ORDER BY date DESC, id DESC')
  const carriers = partiesOf('transporteur')
  const accounts = all<Account>('SELECT * FROM accounts WHERE active = 1 ORDER BY sort_order')
  const [date, setDate] = useState(todayIso())
  const [amount, setAmount] = useState('')
  const [carrier, setCarrier] = useState('')
  const [parcels, setParcels] = useState('')
  const [direction, setDirection] = useState('')
  const [notes, setNotes] = useState('')
  const [accId, setAccId] = useState(accounts[0]?.id ?? 1)
  const [postCash, setPostCash] = useState(true)
  void tick
  const total = rows.reduce((s, r) => s + Number(r.amount), 0)

  return (
    <div className="space-y-6">
      <PageHeader title={t('transport', lang)} />
      <StatCard label={t('total', lang)} tone="brand" value={<Money value={total} />} />
      <Card>
        <CardHeader title={t('add', lang)} />
        <div className="grid gap-3 md:grid-cols-3">
          <Field label={t('date', lang)}>
            <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Field label={t('amount', lang)}>
            <input type="number" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label={t('carrier', lang)}>
            <input className={inputClass} list="car" value={carrier} onChange={(e) => setCarrier(e.target.value)} />
            <datalist id="car">
              {carriers.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </Field>
          <Field label={t('parcels', lang)}>
            <input className={inputClass} value={parcels} onChange={(e) => setParcels(e.target.value)} />
          </Field>
          <Field label={t('direction', lang)}>
            <input className={inputClass} value={direction} onChange={(e) => setDirection(e.target.value)} />
          </Field>
          <Field label={t('notes', lang)}>
            <input className={inputClass} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Field label={t('account', lang)}>
            <select className={inputClass} value={accId} onChange={(e) => setAccId(Number(e.target.value))}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name_fr}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={postCash} onChange={(e) => setPostCash(e.target.checked)} />
            Journal de caisse
          </label>
        </div>
        <Btn
          className="mt-3"
          onClick={() => {
            if (!user) return
            let movId: number | null = null
            if (postCash) {
              movId = insertMovement(
                {
                  account_id: accId,
                  date,
                  nature: 'Frais',
                  designation: 'Transport',
                  detail1: 'Colis',
                  detail2: carrier,
                  remarks: notes || direction,
                  sortie: Number(amount),
                },
                user.id,
              )
            }
            run(
              'INSERT INTO transport_entries (date, amount, carrier, parcels, direction, notes, movement_id) VALUES (?,?,?,?,?,?,?)',
              [date, Number(amount), carrier || null, parcels ? Number(parcels) : null, direction || null, notes || null, movId],
            )
            persist()
            setAmount('')
            setNotes('')
            refresh()
          }}
        >
          {t('add', lang)}
        </Btn>
      </Card>
      <Card padding={false}>
        <TableWrap>
          <table className="table-shell">
          <thead className="bg-slate-50 text-xs text-slate-500">
            <tr>
              <th className="px-3 py-2">{t('date', lang)}</th>
              <th>{t('carrier', lang)}</th>
              <th>{t('parcels', lang)}</th>
              <th>{t('direction', lang)}</th>
              <th>{t('amount', lang)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2">{r.date}</td>
                <td>{r.carrier}</td>
                <td>{r.parcels}</td>
                <td>{r.direction}</td>
                <td>
                  <Money value={r.amount} tone="out" />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-bold">
              <td className="px-3 py-2" colSpan={4}>
                {t('total', lang)}
              </td>
              <td>
                <Money value={total} tone="out" />
              </td>
            </tr>
          </tfoot>
        </table>
        </TableWrap>
      </Card>
    </div>
  )
}
