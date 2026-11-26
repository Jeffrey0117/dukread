// package.json is ESM, but a sandboxed preload must be CommonJS, hence .cjs.
const { contextBridge, ipcRenderer, webUtils } = require('electron')

/** Handlers answer { ok, data } or { ok: false, code }; the page turns a failed answer into an error itself. */
const call = (name) => (...args) => ipcRenderer.invoke(`dukread:${name}`, ...args)

// How the side columns were left last time, handed over by the main process when it made the window.
const LAYOUT_ARGUMENT = '--dukread-layout='
const layoutArgument = process.argv.find((arg) => arg.startsWith(LAYOUT_ARGUMENT))
let layout = null
try { layout = layoutArgument ? JSON.parse(decodeURIComponent(layoutArgument.slice(LAYOUT_ARGUMENT.length))) : null } catch { layout = null }

// This is everything the page can reach. No require, no files of its own choosing.
contextBridge.exposeInMainWorld('dukread', {
  layout,
  setLayout: call('prefs:setLayout'),

  listBooks: call('library:list'),
  addBook: call('library:add'),
  pickBooks: call('library:pick'),
  bookBytes: call('library:bytes'),
  saveProgress: call('library:progress'),
  removeBook: call('library:remove'),

  listMarks: call('notes:list'),
  addMark: call('notes:add'),
  setNote: call('notes:setNote'),
  removeMark: call('notes:remove'),

  listWords: call('vocab:list'),
  addWord: call('vocab:add'),
  removeWord: call('vocab:remove'),

  lookup: call('dict:lookup'),
  translate: call('translate:text'),
  translatePage: call('translate:page'),

  /** Where a file dropped onto the window lives on disk. */
  pathOf: (file) => webUtils.getPathForFile(file),
  /** PDFs handed to the app before the page was up (the command line, "open with"). Asking also turns on onOpen. */
  waitingFiles: call('launch:waiting'),
  /** PDFs handed to the app later, while it is running. */
  onOpen: (listener) => { ipcRenderer.on('dukread:open', (_event, paths) => listener(paths)) },
})
