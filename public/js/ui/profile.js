/* ===== profile.js — 玩家進度：設定、星數、圖鑑、成就、排行、每日挑戰、經典存檔 ===== */
(function (root) {
  'use strict';
  var S = root.Store, D = root.MZData;

  function reducedMotionDefault() {
    try { return root.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  }
  var DEFAULTS = { bgm: 0.6, sfx: 0.8, vibrate: true, motion: reducedMotionDefault(), guide: true, numbers: false };

  var P = {
    settings: function () { return Object.assign({}, DEFAULTS, S.get('settings', {})); },
    setSetting: function (k, v) { var s = P.settings(); s[k] = v; S.set('settings', s); return s; },
    resetSettings: function () { S.set('settings', {}); return P.settings(); },

    /* ---- 闖關 ---- */
    levelStars: function (id) { return (S.get('levels', {}))[id] || 0; },
    setLevelStars: function (id, stars) {
      var all = S.get('levels', {});
      if ((all[id] || 0) >= stars) return false;
      all[id] = stars; S.set('levels', all); return true;
    },
    totalStars: function () { var all = S.get('levels', {}), n = 0; for (var k in all) n += all[k]; return n; },
    clearedCount: function () { var all = S.get('levels', {}), n = 0; for (var k in all) if (all[k] > 0) n++; return n; },
    worldCleared: function (w) {
      for (var i = 1; i <= 50; i++) if (!P.levelStars(w + '-' + i)) return false;
      return true;
    },
    worldUnlocked: function (wi) { return wi === 0 || P.worldCleared(D.WORLDS[wi - 1].id); },
    levelUnlocked: function (wi, i) {
      if (!P.worldUnlocked(wi)) return false;
      return i === 1 || P.levelStars(D.WORLDS[wi].id + '-' + (i - 1)) > 0;
    },

    /* ---- 圖鑑 ---- */
    codex: function () { return S.get('codex', []); },
    addCodex: function (key) {
      var c = P.codex();
      if (c.indexOf(key) >= 0) return false;
      c.push(key); S.set('codex', c); return true;
    },

    /* ---- 成就 ---- */
    achv: function () { return S.get('achv', {}); },
    unlock: function (id) {
      var a = P.achv();
      if (a[id]) return false;
      a[id] = Date.now(); S.set('achv', a);
      if (root.Kit) root.Kit.toast(root.I18N.t('achv.toast', { name: root.I18N.t('achv.' + id + '.name') }), 'achv');
      if (root.GameAudio) root.GameAudio.sfx('achv');
      return true;
    },
    counter: function (k, add) {
      var c = S.get('counters', {});
      if (add) { c[k] = (c[k] || 0) + add; S.set('counters', c); }
      return c[k] || 0;
    },

    /* ---- 排行 ---- */
    rankKey: function (mode, world, diff) { return mode + '|' + world + '|' + diff; },
    ranks: function (mode, world, diff) { return (S.get('ranks', {}))[P.rankKey(mode, world, diff)] || []; },
    best: function (mode, world, diff) { var r = P.ranks(mode, world, diff); return r.length ? r[0].score : 0; },
    addRank: function (mode, world, diff, entry) {
      var all = S.get('ranks', {}), key = P.rankKey(mode, world, diff);
      var list = (all[key] || []).concat([entry]).sort(function (a, b) { return b.score - a.score; }).slice(0, 10);
      all[key] = list; S.set('ranks', all);
      return list.indexOf(entry);
    },

    /* ---- 每日挑戰 ---- */
    dailyBest: function (date, diff) { return ((S.get('daily', {}))[date] || {})[diff] || 0; },
    dailyRecord: function (date, diff, score) {
      var all = S.get('daily', {});
      all[date] = all[date] || {};
      var improved = score > (all[date][diff] || 0);
      if (improved || all[date][diff] == null) all[date][diff] = Math.max(score, all[date][diff] || 0);
      // 只保留最近 30 天
      var keys = Object.keys(all).sort();
      while (keys.length > 30) delete all[keys.shift()];
      S.set('daily', all);
      var st = S.get('streak', { last: null, n: 0 });
      if (st.last !== date) {
        st.n = st.last === root.MZDaily.prevDate(date) ? st.n + 1 : 1;
        st.last = date; S.set('streak', st);
      }
      return improved;
    },
    streak: function () {
      var st = S.get('streak', { last: null, n: 0 }), today = root.MZDaily.taipeiDate();
      if (st.last === today || st.last === root.MZDaily.prevDate(today)) return st.n;
      return 0;
    },

    /* ---- 經典自動存檔 ---- */
    save: function () { return S.get('save', null); },
    setSave: function (data) { if (data) S.set('save', data); else S.remove('save'); },

    tutorialDone: function () { return !!S.get('tutorial', false); },
    setTutorialDone: function () { S.set('tutorial', true); }
  };

  /** 遊戲中即時檢查的成就 */
  P.liveCheck = function (ev, session) {
    if (session.mode === 'tutorial') return;
    if (ev.type === 'merge' || ev.type === 'bonus') {
      P.unlock('first_merge');
      if (ev.combo >= 3) P.unlock('combo3');
      if (ev.combo >= 5) P.unlock('combo5');
      if (ev.gold) P.unlock('gold_merge');
      if (ev.gold && ev.level >= 7) P.unlock('gold_big');
      if (ev.type === 'bonus') P.unlock('double10');
      if (ev.level === 10 && ev.type === 'merge') P.unlock(session.world.id + '_10');
      if (ev.type === 'merge' && P.addCodex(session.world.id + '-' + ev.level)) {
        session.newCodex = (session.newCodex || []).concat([ev.level]);
        P.checkCodex();
      }
    } else if (ev.type === 'item') {
      P.unlock('use_' + ev.item);
    } else if (ev.type === 'thaw') {
      if (P.counter('thawed', 1) >= 10) P.unlock('thaw10');
    }
  };
  P.markDropped = function (session, level) {
    if (session.mode === 'tutorial') return;
    if (P.addCodex(session.world.id + '-' + level)) {
      session.newCodex = (session.newCodex || []).concat([level]);
      P.checkCodex();
    }
  };
  P.checkCodex = function () {
    var c = P.codex();
    if (c.length >= D.WORLDS.length * 10) P.unlock('codex_all');
    D.WORLDS.forEach(function (w) {
      var n = 0;
      for (var l = 1; l <= 10; l++) if (c.indexOf(w.id + '-' + l) >= 0) n++;
      if (n >= 10) P.unlock('codex_world');
    });
  };

  /** 一局結束：記錄排行／星數／每日，並檢查成就 */
  P.finishRound = function (session, ctx) {
    var out = { newBest: false, rankIndex: -1, stars: 0, improved: false };
    var s = session, score = s.score;
    if (s.mode === 'classic' || s.mode === 'daily') {
      var prevBest = P.best(s.mode, s.world.id, s.diff.id);
      out.prevBest = prevBest;
      if (score > 0) out.rankIndex = P.addRank(s.mode, s.world.id, s.diff.id, { score: score, at: Date.now(), max: s.stats.maxLevel });
      out.newBest = score > prevBest && score > 0;
      out.best = Math.max(prevBest, score);
      if (s.mode === 'classic') {
        if (score >= 5000) P.unlock('score5k');
        if (score >= 10000) P.unlock('score10k');
        if (score >= 30000) P.unlock('score30k');
      }
      if (score >= 10000 && s.stats.itemsUsed === 0) P.unlock('noitem10k');
      if (score >= 5000 && s.diff.id === 'myth') P.unlock('myth5k');
      if (s.diff.id === 'kids') P.unlock('kids_round');
      if (s.mode === 'daily') {
        out.improved = P.dailyRecord(ctx.date, s.diff.id, score);
        P.unlock('daily1');
        if (P.streak() >= 7) P.unlock('daily7');
      }
    } else if (s.mode === 'level') {
      out.stars = s.stars();
      if (out.stars) {
        out.improved = P.setLevelStars(s.level.id, out.stars);
        var cleared = P.clearedCount(), stars = P.totalStars();
        if (cleared >= 10) P.unlock('levels10');
        if (cleared >= 50) P.unlock('levels50');
        if (cleared >= 100) P.unlock('levels100');
        if (cleared >= D.WORLDS.length * 50) P.unlock('levels200');
        if (stars >= 100) P.unlock('stars100');
        if (stars >= D.WORLDS.length * 150) P.unlock('stars600');
      }
    }
    return out;
  };

  root.Profile = P;
})(typeof self !== 'undefined' ? self : this);
