// Turns the pieces of text pdf.js reports for a page into paragraphs, for translating.
// The rules come from pdfluv2 (lib/extract.ts), where they were tuned on real books. No DOM here.

/**
 * Drops side notes and footnote numbers: the long pieces of text show where the body column is; a piece
 * wholly outside it is a side note, and a small lone number is a footnote mark.
 */
function withoutMarginalia(items) {
  const body = items.filter((item) => item.str.trim().length >= 20)
  if (body.length < 3) return items
  const left = Math.min(...body.map((item) => item.transform[4]))
  const right = Math.max(...body.map((item) => item.transform[4] + (item.width || 0)))
  const heights = body.map((item) => item.height || 10).sort((a, b) => a - b)
  const bodyHeight = heights[Math.floor(heights.length / 2)]
  return items.filter((item) => {
    const x0 = item.transform[4]
    const x1 = x0 + (item.width || 0)
    if (!(x1 > left - 2 && x0 < right + 2)) return false
    const footnoteMark = /^\d{1,3}$/.test(item.str.trim()) && (item.height || bodyHeight) < bodyHeight * 0.75
    return !footnoteMark
  })
}

function toLines(items) {
  const lines = []
  for (const item of withoutMarginalia(items)) {
    if (item.str.trim().length === 0) continue
    const y = item.transform[5]
    const last = lines[lines.length - 1]
    if (last && Math.abs(y - last.y) <= 2) {
      lines[lines.length - 1] = { y: last.y, height: Math.max(last.height, item.height || 0), parts: [...last.parts, item.str] }
    } else {
      lines.push({ y, height: item.height || 10, parts: [item.str] })
    }
  }
  return lines
}

/** A word broken across two lines with a hyphen is put back together. */
function join(current, text) {
  if (current.length === 0) return text
  if (/[A-Za-z]-$/.test(current)) return current.slice(0, -1) + text
  return `${current} ${text}`
}

// Nothing but numbers and punctuation: what is left of a chart, not prose.
const JUNK = /^[\d\s%$\-–—.,:;()"'“”×xX]+$/

/** `items` are pdf.js text items (`{ str, transform, width, height }`). Returns a list of paragraphs. */
export function paragraphsOf(items) {
  const paragraphs = []
  let current = ''
  let previous = null
  for (const line of toLines(items.filter((item) => typeof item.str === 'string'))) {
    const text = line.parts.join(' ').replace(/\s+/g, ' ').trim()
    if (text.length === 0) continue
    const size = Math.max(line.height, previous?.height ?? 0, 8)
    const gap = previous === null ? 0 : Math.abs(previous.y - line.y)
    if (previous !== null && gap > size * 1.7 && current.length > 0) {
      paragraphs.push(current)
      current = text
    } else {
      current = join(current, text)
    }
    previous = line
  }
  if (current.length > 0) paragraphs.push(current)
  return paragraphs.filter((paragraph) => !JUNK.test(paragraph))
}
