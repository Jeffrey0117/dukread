// How the window was left: its place and size, which side columns were open, and the zoom.
import path from 'node:path'

import { createJsonFile } from './json-store.js'

export const MIN_SIZE = { width: 720, height: 480 }
const DEFAULTS = { bounds: null, maximized: false, layout: { left: true, right: true, rightTab: 'notes', leftTab: 'shelf', scale: 'page-width' } }
const RIGHT_TABS = ['notes', 'vocab', 'zh']
const LEFT_TABS = ['shelf', 'outline']

export function cleanLayout(layout) {
  const base = DEFAULTS.layout
  const scale = layout?.scale
  const goodScale = scale === 'page-width' || (typeof scale === 'number' && scale >= 0.25 && scale <= 5)
  return {
    left: typeof layout?.left === 'boolean' ? layout.left : base.left,
    right: typeof layout?.right === 'boolean' ? layout.right : base.right,
    rightTab: RIGHT_TABS.includes(layout?.rightTab) ? layout.rightTab : base.rightTab,
    leftTab: LEFT_TABS.includes(layout?.leftTab) ? layout.leftTab : base.leftTab,
    scale: goodScale ? scale : base.scale,
  }
}

/** The saved place, if it still lands on a screen that is connected; otherwise a size and no place. */
export function pickBounds(saved, areas) {
  const fallback = { width: 1400, height: 900 }
  if (!saved || ![saved.x, saved.y, saved.width, saved.height].every(Number.isFinite)) return fallback
  const visible = areas.some((area) => saved.x < area.x + area.width - 80 && saved.x + saved.width > area.x + 80 && saved.y >= area.y - 10 && saved.y < area.y + area.height - 80)
  const size = { width: Math.max(saved.width, MIN_SIZE.width), height: Math.max(saved.height, MIN_SIZE.height) }
  return visible ? { ...size, x: saved.x, y: saved.y } : size
}

export function createPrefs({ dataDir }) {
  const store = createJsonFile(path.join(dataDir, 'prefs.json'), DEFAULTS)
  const load = async () => {
    const saved = await store.read()
    return { bounds: saved.bounds ?? null, maximized: saved.maximized === true, layout: cleanLayout(saved.layout) }
  }
  const save = (patch) => store.update((saved) => ({ value: { ...saved, ...patch }, result: null }))
  return { load, save }
}
