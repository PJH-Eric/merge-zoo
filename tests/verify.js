'use strict';
/* 規則核心測試：node tests/verify.js */
const assert = require('assert');
const D = require('../public/js/core/data.js');
const E = require('../public/js/core/engine.js');
const R = require('../public/js/core/rng.js');
const Daily = require('../public/js/core/daily.js');
const Bot = require('../scripts/lib/bot.js');

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log('✓ ' + name); }
  catch (e) { console.error('✗ ' + name + '\n  ' + (e.stack || e)); process.exitCode = 1; }
}
function session(opts) { const s = new E.Session(Object.assign({ seed: 1, world: 'zoo', difficulty: 'normal' }, opts)); s.start(); return s; }
function steps(s, n) { for (let i = 0; i < n; i++) s.step(); }
function pair(s, level, extra) {
  const r = D.RADII[level], y = s.H - r - 1;
  const a = s.makeBody('animal', level, -r + 3, y, extra && extra.a);
  const b = s.makeBody('animal', level, r - 3, y, extra && extra.b);
  a.mz.born = b.mz.born = -10;
  return [a, b];
}
const animals = s => s.animals().filter(b => b.mz.kind === 'animal');

test('半徑：第 10 級直徑為基準箱寬 2/5，第 1 級為其 1/5；箱子接近正方形', () => {
  assert.strictEqual(D.RADII[10] * 2, D.BOX.BASE_W * 0.4);
  assert.ok(Math.abs(D.BOX.BASE_W * D.BOX.H - 400 * 600) < 1000);
  assert.ok(Math.abs(D.RADII[1] - D.RADII[10] / 5) < 0.2);
});
test('計分：第 n 級得 n(n+1)/2×10', () => {
  assert.strictEqual(E.scoreFor(2), 30);
  assert.strictEqual(E.scoreFor(10), 550);
});
test('兩隻同級碰到會合成下一級並得分', () => {
  const s = session(); pair(s, 3); steps(s, 30);
  const a = animals(s);
  assert.strictEqual(a.length, 1);
  assert.strictEqual(a[0].mz.level, 4);
  assert.strictEqual(s.score, E.scoreFor(4));
  assert.strictEqual(s.stats.made[4], 1);
});
test('不同等級不會合成', () => {
  const s = session();
  const r3 = D.RADII[3], r4 = D.RADII[4];
  s.makeBody('animal', 3, -r3, s.H - r3); s.makeBody('animal', 4, r4 + 1, s.H - r4);
  steps(s, 60);
  assert.strictEqual(animals(s).length, 2);
});
test('兩隻第 10 級一起消失並得 1000 分', () => {
  const s = session(); pair(s, 10); steps(s, 30);
  assert.strictEqual(animals(s).length, 0);
  assert.strictEqual(s.score, 1000);
  assert.strictEqual(s.stats.double10, 1);
});
test('連鎖倍率：1 秒內連續合成倍率遞增，最高 ×5', () => {
  const s = session();
  const evs = []; s.on(e => { if (e.type === 'merge') evs.push(e.combo); });
  for (let i = 0; i < 7; i++) { s.comboStep(); }
  assert.strictEqual(Math.min(5, s.chain), 5);
  const s2 = session(); const ev2 = []; s2.on(e => { if (e.type === 'merge') ev2.push(e.combo); });
  pair(s2, 1); steps(s2, 20); pair(s2, 1); steps(s2, 20);
  assert.deepStrictEqual(ev2.slice(0, 2), [1, 2]);
  steps(s2, 120); pair(s2, 1); steps(s2, 20);
  assert.strictEqual(ev2[ev2.length - 1], 1, '超過 1 秒重新計算');
});
test('金色動物合成分數 ×2，合出來的也是金色', () => {
  const s = session(); pair(s, 2, { a: { gold: true } }); steps(s, 30);
  assert.strictEqual(s.score, E.scoreFor(3) * 2);
  assert.ok(animals(s)[0].mz.gold);
});
test('放下冷卻 0.5 秒', () => {
  const s = session();
  assert.ok(s.drop(0));
  assert.ok(!s.drop(0));
  steps(s, 31);
  assert.ok(s.drop(50));
});
test('紅線：停在紅線上超過 2 秒才算輸', () => {
  const s = session();
  const b = s.makeBody('animal', 5, 0, 20); b.mz.born = -10;
  require('../public/js/vendor/matter.min.js').Body.setStatic(b, true);
  steps(s, 60);
  assert.strictEqual(s.state, 'playing');
  assert.ok(s.danger > 0.9);
  steps(s, 70);
  assert.strictEqual(s.state, 'over');
  assert.strictEqual(s.result, 'lose');
});
test('幼幼班不會輸：上層動物變泡泡飛走', () => {
  const s = session({ difficulty: 'kids' });
  const b = s.makeBody('animal', 5, 0, 20); b.mz.born = -10;
  require('../public/js/vendor/matter.min.js').Body.setStatic(b, true);
  let bubble = 0; s.on(e => { if (e.type === 'bubble') bubble++; });
  steps(s, 130);
  assert.strictEqual(s.state, 'playing');
  assert.ok(bubble >= 1);
  s.endNow();
  assert.strictEqual(s.result, 'end');
});
test('彩虹萬用球讓碰到的動物升一級', () => {
  const s = session();
  const r = D.RADII[4];
  const a = s.makeBody('animal', 4, 0, s.H - r); a.mz.born = -10;
  s.makeBody('rainbow', 2, 0, s.H - r * 2 - D.RADII[2] - 2);
  steps(s, 60);
  const a2 = animals(s);
  assert.strictEqual(a2.length, 1);
  assert.strictEqual(a2[0].mz.level, 5);
});
test('炸彈貓只炸掉第 1～4 級小動物', () => {
  const s = session();
  s.makeBody('animal', 2, -60, s.H - D.RADII[2]);
  s.makeBody('animal', 7, 80, s.H - D.RADII[7]);
  s.makeBody('bomb', 2, -60, s.H - D.RADII[2] * 2 - 30);
  steps(s, 90);
  const lv = animals(s).map(b => b.mz.level);
  assert.deepStrictEqual(lv, [7]);
});
test('能量條集滿給道具，道具欄最多 3 格', () => {
  const s = session({ difficulty: 'kids' });
  for (let i = 0; i < 80; i++) s.afterMerge(0, 0, 5);
  assert.strictEqual(s.items.length, 3);
  assert.strictEqual(s.energy, 100);
});
test('搖一搖立即生效並從道具欄移除', () => {
  const s = session(); s.items = ['shake']; let used = 0;
  s.on(e => { if (e.type === 'item') used++; });
  assert.ok(s.armItem(0));
  assert.strictEqual(s.items.length, 0);
  assert.strictEqual(used, 1);
});
test('準備道具後放下的是道具，原本的動物留著', () => {
  const s = session(); s.items = ['rainbow'];
  const held = s.queue[0];
  s.armItem(0);
  assert.strictEqual(s.held().item, 'rainbow');
  s.drop(0);
  assert.strictEqual(s.queue[0], held);
  assert.strictEqual(s.armed, null);
});
test('冰凍塊不能合成，旁邊合成一次就解凍', () => {
  const s = session({ mode: 'level', level: { id: 't', world: 'zoo', index: 1, goal: { type: 'ice' }, ice: [{ x: 0.9, level: 3 }] } });
  const ice = animals(s)[0];
  assert.ok(ice.mz.ice);
  const r = D.RADII[3];
  const other = s.makeBody('animal', 3, ice.position.x - r * 2 - 1, s.H - r); other.mz.born = -10;
  steps(s, 30);
  assert.ok(ice.mz.ice && ice.mz.alive, '冰塊不會跟同級合成');
  s.afterMerge(ice.position.x - 40, ice.position.y, 2); steps(s, 2);
  assert.ok(!ice.mz.ice, '旁邊合成後解凍');
  assert.strictEqual(s.state, 'over');
  assert.strictEqual(s.result, 'win');
});
test('任務：合出指定動物即過關；放下數用完即失敗；時間到即失敗', () => {
  const s = session({ mode: 'level', level: { id: 't', world: 'zoo', index: 1, goal: { type: 'make', level: 3, count: 1 }, stars: [10, 20] } });
  pair(s, 2); steps(s, 30);
  assert.strictEqual(s.result, 'win');
  assert.strictEqual(s.stars(), 3);
  const s2 = session({ mode: 'level', level: { id: 't', world: 'zoo', index: 1, goal: { type: 'score', target: 1e9 }, drops: 2 } });
  s2.drop(-100); steps(s2, 40); s2.drop(100); steps(s2, 40);
  assert.ok(!s2.drop(0));
  steps(s2, 60 * 4);
  assert.strictEqual(s2.result, 'lose');
  const s3 = session({ mode: 'level', level: { id: 't', world: 'zoo', index: 1, goal: { type: 'score', target: 1e9 }, time: 1 } });
  steps(s3, 70);
  assert.strictEqual(s3.result, 'lose');
});
test('旋轉箱子：最多 ±45°，放開會回正', () => {
  const s = session({ mode: 'daily', rule: 'rotate' });
  s.setRotate(1); steps(s, 120);
  assert.ok(Math.abs(s.angle - Math.PI / 4) < 1e-6);
  s.setRotate(0); steps(s, 120);
  assert.strictEqual(s.angle, 0);
  const k = session({ mode: 'daily', rule: 'rotate', difficulty: 'kids' });
  k.setRotate(-1); steps(k, 120);
  assert.ok(Math.abs(k.angle + Math.PI / 9) < 1e-6);
});
test('不能旋轉的模式忽略旋轉輸入', () => {
  const s = session(); s.setRotate(1); steps(s, 30);
  assert.strictEqual(s.angle, 0);
});
test('同一個種子產生同樣的掉落順序', () => {
  const a = new E.Session({ seed: 99 }), b = new E.Session({ seed: 99 });
  for (let i = 0; i < 20; i++) assert.deepStrictEqual(a.rollSpawn(), b.rollSpawn());
});
test('難度掉落範圍：幼幼 1～3、神話 1～6', () => {
  const k = new E.Session({ seed: 3, difficulty: 'kids' }), m = new E.Session({ seed: 3, difficulty: 'myth' });
  let kmax = 0, mmax = 0;
  for (let i = 0; i < 500; i++) { kmax = Math.max(kmax, k.rollSpawn().level); mmax = Math.max(mmax, m.rollSpawn().level); }
  assert.strictEqual(kmax, 3); assert.strictEqual(mmax, 6);
});
test('存檔還原後分數、佇列、動物一致', () => {
  const s = session(); for (let i = 0; i < 300; i++) { if (s.canDrop()) s.drop((i % 7 - 3) * 40); s.step(); }
  const data = JSON.parse(JSON.stringify(s.serialize()));
  const r = E.Session.restore(data);
  assert.strictEqual(r.score, s.score);
  assert.deepStrictEqual(r.queue, s.queue);
  assert.strictEqual(animals(r).length, data.bodies.length);
});
test('每日挑戰：台北時間切日，同一天同世界同規則', () => {
  assert.strictEqual(Daily.taipeiDate(Date.parse('2026-11-22T15:59:00Z')), '2026-11-22');
  assert.strictEqual(Daily.taipeiDate(Date.parse('2026-11-22T16:00:00Z')), '2026-11-23');
  const a = Daily.forDate('2026-11-22'), b = Daily.forDate('2026-11-22');
  assert.deepStrictEqual(a, b);
  assert.ok(D.DAILY_RULES.indexOf(a.rule) >= 0);
  assert.strictEqual(Daily.prevDate('2026-03-01'), '2026-02-28');
});
test('各世界、各難度、各特殊箱子自動遊玩不出錯', () => {
  D.WORLDS.forEach(w => D.DIFFICULTIES.forEach(df => {
    const s = new E.Session({ world: w.id, difficulty: df.id, seed: 5, mode: 'classic' });
    Bot.play(s, { seed: 2, maxT: 40 });
    assert.ok(s.score > 0, w.id + df.id);
  }));
  ['bowl', 'funnel', 'divider'].forEach(shape => {
    const s = new E.Session({ mode: 'level', seed: 4, level: { id: 'x', world: 'space', index: 1, box: { shape }, rotate: true,
      mechanics: [{ type: 'platform' }, { type: 'paddle' }], goal: { type: 'score', target: 1e9 } } });
    s.setRotate(1);
    Bot.play(s, { seed: 3, maxT: 40 });
    assert.ok(s.score > 0, shape);
  });
});
test('關卡資料：200 關齊全且每關都有目標與星數門檻', () => {
  let L;
  try { L = require('../public/js/core/level-data.js'); } catch (e) { L = []; }
  assert.strictEqual(L.length, 200);
  L.forEach(l => {
    assert.ok(l.goal && l.stars && l.stars.length === 2, l.id);
    if (l.goal.type === 'score') assert.ok(l.goal.target > 0, l.id);
    if (l.goal.type === 'make') assert.ok(l.goal.count >= 1 && l.goal.level >= 3, l.id);
  });
  const ids = new Set(L.map(l => l.id)); assert.strictEqual(ids.size, 200);
});
test('關卡抽樣重跑：模擬玩家可以通關', () => {
  let L;
  try { L = require('../public/js/core/level-data.js'); } catch (e) { L = []; }
  const rng = new R.Rng(2026);
  const sample = [L[0], L[49], L[50], L[99], L[100], L[149], L[150], L[199]].concat([0, 1, 2, 3].map(() => L[rng.int(0, L.length - 1)])).filter(Boolean);
  sample.forEach(def => {
    const ok = [101, 202, 303].some(seed => Bot.play(new E.Session({ mode: 'level', level: def, seed: def.seed }), { seed, maxT: 150 }).result === 'win');
    assert.ok(ok, def.id + ' 無法通關');
  });
});
console.log('\n' + passed + ' 項通過' + (process.exitCode ? '，有失敗' : ''));
