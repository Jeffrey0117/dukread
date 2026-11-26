// Right column, second tab: the starred words from every book, newest first. A click goes back to
// where the word was met.
import { h, icon } from '../dom.js'
import { fill, T } from '../text.js'

function wordItem(entry, { onGo, onRemove }) {
  return h('div', { class: 'item word-item', onclick: () => onGo(entry) },
    h('div', { class: 'item-head' },
      h('span', {}, h('span', { class: 'word' }, entry.word), entry.phonetic ? h('span', { class: 'card-sound' }, ` /${entry.phonetic}/`) : null),
      h('button', { class: 'row-remove', title: T.vocab.remove, onclick: (event) => { event.stopPropagation(); onRemove(entry) } }, icon('close')),
    ),
    h('div', { class: 'meaning' }, entry.translation),
    entry.sentence ? h('div', { class: 'sentence' }, entry.sentence) : null,
    h('div', { class: 'row-meta' }, fill(T.vocab.where, { title: entry.bookTitle, page: entry.page })),
  )
}

export function vocabPanel({ words, onGo, onRemove }) {
  if (words.length === 0) return [h('div', { class: 'quiet' }, T.vocab.empty)]
  return [h('div', { class: 'items' }, words.map((entry) => wordItem(entry, { onGo, onRemove })))]
}
