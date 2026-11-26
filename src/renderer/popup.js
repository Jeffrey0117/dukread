// The one small window that floats beside a word or a selection. Only one is open at a time; it
// closes on Escape, on a click elsewhere, and when the page scrolls away under it.
import { setChildren } from './dom.js'

const GAP = 6
const EDGE = 8

export function createPopup({ root, scroller }) {
  let anchor = null

  function place() {
    if (!anchor) return
    const { width, height } = root.getBoundingClientRect()
    const left = Math.min(Math.max(anchor.left, EDGE), window.innerWidth - width - EDGE)
    const below = anchor.bottom + GAP
    const top = below + height > window.innerHeight - EDGE ? Math.max(anchor.top - height - GAP, EDGE) : below
    root.style.left = `${left}px`
    root.style.top = `${top}px`
  }

  /** `rect` is the thing to float beside (window coordinates); `content` is one or more elements. */
  function show(rect, ...content) {
    anchor = { left: rect.left, top: rect.top, bottom: rect.bottom }
    setChildren(root, ...content)
    root.hidden = false
    place()
  }

  /** Swaps what is inside without moving the anchor (the size may change, so it is placed again). */
  function update(...content) {
    if (!anchor) return
    setChildren(root, ...content)
    place()
  }

  function hide() {
    anchor = null
    root.hidden = true
    setChildren(root)
  }

  document.addEventListener('mousedown', (event) => { if (anchor && !root.contains(event.target)) hide() })
  document.addEventListener('keydown', (event) => { if (event.key === 'Escape') hide() })
  scroller.addEventListener('scroll', () => { if (anchor) hide() }, { passive: true })

  return { show, update, hide, isOpen: () => anchor !== null }
}
