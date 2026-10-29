import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { t } from '../../lib/i18n'
import { AppLogo } from '../../shared/AppLogo'
import { Btn, Card, Field, inputClass } from '../../shared/ui'

export function LoginPage() {
  const { login, lang, setLang, error } = useApp()
  const [username, setUsername] = useState('admin')
  const [pin, setPin] = useState('1234')
  const [bad, setBad] = useState(false)
  const [pending, setPending] = useState(false)

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 p-6"
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
    >
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center text-white">
          <AppLogo
            lang={lang}
            size={72}
            showTagline
            inverted
            className="mb-3 !flex-col items-center gap-2 [&_img]:shadow-lg [&_img]:shadow-teal-950/40"
          />
          <p className="mt-1 text-sm text-slate-300">{t('pinDefault', lang)}</p>
        </div>
        <Card className="shadow-2xl ring-1 ring-white/10">
          {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault()
              setPending(true)
              void login(username, pin).then((ok) => {
                setBad(!ok)
                setPending(false)
              })
            }}
          >
            <Field label={t('username', lang)}>
              <input className={inputClass} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" />
            </Field>
            <Field label={t('pin', lang)}>
              <input
                className={inputClass}
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoComplete="current-password"
              />
            </Field>
            {bad && <p className="text-sm text-red-600">{t('badLogin', lang)}</p>}
            <Btn type="submit" className="w-full" disabled={pending}>
              {t('enter', lang)}
            </Btn>
          </form>
          <div className="mt-5 flex justify-center gap-2 rounded-lg bg-slate-50 p-1 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setLang('fr')}
              className={`flex-1 rounded-md py-1.5 ${lang === 'fr' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'}`}
            >
              FR
            </button>
            <button
              type="button"
              onClick={() => setLang('ar')}
              className={`flex-1 rounded-md py-1.5 ${lang === 'ar' ? 'bg-white text-teal-800 shadow-sm' : 'text-slate-500'}`}
            >
              العربية
            </button>
          </div>
        </Card>
      </div>
    </div>
  )
}
