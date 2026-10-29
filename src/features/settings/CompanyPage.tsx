import { useState } from 'react'
import { useApp } from '../../context/AppContext'
import { audit, saveCompany, saveLogo, setSetting } from '../../lib/db'
import { initials } from '../../lib/format'
import { t } from '../../lib/i18n'
import type { CompanyProfile } from '../../lib/types'
import { AppLogo } from '../../shared/AppLogo'
import { Btn, Card, CompanyHeader, Field, PageHeader, inputClass } from '../../shared/ui'

const FORMS = ['Ets', 'SARL', 'EURL', 'SPA', 'Personne physique', 'Autre']

export function CompanyForm({
  onDone,
  setup,
}: {
  onDone?: () => void
  setup?: boolean
}) {
  const { company, lang, refresh, user } = useApp()
  const [form, setForm] = useState<CompanyProfile>(company)
  const [msg, setMsg] = useState('')

  const set = (k: keyof CompanyProfile, v: string) => setForm((f) => ({ ...f, [k]: v }))

  const onFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      setMsg('Logo ≤ 2 Mo')
      return
    }
    const ok = ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml']
    if (!ok.includes(file.type)) {
      setMsg('PNG / JPG / WEBP / SVG')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const url = String(reader.result || '')
      setForm((f) => ({ ...f, logo_data_url: url }))
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <Card>
        {setup && (
          <>
            <h2 className="mb-1 text-lg font-bold">{t('setupTitle', lang)}</h2>
            <p className="mb-4 text-sm text-slate-500">{t('setupHint', lang)}</p>
          </>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label={t('nameFr', lang)}>
            <input className={inputClass} value={form.name_fr} onChange={(e) => set('name_fr', e.target.value)} />
          </Field>
          <Field label={t('nameAr', lang)}>
            <input className={inputClass} dir="rtl" value={form.name_ar} onChange={(e) => set('name_ar', e.target.value)} />
          </Field>
          <Field label={t('legalForm', lang)}>
            <select className={inputClass} value={form.legal_form} onChange={(e) => set('legal_form', e.target.value)}>
              {FORMS.map((f) => (
                <option key={f}>{f}</option>
              ))}
            </select>
          </Field>
          <Field label={t('city', lang)}>
            <input className={inputClass} value={form.city} onChange={(e) => set('city', e.target.value)} />
          </Field>
          <Field label={t('address', lang)}>
            <input className={inputClass} value={form.address} onChange={(e) => set('address', e.target.value)} />
          </Field>
          <Field label={t('phone', lang)}>
            <input className={inputClass} value={form.phone} onChange={(e) => set('phone', e.target.value)} />
          </Field>
          <Field label={t('email', lang)}>
            <input className={inputClass} value={form.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label={t('website', lang)}>
            <input className={inputClass} value={form.website} onChange={(e) => set('website', e.target.value)} />
          </Field>
          <Field label="RC">
            <input className={inputClass} value={form.rc} onChange={(e) => set('rc', e.target.value)} />
          </Field>
          <Field label="NIF">
            <input className={inputClass} value={form.nif} onChange={(e) => set('nif', e.target.value)} />
          </Field>
          <Field label="NIS">
            <input className={inputClass} value={form.nis} onChange={(e) => set('nis', e.target.value)} />
          </Field>
          <Field label="Article d'imposition">
            <input className={inputClass} value={form.ai} onChange={(e) => set('ai', e.target.value)} />
          </Field>
          <Field label={t('fiscalYear', lang)}>
            <input className={inputClass} value={form.fiscal_year} onChange={(e) => set('fiscal_year', e.target.value)} />
          </Field>
          <Field label={t('fiscalStart', lang)}>
            <input type="date" className={inputClass} value={form.fiscal_start} onChange={(e) => set('fiscal_start', e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Btn
            onClick={() => {
              if (!form.name_fr.trim() && !form.name_ar.trim()) return
              if (form.logo_data_url) void saveLogo(form.logo_data_url)
              saveCompany({ ...form, setup_done: '1' }, user?.id)
              setSetting('setup_done', '1')
              audit(user?.id ?? null, 'update', 'company', '1', 'profile')
              refresh()
              setMsg(t('saved', lang))
              onDone?.()
            }}
          >
            {setup ? t('continue', lang) : t('save', lang)}
          </Btn>
          {msg && <span className="self-center text-sm text-teal-700">{msg}</span>}
        </div>
      </Card>
      <div className="space-y-4">
        <Card>
          <Field label={t('logo', lang)}>
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </Field>
          <div className="mt-3 flex gap-2">
            <Btn variant="outline" onClick={() => document.querySelector<HTMLInputElement>('input[type=file]')?.click()}>
              {t('uploadLogo', lang)}
            </Btn>
            <Btn
              variant="ghost"
              onClick={() => {
                setForm((f) => ({ ...f, logo_data_url: '' }))
              }}
            >
              {t('removeLogo', lang)}
            </Btn>
          </div>
        </Card>
        <Card>
          <div className="mb-2 text-xs font-semibold text-slate-500">{t('previewHeader', lang)}</div>
          <div className="mb-3 flex items-center gap-3">
            {form.logo_data_url ? (
              <>
                <img src={form.logo_data_url} alt="" className="h-16 w-16 rounded-lg border border-slate-200 object-contain bg-white" />
                <img src={form.logo_data_url} alt="" className="h-16 w-16 rounded-full border border-slate-200 object-cover bg-white" />
              </>
            ) : (
              <>
                <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-teal-700 text-lg font-bold text-white">
                  {initials(form.name_fr || form.name_ar || 'CP')}
                </div>
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-teal-700 text-lg font-bold text-white">
                  {initials(form.name_fr || form.name_ar || 'CP')}
                </div>
              </>
            )}
          </div>
          <CompanyHeader company={form} lang={lang} />
          <p className="mt-3 text-xs text-slate-500">{t('headerPreviewNote', lang)}</p>
          <div className="mt-3 rounded-xl border border-dashed border-slate-200 p-3 text-xs text-slate-500">
            {[form.address, form.rc && `RC ${form.rc}`, form.nif && `NIF ${form.nif}`].filter(Boolean).join(' · ') || '—'}
          </div>
        </Card>
      </div>
    </div>
  )
}

export function CompanyPage() {
  const { lang } = useApp()
  return (
    <div>
      <PageHeader title={t('company', lang)} />
      <CompanyForm />
    </div>
  )
}

export function SetupWizard() {
  const { lang, refresh } = useApp()
  return (
    <div className="min-h-screen bg-slate-100 p-6" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <AppLogo lang={lang} size={44} showTagline />
        </div>
        <CompanyForm setup onDone={refresh} />
      </div>
    </div>
  )
}
