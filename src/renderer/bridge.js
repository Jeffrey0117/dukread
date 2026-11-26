// The page's side of the bridge to the main process (see preload.cjs). A failed answer becomes an
// Error that carries its code, so callers can use try / catch and decide by `err.code`.
const raw = window.readman

const ASKS = ['setLayout', 'listBooks', 'addBook', 'pickBooks', 'bookBytes', 'saveProgress', 'removeBook', 'listMarks', 'addMark', 'setNote', 'removeMark', 'listWords', 'addWord', 'removeWord', 'lookup', 'translate', 'translatePage', 'waitingFiles']

function ask(name) {
  return async (...args) => {
    const answer = await raw[name](...args)
    if (answer?.ok) return answer.data
    throw Object.assign(new Error(answer?.code ?? 'failed'), { code: answer?.code ?? 'failed' })
  }
}

export const api = Object.freeze({
  ...Object.fromEntries(ASKS.map((name) => [name, ask(name)])),
  layout: raw.layout,
  pathOf: raw.pathOf,
  onOpen: raw.onOpen,
})
