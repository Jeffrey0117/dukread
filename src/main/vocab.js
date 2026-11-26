// The word list: every starred word, with the sentence it was met in and where that was.
import path from 'node:path'

import { AppError, bookId, pageNumber, text } from './errors.js'
import { createJsonFile } from './json-store.js'

const WORD = /^[a-z][a-z'-]{0,60}$/

function cleanWord(value) {
  const word = typeof value === 'string' ? value.toLowerCase().trim() : ''
  if (!WORD.test(word)) throw new AppError('bad_input')
  return word
}

export function createVocab({ dataDir, now = Date.now }) {
  const store = createJsonFile(path.join(dataDir, 'vocab.json'), [])

  /** Newest first. */
  const list = async () => [...(await store.read())].sort((a, b) => b.addedAt - a.addedAt)

  /** Starring a word again moves it to the top with the new sentence. */
  function add(input) {
    const entry = {
      word: cleanWord(input?.word),
      phonetic: text(input?.phonetic ?? '', 120),
      translation: text(input?.translation ?? '', 2000),
      sentence: text(input?.sentence ?? '', 600),
      bookId: bookId(input?.bookId),
      bookTitle: text(input?.bookTitle ?? '', 300),
      page: pageNumber(input?.page),
      addedAt: now(),
    }
    return store.update((words) => ({ value: [...words.filter((other) => other.word !== entry.word), entry], result: entry }))
  }

  function remove(value) {
    const word = cleanWord(value)
    return store.update((words) => ({ value: words.filter((other) => other.word !== word), result: null }))
  }

  return { list, add, remove }
}
