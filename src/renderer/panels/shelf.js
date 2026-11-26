// Left column, first tab: the books that have been opened, most recent first.
import { h, icon } from '../dom.js'
import { fill, T } from '../text.js'

function bookRow(book, { current, onOpen, onRemove }) {
  const progress = book.missing ? T.shelf.missing : book.pages > 0 ? fill(T.shelf.progress, { page: book.lastPage, pages: book.pages }) : ''
  const classes = ['row', 'book', current ? 'current' : '', book.missing ? 'missing' : ''].filter(Boolean).join(' ')
  return h('div', { class: classes, title: book.path, onclick: () => { if (!book.missing) onOpen(book) } },
    h('div', { class: 'row-main' },
      h('div', { class: 'book-title' }, book.title),
      h('div', { class: 'row-meta' }, progress),
    ),
    h('button', { class: 'row-remove', title: T.shelf.remove, onclick: (event) => { event.stopPropagation(); onRemove(book) } }, icon('close')),
  )
}

export function shelfPanel({ books, currentId, onOpen, onRemove, onPick }) {
  return [
    h('button', { class: 'wide', onclick: onPick }, T.shelf.open),
    books.length === 0
      ? h('div', { class: 'quiet' }, T.shelf.empty)
      : h('div', { class: 'rows' }, books.map((book) => bookRow(book, { current: book.id === currentId, onOpen, onRemove }))),
  ]
}
