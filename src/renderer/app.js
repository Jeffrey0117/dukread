// Holds what the window knows (which book, which page, the marks, the words) and wires the parts
// together. Each part draws itself from what it is handed; nothing else keeps state of its own.
import { api } from './bridge.js'
import { h, icon, setChildren } from './dom.js'
import { flash, paintAll, paintPage } from './mark-layer.js'
import { notesPanel } from './panels/notes.js'
import { outlinePanel } from './panels/outline.js'
import { shelfPanel } from './panels/shelf.js'
import { vocabPanel } from './panels/vocab.js'
import { zhPanel } from './panels/zh.js'
import { createPopup } from './popup.js'
import { attachReading } from './reading.js'
import { errorText, fill, T } from './text.js'
import { createViewer, FIT } from './viewer.js'
import { createZhFollower } from './zh-follow.js'

const $ = (id) => document.getElementById(id)
const el = { main: $('main'), title: $('book-title'), pageInput: $('page-input'), pageTotal: $('page-total'), zoomLevel: $('zoom-level'), leftTabs: $('left-tabs'), leftBody: $('left-body'), rightTabs: $('right-tabs'), rightBody: $('right-body'), scroll: $('pages-scroll'), pages: $('pages'), empty: $('empty'), toast: $('toast') }

const DEFAULT_LAYOUT = { left: true, right: true, leftTab: 'shelf', rightTab: 'notes', scale: FIT }
let state = { books: [], book: null, pages: 0, page: 1, marks: [], words: [], outline: [], layout: { ...DEFAULT_LAYOUT, ...api.layout }, scale: 1, fits: true, zh: { status: 'idle', page: 1, paragraphs: [], message: '' } }
const set = (patch) => { state = { ...state, ...patch } }

function later(fn, ms) {
  let timer = null
  return (...args) => { clearTimeout(timer); timer = setTimeout(() => fn(...args), ms) }
}

let toastTimer = null
function toast(message) {
  el.toast.textContent = message
  el.toast.hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { el.toast.hidden = true }, 4000)
}
const complain = (err) => toast(errorText(err))

// ---- drawing ---------------------------------------------------------------------------------

function drawBar() {
  el.title.textContent = state.book?.title ?? T.appName
  document.title = state.book ? `${state.book.title} — ${T.appName}` : T.appName
  if (document.activeElement !== el.pageInput) el.pageInput.value = state.book ? String(state.page) : ''
  el.pageTotal.textContent = state.book ? fill(T.bar.pageOf, { pages: state.pages }) : ''
  el.zoomLevel.textContent = state.book ? `${Math.round(state.scale * 100)}%` : ''
  el.main.classList.toggle('no-left', !state.layout.left)
  el.main.classList.toggle('no-right', !state.layout.right)
  el.empty.hidden = state.book !== null
}

function tabs(names, labels, current, onPick) {
  return names.map((name) => h('button', { class: name === current ? 'tab on' : 'tab', onclick: () => onPick(name) }, labels[name]))
}

function drawLeft() {
  setChildren(el.leftTabs, tabs(['shelf', 'outline'], T.left, state.layout.leftTab, (name) => setLayout({ leftTab: name })))
  const body = state.layout.leftTab === 'outline'
    ? outlinePanel({ hasBook: state.book !== null, outline: state.outline, onGo: (dest) => viewer.goToDest(dest) })
    : shelfPanel({ books: state.books, currentId: state.book?.id, onOpen: (book) => openBook(book), onRemove: removeBook, onPick: pickBooks })
  setChildren(el.leftBody, body)
}

function drawRight() {
  setChildren(el.rightTabs, tabs(['notes', 'vocab', 'zh'], T.right, state.layout.rightTab, (name) => setLayout({ rightTab: name })))
  const hasBook = state.book !== null
  const tab = state.layout.rightTab
  const body = tab === 'vocab'
    ? vocabPanel({ words: state.words, onGo: goToWord, onRemove: (entry) => unstar(entry.word) })
    : tab === 'zh'
      ? zhPanel({ hasBook, view: state.zh, onRetry: () => zh.now() })
      : notesPanel({ hasBook, marks: state.marks, onGo: goToMark, onNote: saveNote, onRemove: removeMark })
  setChildren(el.rightBody, body)
}

const drawAll = () => { drawBar(); drawLeft(); drawRight() }

// ---- layout ----------------------------------------------------------------------------------

const saveLayout = later(() => api.setLayout(state.layout).catch(() => {}), 400)
function setLayout(patch) {
  set({ layout: { ...state.layout, ...patch } })
  saveLayout()
  drawAll()
  zh.follow()
}

// ---- the pages -------------------------------------------------------------------------------

const saveProgress = later(() => {
  if (!state.book) return
  api.saveProgress(state.book.id, { lastPage: state.page, pages: state.pages }).catch(() => {})
}, 800)

const viewer = createViewer({
  container: el.scroll,
  pagesEl: el.pages,
  onPage: (page) => {
    if (!state.book || page === state.page) return
    set({ page, books: state.books.map((book) => (book.id === state.book.id ? { ...book, lastPage: page } : book)) })
    drawBar()
    if (state.layout.leftTab === 'shelf') drawLeft()
    saveProgress()
    zh.follow()
  },
  onScale: (scale, fits) => {
    set({ scale, fits, layout: { ...state.layout, scale: fits ? FIT : Math.round(scale * 100) / 100 } })
    saveLayout()
    drawBar()
  },
  onDrawn: (page, div) => paintPage(div, state.marks.filter((mark) => mark.page === page)),
})
const popup = createPopup({ root: $('popup'), scroller: el.scroll })
const zh = createZhFollower({
  viewer,
  wanted: () => (state.book && state.layout.right && state.layout.rightTab === 'zh' ? { bookId: state.book.id, page: state.page } : null),
  show: (view) => { set({ zh: view }); if (state.layout.rightTab === 'zh') drawRight() },
})

async function openBook(book, page) {
  popup.hide()
  try {
    const [bytes, marks] = await Promise.all([api.bookBytes(book.id), api.listMarks(book.id)])
    set({ book, marks, page: page ?? book.lastPage, pages: 0, outline: [], zh: { status: 'idle', page: page ?? book.lastPage, paragraphs: [], message: '' } })
    const pages = await viewer.open(bytes, { page: state.page, scale: state.layout.scale })
    set({ pages, outline: await viewer.outline(), books: state.books.map((other) => (other.id === book.id ? { ...other, pages } : other)) })
    saveProgress()
  } catch (err) {
    await viewer.close()
    set({ book: null, marks: [], outline: [], pages: 0 })
    complain(err.code ? err : { code: 'open_failed' })
  }
  drawAll()
  zh.follow()
}

async function refreshBooks() {
  set({ books: await api.listBooks() })
}

/** Paths from a drop, the file picker, or the command line: all go on the shelf; the last one is opened. */
async function takeFiles(add) {
  try {
    const added = await add()
    if (added.length === 0) return
    await refreshBooks()
    await openBook(added[added.length - 1])
  } catch (err) {
    complain(err)
  }
}
const pickBooks = () => takeFiles(() => api.pickBooks())
const addPaths = (paths) => takeFiles(async () => {
  const books = []
  for (const path of paths) books.push(await api.addBook(path))
  return books
})

async function removeBook(book) {
  await api.removeBook(book.id).catch(complain)
  if (state.book?.id === book.id) {
    await viewer.close()
    set({ book: null, marks: [], outline: [], pages: 0 })
  }
  await refreshBooks()
  drawAll()
}

// ---- marks and notes -------------------------------------------------------------------------

const repaint = () => paintAll(el.pages, state.marks, (page) => viewer.pageDiv(page))

async function addMark(lines) {
  const mark = await api.addMark(state.book.id, { page: lines.page, rects: lines.rects, text: lines.text })
  set({ marks: await api.listMarks(state.book.id) })
  repaint()
  drawRight()
  return mark
}

function writeNote(mark) {
  setLayout({ right: true, rightTab: 'notes' })
  const box = el.rightBody.querySelector(`textarea[data-mark="${CSS.escape(mark.id)}"]`)
  box?.scrollIntoView({ block: 'center' })
  box?.focus()
}

async function saveNote(mark, note) {
  await api.setNote(state.book.id, mark.id, note).catch(complain)
  set({ marks: state.marks.map((other) => (other.id === mark.id ? { ...other, note } : other)) })
  repaint()
}

async function removeMark(mark) {
  await api.removeMark(state.book.id, mark.id).catch(complain)
  set({ marks: state.marks.filter((other) => other.id !== mark.id) })
  repaint()
  drawRight()
}

function goToMark(mark) {
  viewer.goToSpot(mark.page, mark.rects[0].y)
  setTimeout(() => flash(el.pages, mark.id), 250)
}

// ---- words -----------------------------------------------------------------------------------

const isStarred = (word) => state.words.some((entry) => entry.word === word)

async function unstar(word) {
  await api.removeWord(word).catch(complain)
  set({ words: state.words.filter((entry) => entry.word !== word) })
  if (state.layout.rightTab === 'vocab') drawRight()
}

async function toggleStar(entry, picked) {
  if (isStarred(entry.word)) return unstar(entry.word)
  try {
    await api.addWord({ word: entry.word, phonetic: entry.phonetic, translation: entry.translation, sentence: picked.sentence, bookId: state.book.id, bookTitle: state.book.title, page: picked.page })
    set({ words: await api.listWords() })
    if (state.layout.rightTab === 'vocab') drawRight()
  } catch (err) {
    complain(err)
  }
}

async function goToWord(entry) {
  if (state.book?.id === entry.bookId) { viewer.goTo(entry.page); return }
  const book = state.books.find((other) => other.id === entry.bookId)
  if (!book || book.missing) { complain({ code: book ? 'file_missing' : 'no_book' }); return }
  await openBook(book, entry.page)
}

// ---- controls --------------------------------------------------------------------------------

function wire() {
  const button = (id, name, title, onclick) => {
    const node = $(id)
    if (name) node.append(icon(name))
    node.title = title
    node.addEventListener('click', onclick)
  }
  button('toggle-left', 'left', T.bar.toggleLeft, () => setLayout({ left: !state.layout.left }))
  button('toggle-right', 'right', T.bar.toggleRight, () => setLayout({ right: !state.layout.right }))
  button('zoom-out', 'minus', T.bar.zoomOut, () => viewer.zoomBy(1 / 1.1))
  button('zoom-in', 'plus', T.bar.zoomIn, () => viewer.zoomBy(1.1))
  button('zoom-level', null, T.bar.fit, () => viewer.fit())
  setChildren(el.empty, h('div', { class: 'empty-title' }, T.empty.title), h('div', { class: 'quiet' }, T.empty.hint), h('button', { class: 'primary', onclick: pickBooks }, T.empty.open))

  el.pageInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') event.target.blur() })
  el.pageInput.addEventListener('focus', (event) => event.target.select())
  el.pageInput.addEventListener('blur', (event) => {
    const page = Number.parseInt(event.target.value, 10)
    if (Number.isInteger(page)) viewer.goTo(page)
    drawBar()
  })

  el.scroll.addEventListener('wheel', (event) => {
    if (!event.ctrlKey) return
    event.preventDefault()
    viewer.zoomBy(event.deltaY < 0 ? 1.1 : 1 / 1.1)
  }, { passive: false })

  document.addEventListener('keydown', (event) => {
    const typing = event.target.matches('input, textarea')
    if (event.ctrlKey && event.key.toLowerCase() === 'o') { event.preventDefault(); pickBooks() }
    else if (event.ctrlKey && (event.key === '=' || event.key === '+')) { event.preventDefault(); viewer.zoomBy(1.1) }
    else if (event.ctrlKey && event.key === '-') { event.preventDefault(); viewer.zoomBy(1 / 1.1) }
    else if (event.ctrlKey && event.key === '0') { event.preventDefault(); viewer.fit() }
    else if (!typing && event.key === 'ArrowRight') viewer.goTo(state.page + 1)
    else if (!typing && event.key === 'ArrowLeft') viewer.goTo(state.page - 1)
  })

  // A PDF dropped anywhere on the window is opened.
  window.addEventListener('dragover', (event) => event.preventDefault())
  window.addEventListener('drop', (event) => {
    event.preventDefault()
    const paths = [...(event.dataTransfer?.files ?? [])].map((file) => api.pathOf(file)).filter((path) => /\.pdf$/i.test(path))
    if (paths.length > 0) addPaths(paths)
  })
  api.onOpen((paths) => addPaths(paths))
  attachReading({ container: el.scroll, popup, actions: { isStarred, toggleStar, addMark, writeNote } })
}

async function start() {
  wire()
  drawAll()
  const [books, words] = await Promise.all([api.listBooks(), api.listWords()])
  set({ books, words })
  drawAll()
  // A PDF the app was started with comes first; otherwise pick up where the reading stopped.
  const handed = await api.waitingFiles()
  const last = books.find((book) => !book.missing)
  if (handed.length > 0) await addPaths(handed)
  else if (last) await openBook(last)
  document.documentElement.dataset.ready = 'true'
}

start().catch(complain)
