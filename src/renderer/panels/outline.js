// Left column, second tab: the book's own table of contents. A click goes there.
import { h } from '../dom.js'
import { T } from '../text.js'

const MAX_DEPTH = 4

function entries(items, depth, onGo) {
  return items.flatMap((item) => [
    h('div', { class: 'row outline-row', style: `padding-left:${10 + depth * 14}px`, title: item.title, onclick: () => onGo(item.dest) }, item.title),
    ...(depth + 1 < MAX_DEPTH ? entries(item.items, depth + 1, onGo) : []),
  ])
}

export function outlinePanel({ hasBook, outline, onGo }) {
  if (!hasBook) return [h('div', { class: 'quiet' }, T.outline.noBook)]
  if (outline.length === 0) return [h('div', { class: 'quiet' }, T.outline.none)]
  return [h('div', { class: 'rows' }, entries(outline, 0, onGo))]
}
