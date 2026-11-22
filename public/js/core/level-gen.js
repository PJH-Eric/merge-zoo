/* ===== level-gen.js — 關卡產生器：依世界與關數排出關卡初稿（目標數值由 scripts/gen-levels.js 試玩校準）=====
 * 機關分世界漸進引入：動物園＝基本＋道具＋金色；海洋＋冰塊；甜點＋碗形／漏斗／隔板，後半段＋旋轉；太空＋會動的機關。
 */
(function (root) {
  'use strict';
  var D = root.MZData || require('./data.js');
  var R = root.MZRng || require('./rng.js');

  function draft(wi, index) {
    var world = D.WORLDS[wi].id;
    var rng = new R.Rng('merge-zoo-level-' + world + '-' + index);
    var p = (wi * 50 + index) / 200;                 // 整體進度 0..1
    var lp = index / 50;                              // 世界內進度
    var def = { id: world + '-' + index, world: world, index: index, seed: R.hashString('mz-' + world + '-' + index),
      boss: index % 10 === 0, lift: +(0.15 + p * 0.55).toFixed(2) };
    var k = index % 5;
    var bigLevel = Math.min(9, 4 + Math.floor(p * 4 + lp * 1.5));

    if (def.boss) {
      def.goal = { type: 'make', level: Math.min(9, bigLevel + 1), count: 1 };
      def.drops = 0;                                  // 由校準決定
      def.lineOffset = index >= 30 ? 30 : 0;
    } else if (k === 1) {
      def.goal = { type: 'score', target: 0 };
    } else if (k === 2) {
      def.goal = { type: 'make', level: bigLevel, count: 1 + (index % 3 === 0 ? 1 : 0) };
    } else if (k === 3) {
      def.goal = { type: 'score', target: 0 };
      def.drops = 0;
    } else if (k === 4) {
      def.goal = { type: 'score', target: 0 };
      def.time = 50 + Math.round(lp * 30 / 5) * 5;
    } else {
      def.goal = { type: 'make', level: Math.max(4, bigLevel - 1), count: 2 };
      def.drops = 0;
    }
    if (!def.boss && index % 7 === 0) def.lineOffset = 40;

    // 世界專屬機關
    if (world === 'zoo') {
      if (index >= 3 && index % 4 === 3) def.items = { rainbow: 1, bomb: 1, shake: 1 };
      if (index === 3) def.intro = 'items';
      if (index === 6) def.intro = 'gold';
    } else if (world === 'ocean') {
      if (index === 1 || index % 3 !== 2) {
        var n = 2 + Math.floor(lp * 4);
        def.ice = [];
        for (var i = 0; i < n; i++) def.ice.push({ x: +(-0.9 + 1.8 * (i + 0.5) / n).toFixed(2), level: rng.int(2, Math.min(6, 3 + Math.floor(lp * 3))) });
        if (index === 1 || index % 5 === 0 && !def.boss) { def.goal = { type: 'ice' }; def.drops = 0; }
      }
      if (index === 1) def.intro = 'ice';
      if (index % 6 === 0) def.items = { rainbow: 1, bomb: 1 };
    } else if (world === 'sweets') {
      var shapes = ['bowl', 'funnel', 'divider'];
      if (index === 1 || index % 2 === 1) def.box = { shape: shapes[(index >> 1) % 3] };
      if (index === 1) def.intro = 'shape';
      if (index >= 26 && index % 3 === 2) { def.rotate = true; if (index === 26) def.intro = 'rotate'; }
      if (index === 26) def.rotate = true;
      if (index % 8 === 4) def.ice = [{ x: -0.5, level: 3 }, { x: 0.5, level: 4 }];
      if (index % 6 === 0) def.items = { rainbow: 1, shake: 1 };
    } else {
      if (index === 1 || index % 2 === 1) {
        def.mechanics = index % 4 === 1 ? [{ type: 'platform', period: 5 + (index % 3) }] : [{ type: 'paddle', side: index % 3 === 0 ? -1 : 1, speed: 0.7 + lp * 0.5 }];
        if (index >= 30 && index % 6 === 5) def.mechanics.push({ type: 'paddle', side: -1, speed: 0.8 });
      }
      if (index === 1) def.intro = 'mech';
      if (index % 4 === 2) def.box = { shape: ['bowl', 'funnel', 'divider'][index % 3] };
      if (index % 5 === 2) def.rotate = true;
      if (index % 7 === 3) def.ice = [{ x: -0.4, level: 4 }, { x: 0.4, level: 3 }];
      if (index % 6 === 0) def.items = { rainbow: 1, bomb: 1, shake: 1 };
    }
    return def;
  }

  var api = { draft: draft };
  root.MZLevelGen = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
