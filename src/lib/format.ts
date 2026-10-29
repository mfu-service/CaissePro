export function formatDzd(value: number | null | undefined, withUnit = true): string {
  const n = Number(value ?? 0)
  const formatted = new Intl.NumberFormat('fr-DZ', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)
  return withUnit ? `${formatted} DA` : formatted
}

export function todayIso(): string {
  const d = new Date()
  const z = (x: number) => String(x).padStart(2, '0')
  return `${d.getFullYear()}-${z(d.getMonth() + 1)}-${z(d.getDate())}`
}

export function formatDate(iso: string | null | undefined, lang: 'fr' | 'ar' = 'fr'): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return iso
  return lang === 'ar' ? `${d}/${m}/${y}` : `${d}/${m}/${y}`
}

export function monthKey(iso: string): string {
  return iso.slice(0, 7)
}

export function monthLabel(key: string, lang: 'fr' | 'ar'): string {
  const [y, m] = key.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date.toLocaleDateString(lang === 'ar' ? 'ar-DZ' : 'fr-DZ', {
    month: 'short',
    year: 'numeric',
  })
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return 'CP'
  return parts
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function num(v: unknown): number {
  if (v == null || v === '') return 0
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0
  const s = String(v).replace(/\s/g, '').replace(',', '.')
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}
