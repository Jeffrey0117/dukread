// Small helpers for building the page by hand.

/** `h('button', { class: 'x', onclick: fn, title: 't' }, 'label', child)` */
export function h(tag, props = {}, ...children) {
  const element = document.createElement(tag)
  for (const [name, value] of Object.entries(props)) {
    if (value === undefined || value === null || value === false) continue
    if (name === 'class') element.className = value
    else if (name === 'dataset') Object.assign(element.dataset, value)
    else if (name.startsWith('on')) element.addEventListener(name.slice(2), value)
    else if (name === 'value') element.value = value
    else element.setAttribute(name, value === true ? '' : String(value))
  }
  element.append(...children.flat().filter((child) => child !== null && child !== undefined && child !== false))
  return element
}

/** Replaces everything inside `parent`. */
export function setChildren(parent, ...children) {
  parent.replaceChildren(...children.flat().filter((child) => child !== null && child !== undefined && child !== false))
}

const SVG = 'http://www.w3.org/2000/svg'
const PATHS = {
  left: 'M3 4h18v16H3z M9 4v16',
  right: 'M3 4h18v16H3z M15 4v16',
  minus: 'M5 12h14',
  plus: 'M12 5v14 M5 12h14',
  close: 'M6 6l12 12 M18 6L6 18',
  star: 'M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.9 6.8 19.6l1-5.8L3.5 9.7l5.9-.8z',
}

/** A line drawing, coloured by the text around it. */
export function icon(name) {
  const svg = document.createElementNS(SVG, 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('class', `icon icon-${name}`)
  svg.setAttribute('aria-hidden', 'true')
  const path = document.createElementNS(SVG, 'path')
  path.setAttribute('d', PATHS[name])
  svg.append(path)
  return svg
}
