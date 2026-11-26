// Draws the app's icon (build/icon.png).   npx electron scripts/make-icon.cjs
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const OUT = path.resolve(__dirname, '../build/icon.png')
const HTML = `<body style="margin:0;background:transparent"><div style="width:256px;height:256px;border-radius:56px;background:#26262a;display:flex;align-items:center;justify-content:center;position:relative;overflow:hidden">
<div style="position:absolute;left:52px;right:52px;top:132px;height:44px;background:#ffd60a;border-radius:6px"></div>
<div style="position:relative;font:700 150px Georgia,serif;color:#fff;line-height:1;margin-top:-8px">R</div></div></body>`

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 256, height: 256, useContentSize: true, frame: false, transparent: true })
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(HTML)}`)
  await new Promise((resolve) => setTimeout(resolve, 500))
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: 256, height: 256 })
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, image.resize({ width: 256, height: 256 }).toPNG())
  app.quit()
})
