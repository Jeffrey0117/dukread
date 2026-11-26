// Keeps the "中文" tab on the page being read: when the page changes (and the tab is showing), it waits
// for the turning to stop, then fetches that page's Chinese. Answers for a page already left are dropped.
import { api } from './bridge.js'
import { errorText } from './text.js'

const SETTLE_MS = 500

/**
 * `wanted()` answers `{ bookId, page }` when the tab is showing, else null.
 * `show(view)` is handed `{ status, page, paragraphs, message }`.
 */
export function createZhFollower({ viewer, wanted, show }) {
  let timer = null
  let asked = 0
  let shown = null

  async function load() {
    const want = wanted()
    if (!want) return
    const mine = (asked += 1)
    const view = (status, extra = {}) => ({ status, page: want.page, paragraphs: [], message: '', ...extra })
    show(view('loading'))
    try {
      const paragraphs = await viewer.paragraphs(want.page)
      if (mine !== asked) return
      if (paragraphs.length === 0) { shown = want; show(view('empty')); return }
      const zh = await api.translatePage(want.bookId, want.page, paragraphs.join('\n\n'))
      if (mine !== asked) return
      shown = want
      show(view('ready', { paragraphs: zh.split(/\n+/).map((line) => line.trim()).filter(Boolean) }))
    } catch (err) {
      if (mine !== asked) return
      shown = null
      show(view('error', { message: errorText(err) }))
    }
  }

  /** Call whenever the page, the book or the tab may have changed. */
  function follow() {
    const want = wanted()
    clearTimeout(timer)
    if (!want || (shown && shown.bookId === want.bookId && shown.page === want.page)) return
    timer = setTimeout(load, SETTLE_MS)
  }

  /** Fetch right away (the "try again" button). */
  function now() {
    clearTimeout(timer)
    shown = null
    load()
  }

  return { follow, now }
}
