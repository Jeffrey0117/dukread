#!/usr/bin/env node
// 每天用的 DukRead 直接從原始碼跑，改完不用打包。
//
//   npm run live            啟動（背景執行；已經在跑就不重複開）
//   npm run live:reload     畫面那一半（src/renderer）改了：重新載入頁面
//   npm run live:restart    主程序那一半（src/main、preload）改了：整個重開
//
// 重載或重開之前會先檢查語法，有錯就不動，舊的繼續跑。
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const DATA = process.env.DUKREAD_HOME ? path.resolve(process.env.DUKREAD_HOME) : path.join(process.env.APPDATA ?? path.join(os.homedir(), '.config'), 'DukRead')
const FLAG = path.join(DATA, 'live.flag')
const ALIVE = path.join(DATA, 'live.pid')
const LOG = path.join(DATA, 'live.log')

/** The source files that do not parse. */
function broken() {
  const files = []
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === 'vendor' || entry.name === 'node_modules') continue
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(full)
      else if (/\.(js|cjs)$/.test(entry.name)) files.push(full)
    }
  }
  walk(path.join(ROOT, 'src'))
  return files.filter((file) => spawnSync(process.execPath, ['--check', file], { stdio: 'ignore' }).status !== 0)
}

function runningPid() {
  try {
    const pid = Number(fs.readFileSync(ALIVE, 'utf8'))
    if (!Number.isInteger(pid) || pid <= 0) return null
    process.kill(pid, 0)
    return pid
  } catch { return null }
}

function start() {
  const already = runningPid()
  if (already) { process.stdout.write(`已經在跑了（PID ${already}）。改完用 npm run live:reload 或 live:restart。\n`); return }
  spawnSync(process.execPath, [path.join(ROOT, 'scripts', 'vendor.js')], { stdio: 'ignore' })
  const electron = path.join(ROOT, 'node_modules', 'electron', 'dist', process.platform === 'win32' ? 'electron.exe' : 'electron')
  fs.mkdirSync(DATA, { recursive: true })
  const out = fs.openSync(LOG, 'a')
  // Started from inside another tool's session, those marks would make Electron run as plain Node.
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^(ELECTRON_RUN_AS_NODE|CLAUDECODE|CLAUDE_CODE_ENTRYPOINT|CLAUDE_CODE_SSE_PORT)$/.test(name)))
  const child = spawn(electron, ['.', ...process.argv.slice(3)], { cwd: ROOT, detached: true, stdio: ['ignore', out, out], env: { ...env, DUKREAD_LIVE: '1' } })
  child.unref()
  process.stdout.write(`DukRead 從原始碼啟動了（PID ${child.pid}）。記錄：${LOG}\n`)
}

function tell(what) {
  const bad = broken()
  if (bad.length > 0) {
    process.stderr.write(`有檔案語法不對，沒有動正在跑的那一個：\n${bad.map((file) => `  ${path.relative(ROOT, file)}`).join('\n')}\n`)
    process.exit(1)
  }
  if (!runningPid()) { process.stdout.write('目前沒有在跑，直接啟動。\n'); start(); return }
  fs.writeFileSync(FLAG, `${what} ${Date.now()}`, 'utf8')
  process.stdout.write(what === 'page' ? '已要求重新載入頁面。\n' : '已要求重開。\n')
}

const command = process.argv[2] ?? 'start'
if (command === 'start') start()
else if (command === 'reload') tell('page')
else if (command === 'restart') tell('app')
else { process.stderr.write('用法：node scripts/live.js [start|reload|restart]\n'); process.exit(1) }
