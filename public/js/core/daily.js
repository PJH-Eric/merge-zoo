/* ===== daily.js — 每日挑戰：台北時間切日，同一天同一組種子、世界與當日規則 ===== */
(function (root) {
  'use strict';
  var D = root.MZData || require('./data.js');
  var R = root.MZRng || require('./rng.js');

  function taipeiDate(now) {
    var d = new Date((now == null ? Date.now() : now) + 8 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  }
  function forDate(date) {
    var seed = R.hashString('merge-zoo-daily-' + date);
    var rng = new R.Rng(seed);
    var world = D.WORLDS[rng.int(0, D.WORLDS.length - 1)].id;
    var rule = D.DAILY_RULES[rng.int(0, D.DAILY_RULES.length - 1)];
    return { date: date, seed: seed, world: world, rule: rule };
  }
  function prevDate(date) {
    var t = Date.parse(date + 'T00:00:00Z') - 86400000;
    return new Date(t).toISOString().slice(0, 10);
  }
  var api = { taipeiDate: taipeiDate, forDate: forDate, today: function () { return forDate(taipeiDate()); }, prevDate: prevDate };
  root.MZDaily = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
