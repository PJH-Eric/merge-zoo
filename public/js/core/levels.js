/* ===== levels.js — 闖關關卡存取（資料由 scripts/gen-levels.js 產生到 level-data.js）===== */
(function (root) {
  'use strict';
  var D = root.MZData || require('./data.js');
  var DATA = root.MZLevelData || (typeof require === 'function' ? (function () { try { return require('./level-data.js'); } catch (e) { return null; } })() : null) || [];
  var byId = {};
  DATA.forEach(function (lv) { byId[lv.id] = lv; });
  var api = {
    list: DATA,
    get: function (world, index) { return byId[world + '-' + index] || null; },
    next: function (def) {
      if (def.index < 50) return byId[def.world + '-' + (def.index + 1)] || null;
      var wi = D.WORLDS.map(function (w) { return w.id; }).indexOf(def.world);
      return wi < D.WORLDS.length - 1 ? byId[D.WORLDS[wi + 1].id + '-1'] || null : null;
    }
  };
  root.MZLevels = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
