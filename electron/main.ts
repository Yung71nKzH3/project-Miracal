import { app, BrowserWindow, ipcMain } from 'electron'
import { join } from 'node:path'
import { Worker } from 'node:worker_threads'

// The built directory structure
process.env.DIST = join(__dirname, '../dist')
process.env.PUBLIC = app.isPackaged ? process.env.DIST : join(__dirname, '../public')

let win: BrowserWindow | null = null
const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']

console.log('Main process starting...')
console.log('VITE_DEV_SERVER_URL:', VITE_DEV_SERVER_URL)
console.log('DIST:', process.env.DIST)

function createWindow() {
  win = new BrowserWindow({
    width: 600,
    height: 400,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    center: true,
    skipTaskbar: false,
    icon: join(process.env.PUBLIC!, 'icon.png'),
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  // Removed default ignore mouse events to start in "interactive" mode
  // win.setIgnoreMouseEvents(true, { forward: true })
  // win.webContents.openDevTools()

  if (VITE_DEV_SERVER_URL) {
    console.log('Loading URL:', VITE_DEV_SERVER_URL)
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    console.log('Loading file:', join(process.env.DIST!, 'index.html'))
    win.loadFile(join(process.env.DIST!, 'index.html'))
  }

  ipcMain.on('set-ignore-mouse-events', (event, ignore, options) => {
    win?.setIgnoreMouseEvents(ignore, options)
  })

  ipcMain.on('set-always-on-top', (event, flag) => {
    win?.setAlwaysOnTop(flag, 'screen-saver')
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.whenReady().then(() => {
  createWindow()

  // Initialize SMTC Worker
  console.log('Starting SMTC Worker thread...')
  const workerPath = join(__dirname, 'smtc-worker.js')
  const worker = new Worker(workerPath)

  worker.on('message', (message) => {
    if (message.type === 'media-update') {
      win?.webContents.send('media-update', message.data)
    } else if (message.type === 'media-position') {
      win?.webContents.send('media-position', message.data)
    }
  })

  worker.on('error', (err) => {
    console.error('SMTC Worker error:', err)
  })

  worker.on('exit', (code) => {
    console.log(`SMTC Worker exited with code ${code}`)
  })
})
