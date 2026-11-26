document.querySelector('#right-tabs .tab:nth-child(3)').click();
await until(() => document.querySelector('.zh-text') || document.querySelector('#right-body .wide'), 'the Chinese', 30000);
return { zh: document.getElementById('right-body').innerText.slice(0, 400) };
