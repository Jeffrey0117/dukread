const input = document.getElementById('page-input'); input.focus(); input.value = '2'; input.dispatchEvent(new FocusEvent('blur'));
await until(() => document.getElementById('right-body').innerText.includes('第 2 頁') && document.querySelector('.zh-text'), 'page 2 in Chinese', 30000);
await pause(1200);
return { page: input.value, zh: document.getElementById('right-body').innerText.slice(0, 200) };
