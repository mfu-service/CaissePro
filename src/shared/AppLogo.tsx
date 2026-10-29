import { t } from '../lib/i18n'
import type { Lang } from '../lib/types'

function publicAsset(file: string) {
  const base = import.meta.env.BASE_URL
  return `${base}${file.replace(/^\//, '')}`
}

type Props = {
  lang?: Lang
  size?: number
  showName?: boolean
  showTagline?: boolean
  className?: string
  inverted?: boolean
}

export function AppLogo({
  lang = 'fr',
  size = 40,
  showName = true,
  showTagline = false,
  className = '',
  inverted = false,
}: Props) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img
        src={publicAsset('caissepro-icon.svg')}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-[22%] shadow-sm ring-1 ring-black/5"
        draggable={false}
      />
      {showName ? (
        <div className="min-w-0 leading-tight">
          <div className={`truncate text-base font-bold tracking-tight ${inverted ? 'text-white' : 'text-slate-900'}`}>
            {t('app', lang)}
          </div>
          {showTagline ? (
            <div className={`text-[10px] font-semibold uppercase tracking-widest ${inverted ? 'text-teal-200' : 'text-teal-700'}`}>
              {lang === 'ar' ? 'إدارة الصندوق' : 'Gestion de caisse'}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function AppLogoWide({ className = '', height = 36 }: { className?: string; height?: number }) {
  return (
    <img
      src={publicAsset('caissepro-logo.svg')}
      alt="CaissePro"
      className={className}
      style={{ height, width: 'auto' }}
      draggable={false}
    />
  )
}
