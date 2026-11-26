// Running from source for everyday use (scripts/live.js, READMAN_LIVE=1). Nothing reloads by itself:
// the app takes new code only when told to, through a small file in its data folder — "page" reloads
// the window, "app" starts the whole program again. It also leaves its process number there, so the
// script can tell whether it is running.
import fs from 'node:fs'
import path from 'node:path'

export function watchLive({ dataDir, app, getWindow }) {
  const flag = path.join(dataDir, 'live.flag')
  const alive = path.join(dataDir, 'live.pid')
  try {
    fs.mkdirSync(dataDir, { recursive: true })
    fs.rmSync(flag, { force: true })
    fs.writeFileSync(alive, String(process.pid), 'utf8')
  } catch { /* without the folder there is nothing to watch */ }
  app.on('quit', () => {
    try { if (fs.readFileSync(alive, 'utf8') === String(process.pid)) fs.rmSync(alive, { force: true }) } catch { /* already gone */ }
  })

  let last = ''
  const timer = setInterval(() => {
    let told = ''
    try { told = fs.readFileSync(flag, 'utf8') } catch { return }
    if (!told || told === last) return
    last = told
    try { fs.rmSync(flag, { force: true }) } catch { /* read as the same word next time and skipped */ }
    if (told.startsWith('app')) { app.relaunch(); app.quit(); return }
    const win = getWindow()
    if (win && !win.isDestroyed()) win.webContents.reloadIgnoringCache()
  }, 700)
  timer.unref?.()
}
