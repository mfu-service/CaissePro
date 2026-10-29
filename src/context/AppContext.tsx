import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { all, getCompany, getSetting, hashPin, initDb, one, persist, setSetting } from '../lib/db'
import type { CompanyProfile, Lang, User } from '../lib/types'

type AppCtx = {
  ready: boolean
  user: User | null
  lang: Lang
  company: CompanyProfile
  error: string | null
  setLang: (l: Lang) => void
  login: (username: string, pin: string) => Promise<boolean>
  logout: () => void
  refresh: () => void
  reloadUser: () => void
  tick: number
}

const Ctx = createContext<AppCtx | null>(null)

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [lang, setLangState] = useState<Lang>('fr')
  const [company, setCompany] = useState<CompanyProfile>({} as CompanyProfile)
  const [error, setError] = useState<string | null>(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    void (async () => {
      try {
        await initDb()
        const nextLang = (getSetting('lang', 'fr') as Lang) || 'fr'
        setLangState(nextLang)
        document.documentElement.lang = nextLang
        document.documentElement.dir = nextLang === 'ar' ? 'rtl' : 'ltr'
        setCompany(getCompany())
        const saved = sessionStorage.getItem('caissepro-user')
        if (saved) setUser(JSON.parse(saved) as User)
        setReady(true)
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      }
    })()
  }, [])

  const refresh = useCallback(() => {
    setCompany(getCompany())
    setTick((n) => n + 1)
  }, [])

  const applyDir = (l: Lang) => {
    document.documentElement.lang = l
    document.documentElement.dir = l === 'ar' ? 'rtl' : 'ltr'
  }

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    applyDir(l)
    setSetting('lang', l)
    persist()
  }, [])

  const login = useCallback(async (username: string, pin: string) => {
    const hash = await hashPin(pin)
    const found = one<User & { pin_hash: string }>(
      'SELECT id, username, display_name, role, active, pin_hash FROM users WHERE username = ? AND active = 1',
      [username.trim()],
    )
    if (!found || found.pin_hash !== hash) return false
    const u: User = {
      id: found.id,
      username: found.username,
      display_name: found.display_name,
      role: found.role,
      active: found.active,
    }
    setUser(u)
    sessionStorage.setItem('caissepro-user', JSON.stringify(u))
    return true
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    sessionStorage.removeItem('caissepro-user')
  }, [])

  const reloadUser = useCallback(() => {
    const saved = sessionStorage.getItem('caissepro-user')
    if (!saved) return
    const cur = JSON.parse(saved) as User
    const found = one<User>(
      'SELECT id, username, display_name, role, active FROM users WHERE id = ? AND active = 1',
      [cur.id],
    )
    if (found) {
      setUser(found)
      sessionStorage.setItem('caissepro-user', JSON.stringify(found))
    } else {
      logout()
    }
  }, [logout])

  const value = useMemo(
    () => ({ ready, user, lang, company, error, setLang, login, logout, refresh, reloadUser, tick }),
    [ready, user, lang, company, error, setLang, login, logout, refresh, reloadUser, tick],
  )

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useApp() {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useApp')
  return ctx
}

export function useUsers() {
  return all<User>('SELECT id, username, display_name, role, active FROM users ORDER BY id')
}
