// One line per event on stderr; run through scripts/live.js it lands in live.log in the data folder.
function write(level, message, detail) {
  const extra = detail instanceof Error ? detail.stack ?? detail.message : detail === undefined ? '' : JSON.stringify(detail)
  process.stderr.write(`${new Date().toISOString()} ${level} ${message}${extra ? ` ${extra}` : ''}\n`)
}

export const log = {
  info: (message, detail) => write('info', message, detail),
  error: (message, detail) => write('error', message, detail),
}
