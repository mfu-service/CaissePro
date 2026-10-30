const ARABIC =
  'U+0600-06FF,U+0750-077F,U+0870-088E,U+0890-0891,U+0897-08E1,U+08E3-08FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC'
const LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF'
const LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'

function face(weight: number, src: string, range: string) {
  const url = src.startsWith('data:') ? src : `data:font/woff2;base64,${src}`
  return `@font-face{font-family:'Cairo';font-style:normal;font-weight:${weight};font-display:block;src:url("${url}") format('woff2');unicode-range:${range};}`
}

let fontCss: Promise<string> | null = null

function cairoCss() {
  if (!fontCss) {
    fontCss = Promise.all([
      import('@fontsource/cairo/files/cairo-arabic-400-normal.woff2?inline'),
      import('@fontsource/cairo/files/cairo-latin-ext-400-normal.woff2?inline'),
      import('@fontsource/cairo/files/cairo-latin-400-normal.woff2?inline'),
      import('@fontsource/cairo/files/cairo-arabic-700-normal.woff2?inline'),
      import('@fontsource/cairo/files/cairo-latin-ext-700-normal.woff2?inline'),
      import('@fontsource/cairo/files/cairo-latin-700-normal.woff2?inline'),
    ]).then(([ar400, ext400, lat400, ar700, ext700, lat700]) =>
      [
        face(400, ar400.default, ARABIC),
        face(400, ext400.default, LATIN_EXT),
        face(400, lat400.default, LATIN),
        face(700, ar700.default, ARABIC),
        face(700, ext700.default, LATIN_EXT),
        face(700, lat700.default, LATIN),
      ].join('\n'),
    )
  }
  return fontCss
}

function reportCss(landscape: boolean) {
  const page = landscape ? 'A4 landscape' : 'A4 portrait'
  return `
    ${''}
    @page { size: ${page}; margin: 11mm 10mm 16mm 10mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      color: #0f172a;
      font-family: Cairo, "Segoe UI", Tahoma, sans-serif;
    }
    .print-document { display: block !important; }
    .print-letterhead { display: flex; align-items: flex-start; justify-content: space-between; gap: 6mm; width: 100%; }
    .print-brand { display: flex; align-items: center; gap: 4mm; min-width: 0; flex: 1; }
    .print-logo { width: 18mm; height: 18mm; flex: 0 0 auto; object-fit: contain; border: 0.4pt solid #e2e8f0; border-radius: 2mm; background: #fff; }
    .print-logo-fallback { display: flex; align-items: center; justify-content: center; background: #0f766e; color: #fff; font-weight: 700; font-size: 11pt; }
    .print-legal { margin: 0; font-size: 8pt; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #0f766e; }
    .print-org { margin: 0.4mm 0 0; font-size: 13.5pt; font-weight: 700; line-height: 1.25; color: #0f172a; }
    .print-org-alt, .print-meta, .print-ids { margin: 0.6mm 0 0; font-size: 8pt; line-height: 1.35; color: #475569; }
    .print-stamp { flex: 0 0 auto; max-width: 68mm; text-align: end; }
    .print-stamp-kicker { font-size: 8pt; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: #0f766e; }
    .print-stamp-title { margin-top: 0.8mm; font-size: 11pt; font-weight: 700; line-height: 1.3; }
    .print-stamp-date { margin-top: 1mm; font-size: 8pt; color: #64748b; }
    .print-rule { height: 1.4mm; margin: 3mm 0 3.5mm; border-top: 2pt solid #0f766e; border-bottom: 0.7pt solid #5eead4; }
    .print-title { margin: 0; font-size: 13pt; font-weight: 700; line-height: 1.3; }
    .print-sub, .print-unit { margin: 1mm 0 0; font-size: 8.5pt; color: #64748b; }
    .print-criteria { margin: 3mm 0 1.2mm; font-size: 8pt; font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; color: #0f766e; }
    .print-filters { display: flex; flex-wrap: wrap; gap: 2mm; margin: 0 0 4mm; }
    .print-filters div { border: 0.4pt solid #cbd5e1; border-radius: 1.4mm; background: #f8fafc; padding: 1mm 2.4mm; font-size: 8.5pt; line-height: 1.35; }
    .print-filters span { color: #64748b; }
    .print-filters strong { font-weight: 700; color: #0f172a; }
    .print-kpis { display: grid; gap: 3mm; margin: 0 0 2mm; }
    .print-kpis.n-2 { grid-template-columns: repeat(2, 1fr); }
    .print-kpis.n-3 { grid-template-columns: repeat(3, 1fr); }
    .print-kpis.n-4 { grid-template-columns: repeat(4, 1fr); }
    .print-kpi { border: 0.5pt solid #e2e8f0; border-top: 2pt solid #0f766e; padding: 2.2mm 3mm 2.4mm; break-inside: avoid; page-break-inside: avoid; }
    .print-kpi.in { border-top-color: #047857; }
    .print-kpi.out { border-top-color: #b91c1c; }
    .print-kpi span { display: block; font-size: 7.5pt; font-weight: 700; letter-spacing: 0.03em; text-transform: uppercase; color: #64748b; }
    .print-kpi strong { display: block; margin-top: 1mm; font-size: 12pt; font-variant-numeric: tabular-nums; }
    .print-kpi.in strong { color: #047857; }
    .print-kpi.out strong { color: #b91c1c; }
    .print-section { margin-top: 5mm; }
    .print-section h3 { margin: 0 0 2mm; padding-bottom: 1mm; border-bottom: 0.6pt solid #99f6e4; font-size: 11pt; font-weight: 700; color: #0f766e; break-after: avoid; page-break-after: avoid; }
    .print-table { width: 100%; border-collapse: collapse; font-size: 8.5pt; }
    .print-table-dense { font-size: 7.5pt; }
    .print-table thead { display: table-header-group; }
    .print-table th { background: #0f766e; color: #fff; font-weight: 700; text-align: start; padding: 1.5mm 1.6mm; border: 0.3pt solid #0d5c56; vertical-align: bottom; }
    .print-table td { padding: 1.15mm 1.6mm; border: 0.3pt solid #e2e8f0; vertical-align: top; overflow-wrap: anywhere; }
    .print-table tbody tr:nth-child(even) td { background: #f8fafc; }
    .print-table tfoot td { background: #f0fdfa; font-weight: 700; border-top: 0.8pt solid #0f766e; }
    .print-table tr { break-inside: avoid; page-break-inside: avoid; }
    .print-table .num, .print-table th.num { text-align: end; font-variant-numeric: tabular-nums; white-space: nowrap; }
    .print-nowrap { white-space: nowrap; }
    .print-table .strong { font-weight: 700; }
    .print-in { color: #047857; font-weight: 700; }
    .print-out { color: #b91c1c; font-weight: 700; }
    .print-empty { padding: 6mm 2mm !important; text-align: center; color: #94a3b8; }
    .print-footer {
      position: fixed;
      right: 10mm;
      bottom: 4mm;
      left: 10mm;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 4mm;
      height: 8mm;
      border-top: 0.6pt solid #0f766e;
      background: #fff;
      font-size: 8pt;
      color: #475569;
    }
    .print-footer-pages::after { content: counter(page) " / " counter(pages); }
  `
}

export async function buildReportHtml(root: Element, landscape: boolean) {
  const fonts = await cairoCss()
  const dir = root.getAttribute('dir') === 'ltr' ? 'ltr' : 'rtl'
  const lang = dir === 'ltr' ? 'fr' : 'ar'
  return `<!DOCTYPE html><html lang="${lang}" dir="${dir}"><head><meta charset="utf-8"><title>CaissePro</title><style>${fonts}${reportCss(landscape)}</style></head><body>${root.outerHTML}</body></html>`
}
