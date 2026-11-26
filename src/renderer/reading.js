// What the mouse does on a page: a click on a word looks it up, and a selection offers to mark it,
// note it, or show it in Chinese.
import { api } from './bridge.js'
import { selectedLines, wordFromPoint } from './pick.js'
import { selectionBar, translationCard } from './selection-bar.js'
import { errorText, T } from './text.js'
import { wordCard } from './word-card.js'

const CLICK_SLACK = 4

/**
 * `actions` come from app.js: `isStarred(word)`, `toggleStar(entry, picked)`, `addMark(lines)` (answers
 * the new mark), `writeNote(mark)`.
 */
export function attachReading({ container, popup, actions }) {
  let asked = 0
  let pressedAt = null

  async function showWord(picked) {
    const mine = (asked += 1)
    const stale = () => mine !== asked || !popup.isOpen()
    popup.show(picked.rect, wordCard({ word: picked.word, status: 'looking' }))
    let entry = await api.lookup(picked.word).catch(() => null)
    if (stale()) return
    if (!entry) {
      // Not in the dictionary (a name, a term of the trade): ask the translator instead.
      const zh = await api.translate(picked.word).catch(() => '')
      if (stale()) return
      if (zh && zh.toLowerCase() !== picked.word.toLowerCase()) entry = { word: picked.word.toLowerCase(), base: null, phonetic: '', translation: zh }
    }
    const draw = () => {
      if (stale()) return
      const key = entry ? entry.base ?? entry.word : picked.word
      popup.update(wordCard({
        word: picked.word,
        entry,
        status: entry ? 'found' : 'unknown',
        starred: actions.isStarred(key),
        onStar: async () => { await actions.toggleStar({ ...entry, word: key }, picked); draw() },
      }))
    }
    draw()
  }

  function showSelection(lines) {
    asked += 1
    const done = () => { window.getSelection()?.removeAllRanges(); popup.hide() }
    popup.show(lines.anchor, selectionBar({
      onMark: async () => { done(); await actions.addMark(lines) },
      onNote: async () => { done(); actions.writeNote(await actions.addMark(lines)) },
      onTranslate: async () => {
        const mine = asked
        popup.update(translationCard(T.selection.translating, true))
        const zh = await api.translate(lines.text).catch((err) => errorText(err))
        if (mine === asked && popup.isOpen()) popup.update(translationCard(zh))
      },
    }))
  }

  container.addEventListener('mousedown', (event) => { pressedAt = event.button === 0 ? { x: event.clientX, y: event.clientY } : null })
  container.addEventListener('mouseup', (event) => {
    if (event.button !== 0 || !pressedAt || event.target.closest('a')) return
    const moved = Math.hypot(event.clientX - pressedAt.x, event.clientY - pressedAt.y) > CLICK_SLACK
    const { clientX, clientY } = event
    // The selection is not settled until this event has run its course.
    setTimeout(() => {
      const lines = selectedLines()
      if (lines) { showSelection(lines); return }
      if (moved) return
      const picked = wordFromPoint(clientX, clientY)
      if (picked) showWord(picked)
    }, 0)
  })
}
