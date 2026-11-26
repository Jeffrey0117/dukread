// Marked lines and the notes written on them, one file per book.
// A mark is a set of boxes on one page, each given as fractions of the page (0 to 1), so it stays in
// place at any zoom.
import { randomUUID } from 'node:crypto'
import path from 'node:path'

import { AppError, bookId, pageNumber, text } from './errors.js'
import { createJsonFile } from './json-store.js'

const MAX_RECTS = 400
const MAX_TEXT = 8000
const MAX_NOTE = 8000

const fraction = (value) => typeof value === 'number' && Number.isFinite(value) && value >= -0.01 && value <= 1.01

function cleanRects(rects) {
  if (!Array.isArray(rects) || rects.length === 0 || rects.length > MAX_RECTS) throw new AppError('bad_input')
  return rects.map((rect) => {
    const box = { x: rect?.x, y: rect?.y, w: rect?.w, h: rect?.h }
    if (!Object.values(box).every(fraction)) throw new AppError('bad_input')
    return box
  })
}

/** Reading order: page first, then top to bottom. */
const inOrder = (marks) => [...marks].sort((a, b) => a.page - b.page || a.rects[0].y - b.rects[0].y)

export function createNotes({ dataDir, now = Date.now, newId = randomUUID }) {
  const files = new Map()
  const fileOf = (id) => {
    bookId(id)
    if (!files.has(id)) files.set(id, createJsonFile(path.join(dataDir, 'notes', `${id}.json`), []))
    return files.get(id)
  }

  const list = async (id) => inOrder(await fileOf(id).read())

  function add(id, input) {
    const mark = {
      id: newId(),
      page: pageNumber(input?.page),
      rects: cleanRects(input?.rects),
      text: text(input?.text ?? '', MAX_TEXT),
      note: text(input?.note ?? '', MAX_NOTE),
      createdAt: now(),
    }
    return fileOf(id).update((marks) => ({ value: [...marks, mark], result: mark }))
  }

  function setNote(id, markId, note) {
    const clean = text(note, MAX_NOTE)
    return fileOf(id).update((marks) => {
      if (!marks.some((mark) => mark.id === markId)) throw new AppError('no_mark')
      return { value: marks.map((mark) => (mark.id === markId ? { ...mark, note: clean } : mark)), result: null }
    })
  }

  function remove(id, markId) {
    return fileOf(id).update((marks) => ({ value: marks.filter((mark) => mark.id !== markId), result: null }))
  }

  return { list, add, setNote, remove }
}
