// What the small window shows for a clicked word: the word, how it sounds, what it means, and a star
// that keeps it in the word list.
import { h, icon } from './dom.js'
import { fill, T } from './text.js'

/** "n. 關閉；vt. 使終止" reads better as one line per part of speech. */
const senses = (translation) => translation.split(/[；\n]/).map((part) => part.trim()).filter(Boolean)

/**
 * `entry` is `{ word, base, phonetic, translation }`, or null while looking / when nothing was found.
 * `status` is 'looking' | 'found' | 'unknown'. `starred` and `onStar` drive the star.
 */
export function wordCard({ word, entry, status, starred, onStar }) {
  const head = h('div', { class: 'card-head' },
    h('span', { class: 'card-word' }, word),
    entry?.phonetic ? h('span', { class: 'card-sound' }, `/${entry.phonetic}/`) : null,
    status === 'found'
      ? h('button', { class: starred ? 'star on' : 'star', title: starred ? T.word.unstar : T.word.star, onclick: onStar }, icon('star'))
      : null,
  )
  if (status === 'looking') return h('div', { class: 'card' }, head, h('div', { class: 'card-quiet' }, T.word.looking))
  if (status === 'unknown') return h('div', { class: 'card' }, head, h('div', { class: 'card-quiet' }, T.word.unknown))
  return h('div', { class: 'card' },
    head,
    entry.base ? h('div', { class: 'card-quiet' }, fill(T.word.base, { base: entry.base })) : null,
    h('div', { class: 'card-senses' }, senses(entry.translation).map((sense) => h('div', {}, sense))),
  )
}
