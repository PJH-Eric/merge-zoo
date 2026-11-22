'use strict';
/* 產生並校準 200 關：node scripts/gen-levels.js
 * 1. level-gen 排出初稿  2. 模擬玩家試玩量測能力  3. 依進度設定目標與星數門檻
 * 4. 用不同隨機種子再試玩，確認每一關都能過（過不了就降低目標重試）  5. 寫入 public/js/core/level-data.js
 */
const fs = require('fs');
const path = require('path');
const D = require('../public/js/core/data.js');
const E = require('../public/js/core/engine.js');
const G = require('../public/js/core/level-gen.js');
const Bot = require('./lib/bot.js');

const only = process.argv[2];   // 可只跑單一世界：node scripts/gen-levels.js zoo

function run(def, seed, maxT) {
  const s = new E.Session({ mode: 'level', level: def, seed: def.seed });
  return Bot.play(s, { seed, maxT: maxT || 150, skill: 0.7 });
}

function calibrate(draft) {
  const p = (D.WORLDS.findIndex(w => w.id === draft.world) * 50 + draft.index) / 200;
  const factor = 0.5 + p * 0.3;
  const probe = JSON.parse(JSON.stringify(draft));
  const g = probe.goal;
  // 量測：不設目標（極大），看模擬玩家在限制內能做到多少
  const budgetDrops = draft.drops === 0 ? Math.round(34 + p * 16) : 0;
  if (budgetDrops) probe.drops = budgetDrops;
  if (g.type === 'score') g.target = 1e9;
  if (g.type === 'make') g.count = 999;
  if (g.type === 'ice') { probe.goal = { type: 'score', target: 1e9 }; }
  // 沒有放下數或時間限制的關卡，以「一段合理遊玩時間」內的表現為準
  const window = draft.time ? null : (budgetDrops ? 150 : Math.round(40 + p * 30));
  const runs = [11, 23, 37].map(seed => run(probe, seed, window));
  const def = JSON.parse(JSON.stringify(draft));
  if (budgetDrops) def.drops = budgetDrops;
  if (g.type === 'score') {
    const avg = runs.reduce((a, s) => a + s.score, 0) / runs.length;
    def.goal.target = Math.max(500, Math.round(avg * factor / 50) * 50);
  } else if (g.type === 'make') {
    // 以「合出指定等級（含更高等級折算）」的平均次數決定數量；做不到就降一級
    let level = g.level;
    const madeAt = (s, l) => { let c = 0; for (let x = l; x <= 10; x++) c += (s.stats.made[x] || 0) * Math.pow(2, x - l); return c; };
    while (level > 3 && runs.filter(s => madeAt(s, level) >= 1).length < 2) level--;
    const avg = runs.reduce((a, s) => a + madeAt(s, level), 0) / runs.length;
    def.goal.level = level;
    def.goal.count = Math.max(1, Math.min(draft.goal.count + 1, Math.floor(avg * factor + 0.3)));
  }
  return def;
}

function verify(def) {
  for (let attempt = 0; attempt < 6; attempt++) {
    const wins = [101, 202, 303].map(seed => run(def, seed)).filter(s => s.result === 'win');
    if (wins.length >= 1) {
      const best = Math.max(...wins.map(s => s.score));
      def.stars = [Math.round(best * 1.0 / 50) * 50, Math.round(best * 1.35 / 50) * 50];
      def.verified = wins.length;
      return def;
    }
    // 降低難度再試
    const g = def.goal;
    if (g.type === 'score') g.target = Math.max(300, Math.round(g.target * 0.8 / 50) * 50);
    else if (g.type === 'make') { if (g.count > 1) g.count--; else if (g.level > 3) g.level--; }
    if (def.drops) def.drops += 6;
    if (def.time) def.time += 10;
    if (g.type === 'ice' && def.ice.length > 1) def.ice.pop();
  }
  throw new Error('無法驗證關卡 ' + def.id);
}

const out = [];
const t0 = Date.now();
D.WORLDS.forEach((w, wi) => {
  if (only && only !== w.id) return;
  for (let i = 1; i <= 50; i++) {
    const def = verify(calibrate(G.draft(wi, i)));
    delete def.verified;
    out.push(def);
    process.stdout.write('.');
  }
  process.stdout.write(' ' + w.id + '\n');
});
const file = path.join(__dirname, '..', 'public', 'js', 'core', 'level-data.js');
let existing = [];
if (only) { try { existing = require(file).filter(l => l.world !== only); } catch (e) { existing = []; } }
const all = existing.concat(out).sort((a, b) => D.WORLDS.findIndex(w => w.id === a.world) - D.WORLDS.findIndex(w => w.id === b.world) || a.index - b.index);
fs.writeFileSync(file, '/* 由 scripts/gen-levels.js 產生並經模擬玩家驗證，請勿手改 */\n(function (root) {\n  var DATA = ' +
  JSON.stringify(all).replace(/\},\{"id"/g, '},\n    {"id"') + ';\n  root.MZLevelData = DATA;\n  if (typeof module !== \'undefined\' && module.exports) module.exports = DATA;\n})(typeof self !== \'undefined\' ? self : this);\n');
console.log('完成', all.length, '關，耗時', Math.round((Date.now() - t0) / 1000), '秒');
