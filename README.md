# DukRead

在原版頁面上讀英文 PDF：點一個字就查，選一段就能畫線、寫筆記、翻成中文，整頁的中文在旁邊對照。
歐路詞典那種讀法的自己版本。桌面程式（Windows），書留在硬碟原位，不上傳。

設計：`docs/superpowers/specs/2026-11-26-dukread-first-cut-design.md`

## 開起來

```
npm install          （這台機器下載 Electron 要加 NODE_TLS_REJECT_UNAUTHORIZED=0）
start.cmd            （背景開；也可以 start.cmd "C:\路徑\書.pdf" 直接開那本）
```

資料在 `%APPDATA%\DukRead`（書櫃、筆記、生詞、翻過的頁）；記錄在同一個資料夾的 `live.log`。

## 怎麼用

- 把 PDF 拖進視窗，或按「開書」。下次開程式會接著上次那本、那一頁。
- **點一個字**：字旁邊出現意思；按星號收進生詞。
- **選一段字**：畫線、筆記、翻成中文。
- 右欄：筆記（這本書的）、生詞（所有書的）、中文（目前這頁的翻譯，跟著翻頁走）。
- 左欄：書櫃、目錄。
- Ctrl+滾輪 或 Ctrl +/- 縮放，Ctrl+0 符合寬度，←/→ 翻頁，Ctrl+O 開書。

## 改完程式

```
npm run live:reload      改了畫面（src/renderer）
npm run live:restart     改了主程序（src/main、preload.cjs）
```

有語法錯就不會動正在跑的那一個。

## 測試

- `npm test`：規則和資料（不用開視窗）。
- `npm run smoke`：真的把程式開起來，用測試書走一遍（開書、查字、收生詞、畫線、寫筆記、看中文、重開後還在），
  截圖和結果放在 `.smoke/`。用的是另一個資料夾，不會動到平常的書櫃。會連一次免費翻譯。

## 程式放哪

| 位置 | 內容 |
|---|---|
| `src/main/library.js` | 書櫃：開過哪些書、檔案在哪、讀到哪 |
| `src/main/notes.js` | 畫線和筆記，一本書一個檔 |
| `src/main/vocab.js` | 生詞 |
| `src/main/dict.js` | 離線詞典（`assets/dict.json`，從 pdfluv2 搬來的 ECDICT 精簡版） |
| `src/main/translate.js` | 免費翻譯＋轉繁體＋翻過的頁存起來 |
| `src/main/ipc.js`、`src/preload.cjs` | 頁面能跟主程序要的所有東西 |
| `src/renderer/viewer.js` | 用 pdf.js 把原版頁面畫出來（唯一碰 pdf.js 的檔） |
| `src/renderer/reading.js`、`pick.js` | 滑鼠在頁面上：點字、選字 |
| `src/renderer/lib/` | 純計算：找字、找句子、畫線的框、頁面文字接成段落 |
| `src/renderer/panels/` | 左右兩欄的五個分頁 |
| `src/renderer/text.js` | 畫面上所有的字 |

## 還沒做

掃描版的書（沒有文字層）、epub、書內搜尋、背單字、帳號和同步、安裝檔。
