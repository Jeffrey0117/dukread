// The pages themselves: pdf.js draws each page as it is in the file and lays selectable text over it.
// This file is the only one that talks to pdf.js.
import * as pdfjsLib from './vendor/pdfjs/build/pdf.mjs'

import { paragraphsOf } from './lib/page-text.js'

const here = (relative) => new URL(relative, import.meta.url).href
pdfjsLib.GlobalWorkerOptions.workerSrc = here('./vendor/pdfjs/build/pdf.worker.mjs')
// The viewer half of pdf.js looks for the engine under this name.
globalThis.pdfjsLib = pdfjsLib
const { EventBus, PDFLinkService, PDFViewer } = await import('./vendor/pdfjs/web/pdf_viewer.mjs')

const MIN_SCALE = 0.25
const MAX_SCALE = 5
export const FIT = 'page-width'

/**
 * `container` scrolls and must be absolutely positioned; `pagesEl` inside it receives the pages.
 * `onPage(number)`, `onScale(scale, fits)`, `onDrawn(number, pageDiv)` are told what happens.
 */
export function createViewer({ container, pagesEl, onPage, onScale, onDrawn }) {
  const eventBus = new EventBus()
  const linkService = new PDFLinkService({ eventBus })
  const pdfViewer = new PDFViewer({ container, viewer: pagesEl, eventBus, linkService, textLayerMode: 1, imageResourcesPath: here('./vendor/pdfjs/web/images/') })
  linkService.setViewer(pdfViewer)
  let doc = null
  let loading = null

  eventBus.on('pagechanging', ({ pageNumber }) => onPage(pageNumber))
  eventBus.on('scalechanging', ({ scale }) => onScale(scale, pdfViewer.currentScaleValue === FIT))
  eventBus.on('pagerendered', ({ pageNumber, source }) => onDrawn(pageNumber, source.div))

  // "Fit the width" has to be worked out again whenever the room for the page changes.
  new ResizeObserver(() => {
    if (!doc) return
    if (pdfViewer.currentScaleValue === FIT) pdfViewer.currentScaleValue = FIT
    else pdfViewer.update()
  }).observe(container)

  async function close() {
    if (loading) await loading.destroy().catch(() => {})
    loading = null
    doc = null
    pdfViewer.setDocument(null)
    linkService.setDocument(null, null)
  }

  /** `bytes` is the whole file. Opens at `page`, at `scale` (a number, or FIT). Returns the page count. */
  async function open(bytes, { page, scale }) {
    await close()
    loading = pdfjsLib.getDocument({
      data: bytes,
      cMapUrl: here('./vendor/pdfjs/cmaps/'),
      cMapPacked: true,
      standardFontDataUrl: here('./vendor/pdfjs/standard_fonts/'),
      isEvalSupported: false,
    })
    doc = await loading.promise
    eventBus.on('pagesinit', () => {
      pdfViewer.currentScaleValue = String(scale)
      pdfViewer.currentPageNumber = Math.min(Math.max(page, 1), doc.numPages)
    }, { once: true })
    pdfViewer.setDocument(doc)
    linkService.setDocument(doc, null)
    return doc.numPages
  }

  const pageDiv = (number) => pdfViewer.getPageView(number - 1)?.div ?? null

  function goTo(number) {
    if (doc) pdfViewer.currentPageNumber = Math.min(Math.max(number, 1), doc.numPages)
  }

  /** Brings a spot on a page into view; `top` is a fraction of the page's height. */
  function goToSpot(number, top) {
    const div = pageDiv(number)
    if (!div) return
    container.scrollTop = div.offsetTop + div.clientHeight * top - container.clientHeight * 0.3
  }

  function zoomBy(factor) {
    if (doc) pdfViewer.currentScale = Math.min(Math.max(pdfViewer.currentScale * factor, MIN_SCALE), MAX_SCALE)
  }

  function fit() {
    if (doc) pdfViewer.currentScaleValue = FIT
  }

  /** The book's own table of contents, as `[{ title, dest, items }]` (empty when it has none). */
  async function outline() {
    if (!doc) return []
    const plain = (items) => (items ?? []).map((item) => ({ title: String(item.title ?? '').trim(), dest: item.dest ?? null, items: plain(item.items) }))
    return plain(await doc.getOutline())
  }

  function goToDest(dest) {
    if (doc && dest) linkService.goToDestination(dest).catch(() => {})
  }

  /** The prose of one page, as paragraphs. */
  async function paragraphs(number) {
    if (!doc) return []
    const page = await doc.getPage(number)
    const content = await page.getTextContent()
    return paragraphsOf(content.items)
  }

  return { open, close, goTo, goToSpot, goToDest, zoomBy, fit, outline, paragraphs, pageDiv, isOpen: () => doc !== null, page: () => pdfViewer.currentPageNumber }
}
