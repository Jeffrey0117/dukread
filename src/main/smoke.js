// Checks the window without a person watching it. DUKREAD_SMOKE_STEPS=<file> names a JSON list of
// { "file": "step.js", "shot": "picture.png" }: each file is the body of an async function run in the
// page, and "shot" (optional) saves a picture of the window after it. Prints one line and quits.
import fs from 'node:fs/promises'
import path from 'node:path'

const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export function runSmoke(win, app) {
  const listFile = process.env.DUKREAD_SMOKE_STEPS
  const problems = []
  // Nobody is looking at this window, and it must behave as if somebody were.
  win.webContents.setBackgroundThrottling(false)
  win.webContents.on('console-message', (_event, level, message, line, source) => {
    if (level >= 2 && !message.includes('Electron Security Warning')) problems.push(`${message} (${String(source).slice(-50)}:${line})`)
  })

  win.webContents.once('did-finish-load', async () => {
    const results = []
    try {
      const steps = JSON.parse(await fs.readFile(listFile, 'utf8'))
      for (const step of steps) {
        const body = await fs.readFile(path.resolve(path.dirname(listFile), step.file), 'utf8')
        results.push(await win.webContents.executeJavaScript(`(async () => { ${body} })()`))
        if (step.shot) {
          win.webContents.invalidate()
          await pause(500)
          const image = await win.webContents.capturePage()
          await fs.writeFile(path.resolve(path.dirname(listFile), step.shot), image.toPNG())
        }
      }
    } catch (err) {
      problems.push(`script: ${err.message}`)
    }
    process.stdout.write(`SMOKE ${JSON.stringify({ results, problems })}\n`)
    app.quit()
  })
}
