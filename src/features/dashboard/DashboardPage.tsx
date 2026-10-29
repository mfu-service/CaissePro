import { ArrowLeftRight, BookOpen, Receipt } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Link } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { all, accountBalance, one } from '../../lib/db'
import { chartValueMargin, chartValueYAxisProps } from '../../lib/chartAxis'
import { formatDzd, monthKey, todayIso } from '../../lib/format'
import { t } from '../../lib/i18n'
import type { Account, Receivable } from '../../lib/types'
import { Card, CardHeader, CompanyHomeProfile, Money, PageHeader, StatCard } from '../../shared/ui'

export function DashboardPage() {
  const { lang, tick, company } = useApp()
  const today = todayIso()
  const month = monthKey(today)
  const accounts = all<Account>('SELECT * FROM accounts WHERE active = 1 ORDER BY sort_order')

  const day = one<{ e: number; s: number }>(
    `SELECT COALESCE(SUM(entree),0) e, COALESCE(SUM(sortie),0) s FROM movements WHERE date = ?`,
    [today],
  )
  const mo = one<{ e: number; s: number }>(
    `SELECT COALESCE(SUM(entree),0) e, COALESCE(SUM(sortie),0) s FROM movements WHERE date LIKE ?`,
    [`${month}%`],
  )
  const expenses = all<{ designation: string; s: number }>(
    `SELECT IFNULL(designation, nature) designation, SUM(sortie) s
     FROM movements WHERE date LIKE ? AND sortie > 0
     GROUP BY designation ORDER BY s DESC LIMIT 6`,
    [`${month}%`],
  )
  const debts = all<Receivable>('SELECT * FROM receivables ORDER BY (debit-credit) DESC LIMIT 6')
  const monthly = all<{ m: string; e: number; s: number }>(
    `SELECT substr(date,1,7) m, SUM(entree) e, SUM(sortie) s FROM movements GROUP BY m ORDER BY m`,
  )
  void tick

  const kpis = [
    { label: t('todayIn', lang), value: Number(day?.e ?? 0), tone: 'in' as const },
    { label: t('todayOut', lang), value: Number(day?.s ?? 0), tone: 'out' as const },
    { label: t('monthIn', lang), value: Number(mo?.e ?? 0), tone: 'in' as const },
    { label: t('monthOut', lang), value: Number(mo?.s ?? 0), tone: 'out' as const },
  ]

  return (
    <div className="space-y-6">
      <CompanyHomeProfile company={company} lang={lang} />

      <PageHeader
        title={t('dashboard', lang)}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              to="/journal"
              className="inline-flex items-center gap-2 rounded-lg bg-teal-700 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800"
            >
              <BookOpen size={16} />
              {t('journal', lang)}
            </Link>
            <Link
              to="/transferts"
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <ArrowLeftRight size={16} />
              {t('transfers', lang)}
            </Link>
          </div>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <StatCard
            key={k.label}
            label={k.label}
            tone={k.tone}
            value={<Money value={k.value} tone={k.tone === 'in' ? 'in' : k.tone === 'out' ? 'out' : 'auto'} />}
          />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title={t('balances', lang)} />
          <ul className="divide-y divide-slate-100">
            {accounts.map((a) => {
              const bal = accountBalance(a.id)
              return (
                <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm first:pt-0">
                  <span className="font-medium text-slate-700">{lang === 'ar' ? a.name_ar : a.name_fr}</span>
                  <span className="text-end">
                    <Money value={bal} />
                    {bal < 50000 && bal >= 0 ? (
                      <span className="ms-2 text-[10px] font-bold uppercase text-amber-600">{t('lowBalance', lang)}</span>
                    ) : null}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title={t('monthlyChart', lang)} />
          <div className="h-60">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthly} margin={chartValueMargin(lang === 'ar')}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="m" fontSize={11} tickLine={false} />
                <YAxis {...chartValueYAxisProps(lang === 'ar')} />
                <Tooltip formatter={(v) => formatDzd(Number(v))} />
                <Line type="monotone" dataKey="e" name={t('entree', lang)} stroke="#047857" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="s" name={t('sortie', lang)} stroke="#b91c1c" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader title={t('topExpenses', lang)} />
          <ul className="space-y-2 text-sm">
            {expenses.map((e) => (
              <li key={e.designation} className="flex justify-between gap-2 rounded-lg bg-slate-50/80 px-2 py-1.5">
                <span className="truncate text-slate-700">{e.designation || '—'}</span>
                <Money value={e.s} tone="out" />
              </li>
            ))}
            {!expenses.length && <li className="py-6 text-center text-sm text-slate-400">{t('noData', lang)}</li>}
          </ul>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader
            title={t('receivables', lang)}
            actions={
              <Link to="/creances" className="text-xs font-semibold text-teal-700 hover:underline">
                {t('receivables', lang)} →
              </Link>
            }
          />
          <ul className="space-y-2 text-sm">
            {debts.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2 last:border-0">
                <span className="flex items-center gap-2 font-medium text-slate-700">
                  <Receipt size={14} className="text-slate-400" />
                  {d.client_name}
                </span>
                <Money value={d.debit - d.credit} />
              </li>
            ))}
            {!debts.length && <li className="py-6 text-center text-slate-400">{t('noData', lang)}</li>}
          </ul>
        </Card>
      </div>
    </div>
  )
}
