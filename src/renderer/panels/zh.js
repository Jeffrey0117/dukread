// Right column, third tab: the Chinese for the page being read. It follows the page as it turns.
import { h } from '../dom.js'
import { fill, T } from '../text.js'

/** `view` is `{ status: 'idle' | 'loading' | 'ready' | 'empty' | 'error', page, paragraphs, message }`. */
export function zhPanel({ hasBook, view, onRetry }) {
  if (!hasBook) return [h('div', { class: 'quiet' }, T.zh.noBook)]
  const head = h('div', { class: 'row-meta zh-head' }, fill(T.zh.page, { page: view.page }))
  if (view.status === 'loading' || view.status === 'idle') return [head, h('div', { class: 'quiet' }, T.zh.loading)]
  if (view.status === 'empty') return [head, h('div', { class: 'quiet' }, T.zh.noText)]
  if (view.status === 'error') return [head, h('div', { class: 'quiet' }, view.message), h('button', { class: 'wide', onclick: onRetry }, T.zh.retry)]
  return [head, h('div', { class: 'zh-text' }, view.paragraphs.map((paragraph) => h('p', {}, paragraph)))]
}
