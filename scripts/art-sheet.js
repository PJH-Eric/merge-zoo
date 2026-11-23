// 產生 40 隻角色對照表（開發用）：node scripts/art-sheet.js > tmp/art.html
const A = require('../public/js/art/animals.js');
globalThis.MZArt = A; require('../public/js/art/animals-more.js');
let h = '<html><body style="margin:0;background:#f4efe6;font-family:sans-serif">';
for (const w of ['zoo', 'ocean', 'sweets', 'space', 'polar', 'jungle', 'dino', 'farm']) {
  h += '<div style="display:flex;gap:4px;padding:4px;align-items:center"><b style="width:60px">' + w + '</b>';
  for (let l = 1; l <= 10; l++) h += '<div style="width:110px;text-align:center">' + A.svg(w, l, 'normal').replace('width="160" height="160"', 'width="110" height="110"') + '</div>';
  h += '</div>';
}
h += '<div style="display:flex;gap:4px;padding:4px"><b style="width:60px">expr</b>';
for (const e of ['normal', 'squish', 'nervous']) h += A.svg('zoo', 4, e).replace('width="160" height="160"', 'width="110" height="110"');
for (const t of ['rainbow', 'bomb', 'shake']) h += A.itemSvg(t).replace('<svg ', '<svg width="100" height="100" ');
h += A.svg('zoo', 6, 'normal', { number: true }).replace('width="160" height="160"', 'width="110" height="110"');
h += '</div></body></html>';
process.stdout.write(h);
