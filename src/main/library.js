// The shelf: which PDFs have been opened, where each one lives on disk, and how far it has been read.
// The files themselves are never copied or changed.
import { createHash } from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'

import { AppError, bookId, pageNumber } from './errors.js'
import { createJsonFile } from './json-store.js'

const SAMPLE_BYTES = 1024 * 1024

/** The same file gives the same id wherever it is moved to: its size plus its first megabyte. */
export async function fingerprint(filePath) {
  const handle = await fs.open(filePath, 'r')
  try {
    const { size } = await handle.stat()
    const sample = Buffer.alloc(Math.min(size, SAMPLE_BYTES))
    await handle.read(sample, 0, sample.length, 0)
    return createHash('sha256').update(String(size)).update(sample).digest('hex').slice(0, 16)
  } finally {
    await handle.close()
  }
}

const titleOf = (filePath) => path.basename(filePath).replace(/\.pdf$/i, '')

async function exists(filePath) {
  try { await fs.access(filePath); return true } catch { return false }
}

export function createLibrary({ dataDir, now = Date.now }) {
  const store = createJsonFile(path.join(dataDir, 'library.json'), [])

  async function list() {
    const books = await store.read()
    const flagged = await Promise.all(books.map(async (book) => ({ ...book, missing: !(await exists(book.path)) })))
    return flagged.sort((a, b) => b.openedAt - a.openedAt)
  }

  /** Puts a PDF on the shelf (or finds it there) and marks it as just opened. */
  async function add(filePath) {
    if (typeof filePath !== 'string' || !/\.pdf$/i.test(filePath)) throw new AppError('not_pdf')
    const full = path.resolve(filePath)
    if (!(await exists(full))) throw new AppError('file_missing')
    const id = await fingerprint(full)
    return store.update((books) => {
      const known = books.find((book) => book.id === id)
      const book = known
        ? { ...known, path: full, openedAt: now() }
        : { id, path: full, title: titleOf(full), pages: 0, lastPage: 1, addedAt: now(), openedAt: now() }
      return { value: [...books.filter((other) => other.id !== id), book], result: book }
    })
  }

  async function get(id) {
    const book = (await store.read()).find((other) => other.id === bookId(id))
    if (!book) throw new AppError('no_book')
    return book
  }

  async function bytes(id) {
    const book = await get(id)
    try {
      return await fs.readFile(book.path)
    } catch (err) {
      if (err.code === 'ENOENT') throw new AppError('file_missing')
      throw err
    }
  }

  /** Remembers the page being read and how many pages the book has. */
  function progress(id, { lastPage, pages }) {
    bookId(id)
    const patch = { lastPage: pageNumber(lastPage), pages: pageNumber(pages) }
    return store.update((books) => ({ value: books.map((book) => (book.id === id ? { ...book, ...patch } : book)), result: null }))
  }

  function remove(id) {
    bookId(id)
    return store.update((books) => ({ value: books.filter((book) => book.id !== id), result: null }))
  }

  return { list, add, get, bytes, progress, remove }
}
