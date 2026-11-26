// The offline English → Traditional Chinese dictionary (ECDICT, trimmed to common words; built in the
// pdfluv2 repository by scripts/build-dict.mjs). Held in memory; a lookup also tries the word's base form.
import fs from 'node:fs/promises'

/** Spellings to try when the table of forms does not know the word. */
function* guesses(word) {
  if (word.endsWith("'s")) yield word.slice(0, -2)
  if (word.endsWith('ies') && word.length > 4) yield `${word.slice(0, -3)}y`
  if (word.endsWith('es') && word.length > 3) yield word.slice(0, -2)
  if (word.endsWith('s') && word.length > 2) yield word.slice(0, -1)
  if (word.endsWith('ing') && word.length > 5) {
    yield word.slice(0, -3)
    yield `${word.slice(0, -3)}e`
  }
  if (word.endsWith('ed') && word.length > 4) {
    yield word.slice(0, -2)
    yield word.slice(0, -1)
  }
  if (word.endsWith('ly') && word.length > 4) yield word.slice(0, -2)
  if (word.endsWith('er') && word.length > 4) yield word.slice(0, -2)
  if (word.endsWith('est') && word.length > 5) yield word.slice(0, -3)
}

/** `data` is `{ words: { word: [phonetic, translation] }, lemma: { form: base } }`. */
export function lookupIn(data, raw) {
  const word = String(raw ?? '').toLowerCase().trim()
  if (!/^[a-z][a-z'-]*$/.test(word)) return null

  const entry = (key) => {
    const hit = data.words[key]
    return hit ? { word, base: key === word ? null : key, phonetic: hit[0], translation: hit[1] } : null
  }
  const viaBase = (key) => entry(key) ?? (data.lemma[key] ? entry(data.lemma[key]) : null)

  const direct = viaBase(word)
  if (direct) return direct
  for (const guess of guesses(word)) {
    const hit = viaBase(guess)
    if (hit) return hit
  }
  // "well-known" and the like: fall back to the last part.
  if (!word.includes('-')) return null
  const last = word.split('-').pop()
  const hit = lookupIn(data, last)
  return hit ? { ...hit, word, base: hit.base ?? last } : null
}

export function createDict(file) {
  let loading = null
  const load = () => {
    loading ??= fs.readFile(file, 'utf8').then((raw) => JSON.parse(raw))
    return loading
  }
  return { lookup: async (word) => lookupIn(await load(), word), warm: () => load().then(() => {}) }
}
