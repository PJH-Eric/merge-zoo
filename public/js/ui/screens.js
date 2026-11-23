/* ===== screens.js — 首頁、模式設定、闖關選關、圖鑑、成就、排行、怎麼玩 ===== */
(function (root) {
  'use strict';
  var K = root.Kit, h = K.h, D = root.MZData, P = root.Profile, Art = root.MZArt;
  var t = function (k, p) { return root.I18N.t(k, p); };
  var WORLD_IDS = D.WORLDS.map(function (w) { return w.id; });
  function charName(w, l) { return t('char.' + w + '.' + l); }
  function pic(w, l, cls, alt) { return h('img', { class: cls || '', src: Art.image(w, l, 'normal').src, alt: alt == null ? charName(w, l) : alt, draggable: 'false' }); }

  var S = {};

  /* ---------- 首頁 ---------- */
  S.home = function (host, app) {
    var hero = h('div', { class: 'hero' },
      h('div', { class: 'hero-pile', 'aria-hidden': 'true' },
        pic('zoo', 10, 'hp hp-10', ''), pic('zoo', 8, 'hp hp-8', ''), pic('zoo', 6, 'hp hp-6', ''), pic('zoo', 4, 'hp hp-4', ''),
        pic('zoo', 3, 'hp hp-3', ''), pic('zoo', 1, 'hp hp-1', ''), pic('zoo', 1, 'hp hp-1b', '')),
      h('h1', { class: 'logo' }, h('span', { class: 'logo-a', text: t('game.name') })),
      h('p', { class: 'tagline', text: t('home.tag') }));
    var save = P.save();
    var main = h('div', { class: 'home-main' });
    if (save && save.bodies && save.bodies.length) {
      main.appendChild(K.button({ icon: 'play', label: t('home.continue'), sub: t('home.continue.sub', { world: t('world.' + save.world) + '・' + t('diff.' + save.difficulty), score: save.score.toLocaleString() }),
        variant: 'big continue', onClick: function () { app.go('play', { mode: 'classic', restore: save }); } }));
    }
    main.appendChild(h('div', { class: 'home-big' },
      K.button({ label: t('home.classic'), sub: t('home.classic.sub'), variant: 'big mode-classic', onClick: function () { app.go('setup', { mode: 'classic' }); } }),
      K.button({ label: t('home.levels'), sub: t('home.levels.sub'), variant: 'big mode-levels', onClick: function () { app.go('levels'); } }),
      K.button({ label: t('home.daily'), sub: t('home.daily.sub'), variant: 'big mode-daily', onClick: function () { app.go('setup', { mode: 'daily' }); } })));
    main.appendChild(h('div', { class: 'home-small' },
      K.button({ icon: 'book', label: t('home.codex'), variant: 'chip', onClick: function () { app.go('codex'); } }),
      K.button({ icon: 'trophy', label: t('home.achv'), variant: 'chip', onClick: function () { app.go('achv'); } }),
      K.button({ icon: 'chart', label: t('home.rank'), variant: 'chip', onClick: function () { app.go('rank'); } }),
      K.button({ icon: 'help', label: t('home.howto'), variant: 'chip', onClick: function () { S.howto(); } })));
    host.appendChild(K.scrollArea(h('div', { class: 'home' }, hero, main), 'screen-scroll'));
  };

  /* ---------- 怎麼玩 ---------- */
  S.howto = function () {
    var list = h('ol', { class: 'howto' });
    for (var i = 1; i <= 7; i++) list.appendChild(h('li', { text: t('how.' + i) }));
    var items = h('div', { class: 'howto-items' }, D.ITEMS.map(function (it) {
      return h('div', { class: 'howto-item' }, h('img', { src: Art.itemImage(it).src, alt: '' }), h('b', { text: t('item.' + it) }), h('span', { text: t('item.' + it + '.desc') }));
    }));
    K.modal({ title: t('how.title'), content: h('div', null, list, items) });
  };

  /* ---------- 模式設定（經典／每日） ---------- */
  S.setup = function (host, app, params) {
    var mode = params.mode || 'classic';
    var daily = mode === 'daily' ? root.MZDaily.today() : null;
    var last = root.Store.get('lastSetup', { world: 'zoo', difficulty: 'normal' });
    var state = { world: daily ? daily.world : last.world, difficulty: last.difficulty };
    var wrap = h('div', { class: 'setup' });
    app.setTitle(t(mode === 'daily' ? 'setup.daily' : 'setup.classic'));

    var worldBox = h('div', { class: 'choice-grid worlds', role: 'radiogroup', 'aria-label': t('setup.world') });
    if (daily) {
      wrap.appendChild(h('div', { class: 'daily-card' },
        pic(daily.world, 5, 'daily-pic', ''),
        h('div', null,
          h('p', { class: 'daily-date', text: daily.date }),
          h('p', null, h('span', { class: 'lbl', text: t('setup.dailyWorld') + '：' }), h('b', { text: t('world.' + daily.world) })),
          h('p', null, h('span', { class: 'lbl', text: t('setup.dailyRule') + '：' }), h('b', { text: t('daily.rule.' + daily.rule) })),
          P.streak() ? h('p', { class: 'streak', text: t('daily.streak', { n: P.streak() }) }) : null)));
    } else {
      wrap.appendChild(h('h2', { class: 'sec-title', text: t('setup.world') }));
      WORLD_IDS.forEach(function (w) {
        var b = h('button', { type: 'button', class: 'choice world-choice w-' + w, role: 'radio', 'aria-checked': String(state.world === w),
          onclick: function () { state.world = w; sync(); if (root.GameAudio) root.GameAudio.sfx('click'); } },
          h('span', { class: 'choice-pics', 'aria-hidden': 'true' }, pic(w, 1, '', ''), pic(w, 4, '', ''), pic(w, 8, '', '')),
          h('b', { text: t('world.' + w) }), h('small', { text: t('world.' + w + '.feel') }));
        worldBox.appendChild(b);
      });
      wrap.appendChild(worldBox);
    }
    wrap.appendChild(h('h2', { class: 'sec-title', text: t('setup.diff') }));
    var diffBox = h('div', { class: 'choice-grid diffs', role: 'radiogroup', 'aria-label': t('setup.diff') });
    D.DIFFICULTIES.forEach(function (df) {
      var best = daily ? P.dailyBest(daily.date, df.id) : 0;
      diffBox.appendChild(h('button', { type: 'button', class: 'choice diff-choice d-' + df.id, role: 'radio', 'aria-checked': String(state.difficulty === df.id),
        onclick: function () { state.difficulty = df.id; sync(); if (root.GameAudio) root.GameAudio.sfx('click'); } },
        h('b', { text: t('diff.' + df.id) }), h('small', { text: t('diff.' + df.id + '.desc') }),
        daily ? h('small', { class: 'best', text: best ? t('daily.best') + ' ' + best.toLocaleString() : t('daily.noRecord') }) : null));
    });
    wrap.appendChild(diffBox);
    wrap.appendChild(h('div', { class: 'setup-go' }, K.button({ icon: 'play', label: t('setup.start'), variant: 'primary big-go', onClick: function () {
      root.Store.set('lastSetup', { world: daily ? last.world : state.world, difficulty: state.difficulty });
      app.go('play', { mode: mode, world: state.world, difficulty: state.difficulty, daily: daily });
    } })));
    function sync() {
      worldBox.querySelectorAll('.choice').forEach(function (b, i) { b.setAttribute('aria-checked', String(WORLD_IDS[i] === state.world)); });
      diffBox.querySelectorAll('.choice').forEach(function (b, i) { b.setAttribute('aria-checked', String(D.DIFFICULTIES[i].id === state.difficulty)); });
    }
    host.appendChild(K.scrollArea(wrap, 'screen-scroll'));
  };

  /* ---------- 闖關選關 ---------- */
  S.levels = function (host, app, params) {
    var L = root.MZLevels;
    app.setTitle(t('levels.title'));
    var wi = Math.max(0, WORLD_IDS.indexOf(params.world || root.Store.get('lastLevelWorld', 'zoo')));
    if (!P.worldUnlocked(wi)) wi = 0;
    var tabs = h('div', { class: 'tabs', role: 'tablist', 'aria-label': t('levels.title') });
    var gridHost = h('div', { class: 'level-host' });
    var summary = h('p', { class: 'level-summary' });
    WORLD_IDS.forEach(function (w, i) {
      var open = P.worldUnlocked(i);
      tabs.appendChild(h('button', { type: 'button', class: 'tab w-' + w + (open ? '' : ' locked'), role: 'tab', 'aria-selected': String(i === wi),
        'aria-disabled': open ? null : 'true', title: open ? null : t('levels.worldLocked'),
        onclick: function () { if (!open) { K.toast(t('levels.worldLocked')); return; } wi = i; root.Store.set('lastLevelWorld', w); render(); } },
        pic(w, 1, '', ''), h('span', { text: t('world.' + w) }), open ? null : K.icon('lock')));
    });
    function scrollSelectedTab(behavior) {
      var selected = tabs.querySelector('.tab[aria-selected="true"]');
      if (!selected || !tabs.isConnected) return;
      var tabsRect = tabs.getBoundingClientRect(), selectedRect = selected.getBoundingClientRect();
      var target = tabs.scrollLeft + selectedRect.left - tabsRect.left + (selectedRect.width - tabs.clientWidth) / 2;
      tabs.scrollTo({ left: Math.max(0, Math.min(tabs.scrollWidth - tabs.clientWidth, target)), behavior: behavior || 'auto' });
    }
    function render() {
      tabs.querySelectorAll('.tab').forEach(function (b, i) { b.setAttribute('aria-selected', String(i === wi)); });
      var w = WORLD_IDS[wi], stars = 0;
      var grid = h('div', { class: 'level-grid' });
      for (var i = 1; i <= 50; i++) {
        (function (i) {
          var def = L.get(w, i), st = P.levelStars(w + '-' + i), open = P.levelUnlocked(wi, i);
          stars += st;
          var sr = h('span', { class: 'lv-stars', 'aria-hidden': 'true' });
          for (var k = 0; k < 3; k++) sr.appendChild(K.icon('star', k < st ? 'on' : 'off'));
          grid.appendChild(h('button', { type: 'button', class: 'lv' + (open ? '' : ' locked') + (st ? ' done' : '') + (def.boss ? ' boss' : ''),
            'aria-label': t('levels.level', { n: i }) + (def.boss ? '・' + t('levels.boss') : '') + '・' + (open ? t('levels.stars', { n: st }) : t('levels.locked')),
            onclick: function () { if (!open) { K.toast(t('levels.locked')); return; } S.levelInfo(def, app); } },
            def.boss ? K.icon('crown', 'lv-crown') : null, open ? h('b', { text: String(i) }) : K.icon('lock'), open ? sr : null));
        })(i);
      }
      summary.textContent = t('world.' + w) + '・' + t('levels.stars', { n: stars + ' / 150' });
      gridHost.innerHTML = '';
      gridHost.appendChild(grid);
      scrollSelectedTab('smooth');
    }
    render();
    host.appendChild(h('div', { class: 'levels-screen' }, tabs, summary, K.scrollArea(gridHost, 'screen-scroll levels-scroll')));
    scrollSelectedTab('auto');
  };

  S.goalText = function (def) {
    var g = def.goal;
    if (g.type === 'score') return t('goal.score', { n: g.target.toLocaleString() });
    if (g.type === 'make') return t('goal.make', { n: g.count, name: charName(def.world, g.level) });
    return t('goal.ice', { n: def.ice.length });
  };
  S.levelInfo = function (def, app) {
    var lim = [];
    if (def.drops) lim.push(t('limit.drops', { n: def.drops }));
    if (def.time) lim.push(t('limit.time', { n: def.time }));
    if (def.lineOffset) lim.push(t('limit.lowLine'));
    if (def.rotate) lim.push(t('limit.rotate'));
    if (def.box && def.box.shape && def.box.shape !== 'box') lim.push(t('limit.shape.' + def.box.shape));
    (def.mechanics || []).forEach(function (m) { if (lim.indexOf(t('limit.mech.' + m.type)) < 0) lim.push(t('limit.mech.' + m.type)); });
    var st = P.levelStars(def.id);
    var stars = h('div', { class: 'result-stars small' });
    for (var i = 0; i < 3; i++) stars.appendChild(K.icon('star', i < st ? 'on' : 'off'));
    var items = h('div', { class: 'lv-items' });
    if (def.items) for (var k in def.items) if (def.items[k]) items.appendChild(h('span', { class: 'lv-item' }, h('img', { src: Art.itemImage(k).src, alt: '' }), t('item.' + k) + ' ×' + def.items[k]));
    var go = K.button({ icon: 'play', label: t('setup.start'), variant: 'primary', onClick: function () { m.close(); app.go('play', { mode: 'level', level: def }); } });
    var m = K.modal({ title: t('world.' + def.world) + '・' + t('levels.level', { n: def.index }) + (def.boss ? '・' + t('levels.boss') : ''), class: 'level-modal',
      content: h('div', { class: 'level-info' }, stars,
        h('p', { class: 'goal-line' }, K.icon('flag'), h('b', { text: S.goalText(def) })),
        lim.length ? h('ul', { class: 'lim-list' }, lim.map(function (x) { return h('li', { text: x }); })) : null,
        items.childNodes.length ? items : null),
      actions: [go] });
  };

  /* ---------- 圖鑑 ---------- */
  S.codex = function (host, app) {
    app.setTitle(t('codex.title'));
    var c = P.codex();
    var wrap = h('div', { class: 'codex' }, h('p', { class: 'codex-progress', text: t('codex.progress', { n: c.length, m: D.WORLDS.length * 10 }) }));
    WORLD_IDS.forEach(function (w) {
      var grid = h('div', { class: 'codex-grid' });
      for (var l = 1; l <= 10; l++) {
        (function (l) {
          var got = c.indexOf(w + '-' + l) >= 0;
          grid.appendChild(h('button', { type: 'button', class: 'codex-card' + (got ? '' : ' locked'), 'aria-label': got ? charName(w, l) : t('codex.locked'),
            onclick: function () { if (got) S.codexCard(w, l); else K.toast(t('codex.locked')); } },
            h('span', { class: 'codex-lv', text: 'Lv.' + l }),
            h('img', { src: Art.image(w, l, 'normal').src, alt: '', draggable: 'false' }),
            h('span', { class: 'codex-name', text: got ? charName(w, l) : '？？？' })));
        })(l);
      }
      wrap.appendChild(h('section', { class: 'codex-world w-' + w }, h('h2', { class: 'sec-title', text: t('world.' + w) }), grid));
    });
    host.appendChild(K.scrollArea(wrap, 'screen-scroll'));
  };
  S.codexCard = function (w, l) {
    K.modal({ title: charName(w, l), class: 'codex-modal', content: h('div', { class: 'codex-detail w-' + w },
      h('img', { src: Art.image(w, l, 'normal').src, alt: charName(w, l) }),
      h('p', { class: 'codex-meta', text: t('world.' + w) + '・Lv.' + l }),
      h('p', { text: t('desc.' + w + '.' + l) })) });
  };

  /* ---------- 成就 ---------- */
  S.achv = function (host, app) {
    app.setTitle(t('achv.title'));
    var got = P.achv(), n = 0;
    var list = h('ul', { class: 'achv-list' });
    D.ACHIEVEMENTS.forEach(function (a) {
      var ok = !!got[a.id]; if (ok) n++;
      list.appendChild(h('li', { class: 'achv' + (ok ? ' done' : '') },
        h('span', { class: 'achv-ico', 'aria-hidden': 'true' }, K.icon(ok ? 'trophy' : 'lock')),
        h('span', { class: 'achv-txt' }, h('b', { text: t('achv.' + a.id + '.name') }), h('small', { text: t('achv.' + a.id + '.desc') })),
        h('span', { class: 'sr-only', text: ok ? '✓' : '' })));
    });
    host.appendChild(K.scrollArea(h('div', { class: 'achv-screen' }, h('p', { class: 'codex-progress', text: t('achv.progress', { n: n, m: D.ACHIEVEMENTS.length }) }), list), 'screen-scroll'));
  };

  /* ---------- 排行 ---------- */
  S.rank = function (host, app) {
    app.setTitle(t('rank.title'));
    var st = root.Store.get('rankFilter', { mode: 'classic', world: 'zoo', diff: 'normal' });
    var filters = h('div', { class: 'rank-filters' });
    var listHost = h('div', { class: 'rank-host' });
    function chips(key, values, labeler) {
      var row = h('div', { class: 'chip-row', role: 'radiogroup' });
      values.forEach(function (v) {
        row.appendChild(h('button', { type: 'button', class: 'chip', role: 'radio', 'aria-checked': String(st[key] === v), text: labeler(v),
          onclick: function () { st[key] = v; root.Store.set('rankFilter', st); draw(); } }));
      });
      return row;
    }
    function draw() {
      filters.innerHTML = '';
      filters.appendChild(chips('mode', ['classic', 'daily'], function (v) { return t('rank.' + v); }));
      filters.appendChild(chips('world', WORLD_IDS, function (v) { return t('world.' + v); }));
      filters.appendChild(chips('diff', D.DIFFICULTIES.map(function (d) { return d.id; }), function (v) { return t('diff.' + v); }));
      var list = P.ranks(st.mode, st.world, st.diff);
      listHost.innerHTML = '';
      if (!list.length) { listHost.appendChild(h('p', { class: 'empty-note', text: t('rank.empty') })); return; }
      var ol = h('ol', { class: 'rank-list' });
      list.forEach(function (r, i) {
        var dt = new Date(r.at);
        ol.appendChild(h('li', { class: 'rank-row' + (i < 3 ? ' top' + (i + 1) : '') },
          h('span', { class: 'rank-no', text: String(i + 1) }),
          pic(st.world, Math.max(1, r.max || 1), 'rank-pic', ''),
          h('b', { class: 'rank-score', text: t('rank.score', { n: r.score.toLocaleString() }) }),
          h('small', { class: 'rank-date', text: dt.getFullYear() + '/' + (dt.getMonth() + 1) + '/' + dt.getDate() })));
      });
      listHost.appendChild(ol);
    }
    draw();
    host.appendChild(K.scrollArea(h('div', { class: 'rank-screen' }, filters, listHost), 'screen-scroll'));
  };

  root.MZScreens = S;
})(typeof self !== 'undefined' ? self : this);
