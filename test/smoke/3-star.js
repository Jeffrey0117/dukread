document.querySelector('#popup .star').click();
await until(() => document.querySelector('#popup .star.on'), 'the star to light');
document.querySelector('#right-tabs .tab:nth-child(2)').click();
await until(() => document.querySelector('.word-item'), 'the word in the list');
const listed = document.getElementById('right-body').innerText;
press(document.body, 5, 5, 'mousedown');
// an inflected word: "ran" should be found as "run"
const { node, at } = textNodeWith('ran the');
const range = document.createRange(); range.setStart(node, at); range.setEnd(node, at + 3);
const rect = range.getBoundingClientRect();
press(node.parentElement, rect.left + 3, rect.top + 5, 'mousedown'); press(node.parentElement, rect.left + 3, rect.top + 5, 'mouseup');
await until(() => document.querySelector('#popup .card-senses'), 'the second card');
const ran = document.getElementById('popup').innerText;
press(document.body, 5, 5, 'mousedown');
// empty paper
const page = document.querySelector('.page').getBoundingClientRect();
press(document.querySelector('.textLayer'), page.left + 8, page.top + 8, 'mousedown'); press(document.querySelector('.textLayer'), page.left + 8, page.top + 8, 'mouseup');
await pause(300);
return { listed, ran, popupAfterEmptyClick: !document.getElementById('popup').hidden };
