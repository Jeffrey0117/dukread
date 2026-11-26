#!/usr/bin/env node
// Drives the real window through a reading session with the sample book, in a throwaway data folder:
// open, look up a word, star it, mark and note, see the Chinese, then start again and check that
// everything is still there. Pictures and the report land in .smoke/.   npm run smoke
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const OUT = path.join(ROOT, '.smoke')
const STEPS = path.join(ROOT, 'test', 'smoke')
const SAMPLE = path.join(ROOT, 'test', 'fixtures', 'sample.pdf')
const ELECTRON = path.join(ROOT, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron')

fs.rmSync(OUT, { recursive: true, force: true })
fs.mkdirSync(OUT, { recursive: true })
const helpers = fs.readFileSync(path.join(STEPS, 'lib.txt'), 'utf8')

function run(name, files, args) {
  const steps = files.map((file) => {
    fs.writeFileSync(path.join(OUT, file), `${helpers}\n${fs.readFileSync(path.join(STEPS, file), 'utf8')}`)
    return { file, shot: file.replace(/\.js$/, '.png') }
  })
  const list = path.join(OUT, `${name}.json`)
  fs.writeFileSync(list, JSON.stringify(steps))
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => key !== 'ELECTRON_RUN_AS_NODE'))
  const done = spawnSync(ELECTRON, ['.', ...args], { cwd: ROOT, encoding: 'utf8', timeout: 120_000, env: { ...env, DUKREAD_HOME: path.join(OUT, 'home'), DUKREAD_SMOKE_STEPS: list } })
  const line = (done.stdout ?? '').split('\n').find((text) => text.startsWith('SMOKE '))
  if (!line) throw new Error(`${name}: the app said nothing.\n${done.stderr ?? ''}`)
  return JSON.parse(line.slice(6))
}

const first = run('first', ['1-open.js', '2-word.js', '3-star.js', '4-note.js', '5-zh.js', '6-turn.js'], [SAMPLE])
const second = run('second', ['7-resume.js'], [])
const report = { first, second }
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(report, null, 2))
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`)
const problems = [...first.problems, ...second.problems]
process.exit(problems.length > 0 ? 1 : 0)
