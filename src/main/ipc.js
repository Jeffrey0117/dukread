// Everything the page may ask the main process for. Each answer is { ok: true, data } or
// { ok: false, code }: an Error crossing into the page would lose its code, so none is thrown across.
import { AppError } from './errors.js'
import { cleanLayout } from './prefs.js'

export function createHandlers({ library, notes, vocab, dict, translator, prefs, pickFiles, takeWaiting }) {
  return {
    'library:list': () => library.list(),
    'library:add': (filePath) => library.add(filePath),
    'library:pick': async () => {
      const paths = await pickFiles()
      const books = []
      for (const filePath of paths) books.push(await library.add(filePath))
      return books
    },
    'library:bytes': (id) => library.bytes(id),
    'library:progress': (id, progress) => library.progress(id, progress ?? {}),
    'library:remove': (id) => library.remove(id),

    'notes:list': (id) => notes.list(id),
    'notes:add': (id, mark) => notes.add(id, mark),
    'notes:setNote': (id, markId, note) => notes.setNote(id, markId, note),
    'notes:remove': (id, markId) => notes.remove(id, markId),

    'vocab:list': () => vocab.list(),
    'vocab:add': (entry) => vocab.add(entry),
    'vocab:remove': (word) => vocab.remove(word),

    'dict:lookup': (word) => dict.lookup(word),
    'translate:text': (source) => translator.translate(source),
    'translate:page': (id, page, source) => translator.translatePage(id, page, source),

    'launch:waiting': () => takeWaiting(),
    'prefs:setLayout': (layout) => prefs.save({ layout: cleanLayout(layout) }),
  }
}

export function registerIpc(ipcMain, handlers, { isOurs, log }) {
  for (const [name, handler] of Object.entries(handlers)) {
    ipcMain.handle(`readman:${name}`, async (event, ...args) => {
      if (!isOurs(event)) return { ok: false, code: 'forbidden' }
      try {
        return { ok: true, data: await handler(...args) }
      } catch (err) {
        if (err instanceof AppError) return { ok: false, code: err.code }
        log.error(`${name} failed`, err)
        return { ok: false, code: 'failed' }
      }
    })
  }
}
