/** An error the page is meant to see: `code` is what the page decides on, the message is for the log. */
export class AppError extends Error {
  constructor(code, message = code) {
    super(message)
    this.code = code
  }
}

const BOOK_ID = /^[a-f0-9]{16}$/

/** Book ids become file names, so anything that is not one of ours is refused. */
export function bookId(value) {
  if (typeof value !== 'string' || !BOOK_ID.test(value)) throw new AppError('bad_book')
  return value
}

export function text(value, max) {
  if (typeof value !== 'string') throw new AppError('bad_input')
  return value.slice(0, max)
}

export function pageNumber(value) {
  if (!Number.isInteger(value) || value < 1 || value > 100000) throw new AppError('bad_input')
  return value
}
