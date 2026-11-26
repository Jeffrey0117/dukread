// Every word the window shows lives here. Change wording in this file, nowhere else.

export const T = {
  appName: 'ReadMan',

  bar: {
    toggleLeft: '書櫃與目錄',
    toggleRight: '筆記、生詞與中文',
    pageOf: '/ {pages}',
    zoomOut: '縮小',
    zoomIn: '放大',
    fit: '符合寬度',
  },

  empty: {
    title: '拖一本 PDF 進來',
    hint: '點字就查，選一段就能畫線、寫筆記、翻成中文。',
    open: '開書',
  },

  left: { shelf: '書櫃', outline: '目錄' },
  shelf: {
    open: '開書',
    empty: '還沒有書。',
    progress: '{page} / {pages}',
    missing: '找不到檔案',
    remove: '從書櫃拿掉',
  },
  outline: { none: '這本書沒有目錄。', noBook: '還沒開書。' },

  right: { notes: '筆記', vocab: '生詞', zh: '中文' },
  notes: {
    empty: '選一段字，按「畫線」或「筆記」。',
    noBook: '還沒開書。',
    page: 'p.{page}',
    placeholder: '寫點什麼…',
    remove: '刪掉',
  },
  vocab: {
    empty: '點一個字，按星號，就會收在這裡。',
    where: '{title} · p.{page}',
    remove: '刪掉',
  },
  zh: {
    page: '第 {page} 頁',
    noBook: '還沒開書。',
    loading: '翻譯中…',
    noText: '這一頁沒有可以翻的字。',
    retry: '再試一次',
  },

  word: {
    base: '原形 {base}',
    star: '收進生詞',
    unstar: '從生詞拿掉',
    looking: '查詢中…',
    unknown: '查不到這個字。',
  },
  selection: { mark: '畫線', note: '筆記', translate: '翻成中文', translating: '翻譯中…' },

  errors: {
    file_missing: '找不到這個檔案，可能被搬走或刪掉了。',
    not_pdf: '這不是 PDF。',
    no_book: '書櫃裡沒有這本書。',
    open_failed: '這個 PDF 打不開。',
    translate_busy: '翻譯暫時被擋，等一分鐘再試。',
    translate_offline: '連不上網路，沒辦法翻譯。',
    translate_failed: '翻譯失敗，等一下再試。',
    failed: '出了點問題，再試一次。',
  },
}

/** `fill('p.{page}', { page: 3 })` → 'p.3' */
export function fill(template, values) {
  return template.replace(/\{(\w+)\}/g, (whole, name) => (name in values ? String(values[name]) : whole))
}

export const errorText = (err) => T.errors[err?.code] ?? T.errors.failed
