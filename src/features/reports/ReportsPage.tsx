import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { useApp } from '../../context/AppContext'
import { all, getCompany } from '../../lib/db'
import { exportSynthesisExcel, monthlySynthesis } from '../../lib/export'
import { chartValueMargin, chartValueXAxisProps, chartValueYAxisProps, horizontalBarMargin } from '../../lib/chartAxis'
import { formatDzd, monthLabel } from '../../lib/format'
import { t } from '../../lib/i18n'
import { Btn, Card, CardHeader, CompanyHeader, Money, PageHeader, StatCard, TableWrap, inputClass } from '../../shared/ui'

type SynthRow = { nature: string; designation: string; month: string; entree: number; sortie: number }

function aggregateByNature(rows: SynthRow[]) {
  const map = new Map<string, { entree: number; sortie: number }>()
  for (const r of rows) {
    const cur = map.get(r.nature) ?? { entree: 0, sortie: 0 }
    cur.entree += Number(r.entree)
    cur.sortie += Number(r.sortie)
    map.set(r.nature, cur)
  }
  return [...map.entries()]
    .map(([nature, v]) => ({ nature, ...v, net: v.sortie - v.entree }))
    .sort((a, b) => a.nature.localeCompare(b.nature))
}

function aggregateByDesignation(rows: SynthRow[]) {
  const map = new Map<string, { nature: string; entree: number; sortie: number }>()
  for (const r of rows) {
    const key = `${r.nature}\0${r.designation || '—'}`
    const cur = map.get(key) ?? { nature: r.nature, entree: 0, sortie: 0 }
    cur.entree += Number(r.entree)
    cur.sortie += Number(r.sortie)
    map.set(key, cur)
  }
  return [...map.entries()]
    .map(([key, v]) => {
      const designation = key.split('\0')[1] ?? '—'
      return { nature: v.nature, designation, entree: v.entree, sortie: v.sortie, net: v.sortie - v.entree }
    })
    .sort((a, b) => a.nature.localeCompare(b.nature) || a.designation.localeCompare(b.designation))
}

export function ReportsPage() {
  const { lang, company, tick } = useApp()
  const yearCounts = all<{ y: string; n: number }>(
    `SELECT substr(date,1,4) y, COUNT(*) n FROM movements
     WHERE CAST(substr(date,1,4) AS INTEGER) BETWEEN 2015 AND 2027
     GROUP BY y ORDER BY n DESC`,
  )
  const yearOptions = yearCounts.map((r) => r.y)
  const defaultYear =
    (company.fiscal_year && yearOptions.includes(company.fiscal_year) ? company.fiscal_year : null) ||
    yearOptions[0] ||
    company.fiscal_year ||
    '2025'
  const [year, setYear] = useState(defaultYear)
  const [month, setMonth] = useState('')
  const rows = useMemo(() => monthlySynthesis(year), [year, tick])
  const isAllYear = !month

  const monthOptions = useMemo(() => {
    const fromData = [...new Set(rows.map((r) => r.month).filter((m) => m.startsWith(year)))].sort()
    const fallback = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`)
    const list = fromData.length ? fromData : fallback
    return list
  }, [rows, year])

  useEffect(() => {
    if (month && !month.startsWith(`${year}-`)) setMonth('')
  }, [year, month])

  const scopedRows = useMemo(() => (month ? rows.filter((r) => r.month === month) : rows), [rows, month])

  const months = [...new Set(rows.map((r) => r.month))].sort()
  const groups = [...new Set(rows.map((r) => r.nature))]

  const yearChart = months.map((m) => {
    const slice = rows.filter((r) => r.month === m)
    return {
      m: monthLabel(m, lang),
      in: slice.reduce((s, r) => s + Number(r.entree), 0),
      out: slice.reduce((s, r) => s + Number(r.sortie), 0),
    }
  })

  const natureLines = useMemo(() => aggregateByNature(scopedRows), [scopedRows])
  const designationLines = useMemo(() => aggregateByDesignation(scopedRows), [scopedRows])

  const monthChart = natureLines.map((n) => ({
    name: n.nature.length > 14 ? `${n.nature.slice(0, 12)}…` : n.nature,
    full: n.nature,
    in: n.entree,
    out: n.sortie,
  }))

  const totals = natureLines.reduce(
    (acc, n) => ({
      entree: acc.entree + n.entree,
      sortie: acc.sortie + n.sortie,
      net: acc.net + n.net,
    }),
    { entree: 0, sortie: 0, net: 0 },
  )

  const isRtl = lang === 'ar'
  const periodLabel = month ? monthLabel(month, lang) : `${t('allMonths', lang)} ${year}`
  const reportTitle = isAllYear ? `${t('synthesis', lang)} ${year}` : `${t('natureStatement', lang)} — ${periodLabel}`

  const associes = all<{ detail2: string; s: number }>(
    `SELECT IFNULL(detail2, designation) detail2, SUM(sortie-entree) s
     FROM movements WHERE nature = 'Associés' AND date LIKE ?
     GROUP BY detail2 ORDER BY s DESC`,
    [month ? `${month}%` : `${year}%`],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title={t('reports', lang)}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <FieldSelect label={t('year', lang)} value={year} onChange={setYear} options={yearOptions.map((y) => ({ value: y, label: y }))} />
            <FieldSelect
              label={t('filterMonth', lang)}
              value={month}
              onChange={setMonth}
              options={[
                { value: '', label: t('allMonths', lang) },
                ...monthOptions.map((m) => ({ value: m, label: monthLabel(m, lang) })),
              ]}
            />
            <Btn variant="outline" size="sm" onClick={() => exportSynthesisExcel(year, month || undefined)}>
              {t('exportExcel', lang)}
            </Btn>
            <Btn variant="outline" size="sm" onClick={() => window.print()}>
              {t('print', lang)}
            </Btn>
          </div>
        }
      />

      <Card className="print-sheet">
        <CompanyHeader company={getCompany()} lang={lang} subtitle={reportTitle} />
      </Card>

      {!isAllYear && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label={t('entree', lang)} tone="in" value={<Money value={totals.entree} tone="in" />} />
          <StatCard label={t('sortie', lang)} tone="out" value={<Money value={totals.sortie} tone="out" />} />
          <StatCard label={t('netBalance', lang)} tone="brand" value={<Money value={totals.net} />} />
        </div>
      )}

      <Card>
        <CardHeader title={isAllYear ? t('monthlyChart', lang) : t('natureStatement', lang)} description={periodLabel} />
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {isAllYear ? (
              <BarChart data={yearChart} margin={chartValueMargin(isRtl)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="m" fontSize={11} tickLine={false} />
                <YAxis {...chartValueYAxisProps(isRtl)} />
                <Tooltip formatter={(v) => formatDzd(Number(v))} />
                <Bar dataKey="in" fill="#0f766e" name={t('entree', lang)} radius={[4, 4, 0, 0]} />
                <Bar dataKey="out" fill="#b91c1c" name={t('sortie', lang)} radius={[4, 4, 0, 0]} />
              </BarChart>
            ) : (
              <BarChart data={monthChart} layout="vertical" margin={horizontalBarMargin(isRtl)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis {...chartValueXAxisProps()} />
                <YAxis type="category" dataKey="name" width={100} fontSize={10} tickLine={false} mirror={false} />
                <Tooltip
                  formatter={(v) => formatDzd(Number(v))}
                  labelFormatter={(_, payload) => payload?.[0]?.payload?.full ?? ''}
                />
                <Bar dataKey="in" fill="#0f766e" name={t('entree', lang)} radius={[0, 4, 4, 0]} />
                <Bar dataKey="out" fill="#b91c1c" name={t('sortie', lang)} radius={[0, 4, 4, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </Card>

      {isAllYear ? (
        <Card padding={false}>
          <CardHeader className="px-5 pt-5" title={t('synthesis', lang)} description={periodLabel} />
          <TableWrap>
            <table className="table-shell min-w-full text-xs">
              <thead>
                <tr>
                  <th className="text-start">{t('nature', lang)}</th>
                  {months.map((m) => (
                    <th key={m} className="text-end">
                      {monthLabel(m, lang)}
                    </th>
                  ))}
                  <th className="text-end">{t('total', lang)}</th>
                </tr>
              </thead>
              <tbody>
                {groups.map((g) => {
                  const gRows = rows.filter((r) => r.nature === g)
                  const byMonth = (m: string) =>
                    gRows.filter((r) => r.month === m).reduce((s, r) => s + Number(r.sortie) - Number(r.entree), 0)
                  const tot = months.reduce((s, m) => s + byMonth(m), 0)
                  return (
                    <tr key={g}>
                      <td className="font-semibold text-slate-800">{g}</td>
                      {months.map((m) => (
                        <td key={m} className="text-end tabular-nums">
                          {formatDzd(byMonth(m), false)}
                        </td>
                      ))}
                      <td className="text-end font-semibold tabular-nums">{formatDzd(tot, false)}</td>
                    </tr>
                  )
                })}
                {!groups.length && (
                  <tr>
                    <td colSpan={months.length + 2} className="py-10 text-center text-slate-400">
                      {t('noData', lang)}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      ) : (
        <>
          <Card padding={false}>
            <CardHeader className="px-5 pt-5" title={t('natureStatement', lang)} description={periodLabel} />
            <TableWrap>
              <table className="table-shell">
                <thead>
                  <tr>
                    <th>{t('nature', lang)}</th>
                    <th className="text-end">{t('entree', lang)}</th>
                    <th className="text-end">{t('sortie', lang)}</th>
                    <th className="text-end">{t('netBalance', lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {natureLines.map((n) => (
                    <tr key={n.nature}>
                      <td className="font-semibold text-slate-800">{n.nature}</td>
                      <td className="text-end">{n.entree ? <Money value={n.entree} tone="in" /> : '—'}</td>
                      <td className="text-end">{n.sortie ? <Money value={n.sortie} tone="out" /> : '—'}</td>
                      <td className="text-end font-semibold">
                        <Money value={n.net} />
                      </td>
                    </tr>
                  ))}
                  {!natureLines.length && (
                    <tr>
                      <td colSpan={4} className="py-10 text-center text-slate-400">
                        {t('noData', lang)}
                      </td>
                    </tr>
                  )}
                </tbody>
                {natureLines.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-slate-200 bg-slate-50/80 font-bold">
                      <td className="px-3 py-2">{t('total', lang)}</td>
                      <td className="px-3 py-2 text-end">
                        <Money value={totals.entree} tone="in" />
                      </td>
                      <td className="px-3 py-2 text-end">
                        <Money value={totals.sortie} tone="out" />
                      </td>
                      <td className="px-3 py-2 text-end">
                        <Money value={totals.net} />
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </TableWrap>
          </Card>

          <Card padding={false}>
            <CardHeader className="px-5 pt-5" title={t('byDesignation', lang)} description={periodLabel} />
            <TableWrap>
              <table className="table-shell text-sm">
                <thead>
                  <tr>
                    <th>{t('nature', lang)}</th>
                    <th>{t('designation', lang)}</th>
                    <th className="text-end">{t('entree', lang)}</th>
                    <th className="text-end">{t('sortie', lang)}</th>
                    <th className="text-end">{t('netBalance', lang)}</th>
                  </tr>
                </thead>
                <tbody>
                  {designationLines.map((d) => (
                    <tr key={`${d.nature}-${d.designation}`}>
                      <td className="text-slate-600">{d.nature}</td>
                      <td className="font-medium">{d.designation}</td>
                      <td className="text-end">{d.entree ? <Money value={d.entree} tone="in" /> : '—'}</td>
                      <td className="text-end">{d.sortie ? <Money value={d.sortie} tone="out" /> : '—'}</td>
                      <td className="text-end">
                        <Money value={d.net} />
                      </td>
                    </tr>
                  ))}
                  {!designationLines.length && (
                    <tr>
                      <td colSpan={5} className="py-10 text-center text-slate-400">
                        {t('noData', lang)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </TableWrap>
          </Card>
        </>
      )}

      <Card>
        <CardHeader title={t('partnerLedger', lang)} description={periodLabel} />
        <TableWrap>
          <table className="table-shell">
            <tbody>
              {associes.map((a) => (
                <tr key={a.detail2}>
                  <td className="font-medium">{a.detail2 || '—'}</td>
                  <td className="text-end">
                    <Money value={a.s} />
                  </td>
                </tr>
              ))}
              {!associes.length && (
                <tr>
                  <td colSpan={2} className="py-8 text-center text-slate-400">
                    {t('noData', lang)}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  )
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold text-slate-600">
      <span>{label}</span>
      <select className={`${inputClass} min-w-[8.5rem] py-1.5`} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value || '__all'} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  )
}
