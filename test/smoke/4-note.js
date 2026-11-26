const a = textNodeWith('Programmers often'); const b = textNodeWith('between calls');
getSelection().setBaseAndExtent(a.node, a.at, b.node, b.at + 'between calls.'.length);
const box = getSelection().getRangeAt(0).getBoundingClientRect();
press(a.node.parentElement, box.left, box.top, 'mousedown'); press(b.node.parentElement, box.right, box.bottom, 'mouseup');
await until(() => document.querySelector('#popup .bar-actions'), 'the selection bar');
document.querySelectorAll('#popup .bar-actions button')[1].click();
const note = await until(() => document.querySelector('#right-body textarea'), 'the note box');
await pause(200);
const focused = document.activeElement === note;
note.value = '原來 closure 是這樣來的'; note.dispatchEvent(new Event('input', { bubbles: true })); await pause(1000);
// a second, plain mark on the code listing
const c = textNodeWith('function counter');
getSelection().setBaseAndExtent(c.node, c.at, c.node, c.at + 16);
const box2 = getSelection().getRangeAt(0).getBoundingClientRect();
press(c.node.parentElement, box2.left, box2.top, 'mousedown'); press(c.node.parentElement, box2.right, box2.bottom, 'mouseup');
await until(() => document.querySelector('#popup .bar-actions'), 'the selection bar again');
document.querySelectorAll('#popup .bar-actions button')[0].click();
await until(() => document.querySelectorAll('#right-body .item').length === 2, 'two marks listed');
return { focused, quotes: [...document.querySelectorAll('.quote')].map((q) => q.textContent), bars: document.querySelectorAll('.rm-mark').length, withNote: document.querySelectorAll('.rm-mark.has-note').length, selectionLeft: getSelection().toString() };
