import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { all, persist, run } from '../../lib/db'
import { todayIso } from '../../lib/format'
import { t } from '../../lib/i18n'
import { insertMovement } from '../../lib/movements'
import type { Account, Receivable } from '../../lib/types'
import { Btn, Card, CardHeader, Field, Modal, Money, PageHeader, StatCard, TableWrap, inputClass } from '../../shared/ui'

export function ReceivablesPage() {
  const { lang, user, refresh, tick } = useApp()
  const rows = all<Receivable>('SELECT * FROM receivables ORDER BY (debit-credit) DESC')
  const [name, setName] = useState('')
  const [debit, setDebit] = useState('')
  const [phone, setPhone] = useState('')
  const [payId, setPayId] = useState<number | null>(null)
  const [payAmt, setPayAmt] = useState('')
  const accounts = all<Account>('SELECT * FROM accounts WHERE active = 1 ORDER BY sort_order')
  const [accId, setAccId] = useState(accounts[0]?.id ?? 1)
  void tick
  const total = rows.reduce((s, r) => s + r.debit - r.credit, 0)

  return (
    <div className="space-y-6">
      <PageHeader title={t('receivables', lang)} />
      <StatCard label={t('rest', lang)} tone="brand" value={<Money value={total} />} />
      <Card>
        <CardHeader title={t('add', lang)} />
        <div className="grid gap-2 md:grid-cols-4">
          <input className={inputClass} placeholder={t('name', lang)} value={name} onChange={(e) => setName(e.target.value)} />
          <input className={inputClass} type="number" placeholder={t('debit', lang)} value={debit} onChange={(e) => setDebit(e.target.value)} />
          <input className={inputClass} placeholder={t('phone', lang)} value={phone} onChange={(e) => setPhone(e.target.value)} />
          <Btn
            onClick={() => {
              if (!name.trim()) return
              run('INSERT INTO receivables (client_name, debit, credit, phone) VALUES (?,?,0,?)', [
                name.trim(),
                Number(debit) || 0,
                phone || null,
              ])
              persist()
              setName('')
              setDebit('')
              setPhone('')
              refresh()
            }}
          >
            {t('add', lang)}
          </Btn>
        </div>
      </Card>
      <Card padding={false}>
        <TableWrap>
          <table className="table-shell">
            <thead>
            <tr>
              <th className="px-3 py-2">{t('name', lang)}</th>
              <th>{t('debit', lang)}</th>
              <th>{t('credit', lang)}</th>
              <th>{t('rest', lang)}</th>
              <th>{t('status', lang)}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-100">
                <td className="px-3 py-2">
                  {r.client_name}
                  {r.phone ? <div className="text-xs text-slate-400">{r.phone}</div> : null}
                </td>
                <td>
                  <Money value={r.debit} />
                </td>
                <td>
                  <Money value={r.credit} tone="in" />
                </td>
                <td>
                  <Money value={r.debit - r.credit} />
                </td>
                <td>{r.status}</td>
                <td>
                  <button className="text-teal-700" onClick={() => setPayId(r.id)}>
                    {t('settle', lang)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t font-bold">
              <td className="px-3 py-2">{t('total', lang)}</td>
              <td colSpan={3}>
                <Money value={total} />
              </td>
            </tr>
          </tfoot>
        </table>
        </TableWrap>
      </Card>
      {payId != null && (
        <Modal
          title={t('settle', lang)}
          onClose={() => setPayId(null)}
          footer={
            <>
              <Btn variant="ghost" onClick={() => setPayId(null)}>
                {t('cancel', lang)}
              </Btn>
              <Btn
                onClick={() => {
                  if (!user) return
                  const rec = rows.find((x) => x.id === payId)
                  if (!rec) return
                  const amt = Number(payAmt)
                  insertMovement(
                    {
                      account_id: accId,
                      date: todayIso(),
                      nature: 'Recettes',
                      designation: 'PAIEMENT CLIENT',
                      detail1: rec.client_name,
                      entree: amt,
                      remarks: `Créance #${rec.id}`,
                    },
                    user.id,
                  )
                  run('UPDATE receivables SET credit = credit + ? WHERE id = ?', [amt, rec.id])
                  persist()
                  setPayId(null)
                  setPayAmt('')
                  refresh()
                }}
              >
                {t('save', lang)}
              </Btn>
            </>
          }
        >
            <Field label={t('account', lang)}>
              <select className={inputClass} value={accId} onChange={(e) => setAccId(Number(e.target.value))}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name_fr}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t('amount', lang)}>
              <input className={inputClass} type="number" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
            </Field>
        </Modal>
      )}
    </div>
  )
}
