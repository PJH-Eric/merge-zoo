'use strict';
/* 模擬玩家：關卡驗證與自動遊玩測試共用。啟發式決定放下位置，不偷看未來。 */
const D = require('../../public/js/core/data.js');
const R = require('../../public/js/core/rng.js');

function topUnder(s, x, r) {
  let best = { y: s.H, body: null };
  s.animals().forEach(b => {
    const dx = Math.abs(b.position.x - x), rr = b.circleRadius + r;
    if (dx < rr) {
      const top = b.position.y - Math.sqrt(Math.max(0, rr * rr - dx * dx));
      if (top < best.y) best = { y: top, body: b };
    }
  });
  return best;
}

function chooseX(s, rng, skill) {
  const h = s.held();
  const r = s.heldRadius();
  const lim = s.W / 2 - r - 1;
  let bestX = 0, bestScore = -1e9;
  for (let i = 0; i <= 16; i++) {
    const x = -lim + (2 * lim) * i / 16;
    const hit = topUnder(s, x, r);
    let score = hit.y / s.H * 4;               // 越低越好
    if (hit.body && !h.item && hit.body.mz.kind === 'animal' && !hit.body.mz.ice) {
      const lv = hit.body.mz.level;
      if (lv === h.level) score += 8 + lv;
      else if (Math.abs(lv - h.level) === 1) score += 1;
      else if (lv < h.level) score -= 1.5;
    }
    if (h.item === 'bomb' && hit.body) score += hit.body.mz.level <= 4 ? 3 : 0;
    if (h.item === 'rainbow' && hit.body) score += hit.body.mz.level;
    // 冰塊旁邊合成可以解凍
    if (hit.body && hit.body.mz.ice) score += 1.5;
    score += (rng.next() - 0.5) * (6 - skill * 4);
    if (score > bestScore) { bestScore = score; bestX = x; }
  }
  return bestX;
}

/** 跑一局：回傳 session（已結束或時間到） */
function play(s, opts) {
  opts = opts || {};
  const rng = new R.Rng(opts.seed || 7);
  const skill = opts.skill == null ? 0.7 : opts.skill;
  const maxT = opts.maxT || 120;
  const interval = opts.interval || 0.75;
  let nextDrop = 0.2;
  s.start();
  while (s.state === 'playing' && s.t < maxT) {
    if (s.t >= nextDrop && s.canDrop()) {
      if (s.danger > 0.4 && s.items.length && !s.armed) {
        const i = s.items.indexOf('shake') >= 0 ? s.items.indexOf('shake') : 0;
        s.armItem(i);
      } else if (!s.armed && s.items.length && rng.next() < 0.04) s.armItem(0);
      if (s.dropsLeft && s.dropsLeft() === 0 && !s.armed) { s.step(); continue; }
      s.drop(chooseX(s, rng, skill));
      nextDrop = s.t + interval * (0.8 + rng.next() * 0.4);
    }
    s.step();
  }
  return s;
}

module.exports = { play, chooseX };
