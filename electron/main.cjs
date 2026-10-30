const { app, BrowserWindow, dialog, ipcMain } = require('electron')
const fs = require('fs')
const path = require('path')

const isDev = process.env.CAISSEPRO_DEV === '1'
let splashWindow = null

function showSplash() {
  if (!app.isPackaged || isDev) return
  splashWindow = new BrowserWindow({
    width: 380,
    height: 280,
    frame: false,
    resizable: false,
    center: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    backgroundColor: '#0f172a',
    webPreferences: { sandbox: true },
  })
  void splashWindow.loadFile(path.join(__dirname, 'splash.html'))
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close()
  }
  splashWindow = null
}

function createWindow() {
  showSplash()

  const win = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    title: 'CaissePro',
    show: false,
    backgroundColor: '#f8fafc',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      backgroundThrottling: false,
    },
  })

  win.once('ready-to-show', () => {
    win.show()
    closeSplash()
  })

  if (isDev) {
    void win.loadURL('http://localhost:1420')
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    void win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }
}

function tempReport(ext) {
  return path.join(app.getPath('temp'), `caissepro-${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`)
}

function asBuffer(data) {
  if (Buffer.isBuffer(data)) return data
  if (data instanceof Uint8Array) return Buffer.from(data)
  if (data && data.type === 'Buffer' && Array.isArray(data.data)) return Buffer.from(data.data)
  throw new Error('invalid pdf')
}

ipcMain.handle('report:pdf', async (_event, payload) => {
  const html = String(payload?.html || '')
  const landscape = Boolean(payload?.landscape)
  if (!html.trim()) throw new Error('empty report')
  const file = tempReport('html')
  const win = new BrowserWindow({
    show: false,
    width: landscape ? 1280 : 900,
    height: landscape ? 900 : 1280,
    backgroundColor: '#ffffff',
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      javascript: true,
      backgroundThrottling: false,
    },
  })
  try {
    fs.writeFileSync(file, html, 'utf8')
    await win.loadFile(file)
    await Promise.race([
      win.webContents.executeJavaScript(
        'Promise.all([document.fonts.ready].concat(Array.from(document.images).map((img) => img.complete ? Promise.resolve() : new Promise((resolve) => { img.onload = img.onerror = resolve }))))',
        true,
      ),
      new Promise((_, reject) => setTimeout(() => reject(new Error('report render timeout')), 8000)),
    ])
    const pdf = await win.webContents.printToPDF({
      printBackground: true,
      landscape,
      pageSize: 'A4',
      preferCSSPageSize: true,
      displayHeaderFooter: false,
      margins: { marginType: 'none' },
    })
    if (!pdf?.length) throw new Error('empty pdf')
    return new Uint8Array(pdf)
  } finally {
    if (!win.isDestroyed()) win.destroy()
    fs.unlink(file, () => {})
  }
})

ipcMain.handle('report:save', async (event, payload) => {
  const parent = BrowserWindow.fromWebContents(event.sender)
  const filename = String(payload?.filename || 'rapport.pdf').replace(/[\\/:*?"<>|]/g, ' ')
  const { canceled, filePath } = await dialog.showSaveDialog(parent ?? undefined, {
    defaultPath: filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`,
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  })
  if (canceled || !filePath) return false
  fs.writeFileSync(filePath, asBuffer(payload?.data))
  return true
})

ipcMain.handle('report:print', async (_event, payload) => {
  const file = tempReport('pdf')
  const landscape = Boolean(payload?.landscape)
  fs.writeFileSync(file, asBuffer(payload?.data))
  const win = new BrowserWindow({
    show: false,
    width: landscape ? 1100 : 820,
    height: landscape ? 780 : 1100,
    webPreferences: { sandbox: true, contextIsolation: true, plugins: true },
  })
  try {
    await win.loadFile(file)
    await new Promise((resolve) => setTimeout(resolve, 600))
    await new Promise((resolve, reject) => {
      win.webContents.print(
        {
          silent: false,
          printBackground: true,
          landscape,
          pageSize: 'A4',
          scaleFactor: 100,
          margins: { marginType: 'none' },
        },
        (success, reason) => {
          if (!success && reason && !String(reason).toLowerCase().includes('cancel')) reject(new Error(String(reason)))
          else resolve()
        },
      )
    })
  } finally {
    if (!win.isDestroyed()) win.destroy()
    fs.unlink(file, () => {})
  }
})

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
