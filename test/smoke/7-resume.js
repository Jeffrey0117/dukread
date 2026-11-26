await until(() => document.documentElement.dataset.ready === 'true' && document.querySelector('.textLayer span'), 'the book to reopen');
await pause(800);
const openedAt = document.getElementById("page-input").value;
document.getElementById('page-input').focus(); document.getElementById('page-input').value = '1'; document.getElementById('page-input').dispatchEvent(new FocusEvent('blur'));
await until(() => document.querySelectorAll('.rm-mark').length > 0, 'the marks to be drawn again');
document.querySelector('#right-tabs .tab:nth-child(1)').click();
await pause(1500);
return { openedAtPage: openedAt, title: document.getElementById('book-title').textContent, bars: document.querySelectorAll('.rm-mark').length, note: document.querySelector('#right-body textarea')?.value, quotes: document.querySelectorAll('.quote').length };
