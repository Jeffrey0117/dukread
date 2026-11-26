// Makes the small PDF the checks read (test/fixtures/sample.pdf): three pages with headings (so it has
// a table of contents), prose, and a code listing. Run with:  npx electron scripts/make-sample.cjs
const { app, BrowserWindow } = require('electron')
const fs = require('node:fs')
const path = require('node:path')

const OUT = path.resolve(__dirname, '../test/fixtures/sample.pdf')
const PAGE = 'page-break-before: always'
const HTML = `<!doctype html><html><head><meta charset="utf-8"><style>
  body { font: 12pt/1.6 Georgia, serif; margin: 0; }
  h1 { font: 700 22pt Georgia, serif; } h2 { font: 700 15pt Georgia, serif; }
  pre { font: 10pt Consolas, monospace; background: #f3f3f3; padding: 10px; }
</style></head><body>
<h1>Chapter 1: Closures</h1>
<p>A closure is a function bundled together with its lexical environment. It remembers the variables that were in scope when it was created, even after the outer function has returned.</p>
<p>Programmers often discover closures by accident. They ran the code, and it worked, but nobody could explain why the counter kept its value between calls.</p>
<pre>function counter() {
  let count = 0
  return () => ++count
}</pre>
<h2>Why it matters</h2>
<p>Without closures, callbacks would have no memory. Every well-known pattern for hiding state in JavaScript depends on them.</p>
<h1 style="${PAGE}">Chapter 2: The Old Lighthouse</h1>
<p>It was a bright cold day in April, and the lighthouse keeper had not spoken to another soul for three weeks. The gulls wheeled overhead, indifferent to his solitude.</p>
<p>He climbed the spiral staircase slowly, counting each step as he always did. At the top, the great lamp waited, patient and enormous.</p>
<h1 style="${PAGE}">Chapter 3: Numbers</h1>
<p>12 34 56 %</p>
</body></html>`

app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false })
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(HTML)}`)
  const pdf = await win.webContents.printToPDF({ pageSize: 'A4', generateDocumentOutline: true, generateTaggedPDF: true })
  fs.mkdirSync(path.dirname(OUT), { recursive: true })
  fs.writeFileSync(OUT, pdf)
  process.stdout.write(`wrote ${OUT} (${pdf.length} bytes)\n`)
  app.quit()
})
