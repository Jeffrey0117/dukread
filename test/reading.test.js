import assert from 'node:assert/strict'
import test from 'node:test'

import { mergeLines, toPageRects } from '../src/renderer/lib/marks.js'
import { paragraphsOf } from '../src/renderer/lib/page-text.js'
import { sentenceAt, wordAt } from '../src/renderer/lib/word-pick.js'

test('wordAt finds the word under a position, from either side of it', () => {
  const text = 'A closure is a function.'
  assert.deepEqual(wordAt(text, 4), { word: 'closure', start: 2, end: 9 })
  assert.equal(wordAt(text, 2).word, 'closure')
  assert.equal(wordAt(text, 9).word, 'closure')
  assert.equal(wordAt(text, 23).word, 'function')
})

test('wordAt keeps apostrophes and hyphens inside a word, not around it', () => {
  assert.equal(wordAt("It doesn't work", 6).word, "doesn't")
  assert.equal(wordAt('a well-known fact', 4).word, 'well-known')
  assert.equal(wordAt('he said - no', 8), null)
  assert.equal(wordAt("'quoted'", 3).word, 'quoted')
  assert.equal(wordAt('don’t', 2).word, "don't")
})

test('wordAt answers null off a word and for bad positions', () => {
  assert.equal(wordAt('12 + 34', 1), null)
  assert.equal(wordAt('word', -1), null)
  assert.equal(wordAt('word', 99), null)
  assert.equal(wordAt('', 0), null)
})

test('sentenceAt returns the sentence around a position', () => {
  const text = 'First one here. A closure is a function bundled with its scope. Last one.'
  assert.equal(sentenceAt(text, 20), 'A closure is a function bundled with its scope.')
  assert.equal(sentenceAt(text, 2), 'First one here.')
  assert.equal(sentenceAt(text, text.length - 3), 'Last one.')
})

test('sentenceAt does not stop at a dot inside a number or a name', () => {
  assert.equal(sentenceAt('Version 3.14 of node.js is out. Next.', 10), 'Version 3.14 of node.js is out.')
})

test('sentenceAt cuts text that never ends down to a readable length', () => {
  const long = `${'word '.repeat(300)}`
  assert.ok(sentenceAt(long, 700).length <= 320)
})

test('toPageRects turns screen boxes into fractions of the page', () => {
  const page = { left: 100, top: 50, width: 400, height: 800 }
  const rects = toPageRects([{ left: 200, top: 250, width: 100, height: 16 }, { left: 0, top: 0, width: 0, height: 10 }], page)
  assert.deepEqual(rects, [{ x: 0.25, y: 0.25, w: 0.25, h: 0.02 }])
})

test('toPageRects drops boxes that are off the page', () => {
  const page = { left: 0, top: 0, width: 100, height: 100 }
  assert.deepEqual(toPageRects([{ left: 300, top: 10, width: 20, height: 10 }], page), [])
})

test('mergeLines joins the pieces of a line and keeps lines apart', () => {
  const merged = mergeLines([
    { x: 0.1, y: 0.2, w: 0.2, h: 0.02 },
    { x: 0.305, y: 0.201, w: 0.3, h: 0.02 },
    { x: 0.1, y: 0.23, w: 0.5, h: 0.02 },
  ])
  assert.equal(merged.length, 2)
  assert.deepEqual(merged[0], { x: 0.1, y: 0.2, w: 0.505, h: 0.021 })
  assert.deepEqual(merged[1], { x: 0.1, y: 0.23, w: 0.5, h: 0.02 })
})

test('mergeLines keeps two columns on the same line apart', () => {
  const merged = mergeLines([{ x: 0.1, y: 0.2, w: 0.2, h: 0.02 }, { x: 0.6, y: 0.2, w: 0.2, h: 0.02 }])
  assert.equal(merged.length, 2)
})

const item = (str, x, y, height = 10) => ({ str, transform: [1, 0, 0, 1, x, y], width: str.length * 5, height })

test('paragraphsOf joins lines into paragraphs and splits on a wide gap', () => {
  const items = [
    item('A closure is a function bundled', 50, 700),
    item('with its lexical environment and', 50, 688),
    item('nothing more than that at all.', 50, 676),
    item('The second paragraph starts here', 50, 640),
    item('and it ends on this line here.', 50, 628),
  ]
  assert.deepEqual(paragraphsOf(items), [
    'A closure is a function bundled with its lexical environment and nothing more than that at all.',
    'The second paragraph starts here and it ends on this line here.',
  ])
})

test('paragraphsOf puts a hyphenated word back together and drops chart leftovers', () => {
  const items = [
    item('This is a long line that ends in a hyphen-', 50, 700),
    item('ated word and then carries on for a while.', 50, 688),
    item('12 34 56 %', 50, 600),
  ]
  assert.deepEqual(paragraphsOf(items), ['This is a long line that ends in a hyphenated word and then carries on for a while.'])
})

test('paragraphsOf answers an empty list for a page with no text', () => {
  assert.deepEqual(paragraphsOf([]), [])
})
