// One JSON file on disk, read and written whole. Writes go one after another and through a temporary
// file, so a crash in the middle leaves the old file, never half of a new one.
import fs from 'node:fs/promises'
import path from 'node:path'

export function createJsonFile(file, fallback) {
  let queue = Promise.resolve()

  async function read() {
    try {
      return JSON.parse(await fs.readFile(file, 'utf8'))
    } catch (err) {
      if (err.code === 'ENOENT' || err instanceof SyntaxError) return structuredClone(fallback)
      throw err
    }
  }

  async function writeNow(value) {
    await fs.mkdir(path.dirname(file), { recursive: true })
    const temporary = `${file}.${process.pid}.tmp`
    await fs.writeFile(temporary, JSON.stringify(value), 'utf8')
    await fs.rename(temporary, file)
  }

  /** Reads the file, hands it to `change`, saves what comes back. Returns `{ value, result }` of the change. */
  function update(change) {
    const run = queue.then(async () => {
      const { value, result } = change(await read())
      await writeNow(value)
      return result
    })
    queue = run.catch(() => {})
    return run
  }

  return { read: () => queue.then(read), update }
}
