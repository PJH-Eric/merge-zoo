/* ===== play.js — 遊戲畫面：輸入、HUD、倒數、暫停、教學、結算 ===== */
(function (root) {
  'use strict';
  var K = root.Kit, h = K.h, D = root.MZData, E = root.MZEngine, P = root.Profile, Art = root.MZArt;
  var t = function (k, p) { return root.I18N.t(k, p); };
  var A = function () { return root.GameAnalytics; };
  var SFX = function (n, o) { if (root.GameAudio) root.GameAudio.sfx(n, o); };

  var game = null;   // 目前的對局控制器

  function charName(world, level) { return t('char.' + world + '.' + level); }

  /**
   * 建立對局。cfg: { mode, world, difficulty, level(def), daily({date,seed,rule}), restore(save) }
   */
  function Game(host, cfg, app) {
    this.host = host; this.cfg = cfg; this.app = app;
    this.paused = false; this.locked = true; this.countdownTimer = null;
    this.raf = 0; this.lastT = 0; this.hudT = 0; this.saveT = 0;
    this.keys = { left: false, right: false };
    this.roundKey = 0;
    this.build();
    this.newSession();
  }

  Game.prototype.newSession = function () {
    var cfg = this.cfg, s;
    if (cfg.restore) {
      s = E.Session.restore(cfg.restore);
      cfg.restore = null;
    } else {
      s = new E.Session({
        mode: cfg.mode, world: cfg.world, difficulty: cfg.difficulty, level: cfg.level,
        rule: cfg.daily ? cfg.daily.rule : 'none',
        seed: cfg.daily ? cfg.daily.seed : (cfg.level ? cfg.level.seed : (Date.now() ^ (Math.random() * 1e9)) >>> 0)
      });
    }
    this.session = s;
    this.session.newCodex = [];
    this.roundKey++;
    var self = this;
    s.on(function (ev) { self.onEvent(ev); });
    this.renderer.opts = this.renderOpts();
    this.renderer.attach(s);
    s.setAim(0);
    this.applyLayout();
    this.updateHud(true);
    if (root.GameAudio) root.GameAudio.playBgm(s.world.id);
    this.overlay.innerHTML = '';
    if (s.mode === 'tutorial') this.tutorialStep(0);
  };

  Game.prototype.renderOpts = function () {
    var st = P.settings();
    return { guide: st.guide, reduceMotion: st.motion, numbers: st.numbers };
  };
  Game.prototype.refreshSettings = function () {
    this.renderer.opts = this.renderOpts();
    this.root.classList.toggle('reduce-motion', !!P.settings().motion);
  };

  /* ---------- 版面 ---------- */
  Game.prototype.build = function () {
    var self = this;
    this.canvas = h('canvas', { class: 'stage-canvas', 'aria-hidden': 'true' });
    this.overlay = h('div', { class: 'stage-overlay' });
    this.countEl = h('div', { class: 'countdown', role: 'status', 'aria-live': 'assertive', hidden: true });
    this.dangerEl = h('div', { class: 'danger-tag', role: 'alert', hidden: true, 'data-i18n': 'hud.danger', text: t('hud.danger') });
    this.rotL = K.button({ icon: 'rotL', aria: t('hud.rotL'), title: t('hud.rotL'), variant: 'round', class: 'rot-btn rot-l' });
    this.rotR = K.button({ icon: 'rotR', aria: t('hud.rotR'), title: t('hud.rotR'), variant: 'round', class: 'rot-btn rot-r' });
    this.rotL.setAttribute('data-i18n-attr', 'aria-label=hud.rotL;title=hud.rotL');
    this.rotR.setAttribute('data-i18n-attr', 'aria-label=hud.rotR;title=hud.rotR');
    this.armTag = h('div', { class: 'arm-tag', hidden: true });
    this.stage = h('div', { class: 'stage', tabindex: '0', role: 'application', 'aria-label': t('hud.stage'), 'data-i18n-attr': 'aria-label=hud.stage' },
      this.canvas, this.dangerEl, this.armTag, this.rotL, this.rotR, this.overlay, this.countEl);

    // HUD
    this.hud = {};
    var hd = this.hud;
    hd.score = h('b', { class: 'hud-num' });
    hd.best = h('span', { class: 'hud-sub' });
    hd.next = h('div', { class: 'next-pic' });
    hd.swap = h('button', { type: 'button', class: 'swap-btn', 'aria-keyshortcuts': 'S', 'data-i18n-attr': 'aria-label=hud.swapAria;title=hud.swapAria',
      'aria-label': t('hud.swapAria'), title: t('hud.swapAria'), onclick: function () { self.doSwap(); } },
      K.icon('refresh'), h('span', { class: 'swap-txt', 'data-i18n': 'hud.swap', text: t('hud.swap') }), h('kbd', { class: 'keycap', text: 'S' }));
    hd.pokeHint = h('div', { class: 'poke-hint' });
    hd.goal = h('div', { class: 'hud-goal' });
    hd.limit = h('div', { class: 'hud-limit' });
    hd.energyFill = h('span', { class: 'energy-fill' });
    hd.energy = h('div', { class: 'hud-energy', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100' }, h('span', { class: 'energy-track' }, hd.energyFill));
    hd.items = h('div', { class: 'items' });
    hd.endBtn = K.button({ label: t('hud.end'), variant: 'ghost', class: 'end-btn', onClick: function () { self.session.endNow(); } });
    hd.endBtn.querySelector('.btn-label').setAttribute('data-i18n', 'hud.end');
    hd.title = h('div', { class: 'hud-title' });
    // 時間：經典／每日顯示已玩時間，限時關卡顯示剩餘時間
    hd.timeLabel = h('span', { class: 'hud-label' });
    hd.time = h('b', { class: 'hud-time' });
    // 本局統計
    hd.stat = {};
    var statBox = h('dl', { class: 'hud-stats' });
    ['drops', 'merges', 'combo', 'maxCombo'].forEach(function (k) {
      hd.stat[k] = h('dd');
      statBox.appendChild(h('div', { class: 'hud-stat hs-' + k }, h('dt', { 'data-i18n': 'hud.stat.' + k, text: t('hud.stat.' + k) }), hd.stat[k]));
    });
    // 升級順序：10 級動物，已合出的亮起，最大的一隻加框
    hd.chain = h('div', { class: 'hud-chain', role: 'list' });
    hd.chainHint = h('div', { class: 'chain-hint', 'aria-live': 'polite' });
    var inner = h('div', { class: 'hud-inner' },
      hd.title,
      h('div', { class: 'hud-card hud-scorecard' }, h('span', { class: 'hud-label', 'data-i18n': 'hud.score', text: t('hud.score') }), hd.score, hd.best),
      h('div', { class: 'hud-card hud-timecard' }, hd.timeLabel, hd.time),
      h('div', { class: 'hud-card hud-goalcard' }, h('span', { class: 'hud-label', 'data-i18n': 'hud.goal', text: t('hud.goal') }), hd.goal, hd.limit),
      h('div', { class: 'hud-card hud-nextcard' }, h('span', { class: 'hud-label', 'data-i18n': 'hud.next', text: t('hud.next') }), hd.next, hd.swap),
      h('div', { class: 'hud-card hud-itemcard' }, h('span', { class: 'hud-label', 'data-i18n': 'hud.items', text: t('hud.items') }), hd.energy, hd.items, hd.pokeHint),
      h('div', { class: 'hud-card hud-statcard' }, statBox),
      h('div', { class: 'hud-card hud-chaincard' }, h('span', { class: 'hud-label', 'data-i18n': 'hud.chain', text: t('hud.chain') }), hd.chain, hd.chainHint),
      hd.endBtn);
    // 資訊欄內容超出時用自繪捲軸
    this.side = h('aside', { class: 'hud' }, K.scrollArea(inner, 'hud-scroll'));
    this.root = h('div', { class: 'play' }, this.side, this.stage);
    this.host.appendChild(this.root);
    this.renderer = new root.MZRender.Renderer(this.canvas);
    this.bindInput();
    this.ro = root.ResizeObserver ? new root.ResizeObserver(function () { self.renderer.resize(); }) : null;
    if (this.ro) this.ro.observe(this.stage);
    this.onResize = function () { self.renderer.resize(); };
    root.addEventListener('resize', this.onResize);
    this.onVis = function () { if (root.document.hidden) { self.pause(true); self.autosave(); } };
    root.document.addEventListener('visibilitychange', this.onVis);
    this.onHide = function () { self.autosave(); };
    root.addEventListener('pagehide', this.onHide);
    this.refreshSettings();
    this.loop = this.loop.bind(this);
    this.raf = root.requestAnimationFrame(this.loop);
  };

  Game.prototype.applyLayout = function () {
    var s = this.session;
    var isLevel = s.mode === 'level';
    this.root.dataset.mode = s.mode;
    this.root.dataset.world = s.world.id;
    this.side.querySelector('.hud-goalcard').hidden = !isLevel;
    this.hud.best.hidden = isLevel;
    this.hud.energy.hidden = !s.useEnergy;
    this.hud.endBtn.hidden = !(s.mode === 'tutorial' || (!s.canLose && s.mode !== 'level'));
    this.rotL.hidden = this.rotR.hidden = !s.canRotate;
    var title;
    if (isLevel) title = t('world.' + s.world.id) + '・' + t('result.level', { n: s.level.index });
    else if (s.mode === 'daily') title = t('daily.title') + '・' + t('diff.' + s.diff.id);
    else if (s.mode === 'tutorial') title = t('tut.title');
    else title = t('world.' + s.world.id) + '・' + t('diff.' + s.diff.id);
    this.hud.title.textContent = title;
    this.app.setTitle(title);
    if (isLevel) {
      var g = s.level.goal;
      var goalText = g.type === 'score' ? t('goal.score', { n: g.target.toLocaleString() })
        : g.type === 'make' ? t('goal.make', { n: g.count, name: charName(s.world.id, g.level) })
          : t('goal.ice', { n: s.iceTotal() });
      this.goalText = goalText;
    }
  };

  /* ---------- 輸入 ---------- */
  Game.prototype.bindInput = function () {
    var self = this, st = this.stage;
    function aim(e) {
      var r = self.canvas.getBoundingClientRect();
      var p = self.renderer.toWorld(e.clientX - r.left, e.clientY - r.top);
      var s = self.session;
      var lp = s.angle ? s.worldToLocal(p.x, p.y) : p;
      s.setAim(s.angle ? p.x : lp.x);
    }
    st.addEventListener('pointerdown', function (e) {
      if (e.target.closest('.btn') || self.locked || self.paused) return;
      if (root.GameAudio) root.GameAudio.unlock();
      // 點到箱子裡的動物＝戳一戳（不放下）
      if (self.session.mode !== 'tutorial') {
        var r0 = self.canvas.getBoundingClientRect();
        var wp = self.renderer.toWorld(e.clientX - r0.left, e.clientY - r0.top);
        var lp0 = self.session.worldToLocal(wp.x, wp.y);
        if (lp0.y > 0 && self.session.animalAt(wp.x, wp.y)) { self.doPoke(wp.x, wp.y); return; }
      }
      self.pointer = e.pointerId;
      try { st.setPointerCapture(e.pointerId); } catch (err) {}
      aim(e);
      self.renderer.aiming = true;
      if (self.session.mode === 'tutorial' && self.tutStep === 0) self.tutorialStep(1);
    });
    st.addEventListener('pointermove', function (e) {
      if (self.locked || self.paused) return;
      if (e.pointerType === 'mouse' && self.pointer == null) { aim(e); return; }
      if (self.pointer === e.pointerId) aim(e);
    });
    function up(e) {
      if (self.pointer !== e.pointerId) return;
      self.pointer = null;
      self.renderer.aiming = false;
      if (self.locked || self.paused || e.type === 'pointercancel') return;
      aim(e);
      self.tryDrop();
    }
    st.addEventListener('pointerup', up);
    st.addEventListener('pointercancel', up);

    function rot(btn, dir) {
      btn.addEventListener('pointerdown', function (e) { e.stopPropagation(); if (!self.locked && !self.paused) self.session.setRotate(dir); btn.classList.add('on'); });
      ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (n) {
        btn.addEventListener(n, function () { if (self.session.rotateInput === dir) self.session.setRotate(0); btn.classList.remove('on'); });
      });
    }
    rot(this.rotL, -1); rot(this.rotR, 1);

    this.onKey = function (e) {
      if (K.modalOpen() || self.app.screen !== 'play') return;
      var k = e.key, down = e.type === 'keydown';
      if (k === 'Escape' && down) { e.preventDefault(); self.pause(true); return; }
      if (self.locked || self.paused) return;
      if (k === 'ArrowLeft' || k === 'a' || k === 'A') { self.keys.left = down; e.preventDefault(); }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { self.keys.right = down; e.preventDefault(); }
      else if ((k === ' ' || k === 'Enter' || k === 'ArrowDown') && down) { if (!e.repeat) self.tryDrop(); e.preventDefault(); }
      else if ((k === 'q' || k === 'Q') && self.session.canRotate) self.session.setRotate(down ? -1 : 0);
      else if ((k === 'e' || k === 'E') && self.session.canRotate) self.session.setRotate(down ? 1 : 0);
      else if (down && (k === '1' || k === '2' || k === '3')) self.useItem(+k - 1);
      else if (down && !e.repeat && (k === 's' || k === 'S' || k === 'ArrowUp')) { e.preventDefault(); self.doSwap(); }
    };
    root.addEventListener('keydown', this.onKey);
    root.addEventListener('keyup', this.onKey);
  };

  Game.prototype.tryDrop = function () {
    var s = this.session;
    if (s.mode === 'tutorial' && this.tutStep === 0) this.tutorialStep(1);
    if (s.drop()) {
      if (s.mode === 'tutorial' && this.tutStep <= 1) this.tutorialStep(2);
    }
  };

  Game.prototype.doSwap = function () {
    if (this.locked || this.paused) return;
    if (this.session.swap()) { SFX('swap'); this.updateHud(true); } else SFX('deny');
  };
  Game.prototype.doPoke = function (x, y) {
    var res = this.session.poke(x, y);
    if (res === 'ok') { SFX('poke'); this.updateHud(true); }
    else if (res === 'energy') { SFX('deny'); K.toast(t('toast.noEnergy', { n: E.POKE_COST })); }
    else if (res === 'none') { SFX('deny'); K.toast(t('toast.noPoke')); }
  };

  Game.prototype.useItem = function (i) {
    if (this.locked || this.paused) return;
    if (this.session.armItem(i)) this.updateHud(true);
  };

  /* ---------- 迴圈 ---------- */
  Game.prototype.loop = function (now) {
    var dt = this.lastT ? Math.min(0.1, (now - this.lastT) / 1000) : 0;
    this.lastT = now;
    var s = this.session;
    if (!this.paused && !this.locked && s.state === 'playing') {
      if (this.keys.left || this.keys.right) s.setAim(s.aimX + ((this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0)) * 420 * dt);
      s.update(dt);
      this.hudT += dt; this.saveT += dt;
      if (this.hudT > 0.1) { this.updateHud(); this.hudT = 0; }
      if (this.saveT > 5) { this.autosave(); this.saveT = 0; }
    }
    this.renderer.draw(this.paused ? 0 : dt);
    this.raf = root.requestAnimationFrame(this.loop);
  };

  /* ---------- HUD ---------- */
  Game.prototype.updateHud = function (force) {
    var s = this.session, hd = this.hud;
    hd.score.textContent = s.score.toLocaleString();
    if (s.mode === 'classic' || s.mode === 'daily') {
      var best = s.mode === 'daily' ? P.dailyBest(this.cfg.daily.date, s.diff.id) : P.best('classic', s.world.id, s.diff.id);
      hd.best.textContent = t('hud.best') + ' ' + Math.max(best, s.score).toLocaleString();
    } else hd.best.textContent = '';
    if (s.mode === 'level') {
      var p = s.goalProgress();
      hd.goal.textContent = this.goalText + (p ? '  ' + Math.min(p.cur, p.need).toLocaleString() + ' / ' + p.need.toLocaleString() : '');
      var lim = [];
      var tl = s.timeLeft(), dl = s.dropsLeft();
      if (dl != null) lim.push(t('hud.drops') + ' ' + dl);
      hd.limit.textContent = lim.join('・');
    }
    // 時間
    var tl2 = s.timeLeft();
    var secs = tl2 != null ? Math.ceil(tl2) : Math.floor(s.t);
    hd.timeLabel.textContent = t(tl2 != null ? 'hud.timeLeft' : 'hud.time');
    hd.time.textContent = Math.floor(secs / 60) + ':' + ('0' + (secs % 60)).slice(-2);
    hd.time.classList.toggle('warn', tl2 != null && tl2 <= 10);
    // 統計
    var comboNow = s.t - s.lastMergeT <= 1 ? Math.min(5, s.chain) : 0;
    hd.stat.drops.textContent = s.stats.drops;
    hd.stat.merges.textContent = s.stats.merges;
    hd.stat.combo.textContent = comboNow > 1 ? '×' + comboNow : '—';
    hd.stat.combo.parentNode.classList.toggle('hot', comboNow > 1);
    hd.stat.maxCombo.textContent = '×' + Math.min(5, s.stats.maxCombo || 0);
    // 升級順序
    var reached = s.stats.maxLevel || 0;
    s.animals().forEach(function (b) { if (b.mz.kind === 'animal' && b.mz.level > reached) reached = b.mz.level; });
    var heldNow = s.held();
    var hl = heldNow.item ? 0 : heldNow.level;
    var ckey = s.world.id + reached + '|' + hl;
    if (force || hd.chainKey !== ckey) {
      hd.chainKey = ckey;
      hd.chain.innerHTML = '';
      // 手上的動物與「兩隻一樣會合成的下一級」一起標出來
      hd.chainHint.innerHTML = '';
      if (hl) {
        hd.chainHint.appendChild(document.createTextNode(t('hud.mergeHint', { a: charName(s.world.id, hl) })));
        hd.chainHint.appendChild(h('b', { text: hl < 10 ? charName(s.world.id, hl + 1) : t('hud.mergeTop') }));
      }
      for (var lv = 1; lv <= 10; lv++) {
        hd.chain.appendChild(h('span', { class: 'chain-cell' + (lv <= reached ? ' got' : '') + (lv === reached ? ' top' : '') + (lv === hl ? ' held' : '') + (hl && lv === hl + 1 ? ' result' : ''), role: 'listitem',
          title: 'Lv.' + lv + ' ' + charName(s.world.id, lv), 'aria-label': 'Lv.' + lv + ' ' + charName(s.world.id, lv) + (lv <= reached ? ' ✓' : '') },
          h('img', { src: Art.image(s.world.id, lv, 'normal').src, alt: '' })));
      }
    }
    var pk = s.pokesLeft != null ? t('hud.pokeLeft', { n: s.pokesLeft }) : t('hud.pokeHint');
    var cost = s.pokesLeft != null ? '' : t('hud.pokeCost', { n: E.POKE_COST });
    if (hd.pokeText !== pk + cost) {
      hd.pokeText = pk + cost;
      hd.pokeHint.textContent = '';
      hd.pokeHint.appendChild(h('span', { text: pk }));
      // 能量消耗做成一顆不會被拆行的小標籤
      if (cost) hd.pokeHint.appendChild(h('span', { class: 'poke-cost', text: '⚡ ' + cost }));
    }
    hd.swap.disabled = !!s.armed || s.state !== 'playing';
    var nx = s.queue[s.armed ? 0 : 1];
    var key = s.world.id + nx.level + (nx.gold ? 'g' : '');
    if (force || hd.nextKey !== key) {
      hd.nextKey = key;
      hd.next.innerHTML = '';
      var img = h('img', { src: Art.image(s.world.id, nx.level, 'normal').src, alt: charName(s.world.id, nx.level), class: nx.gold ? 'gold' : '' });
      hd.next.appendChild(img);
    }
    if (s.useEnergy) {
      var pct = Math.min(100, Math.round(s.energy));
      hd.energyFill.style.width = pct + '%';
      hd.energy.setAttribute('aria-valuenow', String(pct));
      hd.energy.setAttribute('aria-label', t('hud.energy') + ' ' + pct + '%');
    }
    var ikey = s.items.join(',') + '|' + s.armed;
    if (force || hd.itemsKey !== ikey) {
      hd.itemsKey = ikey;
      hd.items.innerHTML = '';
      var self = this;
      for (var i = 0; i < 3; i++) {
        (function (i) {
          var it = s.items[i];
          var b = h('button', { type: 'button', class: 'item-slot' + (it ? '' : ' empty'), disabled: !it || null,
            'aria-label': it ? t('item.' + it) + '：' + t('item.' + it + '.desc') + '（' + (i + 1) + '）' : t('hud.emptySlot'),
            title: it ? t('item.' + it) + '：' + t('item.' + it + '.desc') : null,
            onclick: function () { self.useItem(i); } });
          if (it) b.appendChild(h('img', { src: Art.itemImage(it).src, alt: '' }));
          hd.items.appendChild(b);
        })(i);
      }
      this.armTag.hidden = !s.armed;
      if (s.armed) {
        this.armTag.innerHTML = '';
        this.armTag.appendChild(h('span', { text: t('hud.armed', { item: t('item.' + s.armed) }) }));
        this.armTag.appendChild(K.button({ label: t('hud.cancel'), variant: 'mini', onClick: function () { s.cancelArm(); self.updateHud(true); } }));
      }
      this.side.querySelector('.hud-itemcard').hidden = s.mode === 'tutorial';
    }
  };

  /* ---------- 事件 ---------- */
  Game.prototype.onEvent = function (ev) {
    var s = this.session, st = P.settings();
    this.renderer.fx(ev);
    P.liveCheck(ev, s);
    switch (ev.type) {
      case 'drop': SFX('drop'); P.markDropped(s, ev.level); break;
      case 'merge':
        SFX('pop', { level: ev.level, world: s.world.id, combo: ev.combo });
        if (st.vibrate && ev.level >= 7 && root.navigator.vibrate) root.navigator.vibrate(30);
        if (s.mode === 'tutorial' && this.tutStep === 2) this.tutorialStep(3);
        break;
      case 'bonus': SFX('bonus'); if (st.vibrate && root.navigator.vibrate) root.navigator.vibrate([40, 40, 80]); break;
      case 'bomb': SFX('bomb'); if (st.vibrate && root.navigator.vibrate) root.navigator.vibrate(60); break;
      case 'item': if (ev.item === 'shake') SFX('shake'); this.updateHud(true); break;
      case 'gain': SFX('gain'); K.toast(t('toast.gain', { item: t('item.' + ev.item) })); this.updateHud(true); break;
      case 'thaw': SFX('thaw'); break;
      case 'bubble': SFX('bubble'); break;
      case 'impact': if (ev.speed > 4) SFX('impact', ev); break;
      case 'danger':
        this.dangerEl.hidden = !ev.on;
        if (ev.on) SFX('danger');
        break;
      case 'over': this.onOver(ev); break;
    }
  };

  /* ---------- 倒數（3、2、1、開始！） ---------- */
  Game.prototype.countdown = function () {
    var self = this, el = this.countEl, n = 3;
    this.locked = true;
    // 自動化巡檢可用 ?skipcountdown 略過倒數（至少保留一條完整流程實際跑倒數）
    if (/[?&]skipcountdown\b/.test(root.location.search)) n = 0;
    clearTimeout(this.countdownTimer);
    el.hidden = false;
    el.classList.remove('go');
    function show() {
      if (self.paused) return;
      if (n > 0) {
        el.innerHTML = '';
        el.appendChild(h('span', { class: 'count-num', text: String(n) }));
        el.setAttribute('aria-label', t('countdown.aria', { n: n }));
        el.classList.remove('bump'); void el.offsetWidth; el.classList.add('bump');
        SFX('tick');
        n--;
        self.countdownTimer = setTimeout(show, 1000);
      } else {
        el.innerHTML = '';
        el.appendChild(h('span', { class: 'count-num go', text: t('countdown.go') }));
        el.setAttribute('aria-label', t('countdown.go'));
        el.classList.add('go');
        SFX('go');
        self.locked = false;
        var s = self.session;
        if (s.state === 'ready') {
          s.start();
          if (A()) A().start({ mode: 'solo', difficulty: s.mode === 'level' ? 'level' : s.diff.id, variant: s.mode + '_' + s.world.id }, s.mode + self.roundKey);
        }
        self.countdownTimer = setTimeout(function () { el.hidden = true; }, 650);
      }
    }
    show();
  };

  /* ---------- 暫停 ---------- */
  Game.prototype.pause = function (byUser) {
    if (this.paused || this.session.state === 'over' || this.app.screen !== 'play') return;
    if (K.modalOpen() && !byUser) return;
    this.paused = true;
    clearTimeout(this.countdownTimer);
    this.countEl.hidden = true;
    this.session.setRotate(0);
    this.keys.left = this.keys.right = false;
    if (root.GameAudio) root.GameAudio.stopBgm();
    var self = this;
    var resume = K.button({ icon: 'play', label: t('pause.resume'), variant: 'primary', onClick: function () { m.close(); } });
    var restart = K.button({ icon: 'refresh', label: t('pause.restart'), onClick: function () { self.resumeAfter = 'restart'; m.close(); } });
    var home = K.button({ icon: 'home', label: t('pause.home'), onClick: function () { self.resumeAfter = 'home'; m.close(); } });
    this.resumeAfter = null;
    var m = K.modal({ title: t('pause.title'), class: 'pause-modal', content: h('div', { class: 'pause-actions' }, resume, restart, home),
      onClose: function () {
        var what = self.resumeAfter;
        self.paused = false;
        if (what === 'restart') self.restart();
        else if (what === 'home') { self.autosave(); self.app.go('home'); }
        else self.resume();
      } });
  };
  Game.prototype.resume = function () {
    if (root.GameAudio) root.GameAudio.playBgm(this.session.world.id);
    this.lastT = 0;
    if (this.session.mode === 'tutorial' && this.session.state === 'ready') { this.locked = false; this.session.start(); return; }
    this.countdown();
  };
  Game.prototype.restart = function () {
    if (this.session.mode === 'classic') P.setSave(null);
    if (A()) A().reset();
    this.closeResult();
    this.newSession();
    this.begin();
  };
  Game.prototype.begin = function () {
    var s = this.session, self = this;
    this.locked = true;
    if (s.mode === 'tutorial') { this.locked = false; s.start(); return; }
    if (s.mode === 'level' && s.level.intro) {
      var ok = K.button({ label: t('intro.ok'), variant: 'primary', onClick: function () { m.close(); } });
      var m = K.modal({ title: t('intro.title'), class: 'intro-modal', noClose: true, onEscape: function () { m.close(); },
        content: h('div', { class: 'intro-body' }, h('p', { text: t('intro.' + s.level.intro) })), actions: [ok],
        onClose: function () { self.countdown(); } });
      return;
    }
    this.countdown();
  };

  /* ---------- 存檔 ---------- */
  Game.prototype.autosave = function () {
    var s = this.session;
    if (!s || s.mode !== 'classic') return;
    if (s.state === 'over') { P.setSave(null); return; }
    if (s.stats.drops === 0) return;
    P.setSave(s.serialize());
  };

  /* ---------- 教學 ---------- */
  Game.prototype.tutorialStep = function (n) {
    var self = this;
    this.tutStep = n;
    this.overlay.innerHTML = '';
    var keys = ['tut.s1', 'tut.s2', 'tut.s3', 'tut.s4'];
    var card = h('div', { class: 'tut-card', role: 'status', 'aria-live': 'polite' },
      h('span', { class: 'tut-step', text: (n + 1) + ' / 4' }), h('p', { text: t(keys[n]) }));
    if (n === 0) this.overlay.appendChild(h('div', { class: 'tut-finger', 'aria-hidden': 'true' }));
    var row = h('div', { class: 'tut-actions' });
    if (n < 3) row.appendChild(K.button({ label: t('tut.skip'), variant: 'mini', onClick: function () { self.finishTutorial(); } }));
    else row.appendChild(K.button({ label: t('tut.done'), variant: 'primary', onClick: function () { self.finishTutorial(); } }));
    card.appendChild(row);
    this.overlay.appendChild(card);
  };
  Game.prototype.finishTutorial = function () {
    P.setTutorialDone();
    P.unlock('tutorial');
    this.app.go('setup', { mode: 'classic' }, true);
  };

  /* ---------- 結算 ---------- */
  Game.prototype.onOver = function (ev) {
    var self = this, s = this.session;
    this.locked = true;
    this.dangerEl.hidden = true;
    if (s.mode === 'tutorial') return;
    var res = P.finishRound(s, { date: this.cfg.daily && this.cfg.daily.date });
    if (s.mode === 'classic') P.setSave(null);
    if (A()) A().end({ result: ev.result === 'win' ? 'win' : (ev.result === 'lose' && s.mode === 'level' ? 'lose' : 'complete') }, s.mode + this.roundKey);
    SFX(ev.result === 'lose' && (s.mode === 'level' || s.canLose) ? 'lose' : 'win');
    if (root.GameAudio) root.GameAudio.stopBgm();
    this.lastOver = [ev, res];
    setTimeout(function () { self.showResult(ev, res); }, 700);
  };

  /** 切換語言：不中斷對局，只更新文字 */
  Game.prototype.relabel = function () {
    this.applyLayout();
    this.updateHud(true);
    if (this.tutStep != null && this.session.mode === 'tutorial') this.tutorialStep(this.tutStep);
    if (this.resultModal && this.lastOver) { this.closeResult(); this.showResult(this.lastOver[0], this.lastOver[1]); }
  };

  Game.prototype.closeResult = function () { if (this.resultModal) { this.resultModal.close(); this.resultModal = null; } };

  Game.prototype.showResult = function (ev, res) {
    if (this.app.screen !== 'play' || this.session.state !== 'over') return;
    var s = this.session, self = this, isLevel = s.mode === 'level';
    var titleKey = isLevel ? (ev.result === 'win' ? 'result.win' : 'result.lose') : (s.canLose ? 'result.over' : 'result.end');
    var headId = 'rh' + this.roundKey;
    var card = h('section', { class: 'result-card', 'data-result-share': '', 'aria-labelledby': headId });
    var sub = isLevel ? t('world.' + s.world.id) + '・' + t('result.level', { n: s.level.index })
      : (s.mode === 'daily' ? t('result.daily', { date: this.cfg.daily.date }) + '・' + t('world.' + s.world.id) : t('world.' + s.world.id)) + '・' + t('diff.' + s.diff.id);
    card.appendChild(h('div', { class: 'result-head' }, h('h2', { id: headId, class: 'result-title', text: t(titleKey) }), h('p', { class: 'result-sub', text: sub })));
    if (isLevel) {
      var stars = h('div', { class: 'result-stars', 'aria-label': t('levels.stars', { n: res.stars }) });
      for (var i = 0; i < 3; i++) stars.appendChild(K.icon('star', i < res.stars ? 'on' : 'off'));
      card.appendChild(stars);
      if (ev.result !== 'win') card.appendChild(h('p', { class: 'result-reason', text: t('reason.' + ev.reason) }));
    }
    var big = s.stats.maxLevel || (s.animals().reduce(function (m, b) { return b.mz.kind === 'animal' ? Math.max(m, b.mz.level) : m; }, 1));
    card.appendChild(h('div', { class: 'result-main' },
      h('div', { class: 'result-score' }, h('span', { class: 'lbl', text: t('result.score') }), h('b', { text: s.score.toLocaleString() }),
        !isLevel ? h('span', { class: 'result-best' + (res.newBest ? ' new' : '') }, res.newBest ? t('result.newBest') : t('result.best') + ' ' + (res.best || 0).toLocaleString()) : null),
      h('figure', { class: 'result-big' }, h('img', { src: Art.image(s.world.id, big, 'normal').src, alt: charName(s.world.id, big) }),
        h('figcaption', null, h('span', { class: 'lbl', text: t('result.biggest') }), h('b', { text: charName(s.world.id, big) })))));
    var mm = Math.floor(s.t / 60), ss = Math.floor(s.t % 60);
    card.appendChild(h('dl', { class: 'result-stats' },
      stat('result.drops', s.stats.drops), stat('result.merges', s.stats.merges),
      stat('result.combo', '×' + Math.min(5, s.stats.maxCombo || 0)), stat('result.time', mm + ':' + (ss < 10 ? '0' : '') + ss)));
    if (s.newCodex && s.newCodex.length) {
      var row = h('div', { class: 'result-codex' }, h('span', { class: 'lbl', text: t('result.newCodex') }));
      s.newCodex.slice(0, 6).forEach(function (l) { row.appendChild(h('img', { src: Art.image(s.world.id, l, 'normal').src, alt: charName(s.world.id, l), title: charName(s.world.id, l) })); });
      card.appendChild(row);
    }
    var actions = [];
    if (isLevel) {
      var next = root.MZLevels && ev.result === 'win' ? root.MZLevels.next(s.level) : null;
      if (next && P.levelUnlocked(D.WORLDS.map(function (w) { return w.id; }).indexOf(next.world), next.index)) {
        actions.push(K.button({ icon: 'next', label: t('result.next'), variant: 'primary', onClick: function () { self.closeResult(); self.app.go('play', { mode: 'level', level: next }, true); } }));
      }
      actions.push(K.button({ icon: 'refresh', label: ev.result === 'win' ? t('result.again') : t('result.retry'), variant: actions.length ? 'soft' : 'primary', onClick: function () { self.restart(); } }));
      actions.push(K.button({ icon: 'flag', label: t('result.levels'), onClick: function () { self.closeResult(); self.app.go('levels', { world: s.world.id }, true); } }));
    } else {
      actions.push(K.button({ icon: 'refresh', label: t('result.again'), variant: 'primary', onClick: function () { self.restart(); } }));
    }
    actions.push(K.button({ icon: 'home', label: t('result.home'), onClick: function () { self.closeResult(); self.app.go('home'); } }));
    this.resultModal = K.modal({ title: t(titleKey), class: 'result-modal', scrimClass: 'result-scrim', noClose: true, content: card, actions: actions });
    function stat(k, v) { return h('div', { class: 'stat' }, h('dt', { text: t(k) }), h('dd', { text: String(v) })); }
  };

  Game.prototype.destroy = function () {
    root.cancelAnimationFrame(this.raf);
    clearTimeout(this.countdownTimer);
    root.removeEventListener('keydown', this.onKey);
    root.removeEventListener('keyup', this.onKey);
    root.removeEventListener('resize', this.onResize);
    root.removeEventListener('pagehide', this.onHide);
    root.document.removeEventListener('visibilitychange', this.onVis);
    if (this.ro) this.ro.disconnect();
    this.closeResult();
    if (root.GameAudio) root.GameAudio.stopBgm();
    if (A()) A().reset();
  };

  root.MZPlay = {
    open: function (host, cfg, app) {
      if (game) game.destroy();
      game = new Game(host, cfg, app);
      game.begin();
      return game;
    },
    close: function () { if (game) { game.autosave(); game.destroy(); game = null; } },
    current: function () { return game; }
  };
})(typeof self !== 'undefined' ? self : this);
