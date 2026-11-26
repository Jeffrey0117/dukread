import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'

import { createDict, lookupIn } from '../src/main/dict.js'
import { AppError } from '../src/main/errors.js'
import { createLibrary } from '../src/main/library.js'
import { createNotes } from '../src/main/notes.js'
import { cleanLayout, pickBounds } from '../src/main/prefs.js'
import { resolveInside } from '../src/main/protocol.js'
import { createTranslator } from '../src/main/translate.js'
import { createVocab } from '../src/main/vocab.js'

const tempDir = () => fs.mkdtemp(path.join(os.tmpdir(), 'dukread-test-'))
const failsWith = (code) => (err) => err instanceof AppError && err.code === code
const BOOK = 'a'.repeat(16)

async function pdfIn(dir, name, content = 'not really a pdf') {
  const file = path.join(dir, name)
  await fs.writeFile(file, content)
  return file
}

test('library: a new PDF goes on the shelf with its file name as title', async () => {
  const dir = await tempDir()
  const library = createLibrary({ dataDir: dir, now: () => 1000 })
  const book = await library.add(await pdfIn(dir, 'Eloquent JavaScript.pdf'))
  assert.equal(book.title, 'Eloquent JavaScript')
  assert.equal(book.lastPage, 1)
  assert.match(book.id, /^[a-f0-9]{16}$/)
  assert.equal((await library.list()).length, 1)
})

test('library: the same file moved elsewhere is the same book and keeps its place', async () => {
  const dir = await tempDir()
  const library = createLibrary({ dataDir: dir })
  const first = await library.add(await pdfIn(dir, 'book.pdf', 'same bytes'))
  await library.progress(first.id, { lastPage: 42, pages: 300 })
  await fs.mkdir(path.join(dir, 'moved'))
  const second = await library.add(await pdfIn(path.join(dir, 'moved'), 'renamed.pdf', 'same bytes'))
  assert.equal(second.id, first.id)
  assert.equal(second.lastPage, 42)
  assert.ok(second.path.includes('moved'))
  assert.equal((await library.list()).length, 1)
})

test('library: refuses what is not a PDF, and a file that is not there', async () => {
  const dir = await tempDir()
  const library = createLibrary({ dataDir: dir })
  await assert.rejects(library.add(path.join(dir, 'notes.txt')), failsWith('not_pdf'))
  await assert.rejects(library.add(path.join(dir, 'gone.pdf')), failsWith('file_missing'))
})

test('library: a book whose file was deleted is listed as missing and cannot be read', async () => {
  const dir = await tempDir()
  const library = createLibrary({ dataDir: dir })
  const file = await pdfIn(dir, 'book.pdf')
  const book = await library.add(file)
  assert.equal((await library.bytes(book.id)).toString(), 'not really a pdf')
  await fs.rm(file)
  assert.equal((await library.list())[0].missing, true)
  await assert.rejects(library.bytes(book.id), failsWith('file_missing'))
})

test('library: removing a book leaves the file alone', async () => {
  const dir = await tempDir()
  const library = createLibrary({ dataDir: dir })
  const file = await pdfIn(dir, 'book.pdf')
  const book = await library.add(file)
  await library.remove(book.id)
  assert.deepEqual(await library.list(), [])
  await fs.access(file)
})

test('library: the most recently opened book comes first', async () => {
  const dir = await tempDir()
  let clock = 0
  const library = createLibrary({ dataDir: dir, now: () => (clock += 1) })
  await library.add(await pdfIn(dir, 'one.pdf', 'one'))
  await library.add(await pdfIn(dir, 'two.pdf', 'two'))
  assert.deepEqual((await library.list()).map((book) => book.title), ['two', 'one'])
})

test('notes: marks come back in reading order and survive a restart', async () => {
  const dir = await tempDir()
  const notes = createNotes({ dataDir: dir })
  await notes.add(BOOK, { page: 9, rects: [{ x: 0.1, y: 0.5, w: 0.3, h: 0.02 }], text: 'later' })
  await notes.add(BOOK, { page: 2, rects: [{ x: 0.1, y: 0.8, w: 0.3, h: 0.02 }], text: 'second' })
  await notes.add(BOOK, { page: 2, rects: [{ x: 0.1, y: 0.1, w: 0.3, h: 0.02 }], text: 'first' })
  const again = createNotes({ dataDir: dir })
  assert.deepEqual((await again.list(BOOK)).map((mark) => mark.text), ['first', 'second', 'later'])
})

test('notes: a note can be written on a mark, and the mark removed', async () => {
  const dir = await tempDir()
  const notes = createNotes({ dataDir: dir })
  const mark = await notes.add(BOOK, { page: 1, rects: [{ x: 0, y: 0, w: 0.5, h: 0.02 }], text: 'a line' })
  await notes.setNote(BOOK, mark.id, 'what I think')
  assert.equal((await notes.list(BOOK))[0].note, 'what I think')
  await assert.rejects(notes.setNote(BOOK, 'nope', 'x'), failsWith('no_mark'))
  await notes.remove(BOOK, mark.id)
  assert.deepEqual(await notes.list(BOOK), [])
})

test('notes: refuses a book id that could reach another file, and boxes that are not on a page', async () => {
  const notes = createNotes({ dataDir: await tempDir() })
  await assert.rejects(async () => notes.list('../../secret'), failsWith('bad_book'))
  await assert.rejects(async () => notes.add(BOOK, { page: 1, rects: [{ x: 5, y: 0, w: 1, h: 1 }] }), failsWith('bad_input'))
  await assert.rejects(async () => notes.add(BOOK, { page: 1, rects: [] }), failsWith('bad_input'))
  await assert.rejects(async () => notes.add(BOOK, { page: 0, rects: [{ x: 0, y: 0, w: 1, h: 1 }] }), failsWith('bad_input'))
})

test('vocab: starring a word again keeps one entry, with the newer sentence, on top', async () => {
  const dir = await tempDir()
  let clock = 0
  const vocab = createVocab({ dataDir: dir, now: () => (clock += 1) })
  const entry = { translation: 'n. 關閉', bookId: BOOK, bookTitle: 'Book', page: 3 }
  await vocab.add({ ...entry, word: 'Closure', sentence: 'old sentence' })
  await vocab.add({ ...entry, word: 'scope', sentence: 'scope sentence' })
  await vocab.add({ ...entry, word: 'closure', sentence: 'new sentence' })
  const words = await vocab.list()
  assert.deepEqual(words.map((word) => word.word), ['closure', 'scope'])
  assert.equal(words[0].sentence, 'new sentence')
  await vocab.remove('closure')
  assert.deepEqual((await vocab.list()).map((word) => word.word), ['scope'])
})

test('vocab: refuses something that is not a word', async () => {
  const vocab = createVocab({ dataDir: await tempDir() })
  await assert.rejects(async () => vocab.add({ word: '<script>', bookId: BOOK, page: 1 }), failsWith('bad_input'))
})

const DATA = { words: { run: ['rʌn', 'vi. 跑'], closure: ["'klәuʒә", 'n. 關閉'], study: ['', 'v. 學習'], make: ['', 'v. 做'], known: ['', 'a. 知名的'] }, lemma: { ran: 'run' } }

test('dict: finds a word as written, by its table of forms, and by its ending', () => {
  assert.deepEqual(lookupIn(DATA, 'Closure'), { word: 'closure', base: null, phonetic: "'klәuʒә", translation: 'n. 關閉' })
  assert.equal(lookupIn(DATA, 'ran').base, 'run')
  assert.equal(lookupIn(DATA, 'closures').base, 'closure')
  assert.equal(lookupIn(DATA, 'studies').base, 'study')
  assert.equal(lookupIn(DATA, 'making').base, 'make')
  assert.equal(lookupIn(DATA, 'well-known').base, 'known')
})

test('dict: answers null for what it does not know or cannot be a word', () => {
  assert.equal(lookupIn(DATA, 'zzzz'), null)
  assert.equal(lookupIn(DATA, '42'), null)
  assert.equal(lookupIn(DATA, ''), null)
  assert.equal(lookupIn(DATA, undefined), null)
})

test('dict: the real dictionary file knows common words', async () => {
  const dict = createDict(path.resolve('assets/dict.json'))
  assert.match((await dict.lookup('closure')).translation, /關閉/)
  assert.equal((await dict.lookup('ran')).base, 'run')
})

const answer = (status, body) => ({ status, ok: status >= 200 && status < 300, json: async () => body })

test('translate: returns the Chinese, and asks only once for the same page', async () => {
  let asked = 0
  const translator = createTranslator({ dataDir: await tempDir(), fetchImpl: async () => { asked += 1; return answer(200, [['閉包是一個函式。', 'en']]) } })
  assert.equal(await translator.translatePage(BOOK, 7, 'A closure is a function.'), '閉包是一個函式。')
  assert.equal(await translator.translatePage(BOOK, 7, 'A closure is a function.'), '閉包是一個函式。')
  assert.equal(asked, 1)
  await translator.translatePage(BOOK, 8, 'Another page.')
  assert.equal(asked, 2)
})

test('translate: simplified characters in the answer come out traditional', async () => {
  const translator = createTranslator({ dataDir: await tempDir(), fetchImpl: async () => answer(200, ['这个软件很好']) })
  assert.equal(await translator.translate('This software is good'), '這個軟體很好')
})

test('translate: after "too many requests" it stops asking for a minute', async () => {
  let asked = 0
  let clock = 0
  const translator = createTranslator({ dataDir: await tempDir(), now: () => clock, fetchImpl: async () => { asked += 1; return answer(429, null) } })
  await assert.rejects(translator.translate('one'), failsWith('translate_busy'))
  await assert.rejects(translator.translate('two'), failsWith('translate_busy'))
  assert.equal(asked, 1)
  clock = 61_000
  await assert.rejects(translator.translate('three'), failsWith('translate_busy'))
  assert.equal(asked, 2)
})

test('translate: no network is its own error, and empty text asks nobody', async () => {
  let asked = 0
  const translator = createTranslator({ dataDir: await tempDir(), fetchImpl: async () => { asked += 1; throw new Error('offline') } })
  assert.equal(await translator.translate('   '), '')
  assert.equal(asked, 0)
  await assert.rejects(translator.translate('hello'), failsWith('translate_offline'))
})

test('protocol: only files inside the renderer folder can be asked for', () => {
  const root = path.resolve('src/renderer')
  assert.equal(resolveInside(root, 'dukread://app/index.html'), path.join(root, 'index.html'))
  assert.equal(resolveInside(root, 'dukread://app/lib/marks.js'), path.join(root, 'lib', 'marks.js'))
  assert.equal(resolveInside(root, 'dukread://app/..%2F..%2Fpackage.json'), null)
  // The address itself folds ".." away before we see it, so this one stays inside the folder.
  assert.equal(resolveInside(root, 'dukread://app/../main/main.js'), path.join(root, 'main', 'main.js'))
  assert.equal(resolveInside(root, 'dukread://app/lib/..%5C..%5C..%5Cpackage.json'), null)
  assert.equal(resolveInside(root, 'dukread://other/index.html'), null)
})

test('prefs: a saved layout is cleaned, and a window off every screen loses its place', () => {
  assert.deepEqual(cleanLayout({ left: false, rightTab: 'zh', scale: 1.5, leftTab: 'nonsense' }), { left: false, right: true, rightTab: 'zh', leftTab: 'shelf', scale: 1.5 })
  assert.equal(cleanLayout({ scale: 99 }).scale, 'page-width')
  const areas = [{ x: 0, y: 0, width: 1920, height: 1040 }]
  assert.deepEqual(pickBounds({ x: 100, y: 100, width: 1200, height: 800 }, areas), { x: 100, y: 100, width: 1200, height: 800 })
  assert.deepEqual(pickBounds({ x: 5000, y: 100, width: 1200, height: 800 }, areas), { width: 1200, height: 800 })
  assert.deepEqual(pickBounds(null, areas), { width: 1400, height: 900 })
})
