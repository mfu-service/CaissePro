import type { ReactNode } from 'react'
import { formatDate, formatDzd, initials, todayIso } from '../lib/format'
import { t } from '../lib/i18n'
import type { CompanyProfile, Lang } from '../lib/types'
import { openPrintPreview } from './PrintPreview'

export type PrintFilter = { label: string; value: string }
export type PrintKpi = { label: string; value: string; tone?: 'in' | 'out' | 'brand' }

export function printDocument(title: string) {
  void openPrintPreview(title)
}

export function printAmount(value: number, tone?: 'in' | 'out' | 'auto', dashIfZero = true) {
  const n = Number(value) || 0
  const cls = tone === 'in' ? 'num print-in' : tone === 'out' ? 'num print-out' : n < 0 ? 'num print-out' : 'num'
  return <span className={cls}>{!n && dashIfZero ? '—' : formatDzd(n, false)}</span>
}

export function PrintReport({
  company,
  lang,
  title,
  subtitle,
  kicker,
  orientation = 'portrait',
  filters = [],
  kpis = [],
  children,
}: {
  company: CompanyProfile
  lang: Lang
  title: string
  subtitle?: string
  kicker?: string
  orientation?: 'portrait' | 'landscape'
  filters?: PrintFilter[]
  kpis?: PrintKpi[]
  children: ReactNode
}) {
  const name = lang === 'ar' ? company.name_ar || company.name_fr : company.name_fr || company.name_ar
  const alt = lang === 'ar' ? company.name_fr : company.name_ar
  const printed = formatDate(todayIso(), lang)
  const meta = [company.address, company.city, company.phone, company.email].filter((v) => v?.trim())
  const ids = [
    company.rc && `RC ${company.rc}`,
    company.nif && `NIF ${company.nif}`,
    company.nis && `NIS ${company.nis}`,
    company.ai && `AI ${company.ai}`,
  ].filter(Boolean) as string[]
  const kpiCols = Math.min(Math.max(kpis.length, 1), 4)

  return (
    <article className={`print-document print-${orientation}`} dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <header className="print-letterhead">
        <div className="print-brand">
          {company.logo_data_url ? (
            <img className="print-logo" src={company.logo_data_url} alt="" />
          ) : (
            <div className="print-logo print-logo-fallback">{initials(name || 'CP')}</div>
          )}
          <div>
            {company.legal_form ? <p className="print-legal">{company.legal_form}</p> : null}
            <h1 className="print-org">{name || '—'}</h1>
            {alt && alt !== name ? <p className="print-org-alt">{alt}</p> : null}
            {meta.length ? <p className="print-meta">{meta.join(' · ')}</p> : null}
            {ids.length ? <p className="print-ids">{ids.join(' · ')}</p> : null}
          </div>
        </div>
        <div className="print-stamp">
          <div className="print-stamp-kicker">{kicker || t('reports', lang)}</div>
          <div className="print-stamp-title">{title}</div>
          <div className="print-stamp-date">
            {t('printedOn', lang)}: {printed}
          </div>
        </div>
      </header>
      <div className="print-rule" />
      <h2 className="print-title">{title}</h2>
      {subtitle ? <p className="print-sub">{subtitle}</p> : null}
      <p className="print-unit">{t('currencyNote', lang)}</p>
      {filters.length ? (
        <>
          <div className="print-criteria">{t('criteria', lang)}</div>
          <div className="print-filters">
            {filters.map((f) => (
              <div key={f.label}>
                <span>{f.label}: </span>
                <strong>{f.value}</strong>
              </div>
            ))}
          </div>
        </>
      ) : null}
      {kpis.length ? (
        <div className={`print-kpis n-${kpiCols}`}>
          {kpis.map((k) => (
            <div key={k.label} className={`print-kpi${k.tone ? ` ${k.tone}` : ''}`}>
              <span>{k.label}</span>
              <strong>{k.value}</strong>
            </div>
          ))}
        </div>
      ) : null}
      {children}
      <footer className="print-footer">
        <span>{name}</span>
        <span className="print-footer-pages" />
        <span>
          {t('printedOn', lang)}: {printed}
        </span>
      </footer>
    </article>
  )
}

export function PrintSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="print-section">
      <h3>{title}</h3>
      {children}
    </section>
  )
}

export function PrintTable({ children, dense = false }: { children: ReactNode; dense?: boolean }) {
  return <table className={dense ? 'print-table print-table-dense' : 'print-table'}>{children}</table>
}
