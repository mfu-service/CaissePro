import { useEffect, useState } from 'react'
import { t } from '../lib/i18n'
import type { Lang } from '../lib/types'
import { Btn } from './ui'
import { buildReportHtml } from './reportDocument'

type Job = {
  id: number
  title: string
  html: string
  landscape: boolean
  lang: Lang
}

type Ready =
  | { kind: 'pdf'; url: string; data: Uint8Array }
  | { kind: 'html'; url: string }

let emit: ((job: Job) => void) | null = null
let seq = 0

export async function openPrintPreview(title: string) {
  const root = document.querySelector('.print-document')
  if (!root || !emit) return
  const lang: Lang = root.getAttribute('dir') === 'ltr' ? 'fr' : 'ar'
  const landscape = root.classList.contains('print-landscape')
  const html = await buildReportHtml(root, landscape)
  emit({ id: ++seq, title, html, landscape, lang })
}

function pdfFilename(title: string) {
  const clean = title.replace(/[\\/:*?"<>|]/g, ' ').replace(/\s+/g, ' ').trim() || 'rapport'
  return clean.toLowerCase().endsWith('.pdf') ? clean : `${clean}.pdf`
}

function toBytes(data: Uint8Array) {
  const copy = new Uint8Array(data.byteLength)
  copy.set(data)
  return copy
}

export function PrintPreviewHost() {
  const [job, setJob] = useState<Job | null>(null)
  const [phase, setPhase] = useState<'loading' | 'ready' | 'error'>('loading')
  const [ready, setReady] = useState<Ready | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    emit = setJob
    return () => {
      emit = null
    }
  }, [])

  useEffect(() => {
    if (!job) return
    let cancel = false
    let objectUrl = ''
    setPhase('loading')
    setReady(null)
    setBusy(false)
    void (async () => {
      try {
        if (window.caissepro?.renderPdf) {
          const raw = await window.caissepro.renderPdf({ html: job.html, landscape: job.landscape })
          if (cancel) return
          const data = toBytes(raw)
          objectUrl = URL.createObjectURL(new Blob([data], { type: 'application/pdf' }))
          if (cancel) {
            URL.revokeObjectURL(objectUrl)
            return
          }
          setReady({ kind: 'pdf', url: objectUrl, data })
        } else {
          objectUrl = URL.createObjectURL(new Blob([job.html], { type: 'text/html;charset=utf-8' }))
          if (cancel) {
            URL.revokeObjectURL(objectUrl)
            return
          }
          setReady({ kind: 'html', url: objectUrl })
        }
        if (!cancel) setPhase('ready')
      } catch {
        if (!cancel) setPhase('error')
      }
    })()
    return () => {
      cancel = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [job])

  useEffect(() => {
    if (!job) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setJob(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [job])

  if (!job) return null
  const lang = job.lang

  const save = async () => {
    if (!ready) return
    setBusy(true)
    try {
      const filename = pdfFilename(job.title)
      if (ready.kind === 'pdf' && window.caissepro?.savePdf) {
        await window.caissepro.savePdf({ data: ready.data, filename })
        return
      }
      const link = document.createElement('a')
      link.href = ready.url
      link.download = ready.kind === 'pdf' ? filename : filename.replace(/\.pdf$/i, '.html')
      link.click()
    } finally {
      setBusy(false)
    }
  }

  const print = async () => {
    if (!ready) return
    setBusy(true)
    try {
      if (ready.kind === 'pdf' && window.caissepro?.printPdf) {
        await window.caissepro.printPdf({ data: ready.data, landscape: job.landscape })
        return
      }
      const frame = document.getElementById('report-preview-frame') as HTMLIFrameElement | null
      frame?.contentWindow?.focus()
      frame?.contentWindow?.print()
    } catch {
      setPhase('error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex flex-col bg-slate-900/55" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
        <div className="min-w-0">
          <div className="text-xs font-bold uppercase tracking-wide text-teal-700">{t('pdfPreview', lang)}</div>
          <h2 className="truncate text-sm font-bold text-slate-900">{job.title}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Btn variant="outline" disabled={phase !== 'ready' || busy} onClick={() => void save()}>
            {t('savePdf', lang)}
          </Btn>
          <Btn disabled={phase !== 'ready' || busy} onClick={() => void print()}>
            {t('printNow', lang)}
          </Btn>
          <Btn variant="ghost" onClick={() => setJob(null)}>
            {t('closePreview', lang)}
          </Btn>
        </div>
      </div>
      <div className="min-h-0 flex-1 bg-slate-600 p-3 sm:p-4">
        {phase === 'loading' ? (
          <div className="flex h-full items-center justify-center text-sm font-medium text-white">{t('pdfPreparing', lang)}</div>
        ) : null}
        {phase === 'error' ? (
          <div className="flex h-full items-center justify-center text-sm font-medium text-white">{t('pdfFailed', lang)}</div>
        ) : null}
        {phase === 'ready' && ready?.kind === 'pdf' ? (
          <iframe id="report-preview-frame" title={job.title} className="h-full w-full rounded-md bg-white" src={`${ready.url}#toolbar=1&navpanes=0&view=Fit`} />
        ) : null}
        {phase === 'ready' && ready?.kind === 'html' ? (
          <iframe id="report-preview-frame" title={job.title} className="h-full w-full rounded-md bg-white" src={ready.url} />
        ) : null}
      </div>
    </div>
  )
}
