import type { LucideIcon } from 'lucide-react'
import type { I18nKey } from '../lib/i18n'
import { t } from '../lib/i18n'
import { formatDzd, initials } from '../lib/format'
import type { CompanyProfile, Lang } from '../lib/types'

export const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15 disabled:bg-slate-50 disabled:text-slate-500'

export const inputTriggerClass =
  'flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-start text-sm shadow-sm outline-none transition hover:border-slate-300 focus:border-teal-600 focus:ring-4 focus:ring-teal-600/15 disabled:opacity-50'

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-xs font-semibold tracking-wide text-slate-600">{children}</label>
}

export function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <Label>{label}</Label>
      {children}
    </div>
  )
}

export function Btn({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  className = '',
  size = 'md',
}: {
  children: React.ReactNode
  onClick?: () => void
  type?: 'button' | 'submit'
  variant?: 'primary' | 'ghost' | 'danger' | 'outline'
  disabled?: boolean
  className?: string
  size?: 'sm' | 'md'
}) {
  const styles = {
    primary: 'bg-teal-700 text-white shadow-sm hover:bg-teal-800 active:bg-teal-900',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
    danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
    outline: 'border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50',
  }[variant]
  const sizes = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3.5 py-2 text-sm'
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${sizes} ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

export function IconBtn({
  title,
  onClick,
  children,
  tone = 'neutral',
  className = '',
}: {
  title: string
  onClick?: () => void
  children: React.ReactNode
  tone?: 'neutral' | 'brand' | 'danger'
  className?: string
}) {
  const toneCls = {
    neutral: 'text-slate-500 hover:bg-slate-100 hover:text-slate-700',
    brand: 'text-teal-700 hover:bg-teal-50',
    danger: 'text-red-600 hover:bg-red-50',
  }[tone]
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`inline-flex rounded-lg p-2 transition ${toneCls} ${className}`}
    >
      {children}
    </button>
  )
}

export function Money({
  value,
  tone,
}: {
  value: number
  tone?: 'in' | 'out' | 'auto'
}) {
  const cls =
    tone === 'in'
      ? 'amount-in'
      : tone === 'out'
        ? 'amount-out'
        : value < 0
          ? 'amount-out'
          : 'amount'
  return <span className={cls}>{formatDzd(value)}</span>
}

export function CompanyLogoMark({
  company,
  lang,
  size = 'md',
}: {
  company: CompanyProfile
  lang: Lang
  size?: 'sm' | 'md' | 'lg' | 'xl'
}) {
  const name = lang === 'ar' ? company.name_ar || company.name_fr : company.name_fr || company.name_ar
  const logoSize =
    size === 'sm'
      ? 'h-10 w-10 text-xs'
      : size === 'lg'
        ? 'h-14 w-14 text-base sm:h-16 sm:w-16 sm:text-lg'
        : size === 'xl'
          ? 'h-20 w-20 text-xl sm:h-24 sm:w-24 sm:text-2xl'
          : 'h-12 w-12 text-sm'
  const wrap = size === 'xl' ? 'p-2' : 'p-1.5'
  return (
    <div className={`rounded-2xl bg-gradient-to-b from-teal-50/80 to-transparent ${wrap}`}>
      {company.logo_data_url ? (
        <img
          src={company.logo_data_url}
          alt=""
          className={`${logoSize} rounded-xl border border-slate-200/90 bg-white object-contain shadow-md ring-1 ring-black/5`}
        />
      ) : (
        <div
          className={`flex ${logoSize} items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-800 font-bold text-white shadow-md ring-1 ring-teal-900/10`}
        >
          {initials(name || 'CP')}
        </div>
      )}
    </div>
  )
}

export function CompanyBrandCenter({
  company,
  lang,
  subtitle,
  size = 'md',
  logoOnly = false,
}: {
  company: CompanyProfile
  lang: Lang
  subtitle?: string
  size?: 'sm' | 'md' | 'lg'
  logoOnly?: boolean
}) {
  const name = lang === 'ar' ? company.name_ar || company.name_fr : company.name_fr || company.name_ar
  const titleSize =
    size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm font-bold sm:text-base' : 'text-sm sm:text-[15px]'
  const meta = subtitle ?? [company.city, company.phone].filter(Boolean).join(' · ')

  if (logoOnly) {
    return (
      <div className="flex justify-center">
        <CompanyLogoMark company={company} lang={lang} size={size === 'sm' ? 'sm' : 'lg'} />
      </div>
    )
  }

  return (
    <div className="flex max-w-[min(100%,26rem)] flex-col items-center text-center">
      <div className="mb-2">
        <CompanyLogoMark company={company} lang={lang} size={size === 'sm' ? 'sm' : size === 'lg' ? 'lg' : 'md'} />
      </div>
      <div className={`leading-snug text-slate-900 ${titleSize}`}>
        {company.legal_form ? (
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-teal-700 sm:text-[11px]">
            {company.legal_form}
          </span>
        ) : null}
        <span className="block font-bold">{name}</span>
      </div>
      {meta ? <div className="mt-1 max-w-full truncate text-[11px] text-slate-500">{meta}</div> : null}
    </div>
  )
}

export function CompanyHomeProfile({ company, lang }: { company: CompanyProfile; lang: Lang }) {
  const name = lang === 'ar' ? company.name_ar || company.name_fr : company.name_fr || company.name_ar
  const altName = lang === 'ar' ? company.name_fr : company.name_ar
  const facts = [
    { label: t('city', lang), value: company.city },
    { label: t('address', lang), value: company.address },
    { label: t('phone', lang), value: company.phone },
    { label: t('email', lang), value: company.email },
    { label: t('website', lang), value: company.website },
    { label: 'RC', value: company.rc },
    { label: 'NIF', value: company.nif },
    { label: 'NIS', value: company.nis },
    { label: 'AI', value: company.ai },
  ].filter((f) => f.value?.trim())

  return (
    <Card className="bg-gradient-to-br from-white via-teal-50/30 to-white">
      <div className="flex flex-col items-center gap-5 text-center sm:flex-row sm:items-start sm:text-start">
        <CompanyLogoMark company={company} lang={lang} size="xl" />
        <div className="min-w-0 flex-1">
          {company.legal_form ? (
            <div className="text-xs font-semibold uppercase tracking-wider text-teal-700">{company.legal_form}</div>
          ) : null}
          <h2 className="mt-0.5 text-xl font-bold text-slate-900 sm:text-2xl">{name}</h2>
          {altName && altName !== name ? <p className="mt-1 text-sm text-slate-600">{altName}</p> : null}
          {facts.length ? (
            <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
              {facts.map((f) => (
                <div key={f.label} className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-slate-100">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{f.label}</dt>
                  <dd className="mt-0.5 font-medium text-slate-800 break-words">{f.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <p className="mt-3 text-sm text-slate-500">{t('setupHint', lang)}</p>
          )}
        </div>
      </div>
    </Card>
  )
}

export function CompanyHeader({
  company,
  lang,
  subtitle,
  inverted = false,
  compact = false,
}: {
  company: CompanyProfile
  lang: Lang
  subtitle?: string
  inverted?: boolean
  compact?: boolean
}) {
  const name = lang === 'ar' ? company.name_ar || company.name_fr : company.name_fr || company.name_ar
  const size = compact ? 'h-9 w-9 text-xs' : 'h-11 w-11 text-sm'
  return (
    <div className="flex min-w-0 items-center gap-3">
      {company.logo_data_url ? (
        <img
          src={company.logo_data_url}
          alt=""
          className={`${size} rounded-xl border border-slate-200/80 bg-white object-contain shadow-sm`}
        />
      ) : (
        <div
          className={`flex ${size} items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-teal-800 font-bold text-white shadow-sm`}
        >
          {initials(name || 'CP')}
        </div>
      )}
      <div className="min-w-0">
        <div
          className={`truncate font-bold ${compact ? 'text-sm' : 'text-[15px]'} ${inverted ? 'text-white' : 'text-slate-900'}`}
        >
          {company.legal_form ? `${company.legal_form} ` : ''}
          {name}
        </div>
        <div className={`truncate text-xs ${inverted ? 'text-slate-300' : 'text-slate-500'}`}>
          {subtitle ?? [company.city, company.phone].filter(Boolean).join(' · ')}
        </div>
      </div>
    </div>
  )
}

export function T({ k, lang }: { k: I18nKey; lang: Lang }) {
  return <>{t(k, lang)}</>
}

export function Card({
  children,
  className = '',
  padding = true,
}: {
  children: React.ReactNode
  className?: string
  padding?: boolean
}) {
  return <div className={`card ${padding ? 'p-4 sm:p-5' : ''} ${className}`}>{children}</div>
}

export function CardHeader({
  title,
  description,
  actions,
  className = '',
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`mb-4 flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4 ${className}`}>
      <div>
        <h2 className="text-sm font-bold text-slate-900">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}

export function PageTitle({ children }: { children: React.ReactNode }) {
  return <PageHeader title={children} />
}

export function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string
  value: React.ReactNode
  tone?: 'default' | 'in' | 'out' | 'brand'
  hint?: string
}) {
  const accent = {
    default: 'border-slate-200 bg-white',
    in: 'border-emerald-200/80 bg-gradient-to-br from-emerald-50/80 to-white',
    out: 'border-red-200/80 bg-gradient-to-br from-red-50/60 to-white',
    brand: 'border-teal-200/80 bg-gradient-to-br from-teal-50/70 to-white',
  }[tone ?? 'default']
  return (
    <div className={`card border p-4 ${accent}`}>
      <div className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-bold text-slate-900">{value}</div>
      {hint ? <div className="mt-1 text-xs text-slate-400">{hint}</div> : null}
    </div>
  )
}

export function SegmentedTabs<T extends string>({
  items,
  value,
  onChange,
}: {
  items: { id: T; label: string }[]
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div className="scroll-thin mb-5 overflow-x-auto rounded-xl border border-slate-200/80 bg-slate-100/80 p-1">
      <div className="flex min-w-max gap-1">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={`rounded-lg px-3.5 py-2 text-sm font-medium transition ${
              value === item.id
                ? 'bg-white text-teal-800 shadow-sm ring-1 ring-slate-200/80'
                : 'text-slate-600 hover:bg-white/60 hover:text-slate-900'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function FilterBar({ children }: { children: React.ReactNode }) {
  return (
    <Card className="no-print mb-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">{children}</div>
    </Card>
  )
}

export function TableWrap({
  children,
  className = '',
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={`scroll-thin overflow-auto ${className}`}>{children}</div>
}

export function EmptyRow({ colSpan, message }: { colSpan: number; message: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-12 text-center text-sm text-slate-400">
        {message}
      </td>
    </tr>
  )
}

export function Modal({
  title,
  children,
  footer,
  onClose,
  wide,
}: {
  title: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  onClose: () => void
  wide?: boolean
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        className={`card flex max-h-[90vh] w-full flex-col shadow-2xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h2 className="text-base font-bold text-slate-900">{title}</h2>
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-lg leading-none text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="scroll-thin flex-1 overflow-auto px-5 py-4">{children}</div>
        {footer ? <div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-4">{footer}</div> : null}
      </div>
    </div>
  )
}

export function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: string
  icon: LucideIcon
  label: string
}) {
  return (
    <a
      href={to}
      className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/50 hover:text-teal-800"
    >
      <Icon size={16} className="text-teal-700" />
      {label}
    </a>
  )
}
