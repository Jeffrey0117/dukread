// Draws the marked lines on the pages. pdf.js throws away what it finds in a page whenever it redraws
// it, so marks are painted again each time a page is drawn (app.js asks for that).
import { h } from './dom.js'

const LAYER = 'rm-marks'
const percent = (value) => `${value * 100}%`

function layerFor(marks) {
  const bars = marks.flatMap((mark) =>
    mark.rects.map((rect) =>
      h('div', {
        class: mark.note ? 'rm-mark has-note' : 'rm-mark',
        dataset: { mark: mark.id },
        style: `left:${percent(rect.x)};top:${percent(rect.y)};width:${percent(rect.w)};height:${percent(rect.h)}`,
      }),
    ),
  )
  return h('div', { class: LAYER }, bars)
}

/** Paints one page's marks into its div (replacing what was painted before). */
export function paintPage(pageDiv, marks) {
  pageDiv.querySelector(`:scope > .${LAYER}`)?.remove()
  if (marks.length > 0) pageDiv.append(layerFor(marks))
}

/** Paints every page that is drawn right now. `pageDivOf(number)` finds a page's div. */
export function paintAll(pagesEl, marks, pageDivOf) {
  for (const old of pagesEl.querySelectorAll(`.${LAYER}`)) old.remove()
  const byPage = Map.groupBy(marks, (mark) => mark.page)
  for (const [page, onPage] of byPage) {
    const div = pageDivOf(page)
    if (div?.querySelector('canvas')) paintPage(div, onPage)
  }
}

/** Makes one mark blink, so the eye finds it after a jump. */
export function flash(pagesEl, markId) {
  for (const bar of pagesEl.querySelectorAll(`.rm-mark[data-mark="${CSS.escape(markId)}"]`)) {
    bar.classList.remove('flash')
    void bar.offsetWidth
    bar.classList.add('flash')
  }
}
