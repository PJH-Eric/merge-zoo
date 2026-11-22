/* ===== app.js — 路由、頂列、設定彈窗、語言選單、啟動 ===== */
(function (root) {
  'use strict';
  var K = root.Kit, h = K.h, P = root.Profile, d = root.document;
  var t = function (k, p) { return root.I18N.t(k, p); };

  var app = {
    screen: null, params: {},
    setTitle: function (text) { d.getElementById('top-title').textContent = text || ''; },

    /** 切換畫面；replace=true 時不新增瀏覽紀錄 */
    go: function (screen, params, replace, fromPop) {
      params = params || {};
      if (screen === 'play' && params.mode === 'classic' && !params.restore && !P.tutorialDone()) {
        screen = 'play'; params = { mode: 'tutorial', world: 'zoo', difficulty: 'kids' };
      }
      if (app.screen === 'play') root.MZPlay.close();
      app.screen = screen; app.params = params;
      var host = d.getElementById('screen');
      host.innerHTML = '';
      host.dataset.screen = screen;
      d.getElementById('app').dataset.screen = screen;
      app.setTitle('');
      updateTopbar();
      if (!fromPop) {
        var state = { screen: screen, params: screen === 'play' ? null : params };
        if (replace) root.history.replaceState(state, ''); else root.history.pushState(state, '');
      }
      if (screen === 'play') root.MZPlay.open(host, params, app);
      else (root.MZScreens[screen] || root.MZScreens.home)(host, app, params);
      if (root.GameAnalytics) root.GameAnalytics.pageView(screen);
      var focusTarget = host.querySelector('h1, .sec-title, .btn');
      if (focusTarget && screen !== 'play') { /* 不搶焦點，避免捲動跳動 */ }
    },
    back: function () { root.history.back(); }
  };

  function updateTopbar() {
    var s = app.screen;
    var lobby = d.getElementById('btn-lobby');
    lobby.hidden = !(s === 'home' && root.LobbyLink && root.LobbyLink.url);
    if (!lobby.hidden) lobby.href = root.LobbyLink.url;
    d.getElementById('btn-back').hidden = s === 'home' || s === 'play';
    d.getElementById('btn-pause').hidden = s !== 'play';
  }

  root.addEventListener('popstate', function (e) {
    var st = e.state;
    if (!st || st.screen === 'root') {
      // 首頁按上一頁：回遊戲大廳
      if (root.LobbyLink && root.LobbyLink.url) { root.location.href = root.LobbyLink.url; return; }
      app.go('home', {}, true, true);
      return;
    }
    if (app.screen === 'play') {
      var g = root.MZPlay.current();
      if (g && g.session.state === 'playing' && !g.paused) {
        // 遊戲中按上一頁：先暫停，留在遊戲畫面
        root.history.pushState({ screen: 'play' }, '');
        g.pause(true);
        return;
      }
    }
    if (st.screen === 'play') { app.go('home', {}, true, true); return; }
    app.go(st.screen, st.params || {}, false, true);
  });

  /* ---------- 設定彈窗 ---------- */
  function openSettings() {
    var s = P.settings();
    function apply(k, v) {
      s = P.setSetting(k, v);
      if (k === 'bgm' || k === 'sfx') root.GameAudio.setVolume(k, v);
      d.documentElement.classList.toggle('reduce-motion', !!s.motion);
      var g = root.MZPlay.current();
      if (g) g.refreshSettings();
    }
    var rows = {
      bgm: K.slider(t('settings.bgm'), s.bgm, function (v) { apply('bgm', v); }),
      sfx: K.slider(t('settings.sfx'), s.sfx, function (v) { apply('sfx', v); root.GameAudio.sfx('pop', { level: 3 }); }),
      vibrate: K.toggle(t('settings.vibrate'), s.vibrate, function (v) { apply('vibrate', v); }),
      motion: K.toggle(t('settings.motion'), s.motion, function (v) { apply('motion', v); }),
      guide: K.toggle(t('settings.guide'), s.guide, function (v) { apply('guide', v); }, t('settings.guideNote')),
      numbers: K.toggle(t('settings.color'), s.numbers, function (v) { apply('numbers', v); })
    };
    var tut = K.button({ icon: 'help', label: t('settings.tutorial'), onClick: function () {
      m.close();
      root.Store.set('tutorial', false);
      app.go('play', { mode: 'tutorial', world: 'zoo', difficulty: 'kids' });
    } });
    var reset = K.button({ icon: 'refresh', label: t('settings.reset'), onClick: function () {
      s = P.resetSettings();
      ['bgm', 'sfx'].forEach(function (k) { rows[k].set(s[k]); root.GameAudio.setVolume(k, s[k]); });
      ['vibrate', 'motion', 'guide', 'numbers'].forEach(function (k) { rows[k].set(s[k]); });
      d.documentElement.classList.toggle('reduce-motion', !!s.motion);
      var g = root.MZPlay.current(); if (g) g.refreshSettings();
    } });
    var g = root.MZPlay.current();
    var wasPaused = g && g.paused;
    if (g && app.screen === 'play' && !wasPaused && g.session.state === 'playing') { g.pausedBySettings = true; g.paused = true; clearTimeout(g.countdownTimer); g.countEl.hidden = true; }
    var m = K.modal({ title: t('settings.title'), class: 'settings-modal',
      content: h('div', { class: 'settings' }, rows.bgm, rows.sfx, rows.vibrate, rows.motion, rows.guide, rows.numbers,
        app.screen === 'play' ? null : h('div', { class: 'settings-extra' }, tut)),
      actions: [reset, K.button({ label: t('settings.close'), variant: 'primary', onClick: function () { m.close(); } })],
      onClose: function () {
        var g2 = root.MZPlay.current();
        if (g2 && g2.pausedBySettings) { g2.pausedBySettings = false; g2.paused = false; g2.resume(); }
      } });
  }

  function openLang(btn) {
    var langs = root.I18N.LANGS.map(function (l) { return { value: l, label: t('lang.' + l) }; });
    K.menu(btn, langs, function (l) {
      root.I18N.setLang(l);
      var g = root.MZPlay.current();
      if (app.screen === 'play' && g) { g.relabel(); return; }
      app.go(app.screen, app.params, true, true);
    }, root.I18N.lang);
  }

  function init() {
    root.I18N.init();
    var s = P.settings();
    root.GameAudio.setVolume('bgm', s.bgm);
    root.GameAudio.setVolume('sfx', s.sfx);
    d.documentElement.classList.toggle('reduce-motion', !!s.motion);
    d.getElementById('btn-back').addEventListener('click', function () { app.back(); });
    d.getElementById('btn-pause').addEventListener('click', function () { var g = root.MZPlay.current(); if (g) g.pause(true); });
    d.getElementById('btn-settings').addEventListener('click', openSettings);
    var lb = d.getElementById('btn-lang');
    lb.addEventListener('click', function () { openLang(lb); });
    // 第一次手勢解鎖音訊
    ['pointerdown', 'keydown'].forEach(function (n) { root.addEventListener(n, function () { root.GameAudio.unlock(); }, { once: true, capture: true }); });
    root.I18N.onChange(function () { d.documentElement.lang = root.I18N.lang; });
    root.history.replaceState({ screen: 'root' }, '');
    app.go('home');
  }

  root.MZApp = app;
  if (d.readyState === 'loading') d.addEventListener('DOMContentLoaded', init); else init();
})(typeof self !== 'undefined' ? self : this);
