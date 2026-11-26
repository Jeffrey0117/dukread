// The window's own files are served as readman://app/… instead of file://, so the page can use
// modules and a worker like any website. Nothing outside the renderer folder can be asked for.
import fs from 'node:fs/promises'
import path from 'node:path'

export const APP_SCHEME = 'readman'
export const APP_URL = `${APP_SCHEME}://app/index.html`

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.wasm': 'application/wasm',
  '.ttf': 'font/ttf',
  '.woff2': 'font/woff2',
}

/** The file a request means, or null when it points outside the folder. */
export function resolveInside(root, address) {
  let pathname
  try {
    const url = new URL(address)
    if (url.host !== 'app') return null
    pathname = decodeURIComponent(url.pathname)
  } catch {
    return null
  }
  const full = path.resolve(root, `.${pathname}`)
  const inside = full === root || full.startsWith(root + path.sep)
  return inside ? full : null
}

export function registerApp(protocol, rendererDir) {
  const root = path.resolve(rendererDir)
  protocol.handle(APP_SCHEME, async (request) => {
    const file = resolveInside(root, request.url)
    if (!file) return new Response('not found', { status: 404 })
    try {
      const body = await fs.readFile(file)
      const type = TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream'
      return new Response(body, { status: 200, headers: { 'content-type': type, 'cache-control': 'no-store' } })
    } catch {
      return new Response('not found', { status: 404 })
    }
  })
}
