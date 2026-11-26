// What is under the mouse on a page: the word that was clicked, or the lines that were selected.
import { mergeLines, toPageRects } from './lib/marks.js'
import { sentenceAt, wordAt } from './lib/word-pick.js'

const TEXT_LAYER = '.textLayer'
const SLACK = 3

const elementOf = (node) => (node?.nodeType === Node.TEXT_NODE ? node.parentElement : node)

function textNodes(layer) {
  const walker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT)
  const nodes = []
  while (walker.nextNode()) nodes.push(walker.currentNode)
  return nodes
}

/** The page's whole text and where `node` starts in it, for finding the sentence around a word. */
function around(layer, node, offset) {
  let text = ''
  let at = 0
  for (const other of textNodes(layer)) {
    if (other === node) at = text.length + offset
    text += `${other.data} `
  }
  return sentenceAt(text, at)
}

/** The word at a point of the window, or null: `{ word, sentence, page, rect }`. */
export function wordFromPoint(x, y) {
  const caret = document.caretRangeFromPoint(x, y)
  const node = caret?.startContainer
  if (!node || node.nodeType !== Node.TEXT_NODE) return null
  const layer = node.parentElement?.closest(TEXT_LAYER)
  if (!layer) return null
  const found = wordAt(node.data, caret.startOffset)
  if (!found) return null
  const range = document.createRange()
  range.setStart(node, found.start)
  range.setEnd(node, found.end)
  const rect = range.getBoundingClientRect()
  // The caret snaps to the nearest text, even from far away: only a click on the word itself counts.
  const onIt = x >= rect.left - SLACK && x <= rect.right + SLACK && y >= rect.top - SLACK && y <= rect.bottom + SLACK
  if (!onIt) return null
  return { word: found.word, sentence: around(layer, node, found.start), page: Number(layer.closest('.page')?.dataset.pageNumber), rect }
}

/** The current selection, if it is text on a page: `{ page, rects, text, anchor }`, or null. */
export function selectedLines() {
  const selection = window.getSelection()
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return null
  const range = selection.getRangeAt(0)
  const layer = elementOf(range.startContainer)?.closest(TEXT_LAYER)
  if (!layer) return null
  const text = selection.toString().replace(/\s+/g, ' ').trim()
  if (!text) return null

  // Boxes are taken from the text itself. The selection's own boxes would include whole empty layers.
  const boxes = []
  for (const node of textNodes(layer)) {
    if (!range.intersectsNode(node)) continue
    const part = document.createRange()
    part.selectNodeContents(node)
    if (node === range.startContainer) part.setStart(node, range.startOffset)
    if (node === range.endContainer) part.setEnd(node, range.endOffset)
    boxes.push(...part.getClientRects())
  }
  const rects = mergeLines(toPageRects(boxes, layer.getBoundingClientRect()))
  if (rects.length === 0) return null
  const anchor = boxes[boxes.length - 1]
  return { page: Number(layer.closest('.page')?.dataset.pageNumber), rects, text, anchor }
}
