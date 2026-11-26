// The geometry of a marked line: boxes on the screen become boxes on the page, given as fractions of
// the page so they hold at any zoom. No DOM here.

const round = (value) => Math.round(value * 10000) / 10000

/** Screen boxes (as from getClientRects) → page fractions; boxes off the page or with no size are dropped. */
export function toPageRects(clientRects, pageRect) {
  if (!(pageRect.width > 0) || !(pageRect.height > 0)) return []
  return clientRects
    .filter((rect) => rect.width > 0.5 && rect.height > 0.5)
    .map((rect) => ({
      x: (rect.left - pageRect.left) / pageRect.width,
      y: (rect.top - pageRect.top) / pageRect.height,
      w: rect.width / pageRect.width,
      h: rect.height / pageRect.height,
    }))
    .filter((rect) => rect.x < 1 && rect.y < 1 && rect.x + rect.w > 0 && rect.y + rect.h > 0)
}

const sameLine = (a, b) => {
  const overlap = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return overlap > Math.min(a.h, b.h) * 0.5
}

/**
 * A selection comes back as one box per piece of text, several to a line. This joins the pieces of
 * each line into one box, so a mark is drawn as clean bars instead of overlapping fragments.
 */
export function mergeLines(rects, gap = 0.02) {
  const sorted = [...rects].sort((a, b) => a.y - b.y || a.x - b.x)
  const lines = []
  for (const rect of sorted) {
    const line = lines.find((other) => sameLine(other[0], rect))
    if (line) line.push(rect)
    else lines.push([rect])
  }
  const merged = []
  for (const line of lines) {
    const byX = [...line].sort((a, b) => a.x - b.x)
    let current = { ...byX[0] }
    for (const rect of byX.slice(1)) {
      if (rect.x <= current.x + current.w + gap) {
        const top = Math.min(current.y, rect.y)
        const right = Math.max(current.x + current.w, rect.x + rect.w)
        const bottom = Math.max(current.y + current.h, rect.y + rect.h)
        current = { x: current.x, y: top, w: right - current.x, h: bottom - top }
      } else {
        merged.push(current)
        current = { ...rect }
      }
    }
    merged.push(current)
  }
  return merged.map((rect) => ({ x: round(rect.x), y: round(rect.y), w: round(rect.w), h: round(rect.h) }))
}
