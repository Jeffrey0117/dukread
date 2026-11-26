// Right column, first tab: every marked line of this book in reading order, each with room for a note.
import { h, icon } from '../dom.js'
import { fill, T } from '../text.js'

/** A text box that grows with what is typed in it. */
function fit(box) {
  box.style.height = 'auto'
  box.style.height = `${box.scrollHeight}px`
}

const SAVE_AFTER_MS = 600

function markItem(mark, { onGo, onNote, onRemove }) {
  // Saved a moment after the typing stops, and at once when the box is left: closing the window
  // in the middle of a note must not lose it.
  let saved = mark.note
  let timer = null
  const save = (box) => {
    clearTimeout(timer)
    if (box.value === saved) return
    saved = box.value
    onNote(mark, saved)
  }
  const box = h('textarea', {
    class: 'note-box',
    rows: 1,
    placeholder: T.notes.placeholder,
    value: mark.note,
    dataset: { mark: mark.id },
    oninput: (event) => {
      fit(event.target)
      clearTimeout(timer)
      timer = setTimeout(() => save(event.target), SAVE_AFTER_MS)
    },
    onblur: (event) => save(event.target),
  })
  // It has no size until it is on the page.
  requestAnimationFrame(() => fit(box))
  return h('div', { class: 'item' },
    h('div', { class: 'item-head' },
      h('span', { class: 'row-meta' }, fill(T.notes.page, { page: mark.page })),
      h('button', { class: 'row-remove', title: T.notes.remove, onclick: () => onRemove(mark) }, icon('close')),
    ),
    h('div', { class: 'quote', onclick: () => onGo(mark) }, mark.text),
    box,
  )
}

export function notesPanel({ hasBook, marks, onGo, onNote, onRemove }) {
  if (!hasBook) return [h('div', { class: 'quiet' }, T.notes.noBook)]
  if (marks.length === 0) return [h('div', { class: 'quiet' }, T.notes.empty)]
  return [h('div', { class: 'items' }, marks.map((mark) => markItem(mark, { onGo, onNote, onRemove })))]
}
