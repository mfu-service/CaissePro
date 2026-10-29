import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { all, accountBalance } from '../../lib/db'
import { todayIso } from '../../lib/format'
import { t } from '../../lib/i18n'
import { createTransfer } from '../../lib/movements'
import type { Account, Movement } from '../../lib/types'
import { Btn, Card, CardHeader, Field, Money, PageHeader, TableWrap, inputClass } from '../../shared/ui'

export function TransfersPage() {
  const { lang, user, refresh, tick } = useApp()
  const accounts = all<Account>('SELECT * FROM accounts WHERE active = 1 ORDER BY sort_order')
  const [fromId, setFromId] = useState(accounts[0]?.id ?? 1)
  const [toId, setToId] = useState(accounts[1]?.id ?? 2)
  const [date, setDate] = useState(todayIso())
  const [amount, setAmount] = useState('')
  const [remarks, setRemarks] = useState('')
  const [err, setErr] = useState('')
  const recent = all<Movement>(
    `SELECT * FROM movements WHERE nature = 'Transfert' ORDER BY id DESC LIMIT 20`,
  )
  void tick

  return (
    <div className="space-y-6">
      <PageHeader title={t('transfers', lang)} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t('transfers', lang)} />
          <div className="grid gap-3">
            <Field label={t('source', lang)}>
              <select className={inputClass} value={fromId} onChange={(e) => setFromId(Number(e.target.value))}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {lang === 'ar' ? a.name_ar : a.name_fr} ({accountBalance(a.id).toFixed(2)})
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('dest', lang)}>
              <select className={inputClass} value={toId} onChange={(e) => setToId(Number(e.target.value))}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {lang === 'ar' ? a.name_ar : a.name_fr}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('date', lang)}>
              <input type="date" className={inputClass} value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label={t('amount', lang)}>
              <input type="number" min="0" step="0.01" className={inputClass} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </Field>
            <Field label={t('remarks', lang)}>
              <input className={inputClass} value={remarks} onChange={(e) => setRemarks(e.target.value)} />
            </Field>
            {err && <p className="text-sm text-red-600">{err}</p>}
            <Btn
              onClick={() => {
                if (!user) return
                setErr('')
                try {
                  createTransfer({ fromId, toId, date, amount: Number(amount), remarks, userId: user.id })
                  setAmount('')
                  setRemarks('')
                  refresh()
                } catch (e) {
                  setErr(t((e as Error).message as 'required', lang) || (e as Error).message)
                }
              }}
            >
              {t('save', lang)}
            </Btn>
          </div>
        </Card>
        <Card>
          <CardHeader title={t('journal', lang)} />
          <TableWrap>
            <table className="table-shell">
              <thead>
                <tr>
                  <th>{t('date', lang)}</th>
                  <th>{t('designation', lang)}</th>
                  <th className="text-end">{t('amount', lang)}</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((m) => (
                  <tr key={m.id}>
                    <td>{m.date}</td>
                    <td>{m.designation}</td>
                    <td className="text-end">
                      {m.entree ? <Money value={m.entree} tone="in" /> : <Money value={m.sortie} tone="out" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      </div>
    </div>
  )
}
