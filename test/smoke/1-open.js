await until(() => document.documentElement.dataset.ready === 'true' && document.querySelector('.textLayer span'), 'the book to open');
await pause(600);
document.querySelector('#left-tabs .tab:nth-child(2)').click();
const outline = [...document.querySelectorAll('.outline-row')].map((row) => row.textContent);
document.querySelector('#left-tabs .tab:nth-child(1)').click();
return { title: document.getElementById('book-title').textContent, total: document.getElementById('page-total').textContent, page: document.getElementById('page-input').value, outline, shelf: [...document.querySelectorAll('.book')].map((b) => b.textContent) };
