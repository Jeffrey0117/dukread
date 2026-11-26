// What the small window shows for selected text: mark it, write a note on it, or see it in Chinese.
import { h } from './dom.js'
import { T } from './text.js'

export function selectionBar({ onMark, onNote, onTranslate }) {
  return h('div', { class: 'bar-actions' },
    h('button', { onclick: onMark }, T.selection.mark),
    h('button', { onclick: onNote }, T.selection.note),
    h('button', { onclick: onTranslate }, T.selection.translate),
  )
}

/** The Chinese for a selection (or the line that says it is on its way, or why it failed). */
export function translationCard(text, quiet = false) {
  return h('div', { class: quiet ? 'card card-quiet' : 'card card-zh' }, text)
}
