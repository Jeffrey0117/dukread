// Makes the app icon (build/icon.png, 512px square) from the mascot drawing (build/logo.png):
// trims the empty margin and centres the duck.   npx electron scripts/make-icon.cjs
const { app, BrowserWindow, nativeImage } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const SOURCE = path.resolve(__dirname, '../build/logo.png')
const OUT = path.resolve(__dirname, '../build/icon.png')
const SIZE = 512
const MARGIN = 0.03

/** The smallest box that holds every pixel that is not see-through. */
function inked(image) {
  const { width, height } = image.getSize()
  const pixels = image.toBitmap()
  const box = { left: width, top: height, right: 0, bottom: 0 }
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (pixels[(y * width + x) * 4 + 3] < 40) continue
      box.left = Math.min(box.left, x); box.right = Math.max(box.right, x)
      box.top = Math.min(box.top, y); box.bottom = Math.max(box.bottom, y)
    }
  }
  return { x: box.left, y: box.top, width: box.right - box.left + 1, height: box.bottom - box.top + 1 }
}

app.whenReady().then(async () => {
  const whole = nativeImage.createFromPath(SOURCE)
  const duck = whole.crop(inked(whole)).toDataURL()
  const inner = Math.round(SIZE * (1 - MARGIN * 2))
  const html = `<body style="margin:0;background:transparent;width:${SIZE}px;height:${SIZE}px;display:flex;align-items:center;justify-content:center"><img src="${duck}" style="width:${inner}px;height:${inner}px;object-fit:contain"></body>`
  const win = new BrowserWindow({ show: false, width: SIZE, height: SIZE, useContentSize: true, frame: false, transparent: true })
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  await new Promise((resolve) => setTimeout(resolve, 700))
  const shot = await win.webContents.capturePage({ x: 0, y: 0, width: SIZE, height: SIZE })
  fs.writeFileSync(OUT, shot.resize({ width: SIZE, height: SIZE, quality: 'best' }).toPNG())
  app.quit()
})
