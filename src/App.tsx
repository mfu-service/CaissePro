import { lazy, Suspense } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AppProvider, useApp } from './context/AppContext'
import { LoginPage } from './features/auth/LoginPage'
import { AppShell } from './features/layout/AppShell'
import { can } from './lib/permissions'
import { AppLogo } from './shared/AppLogo'
import { PrintPreviewHost } from './shared/PrintPreview'

const DashboardPage = lazy(() => import('./features/dashboard/DashboardPage').then((m) => ({ default: m.DashboardPage })))
const JournalPage = lazy(() => import('./features/journal/JournalPage').then((m) => ({ default: m.JournalPage })))
const TransfersPage = lazy(() => import('./features/transfers/TransfersPage').then((m) => ({ default: m.TransfersPage })))
const PartiesPage = lazy(() => import('./features/parties/PartiesPage').then((m) => ({ default: m.PartiesPage })))
const ReceivablesPage = lazy(() =>
  import('./features/receivables/ReceivablesPage').then((m) => ({ default: m.ReceivablesPage })),
)
const TransportPage = lazy(() => import('./features/transport/TransportPage').then((m) => ({ default: m.TransportPage })))
const ReportsPage = lazy(() => import('./features/reports/ReportsPage').then((m) => ({ default: m.ReportsPage })))
const CompanyPage = lazy(() => import('./features/settings/CompanyPage').then((m) => ({ default: m.CompanyPage })))
const SetupWizard = lazy(() => import('./features/settings/CompanyPage').then((m) => ({ default: m.SetupWizard })))
const SettingsPage = lazy(() => import('./features/settings/SettingsPage').then((m) => ({ default: m.SettingsPage })))
const ImportHelpPage = lazy(() =>
  import('./features/settings/ImportHelpPage').then((m) => ({ default: m.ImportHelpPage })),
)

function RouteFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center text-sm text-slate-500">
      …
    </div>
  )
}

function Gate() {
  const { ready, user, company, error } = useApp()
  if (error) {
    return (
      <div className="p-8 text-red-700">
        <h1 className="text-xl font-bold">CaissePro</h1>
        <p>{error}</p>
      </div>
    )
  }
  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-900 text-white">
        <AppLogo size={56} showTagline inverted className="!flex-col items-center gap-2 opacity-95" />
        <p className="text-sm text-slate-400">…</p>
      </div>
    )
  }
  if (!user) return <LoginPage />

  return (
    <Suspense fallback={<RouteFallback />}>
      {company.setup_done !== '1' && user.role === 'admin' ? (
        <SetupWizard />
      ) : (
        <Routes>
          <Route element={<AppShell />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/journal" element={<JournalPage />} />
            <Route path="/transferts" element={<TransfersPage />} />
            <Route path="/references" element={<PartiesPage />} />
            <Route path="/creances" element={<ReceivablesPage />} />
            <Route path="/transport" element={<TransportPage />} />
            <Route path="/rapports" element={<ReportsPage />} />
            <Route
              path="/entreprise"
              element={can(user, 'company') ? <CompanyPage /> : <Navigate to="/" />}
            />
            <Route
              path="/parametres"
              element={can(user, 'settings') ? <SettingsPage /> : <Navigate to="/" />}
            />
            <Route path="/import-help" element={<ImportHelpPage />} />
          </Route>
        </Routes>
      )}
    </Suspense>
  )
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Gate />
      </HashRouter>
      <PrintPreviewHost />
    </AppProvider>
  )
}
