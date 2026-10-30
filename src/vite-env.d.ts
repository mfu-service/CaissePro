/// <reference types="vite/client" />

declare module '*.wasm?url' {
  const src: string
  export default src
}

declare module '*.woff2?inline' {
  const src: string
  export default src
}

interface CaisseProApi {
  renderPdf: (payload: { html: string; landscape: boolean }) => Promise<Uint8Array>
  savePdf: (payload: { data: Uint8Array; filename: string }) => Promise<boolean>
  printPdf: (payload: { data: Uint8Array; landscape: boolean }) => Promise<void>
}

interface Window {
  caissepro?: CaisseProApi
}
