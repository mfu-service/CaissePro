import {
  ArrowLeftRight,
  BookOpen,
  Building2,
  LayoutDashboard,
  LogOut,
  Package,
  PanelLeft,
  PanelTop,
  Receipt,
  Settings,
  Truck,
  Users,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { useApp } from '../../context/AppContext'
import { getSetting, setSetting } from '../../lib/db'
import { t, type I18nKey } from '../../lib/i18n'
import { can } from '../../lib/permissions'
import { AppLogo } from '../../shared/AppLogo'
import { CompanyBrandCenter, IconBtn } from '../../shared/ui'

type NavItem = { to: string; key: I18nKey; icon: typeof LayoutDashboard; perm: string }

const NAV_GROUPS: NavItem[][] = [
  [
    { to: '/', key: 'dashboard', icon: LayoutDashboard, perm: 'dashboard' },
    { to: '/journal', key: 'journal', icon: BookOpen, perm: 'journal' },
    { to: '/transferts', key: 'transfers', icon: ArrowLeftRight, perm: 'transfer' },
  ],
  [
    { to: '/references', key: 'parties', icon: Users, perm: 'parties' },
    { to: '/creances', key: 'receivables', icon: Receipt, perm: 'receivables' },
    { to: '/transport', key: 'transport', icon: Truck, perm: 'transport' },
    { to: '/rapports', key: 'reports', icon: Package, perm: 'reports' },
  ],
  [
    { to: '/entreprise', key: 'company', icon: Building2, perm: 'company' },
    { to: '/parametres', key: 'settings', icon: Settings, perm: 'settings' },
  ],
]

export function AppShell() {
  const { lang, setLang, company, user, logout } = useApp()
  const [navLayout, setNavLayout] = useState<'top' | 'side'>(() =>
    getSetting('nav_layout', 'top') === 'side' ? 'side' : 'top',
  )
  if (!user) return null

  const groups = NAV_GROUPS.map((g) => g.filter((n) => can(user, n.perm))).filter((g) => g.length)

  const toggleLayout = () => {
    const next = navLayout === 'top' ? 'side' : 'top'
    setNavLayout(next)
    setSetting('nav_layout', next)
  }

  const langSwitch = (
    <div className="flex rounded-lg border border-slate-200/80 bg-white p-0.5 text-xs font-semibold shadow-sm">
      <button
        type="button"
        className={`rounded-md px-2.5 py-1 transition ${lang === 'fr' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        onClick={() => setLang('fr')}
      >
        FR
      </button>
      <button
        type="button"
        className={`rounded-md px-2.5 py-1 transition ${lang === 'ar' ? 'bg-teal-700 text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
        onClick={() => setLang('ar')}
      >
        ع
      </button>
    </div>
  )

  const navClass = (compact: boolean) =>
    ({ isActive }: { isActive: boolean }) =>
      `flex w-full items-center gap-2 rounded-lg font-medium transition ${
        compact ? 'px-2.5 py-2 text-xs' : 'px-3 py-2.5 text-sm'
      } ${
        isActive
          ? 'bg-teal-700 text-white shadow-sm'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`

  const topNavClass = ({ isActive }: { isActive: boolean }) =>
    `flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${
      isActive
        ? 'bg-teal-700 text-white shadow-md shadow-teal-900/15'
        : 'text-slate-600 hover:bg-white hover:text-teal-900 hover:shadow-sm'
    }`

  const renderLinks = (compact: boolean) =>
    groups.map((group, gi) => (
      <div key={gi} className={`flex items-center gap-0.5 ${compact ? 'w-full flex-col' : ''}`}>
        {group.map((n) => {
          const Icon = n.icon
          return (
            <NavLink key={n.to} to={n.to} end={n.to === '/'} className={compact ? navClass(true) : topNavClass}>
              <Icon size={compact ? 16 : 16} strokeWidth={2.25} />
              <span>{t(n.key, lang)}</span>
            </NavLink>
          )
        })}
        {!compact && gi < groups.length - 1 ? (
          <span className="mx-1.5 hidden h-5 w-px shrink-0 bg-slate-300/70 lg:block" aria-hidden />
        ) : null}
      </div>
    ))

  const userChip = (
    <div className="hidden max-w-[9rem] items-center gap-2 truncate rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm sm:flex">
      <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500 ring-2 ring-emerald-100" />
      <span className="truncate">{user.display_name}</span>
    </div>
  )

  const headerTools = (
    <div className="flex flex-wrap items-center justify-end gap-1.5 sm:gap-2">
      {userChip}
      {langSwitch}
      <IconBtn title={navLayout === 'top' ? t('navSide', lang) : t('navTop', lang)} onClick={toggleLayout}>
        <PanelLeft size={18} />
      </IconBtn>
      <BtnLogout lang={lang} onLogout={logout} compact />
    </div>
  )

  if (navLayout === 'top') {
    return (
      <div className="flex min-h-screen flex-col" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <header className="app-header no-print sticky top-0 z-40">
          <div className="border-b border-teal-900/5 bg-gradient-to-b from-white to-slate-50/90">
            <div className="mx-auto grid max-w-[1680px] grid-cols-[auto_1fr_auto] items-center gap-3 px-3 py-2.5 sm:px-5 sm:py-3">
              <div className="flex min-w-0 items-center justify-start">
                <AppLogo lang={lang} size={38} showTagline className="shrink-0" />
              </div>
              <div className="flex min-w-0 justify-center px-1">
                <CompanyBrandCenter company={company} lang={lang} size="lg" logoOnly />
              </div>
              <div className="flex min-w-0 justify-end">{headerTools}</div>
            </div>
          </div>
          <nav className="scroll-thin border-b border-slate-200/80 bg-slate-100/70 backdrop-blur-sm">
            <div className="mx-auto flex max-w-[1680px] justify-center px-2 py-2 sm:px-4">
              <div className="inline-flex max-w-full flex-wrap items-center justify-center gap-1 rounded-2xl border border-slate-200/60 bg-white/90 p-1 shadow-sm">
                {renderLinks(false)}
              </div>
            </div>
          </nav>
        </header>
        <main className="app-main">
          <div className="app-page">
            <Outlet />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <aside className="no-print flex w-[17.5rem] shrink-0 flex-col border-e border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-b from-teal-50/40 to-white px-4 py-4">
          <div className="mb-3 flex items-start justify-between gap-2">
            <AppLogo lang={lang} size={32} showTagline />
            <IconBtn title={t('navTop', lang)} onClick={toggleLayout}>
              <PanelTop size={18} />
            </IconBtn>
          </div>
          <div className="flex justify-center pb-1">
            <CompanyBrandCenter company={company} lang={lang} size="sm" logoOnly />
          </div>
        </div>
        <nav className="scroll-thin flex-1 space-y-3 overflow-y-auto p-3">{renderLinks(true)}</nav>
        <div className="space-y-2 border-t border-slate-100 bg-slate-50/50 p-3">
          {langSwitch}
          <BtnLogout lang={lang} onLogout={logout} wide />
        </div>
      </aside>
      <main className="app-main min-w-0 flex-1">
        <div className="app-page">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

function BtnLogout({
  lang,
  onLogout,
  wide,
  compact,
}: {
  lang: 'fr' | 'ar'
  onLogout: () => void
  wide?: boolean
  compact?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onLogout}
      title={t('logout', lang)}
      className={`inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200/80 bg-white font-medium text-slate-600 shadow-sm transition hover:border-red-200 hover:bg-red-50 hover:text-red-700 ${
        wide ? 'w-full px-3 py-2 text-sm' : compact ? 'p-2 text-sm sm:px-3 sm:py-2' : 'px-3 py-2 text-sm'
      }`}
    >
      <LogOut size={16} />
      <span className={compact ? 'hidden sm:inline' : ''}>{t('logout', lang)}</span>
    </button>
  )
}
