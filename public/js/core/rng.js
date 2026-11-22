/* ===== rng.js — 可注入種子的亂數（mulberry32），狀態可存檔還原 ===== */
(function (root) {
  'use strict';

  function hashString(text) {
    var h = 2166136261 >>> 0;
    var s = String(text);
    for (var i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function Rng(seed) {
    this.state = (typeof seed === 'string' ? hashString(seed) : (seed >>> 0)) || 1;
  }
  Rng.prototype.next = function () {
    var t = (this.state = (this.state + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  Rng.prototype.range = function (a, b) { return a + (b - a) * this.next(); };
  Rng.prototype.int = function (a, b) { return Math.floor(this.range(a, b + 1)); };
  Rng.prototype.pick = function (list) { return list[Math.floor(this.next() * list.length)]; };
  /** 依權重抽索引 */
  Rng.prototype.weighted = function (weights) {
    var total = 0, i;
    for (i = 0; i < weights.length; i++) total += weights[i];
    var r = this.next() * total;
    for (i = 0; i < weights.length; i++) {
      r -= weights[i];
      if (r < 0) return i;
    }
    return weights.length - 1;
  };

  var api = { Rng: Rng, hashString: hashString };
  root.MZRng = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
