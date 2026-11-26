// English → Traditional Chinese through Google's free endpoint (the one pdfluv2 uses: it takes long text
// in a POST and keeps line breaks). Costs nothing; when Google says "too many", we stop asking for a minute.
// A page's translation is kept per book, so turning back to a page never asks twice.
import { createHash } from 'node:crypto'
import path from 'node:path'
import * as OpenCC from 'opencc-js'

import { AppError, bookId, pageNumber, text } from './errors.js'
import { createJsonFile } from './json-store.js'

const ENDPOINT = 'https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=zh-TW'
const BROWSER = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
const COOLDOWN_MS = 60_000
const MAX_CHARS = 12_000

// The answer sometimes carries mainland wording or simplified characters; this settles it as Taiwan usage.
const toTaiwan = OpenCC.Converter({ from: 'cn', to: 'twp' })

function firstString(data) {
  if (!Array.isArray(data)) return null
  const first = data[0]
  if (typeof first === 'string') return first
  return Array.isArray(first) && typeof first[0] === 'string' ? first[0] : null
}

export function createTranslator({ dataDir, fetchImpl = fetch, now = Date.now }) {
  let blockedUntil = 0
  const files = new Map()
  const fileOf = (id) => {
    if (!files.has(id)) files.set(id, createJsonFile(path.join(dataDir, 'translations', `${id}.json`), {}))
    return files.get(id)
  }

  async function translate(raw) {
    const source = text(raw, MAX_CHARS).trim()
    if (!source) return ''
    if (now() < blockedUntil) throw new AppError('translate_busy')
    let response
    try {
      response = await fetchImpl(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': BROWSER },
        body: new URLSearchParams({ q: source }),
        signal: AbortSignal.timeout(20_000),
      })
    } catch {
      throw new AppError('translate_offline')
    }
    if (response.status === 429) {
      blockedUntil = now() + COOLDOWN_MS
      throw new AppError('translate_busy')
    }
    if (!response.ok) throw new AppError('translate_failed', `translate answered ${response.status}`)
    const translated = firstString(await response.json())
    if (translated === null) throw new AppError('translate_failed', 'unexpected answer shape')
    return toTaiwan(translated)
  }

  /** One page of one book. Asked again with the same text, it answers from disk. */
  async function translatePage(id, page, raw) {
    const file = fileOf(bookId(id))
    const key = String(pageNumber(page))
    const source = text(raw, MAX_CHARS).trim()
    const hash = createHash('sha1').update(source).digest('hex')
    const kept = (await file.read())[key]
    if (kept && kept.hash === hash) return kept.zh
    const zh = await translate(source)
    await file.update((pages) => ({ value: { ...pages, [key]: { hash, zh } }, result: null }))
    return zh
  }

  return { translate, translatePage }
}
