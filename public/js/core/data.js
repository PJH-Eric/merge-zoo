/* ===== data.js — 世界、難度、道具、每日規則、成就等純資料 ===== */
(function (root) {
  'use strict';

  /** 箱子內部高度與基準寬度（物理座標，單位與像素同級）：接近正方形，容量與原本 400×600 相同 */
  var BOX = { H: 480, BASE_W: 500, LINE_Y: 70, SPAWN_Y: -58, WALL: 40 };

  /** 第 n 級半徑：第 10 級直徑 200（約基準箱寬的 2/5），第 1 級為第 10 級的 1/5 */
  var RADII = [];
  for (var n = 1; n <= 10; n++) RADII[n] = Math.round(20 * Math.pow(5, (n - 1) / 9) * 10) / 10;

  /** 四個世界：物理手感（重力／彈性／摩擦／空氣阻力）與配色 */
  var WORLDS = [
    { id: 'zoo', gravity: 1, restitution: 0.22, friction: 0.3, frictionAir: 0.012, density: 0.0016,
      current: 0, squash: 0.08, palette: { sky: '#BFE6FF', ground: '#9ED36A', accent: '#F4A23C', box: '#C98B4E' } },
    { id: 'ocean', gravity: 0.5, restitution: 0.04, friction: 0.25, frictionAir: 0.05, density: 0.0016,
      current: 0.00006, squash: 0.06, palette: { sky: '#5FC4E8', ground: '#E9D7A8', accent: '#2E86C1', box: '#8FD3F0' } },
    { id: 'sweets', gravity: 1, restitution: 0.55, friction: 0.2, frictionAir: 0.01, density: 0.0016,
      current: 0, squash: 0.22, palette: { sky: '#FFE1EC', ground: '#FFB8D0', accent: '#E8558B', box: '#F7A9C4' } },
    { id: 'space', gravity: 0.33, restitution: 0.45, friction: 0.15, frictionAir: 0.006, density: 0.0016,
      current: 0, squash: 0.1, palette: { sky: '#1B1F4A', ground: '#3B3F7A', accent: '#9B7BFF', box: '#7C83D6' } },
    // 冰原：滑溜溜，幾乎沒有摩擦，會一直滑動
    { id: 'polar', gravity: 1, restitution: 0.12, friction: 0.004, frictionStatic: 0.01, frictionAir: 0.004, density: 0.0016,
      current: 0, squash: 0.06, palette: { sky: '#DCEFFA', ground: '#F4FAFF', accent: '#4FA8D8', box: '#A8D8F0' } },
    // 叢林：黏黏的，摩擦大、不太滾
    { id: 'jungle', gravity: 1, restitution: 0.05, friction: 0.95, frictionStatic: 1.6, frictionAir: 0.03, density: 0.0016,
      current: 0, squash: 0.08, palette: { sky: '#BFE8A8', ground: '#3E8A3A', accent: '#2E9A4A', box: '#8A6A3A' } },
    // 恐龍：沉重，重力大、落地會震
    { id: 'dino', gravity: 1.6, restitution: 0.04, friction: 0.4, frictionAir: 0.008, density: 0.0024,
      current: 0, squash: 0.05, quake: true, palette: { sky: '#F6C88E', ground: '#8A6A44', accent: '#D8743A', box: '#8A8478' } },
    // 農場：彈彈草堆，中等彈性、重力稍輕
    { id: 'farm', gravity: 0.9, restitution: 0.36, friction: 0.55, frictionAir: 0.012, density: 0.0016,
      current: 0, squash: 0.12, palette: { sky: '#BEE4F8', ground: '#E8C46A', accent: '#C8442E', box: '#B8462E' } }
  ];

  /** 五段難度 */
  var DIFFICULTIES = [
    { id: 'kids', boxW: 600, maxSpawn: 3, guide: true, energy: 1.6, canLose: false, rotateMax: 20 },
    { id: 'easy', boxW: 550, maxSpawn: 4, guide: true, energy: 1.3, canLose: true, rotateMax: 45 },
    { id: 'normal', boxW: 500, maxSpawn: 5, guide: true, energy: 1, canLose: true, rotateMax: 45 },
    { id: 'hard', boxW: 500, maxSpawn: 5, guide: false, energy: 0.8, canLose: true, rotateMax: 45, heavy: true },
    { id: 'myth', boxW: 450, maxSpawn: 6, guide: false, energy: 0.8, canLose: true, rotateMax: 45, heavy: true }
  ];

  var ITEMS = ['rainbow', 'bomb', 'shake'];

  /** 每日挑戰的當日規則（只用遊戲裡已有的東西） */
  var DAILY_RULES = ['none', 'narrow', 'bowl', 'funnel', 'rotate', 'gold2x'];

  /** 成就：id 與達成條件（由 achievements.js 判定） */
  var ACHIEVEMENTS = [
    { id: 'tutorial' }, { id: 'first_merge' }, { id: 'kids_round' },
    { id: 'zoo_10' }, { id: 'ocean_10' }, { id: 'sweets_10' }, { id: 'space_10' },
    { id: 'polar_10' }, { id: 'jungle_10' }, { id: 'dino_10' }, { id: 'farm_10' },
    { id: 'double10' }, { id: 'combo3' }, { id: 'combo5' },
    { id: 'score5k' }, { id: 'score10k' }, { id: 'score30k' }, { id: 'noitem10k' }, { id: 'myth5k' },
    { id: 'gold_merge' }, { id: 'gold_big' },
    { id: 'use_rainbow' }, { id: 'use_bomb' }, { id: 'use_shake' }, { id: 'thaw10' },
    { id: 'levels10' }, { id: 'levels50' }, { id: 'levels100' }, { id: 'levels200' },
    { id: 'stars100' }, { id: 'stars600' },
    { id: 'daily1' }, { id: 'daily7' },
    { id: 'codex_world' }, { id: 'codex_all' }
  ];

  var api = { BOX: BOX, RADII: RADII, WORLDS: WORLDS, DIFFICULTIES: DIFFICULTIES, ITEMS: ITEMS,
    DAILY_RULES: DAILY_RULES, ACHIEVEMENTS: ACHIEVEMENTS, MAX_LEVEL: 10,
    world: function (id) { return WORLDS.filter(function (w) { return w.id === id; })[0] || WORLDS[0]; },
    difficulty: function (id) { return DIFFICULTIES.filter(function (d) { return d.id === id; })[0] || DIFFICULTIES[2]; } };
  root.MZData = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
