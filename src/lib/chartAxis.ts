/** Compact axis ticks for Recharts (full values stay in tooltips). */
export function formatChartTick(value: number): string {
  const n = Number(value)
  if (!Number.isFinite(n)) return ''
  const abs = Math.abs(n)
  if (abs >= 1_000_000) {
    const m = n / 1_000_000
    return `${Number.isInteger(m) ? m : m.toFixed(1)}M`
  }
  if (abs >= 10_000) {
    const k = n / 1_000
    return `${Number.isInteger(k) ? k : k.toFixed(1)}K`
  }
  return new Intl.NumberFormat('fr-DZ', { maximumFractionDigits: 0 }).format(n)
}

export function chartValueMargin(isRtl: boolean) {
  return isRtl
    ? { top: 8, right: 56, left: 12, bottom: 8 }
    : { top: 8, left: 56, right: 12, bottom: 8 }
}

const numericTickProps = {
  fontSize: 11,
  tickLine: false as const,
  axisLine: false as const,
  mirror: false as const,
  tickFormatter: (v: unknown) => formatChartTick(Number(v)),
}

/** Y-axis for vertical bar/line charts (value scale). */
export function chartValueYAxisProps(isRtl: boolean) {
  return {
    ...numericTickProps,
    width: 52,
    orientation: (isRtl ? 'right' : 'left') as 'left' | 'right',
  }
}

/** X-axis for horizontal bar charts (value scale). */
export function chartValueXAxisProps() {
  return {
    type: 'number' as const,
    ...numericTickProps,
    height: 32,
  }
}

export function horizontalBarMargin(isRtl: boolean) {
  return isRtl
    ? { top: 8, right: 8, left: 56, bottom: 8 }
    : { top: 8, left: 8, right: 56, bottom: 8 }
}
