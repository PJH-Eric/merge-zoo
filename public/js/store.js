/* ===== store.js — localStorage 存檔（失敗時退回記憶體，不影響遊戲）===== */
(function (root) {
  'use strict';
  var PREFIX = 'merge-zoo.';
  var mem = {};
  function get(key, fallback) {
    try {
      var raw = root.localStorage.getItem(PREFIX + key);
      if (raw == null) return key in mem ? mem[key] : fallback;
      return JSON.parse(raw);
    } catch (e) { return key in mem ? mem[key] : fallback; }
  }
  function set(key, value) {
    mem[key] = value;
    try { root.localStorage.setItem(PREFIX + key, JSON.stringify(value)); } catch (e) { /* 私密模式等情況只存記憶體 */ }
  }
  function remove(key) {
    delete mem[key];
    try { root.localStorage.removeItem(PREFIX + key); } catch (e) {}
  }
  root.Store = { get: get, set: set, remove: remove };
})(typeof self !== 'undefined' ? self : this);
