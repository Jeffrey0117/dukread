import { app, BrowserWindow, dialog, ipcMain, protocol, screen, shell } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createDict } from './dict.js'
import { createHandlers, registerIpc } from './ipc.js'
import { createLibrary } from './library.js'
import { watchLive } from './live.js'
import { log } from './log.js'
import { createNotes } from './notes.js'
import { cleanLayout, createPrefs, MIN_SIZE, pickBounds } from './prefs.js'
import { APP_SCHEME, APP_URL, registerApp } from './protocol.js'
import { runSmoke } from './smoke.js'
import { createTranslator } from './translate.js'
import { createVocab } from './vocab.js'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const RENDERER_DIR = path.resolve(HERE, '../renderer')
const PRELOAD = path.resolve(HERE, '../preload.cjs')
const DICT_FILE = path.resolve(HERE, '../../assets/dict.json')
const LAYOUT_ARGUMENT = '--readman-layout='
const OPEN_CHANNEL = 'readman:open'
const SMOKE = Boolean(process.env.READMAN_SMOKE_STEPS)

// A separate data folder for tests and checks, so they never touch the real shelf.
if (process.env.READMAN_HOME) app.setPath('userData', path.resolve(process.env.READMAN_HOME))

// Must happen before the app is ready: gives the page a proper origin of its own.
protocol.registerSchemesAsPrivileged([{ scheme: APP_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true } }])

let mainWindow = null
/** PDFs asked for before the page was ready to take them (given on the command line, or by "open with"). */
let waiting = []
/** True once the page has asked for them: from then on a new one can be sent straight to it. */
let pageListening = false

const pdfsIn = (args) => args.filter((arg) => /\.pdf$/i.test(arg)).map((arg) => path.resolve(arg))

function hand(paths) {
  if (paths.length === 0) return
  if (mainWindow && !mainWindow.isDestroyed() && pageListening) mainWindow.webContents.send(OPEN_CHANNEL, paths)
  else waiting = [...waiting, ...paths]
}

function createWindow(prefs, onLeave) {
  const areas = screen.getAllDisplays().map((display) => display.workArea)
  const win = new BrowserWindow({
    ...pickBounds(prefs.bounds, areas),
    minWidth: MIN_SIZE.width,
    minHeight: MIN_SIZE.height,
    autoHideMenuBar: true,
    title: 'ReadMan',
    icon: path.resolve(HERE, '../../build/icon.png'),
    show: !SMOKE,
    webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, sandbox: true, additionalArguments: [`${LAYOUT_ARGUMENT}${encodeURIComponent(JSON.stringify(prefs.layout))}`] },
  })
  // On an oddly scaled screen Windows opens the window a few pixels larger than asked. Saving that
  // would make it grow on every start, so the size is only saved when the person changed it.
  const opened = win.getNormalBounds()
  if (prefs.maximized && !SMOKE) win.maximize()
  win.on('close', () => {
    const now = win.getNormalBounds()
    const untouched = ['x', 'y', 'width', 'height'].every((key) => now[key] === opened[key])
    onLeave(untouched ? prefs.bounds : now, win.isMaximized())
  })
  // A link inside a book opens in the browser; the app's own page never goes anywhere else.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
  win.webContents.on('will-navigate', (event) => event.preventDefault())
  // A reloaded page has to ask again.
  win.webContents.on('did-start-loading', () => { pageListening = false })
  win.loadURL(APP_URL)
  return win
}

async function start() {
  const dataDir = app.getPath('userData')
  const prefs = createPrefs({ dataDir })
  const dict = createDict(DICT_FILE)
  const handlers = createHandlers({
    takeWaiting: () => {
      const paths = waiting
      waiting = []
      pageListening = true
      return paths
    },
    library: createLibrary({ dataDir }),
    notes: createNotes({ dataDir }),
    vocab: createVocab({ dataDir }),
    translator: createTranslator({ dataDir }),
    dict,
    prefs,
    pickFiles: async () => {
      const picked = await dialog.showOpenDialog(mainWindow, { properties: ['openFile', 'multiSelections'], filters: [{ name: 'PDF', extensions: ['pdf'] }] })
      return picked.canceled ? [] : picked.filePaths
    },
  })
  registerApp(protocol, RENDERER_DIR)
  registerIpc(ipcMain, handlers, { log, isOurs: (event) => event.senderFrame?.url?.startsWith(`${APP_SCHEME}://app/`) === true })
  dict.warm().catch((err) => log.error('the dictionary could not be read', err))

  const saved = await prefs.load()
  mainWindow = createWindow({ ...saved, layout: cleanLayout(saved.layout) }, (bounds, maximized) => {
    prefs.save({ bounds, maximized }).catch((err) => log.error('the window place was not saved', err))
  })
  mainWindow.on('closed', () => { mainWindow = null })
  if (SMOKE) runSmoke(mainWindow, app)
  if (process.env.READMAN_LIVE === '1') watchLive({ dataDir, app, getWindow: () => mainWindow })
}

// One ReadMan at a time: opening a PDF "with ReadMan" hands it to the window that is already there.
if (!SMOKE && !app.requestSingleInstanceLock()) {
  app.quit()
} else {
  waiting = pdfsIn(process.argv.slice(1))
  app.on('second-instance', (_event, argv) => {
    hand(pdfsIn(argv.slice(1)))
    if (!mainWindow) return
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  })
  app.on('window-all-closed', () => app.quit())
  app.whenReady().then(start).catch((err) => {
    log.error('could not start', err)
    app.quit()
  })
}
