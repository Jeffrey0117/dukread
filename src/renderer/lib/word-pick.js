// Finding the word and the sentence at a position in a run of text. No DOM here.

const LETTER = /[A-Za-z]/
const INNER = /['’-]/
const MAX_SENTENCE = 320

const isLetter = (char) => char !== undefined && LETTER.test(char)
/** An apostrophe or hyphen counts as part of a word only between two letters ("don't", "well-known"). */
const joins = (text, index) => INNER.test(text[index] ?? '') && isLetter(text[index - 1]) && isLetter(text[index + 1])
const inWord = (text, index) => isLetter(text[index]) || joins(text, index)

/** The word that covers `offset`, as `{ word, start, end }`, or null when the offset is not on a word. */
export function wordAt(text, offset) {
  if (typeof text !== 'string' || offset < 0 || offset > text.length) return null
  // A click lands between two characters; the word may be on either side.
  const at = inWord(text, offset) ? offset : inWord(text, offset - 1) ? offset - 1 : -1
  if (at < 0) return null
  let start = at
  while (start > 0 && inWord(text, start - 1)) start -= 1
  let end = at + 1
  while (end < text.length && inWord(text, end)) end += 1
  return { word: text.slice(start, end).replace(/’/g, "'"), start, end }
}

const ENDS = /[.!?。！？]/

/** The sentence around `offset`, trimmed, never longer than a few lines. */
export function sentenceAt(text, offset) {
  if (typeof text !== 'string' || text.length === 0) return ''
  const at = Math.min(Math.max(offset, 0), text.length - 1)
  let start = at
  while (start > 0 && !(ENDS.test(text[start - 1]) && /\s/.test(text[start] ?? ''))) start -= 1
  let end = at
  while (end < text.length && !(ENDS.test(text[end]) && (end + 1 >= text.length || /\s/.test(text[end + 1])))) end += 1
  const sentence = text.slice(start, Math.min(end + 1, text.length)).replace(/\s+/g, ' ').trim()
  if (sentence.length <= MAX_SENTENCE) return sentence
  // Too long to be one sentence (a table, a code listing): keep what is around the word.
  const from = Math.max(0, at - start - MAX_SENTENCE / 2)
  return sentence.slice(from, from + MAX_SENTENCE).trim()
}
