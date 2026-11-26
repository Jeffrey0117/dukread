#!/usr/bin/env node
// Copies the PDF engine (pdf.js) from node_modules into src/renderer/vendor/ so the page can load it
// as plain files. No bundler on purpose. Safe to run repeatedly; it runs after install and before start.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const VENDOR = path.join(ROOT, 'src', 'renderer', 'vendor')
const COPIES = [
  ['pdfjs-dist/build/pdf.mjs', 'pdfjs/build/pdf.mjs'],
  ['pdfjs-dist/build/pdf.worker.mjs', 'pdfjs/build/pdf.worker.mjs'],
  ['pdfjs-dist/web/pdf_viewer.mjs', 'pdfjs/web/pdf_viewer.mjs'],
  ['pdfjs-dist/web/pdf_viewer.css', 'pdfjs/web/pdf_viewer.css'],
  ['pdfjs-dist/web/images', 'pdfjs/web/images'],
  ['pdfjs-dist/cmaps', 'pdfjs/cmaps'],
  ['pdfjs-dist/standard_fonts', 'pdfjs/standard_fonts'],
  ['pdfjs-dist/LICENSE', 'pdfjs/LICENSE'],
]

async function copyOne(from, to) {
  const source = path.join(ROOT, 'node_modules', from)
  const target = path.join(VENDOR, to)
  try { await fs.access(source) } catch { return `[vendor] skipped ${to} (package not installed)` }
  await fs.mkdir(path.dirname(target), { recursive: true })
  await fs.cp(source, target, { recursive: true, force: true })
  return `[vendor] ${to}`
}

const lines = await Promise.all(COPIES.map(([from, to]) => copyOne(from, to)))
process.stdout.write(`${lines.join('\n')}\n`)
