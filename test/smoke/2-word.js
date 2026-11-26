const { node, at } = textNodeWith('closure is');
const range = document.createRange(); range.setStart(node, at + 2); range.setEnd(node, at + 5);
const rect = range.getBoundingClientRect(); const x = rect.left + rect.width / 2; const y = rect.top + rect.height / 2;
press(node.parentElement, x, y, 'mousedown'); press(node.parentElement, x, y, 'mouseup');
await until(() => document.querySelector('#popup .card-senses'), 'the word card');
const card = document.getElementById('popup').innerText;
// a click on empty paper must not look anything up
return { card, popupBox: document.getElementById('popup').getBoundingClientRect().toJSON(), wordBox: rect.toJSON() };
