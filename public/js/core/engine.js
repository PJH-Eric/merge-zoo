/* ===== engine.js — 合成動物園規則核心（物理、合成、計分、連鎖、紅線、道具、任務）=====
 * 跟畫面、輸入、音訊完全分開；瀏覽器與 Node（測試、關卡驗證）共用同一份。
 * 座標：箱子內部 x ∈ [-W/2, W/2]、y ∈ [0, H]，y=0 為箱口，旋轉中心在 (0, H/2)。
 */
(function (root) {
  'use strict';
  var Matter = root.Matter || (typeof require === 'function' ? require('../vendor/matter.min.js') : null);
  var D = root.MZData || require('./data.js');
  var R = root.MZRng || require('./rng.js');
  var Engine = Matter.Engine, Bodies = Matter.Bodies, Body = Matter.Body, Composite = Matter.Composite, Events = Matter.Events;

  var STEP = 1000 / 60;
  var DT = STEP / 1000;
  var COOLDOWN = 0.5;
  var DANGER_LIMIT = 2;
  var SETTLE_GRACE = 1.2;
  var COMBO_WINDOW = 1.0;
  var ENERGY_FULL = 100;
  var GOLD_CHANCE = 0.03;
  var POKE_COST = 10;          // 戳一戳：經典／每日用能量
  var POKE_PER_LEVEL = 3;      // 戳一戳：闖關每關次數
  var POKE_COOLDOWN = 0.35;

  function scoreFor(level) { return level * (level + 1) / 2 * 10; }

  function Session(opts) {
    opts = opts || {};
    this.opts = opts;
    this.mode = opts.mode || 'classic';
    this.level = opts.level || null;
    this.rule = opts.rule || 'none';
    this.world = D.world(opts.world || (this.level && this.level.world) || 'zoo');
    this.diff = D.difficulty(this.mode === 'level' ? 'normal' : (opts.difficulty || 'normal'));
    var lv = this.level || {};
    var widthFactor = (lv.box && lv.box.width) || (this.rule === 'narrow' ? 0.85 : 1);
    this.W = Math.round(this.diff.boxW * widthFactor);
    this.H = D.BOX.H;
    this.lineY = D.BOX.LINE_Y + (lv.lineOffset || 0);
    this.shape = (lv.box && lv.box.shape) || ({ bowl: 'bowl', funnel: 'funnel' })[this.rule] || 'box';
    this.mechanics = (lv.mechanics || []).slice();
    this.canRotate = !!(lv.rotate || this.rule === 'rotate');
    this.spawnY = this.canRotate ? D.BOX.SPAWN_Y : D.BOX.SPAWN_IN;
    this.rotateMax = (this.diff.rotateMax || 45) * Math.PI / 180;
    this.canLose = this.mode === 'tutorial' ? false : (this.mode === 'level' ? true : this.diff.canLose);
    this.useEnergy = this.mode === 'classic' || this.mode === 'daily';
    this.goldChance = this.mode === 'tutorial' ? 0 : GOLD_CHANCE * (this.rule === 'gold2x' ? 2 : 1);
    this.grace = SETTLE_GRACE / Math.sqrt(this.world.gravity);
    this.rng = new R.Rng(opts.seed != null ? opts.seed : (Date.now() >>> 0));

    this.t = 0;
    this.state = 'ready';           // ready → playing → over（win／lose）
    this.result = null;
    this.score = 0;
    this.cooldown = 0;
    this.danger = 0;
    this.dangerOn = false;
    this.dangerIds = [];
    this.angle = 0;
    this.rotateInput = 0;
    this.chain = 0;
    this.lastMergeT = -99;
    this.energy = 0;
    this.items = [];
    this.armed = null;
    this.aimX = 0;
    this.listeners = [];
    this.pending = [];
    this.contacts = {};
    this.nextId = 1;
    this.stats = { drops: 0, merges: 0, maxCombo: 0, maxLevel: 0, itemsUsed: 0, thawed: 0, goldMerges: 0,
      double10: 0, made: {}, maxGoldLevel: 0 };
    this.lastDropT = -99;
    this.pokeCd = 0;
    this.pokesLeft = this.mode === 'level' ? POKE_PER_LEVEL : null;
    this.stats.swaps = 0; this.stats.pokes = 0;

    if (lv.items) {
      for (var k in lv.items) for (var i = 0; i < lv.items[k]; i++) this.items.push(k);
    }

    this.engine = Engine.create({ positionIterations: 8, velocityIterations: 6, enableSleeping: false });
    this.engine.gravity.y = this.world.gravity;
    this.engine.gravity.scale = 0.001;
    this.statics = [];
    this.buildBox();
    this.queue = [this.rollSpawn(), this.rollSpawn()];
    if (lv.ice) this.placeIce(lv.ice);
    if (this.mode === 'tutorial') this.queue = [{ level: 1 }, { level: 1 }];
    var self = this;
    Events.on(this.engine, 'collisionStart', function (e) { self.onCollide(e.pairs, true); });
    Events.on(this.engine, 'collisionActive', function (e) { self.onCollide(e.pairs, false); });
  }

  Session.prototype.on = function (fn) { this.listeners.push(fn); };
  Session.prototype.emit = function (ev) {
    ev.t = this.t;
    for (var i = 0; i < this.listeners.length; i++) {
      try { this.listeners[i](ev); } catch (err) { if (typeof console !== 'undefined') console.error(err); }
    }
  };

  /* ---------- 箱子與機關 ---------- */
  Session.prototype.addStatic = function (lx, ly, w, h, la, kind) {
    var body = Bodies.rectangle(lx, ly, w, h, { isStatic: true, friction: 0.4, restitution: 0.1, label: 'wall' });
    var rec = { body: body, lx: lx, ly: ly, la: la || 0, w: w, h: h, kind: kind || 'wall' };
    Body.setAngle(body, rec.la);
    this.statics.push(rec);
    Composite.add(this.engine.world, body);
    return rec;
  };

  Session.prototype.buildBox = function () {
    var W = this.W, H = this.H, T = D.BOX.WALL, tall = H + 260;
    this.addStatic(0, H + T / 2, W + T * 2, T, 0, 'floor');
    this.addStatic(-W / 2 - T / 2, H - tall / 2 + T / 2, T, tall + T, 0, 'wall');
    this.addStatic(W / 2 + T / 2, H - tall / 2 + T / 2, T, tall + T, 0, 'wall');
    var i, seg;
    if (this.shape === 'bowl') {
      // 兩側圓弧角：動物會往中間滾
      var rr = W * 0.3, ring = rr + 10, N = 7;
      for (var side = -1; side <= 1; side += 2) {
        var cx = side * (W / 2 - rr), cy = H - rr;
        var from = side < 0 ? Math.PI / 2 : 0;
        for (i = 0; i < N; i++) {
          var am = from + ((i + 0.5) / N) * Math.PI / 2;
          seg = 2 * ring * Math.sin(Math.PI / 4 / N) + 8;
          this.addStatic(cx + Math.cos(am) * ring, cy + Math.sin(am) * ring, seg, 20, am + Math.PI / 2, 'shape');
        }
      }
    } else if (this.shape === 'funnel') {
      var open = W * 0.36, depth = 130;
      var len = Math.hypot((W - open) / 2, depth);
      var ang = Math.atan2(depth, (W - open) / 2);
      this.addStatic(-(W + open) / 4, H - depth / 2, len + 10, 16, ang, 'shape');
      this.addStatic((W + open) / 4, H - depth / 2, len + 10, 16, -ang, 'shape');
    } else if (this.shape === 'divider') {
      this.addStatic(0, H - 60, 16, 120, 0, 'shape');
    }
    var self = this;
    this.mechanics.forEach(function (m) {
      if (m.type === 'platform') {
        var p = self.addStatic(0, H * 0.58, W * 0.3, 16, 0, 'platform');
        p.mech = { type: 'platform', amp: W * 0.25, period: m.period || 6, baseX: 0 };
      } else if (m.type === 'paddle') {
        var side = m.side || 1;
        var q = self.addStatic(side * W * 0.24, H * 0.62, W * 0.34, 14, 0, 'paddle');
        q.mech = { type: 'paddle', speed: (m.speed || 0.9) * side };
      }
    });
    this.syncStatics();
  };

  Session.prototype.localToWorld = function (lx, ly) {
    var cy = this.H / 2, c = Math.cos(this.angle), s = Math.sin(this.angle);
    var dx = lx, dy = ly - cy;
    return { x: dx * c - dy * s, y: cy + dx * s + dy * c };
  };
  Session.prototype.worldToLocal = function (x, y) {
    var cy = this.H / 2, c = Math.cos(-this.angle), s = Math.sin(-this.angle);
    var dx = x, dy = y - cy;
    return { x: dx * c - dy * s, y: cy + dx * s + dy * c };
  };

  Session.prototype.syncStatics = function (kinematic) {
    for (var i = 0; i < this.statics.length; i++) {
      var rec = this.statics[i];
      var p = this.localToWorld(rec.lx, rec.ly);
      Body.setPosition(rec.body, p, !!kinematic);
      Body.setAngle(rec.body, rec.la + this.angle, !!kinematic);
    }
  };

  /* ---------- 掉落佇列 ---------- */
  Session.prototype.spawnWeights = function () {
    var max = this.diff.maxSpawn, w = [];
    var lift = 0;
    if (this.mode === 'classic' && this.diff.id !== 'kids') lift = Math.min(1, this.score / 20000);
    if (this.level && this.level.lift) lift = this.level.lift;
    for (var i = 1; i <= max; i++) {
      var base = this.diff.heavy ? 1 + (i - 1) * 0.12 : Math.pow(max - i + 1, 0.9);
      w.push(base * (1 + lift * (i - 1) * 0.35));
    }
    return w;
  };
  Session.prototype.rollSpawn = function () {
    var level = this.rng.weighted(this.spawnWeights()) + 1;
    var gold = this.rng.next() < this.goldChance;
    return gold ? { level: level, gold: true } : { level: level };
  };
  Session.prototype.held = function () {
    if (this.armed) return { item: this.armed };
    return this.queue[0];
  };
  Session.prototype.heldRadius = function () {
    var h = this.held();
    if (h.item) return D.RADII[2];
    return D.RADII[h.level];
  };
  Session.prototype.setAim = function (x) {
    var r = this.heldRadius();
    var lim = this.W / 2 - r - 1;
    this.aimX = Math.max(-lim, Math.min(lim, x));
    return this.aimX;
  };

  /* ---------- 動物 ---------- */
  Session.prototype.makeBody = function (kind, level, x, y, extra) {
    var r = kind === 'animal' ? D.RADII[level] : D.RADII[2];
    var wd = this.world;
    var body = Bodies.circle(x, y, r, {
      restitution: wd.restitution, friction: wd.friction, frictionAir: wd.frictionAir, frictionStatic: wd.frictionStatic != null ? wd.frictionStatic : 0.5,
      density: wd.density * (kind === 'animal' ? 1 : 1.4), label: kind, slop: 0.04
    });
    body.mz = { id: this.nextId++, kind: kind, level: level, born: this.t, gold: !!(extra && extra.gold),
      ice: !!(extra && extra.ice), hit: -9, alive: true, armedAt: this.t };
    Composite.add(this.engine.world, body);
    return body;
  };
  Session.prototype.animals = function () {
    return Composite.allBodies(this.engine.world).filter(function (b) { return b.mz && b.mz.alive; });
  };
  Session.prototype.remove = function (body) {
    if (!body.mz || !body.mz.alive) return;
    body.mz.alive = false;
    Composite.remove(this.engine.world, body);
  };

  Session.prototype.placeIce = function (list) {
    var self = this;
    list.forEach(function (ic) {
      var lvl = ic.level || 3;
      var x = (ic.x || 0) * (self.W / 2 - D.RADII[lvl] - 2);
      var y = self.H - D.RADII[lvl] - (ic.y || 0);
      var b = self.makeBody('animal', lvl, x, y, { ice: true });
      b.mz.born = -10;
    });
  };

  /* ---------- 控制 ---------- */
  Session.prototype.start = function () {
    if (this.state !== 'ready') return;
    this.state = 'playing';
    this.emit({ type: 'start' });
  };
  Session.prototype.canDrop = function () { return this.state === 'playing' && this.cooldown <= 0; };
  Session.prototype.drop = function (x) {
    if (!this.canDrop()) return false;
    if (this.level && this.level.drops && this.stats.drops >= this.level.drops && !this.armed) return false;
    if (x != null) this.setAim(x);
    // 放下位置＝畫面上手持動物的位置（世界座標），箱子轉斜時也一致
    var p = { x: this.aimX, y: this.spawnY };
    var body;
    if (this.armed) {
      body = this.makeBody(this.armed, 2, p.x, p.y);
      this.stats.itemsUsed++;
      this.emit({ type: 'item', item: this.armed, x: p.x, y: p.y });
      this.armed = null;
    } else {
      var h = this.queue.shift();
      this.queue.push(this.mode === 'tutorial' ? { level: this.stats.drops < 3 ? 1 : this.rng.int(1, 2) } : this.rollSpawn());
      body = this.makeBody('animal', h.level, p.x, p.y, { gold: h.gold });
      this.stats.drops++;
      this.emit({ type: 'drop', level: h.level, x: p.x, y: p.y, gold: !!h.gold });
    }
    this.lastDropT = this.t;
    this.cooldown = COOLDOWN;
    this.setAim(this.aimX);
    return true;
  };
  Session.prototype.armItem = function (index) {
    if (this.state !== 'playing') return false;
    var type = this.items[index];
    if (!type) return false;
    if (type === 'shake') {
      this.items.splice(index, 1);
      this.stats.itemsUsed++;
      this.shake();
      this.emit({ type: 'item', item: 'shake' });
      return true;
    }
    this.items.splice(index, 1);
    if (this.armed) this.items.push(this.armed);   // 換道具：原本準備的放回道具欄
    this.armed = type;
    this.setAim(this.aimX);
    this.emit({ type: 'arm', item: type });
    return true;
  };
  Session.prototype.cancelArm = function () {
    if (!this.armed) return;
    this.items.push(this.armed);
    this.armed = null;
    this.emit({ type: 'arm', item: null });
  };
  Session.prototype.shake = function () {
    var self = this;
    this.animals().forEach(function (b) {
      var m = b.mass;
      Body.setVelocity(b, { x: b.velocity.x + (self.rng.next() - 0.5) * 6, y: b.velocity.y - 3 - self.rng.next() * 3 });
      Body.setAngularVelocity(b, (self.rng.next() - 0.5) * 0.3);
      void m;
    });
  };
  /** 交換：手上的動物跟下一隻對調 */
  Session.prototype.swap = function () {
    if (this.state !== 'playing' || this.armed || this.queue.length < 2) return false;
    var a = this.queue[0];
    this.queue[0] = this.queue[1];
    this.queue[1] = a;
    this.stats.swaps++;
    this.setAim(this.aimX);
    this.emit({ type: 'swap' });
    return true;
  };
  /** 找出某一點上的動物 */
  Session.prototype.animalAt = function (x, y) {
    var hit = null;
    this.animals().forEach(function (b) {
      if (b.mz.kind !== 'animal') return;
      if (Math.hypot(b.position.x - x, b.position.y - y) <= b.circleRadius + 4) hit = b;
    });
    return hit;
  };
  /** 戳一戳：點箱子裡的動物讓牠彈一下，往最近的同伴推。回傳 'ok'／'miss'／'cooldown'／'energy'／'none' */
  Session.prototype.poke = function (x, y) {
    if (this.state !== 'playing') return 'miss';
    var b = this.animalAt(x, y);
    if (!b) return 'miss';
    if (this.pokeCd > 0) return 'cooldown';
    if (this.useEnergy) {
      if (this.energy < POKE_COST) return 'energy';
      this.energy -= POKE_COST;
    } else if (this.pokesLeft != null) {
      if (this.pokesLeft <= 0) return 'none';
      this.pokesLeft--;
    }
    var mate = null, best = 1e9, self = this;
    this.animals().forEach(function (o) {
      if (o === b || o.mz.kind !== 'animal' || o.mz.ice || o.mz.level !== b.mz.level) return;
      var d = Math.hypot(o.position.x - b.position.x, o.position.y - b.position.y);
      if (d < best) { best = d; mate = o; }
    });
    var k = Math.sqrt(this.world.gravity);
    var vx = mate ? Math.max(-4, Math.min(4, (mate.position.x - b.position.x) / 40)) : (this.rng.next() - 0.5) * 2;
    Body.setVelocity(b, { x: b.velocity.x + vx * k, y: -4.6 * k });
    Body.setAngularVelocity(b, (this.rng.next() - 0.5) * 0.2);
    b.mz.hit = this.t;
    this.pokeCd = POKE_COOLDOWN;
    this.stats.pokes++;
    this.emit({ type: 'poke', x: b.position.x, y: b.position.y, r: b.circleRadius, toward: !!mate });
    void self;
    return 'ok';
  };
  Session.prototype.setRotate = function (dir) { this.rotateInput = this.canRotate ? Math.max(-1, Math.min(1, dir)) : 0; };

  /* ---------- 碰撞與合成 ---------- */
  Session.prototype.onCollide = function (pairs, isStart) {
    for (var i = 0; i < pairs.length; i++) {
      var a = pairs[i].bodyA, b = pairs[i].bodyB;
      if (a.mz && a.mz.kind === 'animal') this.contacts[a.id] = (this.contacts[a.id] || 0) + 1;
      if (b.mz && b.mz.kind === 'animal') this.contacts[b.id] = (this.contacts[b.id] || 0) + 1;
      if (isStart) {
        var speed = Math.hypot(a.velocity.x - b.velocity.x, a.velocity.y - b.velocity.y);
        if (speed > 2.2) {
          if (a.mz) a.mz.hit = this.t;
          if (b.mz) b.mz.hit = this.t;
          if ((a.mz && a.mz.kind === 'animal') || (b.mz && b.mz.kind === 'animal')) this.emit({ type: 'impact', speed: speed });
        }
      }
      if (!a.mz && !b.mz) continue;
      this.pending.push([a, b]);
    }
  };

  Session.prototype.resolvePending = function () {
    var list = this.pending;
    this.pending = [];
    for (var i = 0; i < list.length; i++) {
      var a = list[i][0], b = list[i][1];
      var ma = a.mz, mb = b.mz;
      if ((ma && !ma.alive) || (mb && !mb.alive)) continue;
      if (ma && mb && ma.kind === 'animal' && mb.kind === 'animal') {
        if (ma.level === mb.level && !ma.ice && !mb.ice) this.merge(a, b);
        continue;
      }
      var item = ma && ma.kind !== 'animal' ? a : (mb && mb.kind !== 'animal' ? b : null);
      if (!item) continue;
      var other = item === a ? b : a;
      if (item.mz.kind === 'rainbow') {
        if (other.mz && other.mz.kind === 'animal' && !other.mz.ice) this.rainbowHit(item, other);
      } else if (item.mz.kind === 'bomb') {
        if (this.t - item.mz.born > 0.1) this.explode(item);
      }
    }
  };

  Session.prototype.comboStep = function () {
    if (this.t - this.lastMergeT <= COMBO_WINDOW) this.chain++;
    else this.chain = 1;
    this.lastMergeT = this.t;
    if (this.chain > this.stats.maxCombo) this.stats.maxCombo = this.chain;
    return Math.min(5, this.chain);
  };

  Session.prototype.addScore = function (points) {
    this.score += points;
  };

  Session.prototype.merge = function (a, b) {
    var level = a.mz.level;
    var gold = a.mz.gold || b.mz.gold;
    var x = (a.position.x + b.position.x) / 2, y = (a.position.y + b.position.y) / 2;
    var vx = (a.velocity.x + b.velocity.x) / 2, vy = (a.velocity.y + b.velocity.y) / 2;
    this.remove(a);
    this.remove(b);
    var mult = this.comboStep();
    this.stats.merges++;
    if (gold) this.stats.goldMerges++;
    var points;
    if (level >= D.MAX_LEVEL) {
      points = 1000 * mult * (gold ? 2 : 1);
      this.addScore(points);
      this.stats.double10++;
      this.emit({ type: 'bonus', x: x, y: y, points: points, combo: mult, gold: gold });
      this.afterMerge(x, y, D.MAX_LEVEL);
      return;
    }
    var nl = level + 1;
    this.spawnMerged(nl, x, y, vx, vy, gold, mult);
  };

  Session.prototype.spawnMerged = function (nl, x, y, vx, vy, gold, mult) {
    var lim = this.W / 2 - D.RADII[nl] - 1;
    var lp = this.worldToLocal(x, y);
    if (Math.abs(lp.x) > lim) { lp.x = Math.sign(lp.x) * lim; var wp = this.localToWorld(lp.x, lp.y); x = wp.x; y = wp.y; }
    var nb = this.makeBody('animal', nl, x, y, { gold: gold });
    Body.setVelocity(nb, { x: vx * 0.5, y: Math.min(vy, 0) * 0.5 - 0.8 });
    nb.mz.born = this.t - this.grace * 0.6;
    nb.mz.pop = this.t;
    var points = scoreFor(nl) * mult * (gold ? 2 : 1);
    this.addScore(points);
    this.stats.made[nl] = (this.stats.made[nl] || 0) + 1;
    if (nl > this.stats.maxLevel) this.stats.maxLevel = nl;
    if (gold && nl > this.stats.maxGoldLevel) this.stats.maxGoldLevel = nl;
    this.emit({ type: 'merge', level: nl, x: x, y: y, points: points, combo: mult, gold: gold, id: nb.mz.id });
    this.afterMerge(x, y, nl);
  };

  Session.prototype.afterMerge = function (x, y, level) {
    // 能量條
    if (this.useEnergy) {
      this.energy += (6 + level * 2) * this.diff.energy;
      while (this.energy >= ENERGY_FULL) {
        if (this.items.length >= 3) { this.energy = ENERGY_FULL; break; }
        this.energy -= ENERGY_FULL;
        var item = D.ITEMS[this.rng.int(0, 2)];
        this.items.push(item);
        this.emit({ type: 'gain', item: item });
      }
    }
    // 冰凍塊：旁邊有合成就解凍
    var reach = D.RADII[Math.min(level, 10)] * 2 + 40;
    var self = this;
    this.animals().forEach(function (b) {
      if (!b.mz.ice) return;
      var d = Math.hypot(b.position.x - x, b.position.y - y);
      if (d < reach + D.RADII[b.mz.level]) {
        b.mz.ice = false;
        b.mz.pop = self.t;
        self.stats.thawed++;
        self.emit({ type: 'thaw', x: b.position.x, y: b.position.y, level: b.mz.level });
      }
    });
  };

  Session.prototype.rainbowHit = function (item, other) {
    var level = other.mz.level, gold = other.mz.gold;
    var x = other.position.x, y = other.position.y;
    this.remove(item);
    this.remove(other);
    var mult = this.comboStep();
    this.stats.merges++;
    if (level >= D.MAX_LEVEL) {
      var points = 1000 * mult;
      this.addScore(points);
      this.stats.double10++;
      this.emit({ type: 'bonus', x: x, y: y, points: points, combo: mult, gold: gold });
      this.afterMerge(x, y, D.MAX_LEVEL);
      return;
    }
    this.spawnMerged(level + 1, x, y, 0, 0, gold, mult);
  };

  Session.prototype.explode = function (bomb) {
    var x = bomb.position.x, y = bomb.position.y, radius = 120;
    this.remove(bomb);
    var removed = 0, self = this;
    this.animals().forEach(function (b) {
      var dx = b.position.x - x, dy = b.position.y - y, d = Math.hypot(dx, dy);
      if (d > radius + b.circleRadius) return;
      if (b.mz.kind === 'animal' && b.mz.level <= 4 && !b.mz.ice) {
        self.remove(b);
        removed++;
      } else {
        var k = 7 / Math.max(30, d) * 20;
        Body.setVelocity(b, { x: b.velocity.x + dx / Math.max(1, d) * k, y: b.velocity.y + dy / Math.max(1, d) * k - 2 });
      }
    });
    this.emit({ type: 'bomb', x: x, y: y, removed: removed });
  };

  /* ---------- 時間推進 ---------- */
  Session.prototype.update = function (dt) {
    this.acc = (this.acc || 0) + Math.min(0.1, dt);
    var steps = 0;
    while (this.acc >= DT && steps < 6) { this.step(); this.acc -= DT; steps++; }
  };

  Session.prototype.step = function () {
    if (this.state !== 'playing') return;
    this.t += DT;
    if (this.cooldown > 0) this.cooldown -= DT;
    if (this.pokeCd > 0) this.pokeCd -= DT;
    // 旋轉箱子
    if (this.canRotate) {
      var target = this.angle + this.rotateInput * 1.1 * DT;
      if (!this.rotateInput) target = this.angle - Math.sign(this.angle) * Math.min(Math.abs(this.angle), 0.7 * DT);
      this.angle = Math.max(-this.rotateMax, Math.min(this.rotateMax, target));
    }
    // 機關
    for (var i = 0; i < this.statics.length; i++) {
      var rec = this.statics[i];
      if (!rec.mech) continue;
      if (rec.mech.type === 'platform') rec.lx = rec.mech.baseX + Math.sin(this.t * 2 * Math.PI / rec.mech.period) * rec.mech.amp;
      else if (rec.mech.type === 'paddle') rec.la += rec.mech.speed * DT;
    }
    this.syncStatics(true);
    // 海洋水流：小動物被輕推
    if (this.world.current) {
      var cur = Math.sin(this.t * 0.9) * this.world.current;
      this.animals().forEach(function (b) {
        if (b.mz.kind === 'animal' && b.mz.level <= 3 && !b.mz.ice) Body.applyForce(b, b.position, { x: cur * b.mass * 10, y: 0 });
      });
    }
    this.contacts = {};
    Engine.update(this.engine, STEP);
    this.resolvePending();
    this.cleanupOutside();
    this.checkDanger();
    this.checkMission();
  };

  Session.prototype.cleanupOutside = function () {
    var self = this;
    this.animals().forEach(function (b) {
      if (b.position.y > self.H + 400 || Math.abs(b.position.x) > self.W + 400) self.remove(b);
      // 道具碰不到東西太久就自動處理
      if (b.mz.kind === 'bomb' && self.t - b.mz.born > 2.2) self.explode(b);
      if (b.mz.kind === 'rainbow' && self.t - b.mz.born > 6) self.remove(b);
    });
  };

  /**
   * 紅線判定（箱子座標）：
   * - 只算「已經落進箱子、而且幾乎靜止」的動物；還在飛、在彈、剛被戳或被炸飛的不算
   * - 頂端要超過紅線 LINE_TOL 以上才算，擦邊不算
   * - 超線計時累積到 2 秒才輸；離開紅線時計時以 2 倍速退回，避免一彈就歸零或一碰就重來
   */
  var LINE_TOL = 6, SETTLE_SPEED = 1.1, SETTLE_SPIN = 0.12, DANGER_SHOW = 0.3;
  Session.prototype.lineTop = function (b) {
    var lp = this.worldToLocal(b.position.x, b.position.y);
    return lp.y - b.circleRadius;
  };
  Session.prototype.overLine = function (b) {
    if (b.mz.kind !== 'animal') return false;
    if (this.t - b.mz.born < this.grace) return false;
    var top = this.lineTop(b);
    // 曾經整隻掉到紅線下方，才算「落進箱子」
    if (!b.mz.landed && top > this.lineY) b.mz.landed = true;
    if (!b.mz.landed && !b.mz.stuck) {
      // 一直卡在紅線上沒掉下去：靜止夠久也算
      if (Math.hypot(b.velocity.x, b.velocity.y) < SETTLE_SPEED) b.mz.stuckT = (b.mz.stuckT || 0) + DT; else b.mz.stuckT = 0;
      if (b.mz.stuckT > 0.6) b.mz.stuck = true; else return false;
    }
    if (top >= this.lineY - LINE_TOL) return false;
    var speed = Math.hypot(b.velocity.x, b.velocity.y);
    return speed < SETTLE_SPEED && Math.abs(b.angularVelocity) < SETTLE_SPIN * 4;
  };
  Session.prototype.nearLine = function (b) {
    return this.lineTop(b) < this.lineY + 50;
  };

  Session.prototype.checkDanger = function () {
    var self = this;
    var over = this.animals().filter(function (b) { return self.overLine(b); });
    this.dangerIds = over.map(function (b) { return b.id; });
    var was = this.dangerOn;
    if (over.length) this.danger += DT; else this.danger = Math.max(0, this.danger - DT * 2);
    // 有遲滯：累積 0.3 秒才亮警告，完全退回 0 才熄
    if (!was && this.danger >= DANGER_SHOW) { this.dangerOn = true; this.emit({ type: 'danger', on: true }); }
    if (was && this.danger === 0) { this.dangerOn = false; this.emit({ type: 'danger', on: false }); }
    if (this.danger >= DANGER_LIMIT) {
      if (!this.canLose) {
        // 幼幼班：上層動物變泡泡飛走，遊戲繼續
        this.animals().forEach(function (b) {
          if (b.mz.kind !== 'animal') return;
          if (self.lineTop(b) < self.lineY + 110) {
            self.emit({ type: 'bubble', x: b.position.x, y: b.position.y, level: b.mz.level });
            self.remove(b);
          }
        });
        this.danger = 0; this.dangerIds = [];
        this.dangerOn = false;
        this.emit({ type: 'danger', on: false });
      } else {
        this.finish('lose', 'line');
      }
    }
  };
  /** 0~1：紅線倒數進度（給畫面用） */
  Session.prototype.dangerRatio = function () { return Math.min(1, this.danger / DANGER_LIMIT); };

  /* ---------- 任務 ---------- */
  Session.prototype.goalProgress = function () {
    var g = this.level && this.level.goal;
    if (!g) return null;
    if (g.type === 'score') return { cur: this.score, need: g.target };
    if (g.type === 'make') {
      var c = 0;
      for (var l = g.level; l <= 10; l++) c += (this.stats.made[l] || 0) * (l === g.level ? 1 : Math.pow(2, l - g.level));
      return { cur: Math.min(c, g.count), need: g.count };
    }
    if (g.type === 'ice') {
      var left = this.animals().filter(function (b) { return b.mz.ice; }).length;
      return { cur: this.iceTotal() - left, need: this.iceTotal() };
    }
    return null;
  };
  Session.prototype.iceTotal = function () { return (this.level && this.level.ice) ? this.level.ice.length : 0; };
  Session.prototype.timeLeft = function () {
    if (!this.level || !this.level.time) return null;
    return Math.max(0, this.level.time - this.t);
  };
  Session.prototype.dropsLeft = function () {
    if (!this.level || !this.level.drops) return null;
    return Math.max(0, this.level.drops - this.stats.drops);
  };
  Session.prototype.checkMission = function () {
    if (this.state !== 'playing' || !this.level) return;
    var p = this.goalProgress();
    if (p && p.cur >= p.need) { this.finish('win', 'goal'); return; }
    var tl = this.timeLeft();
    if (tl !== null && tl <= 0) { this.finish('lose', 'time'); return; }
    if (this.dropsLeft() === 0 && !this.armed && this.items.indexOf('rainbow') < 0 && this.items.indexOf('bomb') < 0 &&
        this.t - this.lastDropT > 3) this.finish('lose', 'drops');
  };

  Session.prototype.stars = function () {
    if (!this.level || this.result !== 'win') return 0;
    var s = this.level.stars || [0, 0];
    return 1 + (this.score >= s[0] ? 1 : 0) + (this.score >= s[1] ? 1 : 0);
  };

  Session.prototype.finish = function (result, reason) {
    if (this.state === 'over') return;
    this.state = 'over';
    this.result = result;
    this.emit({ type: 'over', result: result, reason: reason, score: this.score });
  };
  /** 幼幼班與無法輸的模式：主動收局 */
  Session.prototype.endNow = function () { this.finish(this.mode === 'level' ? 'lose' : 'end', 'manual'); };

  /* ---------- 存檔 ---------- */
  Session.prototype.serialize = function () {
    return {
      v: 1, world: this.world.id, difficulty: this.diff.id, mode: this.mode, rule: this.rule,
      t: this.t, score: this.score, energy: this.energy, items: this.items.slice(), queue: this.queue.slice(),
      rng: this.rng.state, stats: JSON.parse(JSON.stringify(this.stats)), chain: this.chain,
      bodies: this.animals().filter(function (b) { return b.mz.kind === 'animal'; }).map(function (b) {
        return [b.mz.level, +b.position.x.toFixed(2), +b.position.y.toFixed(2), +b.angle.toFixed(3), b.mz.gold ? 1 : 0];
      })
    };
  };
  Session.restore = function (data, extra) {
    var s = new Session(Object.assign({ world: data.world, difficulty: data.difficulty, mode: data.mode, rule: data.rule, seed: 1 }, extra || {}));
    s.rng.state = data.rng;
    s.t = data.t; s.score = data.score; s.energy = data.energy; s.items = data.items; s.queue = data.queue;
    s.stats = data.stats; s.chain = 0;
    data.bodies.forEach(function (row) {
      var b = s.makeBody('animal', row[0], row[1], row[2], { gold: !!row[4] });
      Body.setAngle(b, row[3]);
      b.mz.born = -10;
    });
    return s;
  };

  var api = { Session: Session, scoreFor: scoreFor, POKE_COST: POKE_COST, POKE_PER_LEVEL: POKE_PER_LEVEL, STEP: STEP, DT: DT, COOLDOWN: COOLDOWN, DANGER_LIMIT: DANGER_LIMIT };
  root.MZEngine = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
