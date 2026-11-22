/* ===== animals.js — 40 隻角色（偏寫實的立體向量 SVG，不用 emoji）=====
 * 風格：保留圓形身體（碰撞判定才準），但臉部依真實動物描繪——
 * 虹膜＋瞳孔＋反光的眼睛、真實的鼻子與嘴、毛流紋理、斑紋與光影；不畫卡通腮紅。
 * 表情：normal／squish（被壓住：瞇眼）／nervous（快超線：睜大眼＋冒汗）。
 */
(function (root) {
  'use strict';
  var uid = 0;
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    function f(c) { return Math.max(0, Math.min(255, Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt))); }
    return '#' + ((1 << 24) + (f(r) << 16) + (f(g) << 8) + f(b)).toString(16).slice(1);
  }
  function prng(seed) {
    var s = 0; for (var i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
    return function () { s = (s + 0x6D2B79F5) >>> 0; var t = Math.imul(s ^ (s >>> 15), s | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }
  function f1(n) { return (+n).toFixed(1); }

  /* ---------- 身體：漸層立體＋毛流＋環境光遮蔽 ---------- */
  function ball(c, id, opt) {
    opt = opt || {};
    var g = 'b' + id, ao = 'o' + id;
    var out = '<defs><radialGradient id="' + g + '" cx="0.38" cy="0.32" r="0.78">' +
      '<stop offset="0" stop-color="' + c.light + '"/><stop offset="0.5" stop-color="' + c.base + '"/><stop offset="1" stop-color="' + c.dark + '"/></radialGradient>' +
      '<radialGradient id="' + ao + '" cx="0.5" cy="0.5" r="0.5"><stop offset="0.78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.28"/></radialGradient></defs>';
    out += '<circle r="50" fill="url(#' + g + ')"/>';
    if (opt.belly) out += '<ellipse cx="0" cy="' + (opt.bellyY || 16) + '" rx="' + (opt.bellyRx || 30) + '" ry="' + (opt.bellyRy || 26) + '" fill="' + opt.belly + '" opacity="0.92"/>';
    if (!opt.smooth) out += furStrands(c, opt.seed || id, opt.furLen || 5);
    out += '<circle r="50" fill="url(#' + ao + ')"/>';
    if (!opt.smooth) out += furEdge(c, opt.seed || id, opt.furLen || 5);
    else out += '<circle r="50" fill="none" stroke="' + shade(c.dark, -0.25) + '" stroke-width="1.6" opacity="0.6"/>';
    out += '<ellipse cx="-16" cy="-27" rx="17" ry="9" fill="#fff" opacity="' + (opt.gloss || 0.18) + '" transform="rotate(-28 -16 -27)"/>';
    return out;
  }
  function furEdge(c, seed, len) {
    var r = prng('e' + seed), p = '';
    for (var i = 0; i < 72; i++) {
      var a = i / 72 * Math.PI * 2 + r() * 0.05, l = len * (0.6 + r() * 0.8);
      p += 'M' + f1(Math.cos(a) * 46) + ' ' + f1(Math.sin(a) * 46) + 'L' + f1(Math.cos(a + 0.05) * (49 + l)) + ' ' + f1(Math.sin(a + 0.05) * (49 + l));
    }
    return '<path d="' + p + '" stroke="' + c.base + '" stroke-width="3" stroke-linecap="round"/>' +
      '<path d="' + p + '" stroke="' + c.dark + '" stroke-width="1" stroke-linecap="round" opacity="0.55"/>';
  }
  function furStrands(c, seed, len) {
    var r = prng('s' + seed), dk = '', lt = '';
    for (var i = 0; i < 46; i++) {
      var a = r() * Math.PI * 2, d = 8 + r() * 36, x = Math.cos(a) * d, y = Math.sin(a) * d;
      var ang = a + (r() - 0.5) * 0.6, l = len * (0.8 + r());
      var seg = 'M' + f1(x) + ' ' + f1(y) + 'l' + f1(Math.cos(ang) * l) + ' ' + f1(Math.sin(ang) * l);
      if (i % 2) dk += seg; else lt += seg;
    }
    return '<path d="' + dk + '" stroke="' + c.dark + '" stroke-width="1.1" opacity="0.35" stroke-linecap="round"/>' +
      '<path d="' + lt + '" stroke="' + c.light + '" stroke-width="1.1" opacity="0.5" stroke-linecap="round"/>';
  }

  /* ---------- 眼睛：虹膜漸層＋瞳孔（圓／貓縫／羊橫條）＋反光＋上眼瞼 ---------- */
  function eye(x, y, o, expr) {
    o = o || {};
    var rx = o.rx || 6.5, ry = o.ry || rx, iris = o.iris || '#3A2414', pup = o.pupil || 'round';
    var rim = o.rim || '#1A120E';
    if (expr === 'squish') {
      return '<path d="M' + f1(x - rx - 1) + ' ' + f1(y) + ' q' + f1(rx + 1) + ' ' + f1(ry * 0.9) + ' ' + f1(rx * 2 + 2) + ' 0" fill="none" stroke="' + rim + '" stroke-width="2.6" stroke-linecap="round"/>';
    }
    var k = expr === 'nervous' ? 1.18 : 1;
    rx *= k; ry *= k;
    var id = 'i' + (uid++);
    var s = '<defs><radialGradient id="' + id + '" cx="0.45" cy="0.4" r="0.6"><stop offset="0" stop-color="' + shade(iris, 0.45) + '"/><stop offset="0.7" stop-color="' + iris + '"/><stop offset="1" stop-color="' + shade(iris, -0.45) + '"/></radialGradient></defs>';
    if (o.white || expr === 'nervous') s += '<ellipse cx="' + x + '" cy="' + y + '" rx="' + f1(rx + 1.4) + '" ry="' + f1(ry + 1.2) + '" fill="#F6F1EA"/>';
    s += '<ellipse cx="' + x + '" cy="' + y + '" rx="' + f1(rx) + '" ry="' + f1(ry) + '" fill="url(#' + id + ')" stroke="' + rim + '" stroke-width="1.6"/>';
    var pr = expr === 'nervous' ? 0.3 : 0.48;
    if (pup === 'slit') s += '<ellipse cx="' + x + '" cy="' + y + '" rx="' + f1(rx * (expr === 'nervous' ? 0.35 : 0.18)) + '" ry="' + f1(ry * 0.85) + '" fill="#0B0807"/>';
    else if (pup === 'bar') s += '<rect x="' + f1(x - rx * 0.62) + '" y="' + f1(y - ry * 0.2) + '" width="' + f1(rx * 1.24) + '" height="' + f1(ry * 0.4) + '" rx="' + f1(ry * 0.2) + '" fill="#0B0807"/>';
    else s += '<circle cx="' + x + '" cy="' + y + '" r="' + f1(Math.min(rx, ry) * pr) + '" fill="#0B0807"/>';
    s += '<ellipse cx="' + f1(x - rx * 0.35) + '" cy="' + f1(y - ry * 0.38) + '" rx="' + f1(rx * 0.28) + '" ry="' + f1(ry * 0.24) + '" fill="#fff" opacity="0.95"/>' +
      '<circle cx="' + f1(x + rx * 0.35) + '" cy="' + f1(y + ry * 0.35) + '" r="' + f1(rx * 0.1) + '" fill="#fff" opacity="0.7"/>';
    if (o.lid !== false) s += '<path d="M' + f1(x - rx - 0.5) + ' ' + f1(y - ry * 0.2) + ' q' + f1(rx + 0.5) + ' ' + f1(-ry * 1.25) + ' ' + f1(rx * 2 + 1) + ' 0" fill="none" stroke="' + rim + '" stroke-width="1.4" opacity="0.6"/>';
    return s;
  }
  function eyes(dx, y, o, expr) { return eye(-dx, y, o, expr) + eye(dx, y, o, expr); }
  function sweat(expr) {
    return expr === 'nervous' ? '<path d="M37 -36 q6 9 0 13 q-6 -4 0 -13z" fill="#9AD8FF" stroke="#4A9FD6" stroke-width="1.2" opacity="0.9"/>' : '';
  }
  function mouthY(y, col, expr, w) {
    w = w || 6; col = col || '#4A2A24';
    if (expr === 'squish') return '<ellipse cx="0" cy="' + (y + 4) + '" rx="3.4" ry="3" fill="#5A2A2A"/>';
    return '<path d="M0 ' + (y - 4) + ' v4 M0 ' + y + ' q' + (-w / 2) + ' 4 ' + (-w) + ' 1.5 M0 ' + y + ' q' + (w / 2) + ' 4 ' + w + ' 1.5" fill="none" stroke="' + col + '" stroke-width="1.6" stroke-linecap="round"/>';
  }
  function whiskers(y, col, len, spread) {
    len = len || 22; spread = spread || 16;
    var s = '';
    [[-1, -4], [-1, 1], [-1, 6], [1, -4], [1, 1], [1, 6]].forEach(function (w) {
      s += 'M' + (w[0] * spread) + ' ' + (y + w[1] * 0.6) + ' q' + (w[0] * len * 0.5) + ' ' + (w[1] * 0.6 - 2) + ' ' + (w[0] * len) + ' ' + (w[1] * 1.4);
    });
    return '<path d="' + s + '" fill="none" stroke="' + (col || '#FFFFFF') + '" stroke-width="0.9" opacity="0.85" stroke-linecap="round"/>';
  }
  function grad(id, a, b) {
    return '<linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="' + a + '"/><stop offset="1" stop-color="' + b + '"/></linearGradient>';
  }

  /* ---------- 耳朵與部件 ---------- */
  var P = {
    roundEar: function (x, y, r, c, inner, id) {
      var gi = 'e' + id + (x > 0 ? 'r' : 'l');
      return '<defs><radialGradient id="' + gi + '" cx="0.5" cy="0.55" r="0.55"><stop offset="0" stop-color="' + shade(inner, -0.1) + '"/><stop offset="1" stop-color="' + shade(inner, 0.35) + '"/></radialGradient></defs>' +
        '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + c.base + '" stroke="' + c.dark + '" stroke-width="1.4"/>' +
        '<circle cx="' + (x + (x > 0 ? -1.5 : 1.5)) + '" cy="' + (y + 1.5) + '" r="' + f1(r * 0.68) + '" fill="url(#' + gi + ')"/>' +
        '<path d="M' + f1(x - r * 0.2) + ' ' + f1(y + r * 0.4) + ' q' + (x > 0 ? 3 : -3) + ' ' + f1(-r * 0.5) + ' ' + (x > 0 ? 1 : -1) + ' ' + f1(-r * 0.8) + '" stroke="' + shade(inner, -0.3) + '" stroke-width="0.8" fill="none" opacity="0.6"/>';
    },
    pointEar: function (s, c, inner) {
      return '<path d="M' + (s * 46) + ' -14 L' + (s * 38) + ' -62 L' + (s * 12) + ' -44 Z" fill="' + c.base + '" stroke="' + c.dark + '" stroke-width="1.6" stroke-linejoin="round"/>' +
        '<path d="M' + (s * 39) + ' -22 L' + (s * 35) + ' -53 L' + (s * 19) + ' -42 Z" fill="' + inner + '"/>' +
        '<path d="M' + (s * 33) + ' -30 l' + (s * 2) + ' -12 M' + (s * 29) + ' -32 l' + (s * 1) + ' -10 M' + (s * 36) + ' -28 l' + (s * 2) + ' -10" stroke="#FFF7EE" stroke-width="1" opacity="0.8"/>';
    },
    longEar: function (s, c, inner, tip) {
      var cx = s * 17, rot = s * 10;
      return '<g transform="rotate(' + rot + ' ' + cx + ' -50)"><ellipse cx="' + cx + '" cy="-62" rx="10.5" ry="27" fill="' + c.base + '" stroke="' + c.dark + '" stroke-width="1.4"/>' +
        '<ellipse cx="' + cx + '" cy="-60" rx="5.5" ry="20" fill="' + inner + '"/>' +
        (tip ? '<path d="M' + (cx - 9) + ' -78 q9 -16 18 0 q-9 -6 -18 0z" fill="' + tip + '"/>' : '') + '</g>';
    },
    floppyEar: function (s, col, dark) {
      return '<path d="M' + (s * 26) + ' -40 C' + (s * 52) + ' -44 ' + (s * 60) + ' -6 ' + (s * 52) + ' 22 C' + (s * 46) + ' 32 ' + (s * 36) + ' 24 ' + (s * 34) + ' 10 C' + (s * 32) + ' -6 ' + (s * 26) + ' -24 ' + (s * 26) + ' -40Z" fill="' + col + '" stroke="' + dark + '" stroke-width="1.6"/>' +
        '<path d="M' + (s * 40) + ' -26 q' + (s * 8) + ' 18 ' + (s * 6) + ' 36" stroke="' + dark + '" stroke-width="1" fill="none" opacity="0.5"/>';
    },
    dogNose: function (y) {
      return '<path d="M-9 ' + (y - 4) + ' q9 -5 18 0 q2 6 -5 10 q-4 2 -8 0 q-7 -4 -5 -10z" fill="#1E1718"/>' +
        '<ellipse cx="-4" cy="' + (y + 0.5) + '" rx="2.4" ry="1.6" fill="#000"/><ellipse cx="4" cy="' + (y + 0.5) + '" rx="2.4" ry="1.6" fill="#000"/>' +
        '<ellipse cx="-2" cy="' + (y - 4) + '" rx="3.5" ry="1.4" fill="#fff" opacity="0.55"/>';
    },
    catNose: function (y, col) {
      col = col || '#E59A9E';
      return '<path d="M-5 ' + (y - 3) + ' h10 q1 1 -1 3 l-3 3 q-1 1 -2 0 l-3 -3 q-2 -2 -1 -3z" fill="' + col + '" stroke="' + shade(col, -0.35) + '" stroke-width="0.8"/>' +
        '<ellipse cx="-1.5" cy="' + (y - 2) + '" rx="2" ry="0.8" fill="#fff" opacity="0.6"/>';
    },
    whiskerDots: function (y) {
      return '<g fill="#5A4030" opacity="0.6"><circle cx="-8" cy="' + y + '" r="0.9"/><circle cx="-12" cy="' + (y + 3) + '" r="0.9"/><circle cx="-7" cy="' + (y + 5) + '" r="0.9"/><circle cx="8" cy="' + y + '" r="0.9"/><circle cx="12" cy="' + (y + 3) + '" r="0.9"/><circle cx="7" cy="' + (y + 5) + '" r="0.9"/></g>';
    },
    stripes: function (paths, col, w) { return '<path d="' + paths + '" stroke="' + col + '" stroke-width="' + (w || 3) + '" fill="none" stroke-linecap="round" opacity="0.8"/>'; },
    star: function (x, y, r, col) {
      var p = '';
      for (var i = 0; i < 10; i++) { var a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.42 : r; p += (i ? 'L' : 'M') + f1(x + Math.cos(a) * rr) + ' ' + f1(y + Math.sin(a) * rr); }
      return '<path d="' + p + 'Z" fill="' + col + '" stroke="' + shade(col, -0.4) + '" stroke-width="1" stroke-linejoin="round"/>';
    },
    sprinkles: function (seed, y0, cols) {
      var r = prng(seed), s = '';
      for (var i = 0; i < 16; i++) {
        var a = r() * Math.PI, d = 18 + r() * 26, x = Math.cos(a + Math.PI) * d, y = y0 + Math.sin(a + Math.PI) * d * 0.7;
        s += '<rect x="' + f1(x - 3.5) + '" y="' + f1(y - 1.2) + '" width="7" height="2.4" rx="1.2" fill="' + cols[i % cols.length] + '" transform="rotate(' + Math.round(r() * 180) + ' ' + f1(x) + ' ' + f1(y) + ')"/>';
      }
      return s;
    }
  };

  function C(base, light, dark) { return { base: base, light: light || shade(base, 0.35), dark: dark || shade(base, -0.3) }; }

  /* ---------- 陸上動物（可換配色，供甜點／太空變化） ---------- */
  var SPECIES = {
    chick: function (e, id, c) {
      c = c || C('#F4CC45', '#FFF3B0', '#C9961C');
      return {
        back: '<path d="M-14 46 l-4 10 M-14 46 l0 11 M-14 46 l4 10 M14 46 l-4 10 M14 46 l0 11 M14 46 l4 10" stroke="#E88A2E" stroke-width="3" stroke-linecap="round"/>' +
          '<path d="M-4 -46 q-6 -14 4 -16 q-2 8 4 12 q2 -10 8 -8 q-4 6 -4 12" fill="' + c.base + '" stroke="' + c.dark + '" stroke-width="1"/>',
        ball: ball(c, id, { furLen: 7, seed: 'chick' + c.base }),
        front: '<path d="M-48 4 q-10 10 -4 24 q8 -6 12 -14z M48 4 q10 10 4 24 q-8 -6 -12 -14z" fill="' + c.dark + '" opacity="0.55"/>' +
          eyes(15, -8, { rx: 5, iris: '#1A1110', lid: false }, e) +
          '<path d="M-8 4 Q0 -4 8 4 Q0 9 -8 4z" fill="#F29A3F" stroke="#B8611B" stroke-width="1.2"/>' +
          (e === 'squish' ? '<path d="M-6 6 Q0 14 6 6z" fill="#C9661E"/>' : '<path d="M-6 6 Q0 11 6 6" fill="#D47827"/>') +
          '<circle cx="-2.5" cy="2" r="0.8" fill="#8A4512"/><circle cx="2.5" cy="2" r="0.8" fill="#8A4512"/>' + sweat(e)
      };
    },
    mouse: function (e, id, c) {
      c = c || C('#A39787', '#D7CEC2', '#6F6355');
      return {
        back: P.roundEar(-34, -36, 20, c, '#F0B4B0', id) + P.roundEar(34, -36, 20, c, '#F0B4B0', id),
        ball: ball(c, id, { belly: '#E9E1D5', bellyY: 22, bellyRx: 26, bellyRy: 22, furLen: 3, seed: 'mouse' + c.base }),
        front: eyes(15, -6, { rx: 6, iris: '#120C0A', lid: false }, e) +
          '<ellipse cx="0" cy="10" rx="4.5" ry="3.4" fill="#E9969A" stroke="#B8676C" stroke-width="0.8"/>' + mouthY(17, '#7A4A48', e, 4) +
          whiskers(12, '#F4EEE6', 26, 8) + sweat(e)
      };
    },
    rabbit: function (e, id, c) {
      c = c || C('#C8B6A2', '#ECE2D5', '#8C7A66');
      return {
        back: P.longEar(-1, c, '#E8B4AE', shade(c.dark, -0.2)) + P.longEar(1, c, '#E8B4AE', shade(c.dark, -0.2)),
        ball: ball(c, id, { belly: '#F3ECE2', bellyY: 18, bellyRx: 22, bellyRy: 20, furLen: 4, seed: 'rabbit' + c.base }),
        front: eyes(21, -8, { rx: 7, ry: 7.5, iris: '#3B2216' }, e) +
          '<path d="M-4 8 q4 -3 8 0 l-4 3z" fill="#D88A8C"/>' + mouthY(14, '#6B4038', e, 5) + whiskers(12, '#FFFFFF', 22, 9) + sweat(e)
      };
    },
    cat: function (e, id, c, opt) {
      c = c || C('#E39548', '#F7C88E', '#A85E22');
      opt = opt || {};
      var st = opt.stripe || '#9C521C';
      return {
        back: P.pointEar(-1, c, '#E9AFA6') + P.pointEar(1, c, '#E9AFA6'),
        ball: ball(c, id, { belly: opt.muzzle || '#FBE7CF', bellyY: 18, bellyRx: 24, bellyRy: 18, furLen: 4, seed: 'cat' + c.base }),
        front: P.stripes('M-4 -46 v12 M4 -46 v12 M-11 -44 q2 6 1 11 M11 -44 q-2 6 -1 11 M-46 -4 q8 2 14 0 M-47 6 q8 0 13 -2 M46 -4 q-8 2 -14 0 M47 6 q-8 0 -13 -2', st, 2.6) +
          eyes(16, -6, { rx: 7.5, ry: 6.5, iris: opt.iris || '#A8B83A', pupil: 'slit' }, e) +
          P.catNose(8) + mouthY(15, '#6B3A2C', e, 5) + whiskers(12, '#FFFFFF', 26, 12) + sweat(e)
      };
    },
    dog: function (e, id, c) {
      c = c || C('#C98D52', '#E8B985', '#8C5A2B');
      return {
        back: '',
        ball: ball(c, id, { belly: '#F8EFE2', bellyY: 18, bellyRx: 20, bellyRy: 24, furLen: 3, seed: 'dog' + c.base }) +
          '<path d="M-6 -50 q6 14 0 40 q6 -26 12 -40z" fill="#F8EFE2" opacity="0.85"/>',
        front: P.floppyEar(-1, shade(c.base, -0.35), shade(c.dark, -0.3)) + P.floppyEar(1, shade(c.base, -0.35), shade(c.dark, -0.3)) +
          '<ellipse cx="-14" cy="-19" rx="3.2" ry="2" fill="' + shade(c.base, -0.15) + '"/><ellipse cx="14" cy="-19" rx="3.2" ry="2" fill="' + shade(c.base, -0.15) + '"/>' +
          eyes(15, -9, { rx: 6.5, iris: '#4A2A14' }, e) + P.dogNose(10) +
          (e === 'squish' ? '<path d="M-6 20 q6 7 12 0z" fill="#B34A4F"/>' : '<path d="M0 15 v4 M0 19 q-6 4 -11 0 M0 19 q6 4 11 0" fill="none" stroke="#3A2418" stroke-width="1.6" stroke-linecap="round"/>') +
          P.whiskerDots(15) + sweat(e)
      };
    },
    pig: function (e, id, c) {
      c = c || C('#F0AFA8', '#FCD9D3', '#C97F78');
      return {
        back: '<path d="M-44 -18 L-44 -56 L-16 -42 Z M44 -18 L44 -56 L16 -42 Z" fill="' + c.base + '" stroke="' + c.dark + '" stroke-width="1.6" stroke-linejoin="round"/>' +
          '<path d="M-40 -24 L-41 -48 L-22 -40 Z M40 -24 L41 -48 L22 -40 Z" fill="#E89089"/>',
        ball: ball(c, id, { seed: 'pig' + c.base, smooth: true, gloss: 0.25 }),
        front: eyes(18, -12, { rx: 4.6, iris: '#2A1A14' }, e) +
          '<path d="M-24 -19 l3 -3 M-21 -20 l2 -4 M24 -19 l-3 -3 M21 -20 l-2 -4" stroke="#3A2A24" stroke-width="1" opacity="0.6"/>' +
          '<defs><radialGradient id="sn' + id + '" cx="0.5" cy="0.35" r="0.65"><stop offset="0" stop-color="#F9C6C0"/><stop offset="1" stop-color="#D98A84"/></radialGradient></defs>' +
          '<ellipse cx="0" cy="10" rx="15" ry="10.5" fill="url(#sn' + id + ')" stroke="#B86C66" stroke-width="1.4"/>' +
          '<ellipse cx="-5" cy="10" rx="2.8" ry="4" fill="#8E4A47"/><ellipse cx="5" cy="10" rx="2.8" ry="4" fill="#8E4A47"/>' +
          (e === 'squish' ? '<ellipse cx="0" cy="26" rx="4" ry="3" fill="#8E4A47"/>' : '<path d="M-7 25 q7 4 14 0" stroke="#8E4A47" stroke-width="1.5" fill="none" stroke-linecap="round"/>') + sweat(e)
      };
    },
    sheep: function (e, id, c, wool) {
      wool = wool || '#F3EEE4';
      c = c || C('#E6D6C0', '#F6EBDD', '#B79F84');
      var w = '', r = prng('wool' + wool), i;
      for (i = 0; i < 26; i++) {
        var a = i / 26 * Math.PI * 2, d = 40 + r() * 8;
        w += '<circle cx="' + f1(Math.cos(a) * d) + '" cy="' + f1(Math.sin(a) * d) + '" r="' + f1(9 + r() * 3) + '"/>';
      }
      var curls = '', r2 = prng('curl' + wool);
      for (i = 0; i < 22; i++) { var a2 = r2() * Math.PI * 2, d2 = r2() * 42; curls += '<path d="M' + f1(Math.cos(a2) * d2) + ' ' + f1(Math.sin(a2) * d2) + ' a4 4 0 1 1 6 2" fill="none" stroke="' + shade(wool, -0.2) + '" stroke-width="1.1" opacity="0.7"/>'; }
      return {
        back: '<g fill="' + wool + '" stroke="' + shade(wool, -0.22) + '" stroke-width="1.2">' + w + '</g>' +
          '<ellipse cx="-36" cy="-8" rx="13" ry="6" fill="' + c.base + '" stroke="' + c.dark + '" stroke-width="1.2" transform="rotate(20 -36 -8)"/>' +
          '<ellipse cx="36" cy="-8" rx="13" ry="6" fill="' + c.base + '" stroke="' + c.dark + '" stroke-width="1.2" transform="rotate(-20 36 -8)"/>',
        ball: ball(C(wool, '#FFFFFF', shade(wool, -0.18)), id, { smooth: true }) + curls +
          '<path d="M-20 -16 Q-22 26 0 30 Q22 26 20 -16 Q12 -26 0 -26 Q-12 -26 -20 -16z" fill="' + c.base + '" stroke="' + c.dark + '" stroke-width="1.2"/>',
        front: eyes(13, -8, { rx: 5.5, ry: 5, iris: '#B78B3A', pupil: 'bar' }, e) +
          '<path d="M-6 13 q6 -4 12 0 q-2 4 -6 5 q-4 -1 -6 -5z" fill="#6E5446"/>' + mouthY(21, '#5A3E34', e, 4) + sweat(e)
      };
    },
    panda: function (e, id, c, patch) {
      c = c || C('#F5F2EB', '#FFFFFF', '#C9C2B6');
      patch = patch || '#1F1E24';
      var pc = C(patch, '#4A4852', '#0E0D12');
      return {
        back: P.roundEar(-34, -34, 15, pc, patch, id) + P.roundEar(34, -34, 15, pc, patch, id),
        ball: ball(c, id, { furLen: 4, seed: 'panda' + c.base }),
        front: '<path d="M-30 -10 q2 -14 14 -12 q10 2 6 14 q-4 14 -14 14 q-8 -2 -6 -16z" fill="' + patch + '"/>' +
          '<path d="M30 -10 q-2 -14 -14 -12 q-10 2 -6 14 q4 14 14 14 q8 -2 6 -16z" fill="' + patch + '"/>' +
          eyes(17, -4, { rx: 4.6, iris: '#2A1C14', rim: '#000', lid: false }, e) +
          '<ellipse cx="0" cy="14" rx="15" ry="11" fill="#FFFFFF"/>' +
          '<path d="M-6 8 q6 -4 12 0 q-1 5 -6 6 q-5 -1 -6 -6z" fill="#18161A"/>' + mouthY(18, '#18161A', e, 4) + sweat(e)
      };
    },
    lion: function (e, id, c, mane) {
      c = c || C('#D9A458', '#F1CB8A', '#A46F2C');
      mane = mane || ['#7A4319', '#A8642A', '#C9853A'];
      var m = '';
      [[70, 16, mane[0]], [64, 18, mane[1]], [58, 20, mane[2]]].forEach(function (ring, k) {
        for (var i = 0; i < ring[1]; i++) {
          var a = (i + k * 0.5) / ring[1] * Math.PI * 2;
          var tip = ring[0];
          m += '<path d="M' + f1(Math.cos(a - 0.24) * 42) + ' ' + f1(Math.sin(a - 0.24) * 42) + ' Q' + f1(Math.cos(a - 0.12) * tip * 0.95) + ' ' + f1(Math.sin(a - 0.12) * tip * 0.95) + ' ' + f1(Math.cos(a + 0.04) * tip) + ' ' + f1(Math.sin(a + 0.04) * tip) +
            ' Q' + f1(Math.cos(a + 0.12) * tip * 0.8) + ' ' + f1(Math.sin(a + 0.12) * tip * 0.8) + ' ' + f1(Math.cos(a + 0.24) * 42) + ' ' + f1(Math.sin(a + 0.24) * 42) + 'Z" fill="' + ring[2] + '" stroke="' + shade(ring[2], -0.3) + '" stroke-width="0.8"/>' +
            '<path d="M' + f1(Math.cos(a) * 50) + ' ' + f1(Math.sin(a) * 50) + ' L' + f1(Math.cos(a + 0.03) * (tip - 4)) + ' ' + f1(Math.sin(a + 0.03) * (tip - 4)) + '" stroke="' + shade(ring[2], -0.35) + '" stroke-width="0.8" opacity="0.6"/>';
        }
      });
      return {
        back: m,
        ball: ball(c, id, { belly: '#F6E7CC', bellyY: 18, bellyRx: 20, bellyRy: 16, furLen: 3, seed: 'lion' + c.base }) +
          P.roundEar(-30, -34, 9, c, '#8A5A2A', id) + P.roundEar(30, -34, 9, c, '#8A5A2A', id),
        front: eyes(16, -8, { rx: 6.5, ry: 5.5, iris: '#C98E2B' }, e) +
          '<path d="M-9 4 q9 -4 18 0 q0 8 -9 11 q-9 -3 -9 -11z" fill="#9A5A4A" stroke="#5E3024" stroke-width="1"/>' +
          mouthY(20, '#4A261C', e, 6) + P.whiskerDots(18) + whiskers(19, '#FFFFFF', 18, 10) + sweat(e)
      };
    },
    elephant: function (e, id, c) {
      c = c || C('#9C9EA3', '#C9CBCF', '#6B6D72');
      return {
        back: '<path d="M-30 -30 C-62 -44 -76 -4 -62 22 C-54 34 -40 26 -36 12 Z" fill="' + c.base + '" stroke="' + c.dark + '" stroke-width="1.6"/>' +
          '<path d="M30 -30 C62 -44 76 -4 62 22 C54 34 40 26 36 12 Z" fill="' + c.base + '" stroke="' + c.dark + '" stroke-width="1.6"/>' +
          '<path d="M-38 -24 C-60 -30 -68 0 -58 16 M38 -24 C60 -30 68 0 58 16" fill="none" stroke="#D4A6A8" stroke-width="5" opacity="0.6"/>' +
          '<path d="M-50 -20 q-6 12 -2 24 M50 -20 q6 12 2 24" stroke="' + c.dark + '" stroke-width="1" fill="none" opacity="0.6"/>',
        ball: ball(c, id, { seed: 'ele' + c.base, smooth: true }) +
          '<path d="M-26 -36 q8 -4 14 2 M12 -34 q8 -4 14 2 M-34 -22 q6 2 8 8 M26 -14 q6 2 8 8 M-20 -44 q20 -6 40 0" stroke="' + c.dark + '" stroke-width="1" fill="none" opacity="0.5"/>',
        front: eyes(19, -12, { rx: 4.5, iris: '#3A2418' }, e) +
          '<path d="M-14 6 q-2 10 -10 12 q-4 0 -3 -3 q6 -2 7 -9z M14 6 q2 10 10 12 q4 0 3 -3 q-6 -2 -7 -9z" fill="#F4ECD8" stroke="#B8AE96" stroke-width="1"/>' +
          '<path d="M-9 -6 C-10 18 -8 36 2 44 C8 48 14 44 11 40 C4 34 8 16 9 -6 Z" fill="' + c.base + '" stroke="' + c.dark + '" stroke-width="1.6"/>' +
          '<path d="M-8 4 h16 M-8 10 h16 M-7 16 h15 M-6 22 h14 M-4 28 h12 M-1 34 h10" stroke="' + c.dark + '" stroke-width="0.9" opacity="0.6"/>' +
          (e === 'squish' ? '<ellipse cx="-14" cy="22" rx="3" ry="2.4" fill="#5A3434"/>' : '') + sweat(e)
      };
    },
    hedgehog: function (e, id) {
      var c = C('#9A8574', '#C8B5A2', '#5E4E40');
      var sp = '', r = prng('hedge');
      for (var i = 0; i < 40; i++) {
        var a = -Math.PI * 0.95 + i / 40 * Math.PI * 1.9, l = 10 + r() * 8;
        sp += 'M' + f1(Math.cos(a) * 44) + ' ' + f1(Math.sin(a) * 44) + 'L' + f1(Math.cos(a) * (50 + l)) + ' ' + f1(Math.sin(a) * (50 + l));
      }
      return {
        back: '<path d="' + sp + '" stroke="#4E3E32" stroke-width="3.4" stroke-linecap="round"/><path d="' + sp + '" stroke="#C9B6A0" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>',
        ball: ball(c, id, { furLen: 3, seed: 'hedge' }) +
          '<circle cx="-26" cy="-24" r="6" fill="#7E6A5C" opacity="0.7"/><circle cx="-26" cy="-24" r="3.5" fill="#6A584C" opacity="0.7"/><circle cx="28" cy="-18" r="4.5" fill="#7E6A5C" opacity="0.7"/>' +
          '<ellipse cx="0" cy="12" rx="26" ry="22" fill="#EAD8C2"/>',
        front: eyes(13, -2, { rx: 4.8, iris: '#1A110C', lid: false }, e) + '<ellipse cx="0" cy="12" rx="4" ry="3" fill="#2A1C16"/>' + mouthY(19, '#5A3A2C', e, 4) + sweat(e)
      };
    }
  };

  /* ---------- 海洋生物 ---------- */
  var OCEAN = {
    1: function (e, id) { // 小蝦
      var c = C('#EE8466', '#FFC2AA', '#B44E36');
      return {
        back: '<path d="M-8 -46 Q-26 -84 -58 -76 M8 -46 Q26 -84 58 -76" stroke="#C25638" stroke-width="2" fill="none"/>' +
          '<path d="M-10 46 l-6 10 M0 48 l0 10 M10 46 l6 10" stroke="#D86A4C" stroke-width="2.4" stroke-linecap="round"/>' +
          '<path d="M46 6 l16 -12 l-2 14 l4 12 l-18 -6z" fill="#F29C7E" stroke="#B44E36" stroke-width="1.4"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.32 }) +
          '<path d="M-40 4 Q0 22 40 4 M-36 18 Q0 34 36 18 M-28 30 Q0 44 28 30" stroke="#FFD8C8" stroke-width="3" fill="none" opacity="0.7"/>' +
          '<path d="M-40 4 Q0 22 40 4 M-36 18 Q0 34 36 18" stroke="#B44E36" stroke-width="1" fill="none" opacity="0.6"/>',
        front: '<path d="M-14 -30 l-4 -14 M14 -30 l4 -14" stroke="#B44E36" stroke-width="3"/>' +
          eye(-18, -46, { rx: 5, iris: '#141010', lid: false }, e) + eye(18, -46, { rx: 5, iris: '#141010', lid: false }, e) +
          (e === 'squish' ? '<ellipse cx="0" cy="-6" rx="3" ry="2.4" fill="#7A2A1A"/>' : '<path d="M-5 -8 q5 3 10 0" stroke="#8A3A28" stroke-width="1.4" fill="none"/>') + sweat(e)
      };
    },
    2: function (e, id) { // 海馬
      var c = C('#E3A23C', '#FFD58A', '#A8691A');
      return {
        back: '<path d="M-14 -46 l4 -16 l5 12 l5 -16 l5 16 l5 -12 l3 16" fill="#D08A28" stroke="#8A5410" stroke-width="1.4" stroke-linejoin="round"/>' +
          '<path d="M30 40 q24 6 20 24 q-4 12 -16 4 q-4 -6 4 -8" fill="none" stroke="#C4821F" stroke-width="7" stroke-linecap="round"/>',
        ball: ball(c, id, { smooth: true }) +
          '<path d="M-36 -10 Q0 0 36 -10 M-40 6 Q0 16 40 6 M-38 22 Q0 32 38 22 M-30 36 Q0 46 30 36" stroke="#A8691A" stroke-width="1.6" fill="none" opacity="0.6"/>' +
          '<g fill="#8A5410" opacity="0.5"><circle cx="-24" cy="-2" r="1.5"/><circle cx="18" cy="10" r="1.5"/><circle cx="-10" cy="26" r="1.5"/><circle cx="26" cy="-6" r="1.5"/></g>',
        front: '<path d="M-38 -6 h-24 q-6 4 0 9 h24z" fill="#E0A24A" stroke="#8A5410" stroke-width="1.4"/>' +
          eye(-10, -20, { rx: 7, iris: '#7A5A14' }, e) + eye(20, -20, { rx: 6, iris: '#7A5A14' }, e) +
          '<path d="M-17 -20 l-5 -2 M-17 -16 l-5 2" stroke="#6A4410" stroke-width="1"/>' + sweat(e)
      };
    },
    3: function (e, id) { // 小丑魚
      var c = C('#F06A1E', '#FFA662', '#B2440A');
      function band(x, w) { return '<path d="M' + x + ' -50 q' + (x > 0 ? 10 : -10) + ' 50 0 100" stroke="#111" stroke-width="' + (w + 4) + '" fill="none"/><path d="M' + x + ' -50 q' + (x > 0 ? 10 : -10) + ' 50 0 100" stroke="#FAFAF5" stroke-width="' + w + '" fill="none"/>'; }
      return {
        back: '<path d="M-14 -46 Q4 -72 24 -44" fill="#F06A1E" stroke="#111" stroke-width="2.2"/><path d="M46 -6 l18 -16 v40 z" fill="#F06A1E" stroke="#111" stroke-width="2.2" stroke-linejoin="round"/>' +
          '<path d="M-10 46 q10 14 20 0" fill="#F06A1E" stroke="#111" stroke-width="2"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.3 }) + '<defs><clipPath id="cl' + id + '"><circle r="49"/></clipPath></defs><g clip-path="url(#cl' + id + ')">' + band(-26, 11) + band(22, 11) + '</g>',
        front: eye(-6, -8, { rx: 8.5, iris: '#E0A82A' }, e) + eye(9, -8, { rx: 7, iris: '#E0A82A' }, e) +
          (e === 'squish' ? '<ellipse cx="2" cy="12" rx="3.4" ry="3" fill="#5A1A08"/>' : '<path d="M-4 12 q6 4 12 0" stroke="#5A1A08" stroke-width="1.6" fill="none"/>') + sweat(e)
      };
    },
    4: function (e, id) { // 河豚
      var c = C('#D9C186', '#F4E6BC', '#9C824A');
      var sp = '', i;
      for (i = 0; i < 26; i++) { var a = i / 26 * Math.PI * 2; sp += 'M' + f1(Math.cos(a - 0.06) * 48) + ' ' + f1(Math.sin(a - 0.06) * 48) + 'L' + f1(Math.cos(a) * 60) + ' ' + f1(Math.sin(a) * 60) + 'L' + f1(Math.cos(a + 0.06) * 48) + ' ' + f1(Math.sin(a + 0.06) * 48) + 'Z'; }
      var spots = '', r = prng('puff');
      for (i = 0; i < 22; i++) { var b = r() * Math.PI * 2, d = 12 + r() * 32; spots += '<circle cx="' + f1(Math.cos(b) * d) + '" cy="' + f1(Math.sin(b) * d * 0.8 - 8) + '" r="' + f1(1.8 + r() * 2.4) + '"/>'; }
      return {
        back: '<path d="' + sp + '" fill="#C8AE72" stroke="#7E6636" stroke-width="1"/>',
        ball: ball(c, id, { smooth: true, belly: '#F8F4E8', bellyY: 22, bellyRx: 32, bellyRy: 24 }) + '<g fill="#6E5428" opacity="0.65">' + spots + '</g>',
        front: eyes(19, -10, { rx: 9, iris: '#5C8A3A', white: true }, e) +
          (e === 'squish' ? '<ellipse cx="0" cy="16" rx="4" ry="3.4" fill="#5A3A1A"/>' : '<path d="M-4 16 q4 -3 8 0 q-4 3 -8 0z" fill="#9A6A3A" stroke="#5A3A1A" stroke-width="1"/>') + sweat(e)
      };
    },
    5: function (e, id) { // 章魚
      var c = C('#C9564C', '#EE9484', '#8A2E28');
      var arms = '';
      [-36, -16, 4, 24, 40].forEach(function (x, i) {
        var dx = i % 2 ? 6 : -6;
        arms += '<path d="M' + (x - 8) + ' 30 q' + dx + ' 22 ' + (dx + 4) + ' 30 q8 2 10 -6 q-4 -10 6 -24z" fill="' + c.base + '" stroke="' + c.dark + '" stroke-width="1.2"/>' +
          '<circle cx="' + (x + dx * 0.6) + '" cy="46" r="2.4" fill="#F4C2B4"/><circle cx="' + (x + dx * 0.8) + '" cy="54" r="2" fill="#F4C2B4"/>';
      });
      var spots = '', r = prng('octo');
      for (var j = 0; j < 30; j++) { var b = r() * Math.PI * 2, d = r() * 44; spots += '<circle cx="' + f1(Math.cos(b) * d) + '" cy="' + f1(Math.sin(b) * d - 4) + '" r="' + f1(0.8 + r() * 1.6) + '"/>'; }
      return { back: '', ball: ball(c, id, { smooth: true, gloss: 0.28 }) + '<g fill="#7A2420" opacity="0.4">' + spots + '</g>',
        front: arms + eyes(17, -6, { rx: 8, ry: 7, iris: '#D8A23A', pupil: 'bar' }, e) + sweat(e) };
    },
    6: function (e, id) { // 海龜
      var c = C('#6E5A3C', '#A68A5E', '#43351F');
      return {
        back: '<path d="M-46 22 q-18 4 -22 18 q14 4 26 -6z M46 22 q18 4 22 18 q-14 4 -26 -6z" fill="#7C8A52" stroke="#4A5630" stroke-width="1.2"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.22 }) +
          '<g fill="#8A7046" opacity="0.6"><path d="M-10 -36 l10 -5 l10 5 v10 l-10 5 l-10 -5z"/></g>' +
          '<g fill="none" stroke="#D8C08A" stroke-width="2" opacity="0.8"><path d="M-12 -38 l12 -7 l12 7 v14 l-12 7 l-12 -7z"/><path d="M-12 -24 l-14 8 l-18 -6 M12 -24 l14 8 l18 -6 M0 -17 v10 M-26 -16 l-2 14 M26 -16 l2 14"/></g>' +
          '<path d="M-30 4 Q0 -6 30 4 Q34 30 0 44 Q-34 30 -30 4z" fill="#8E9A5E" stroke="#4A5630" stroke-width="1.4"/>' +
          '<g fill="none" stroke="#5E6A3A" stroke-width="1" opacity="0.7"><path d="M-14 12 l6 -4 l6 4 l-6 4z M2 12 l6 -4 l6 4 l-6 4z M-6 24 l6 -4 l6 4 l-6 4z"/></g>',
        front: eyes(14, 10, { rx: 5, iris: '#1E1612' }, e) +
          (e === 'squish' ? '<ellipse cx="0" cy="32" rx="3.6" ry="2.6" fill="#2A2416"/>' : '<path d="M-8 30 q8 5 16 0" stroke="#2A2416" stroke-width="1.6" fill="none"/>') + sweat(e)
      };
    },
    7: function (e, id) { // 海豹
      var c = C('#A8A8A4', '#D4D4D0', '#6E6E6A');
      var spots = '', r = prng('seal');
      for (var j = 0; j < 14; j++) { var b = r() * Math.PI * 2, d = 18 + r() * 28; spots += '<ellipse cx="' + f1(Math.cos(b) * d) + '" cy="' + f1(Math.sin(b) * d) + '" rx="' + f1(2 + r() * 3) + '" ry="' + f1(1.5 + r() * 2) + '"/>'; }
      return {
        back: '<path d="M-44 20 q-16 10 -12 22 q12 0 18 -12z M44 20 q16 10 12 22 q-12 0 -18 -12z" fill="#8E8E8A" stroke="#5A5A56" stroke-width="1.2"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.28, belly: '#C8C8C2', bellyY: 22 }) + '<g fill="#5E5E5A" opacity="0.5">' + spots + '</g>',
        front: eyes(17, -8, { rx: 8.5, ry: 9, iris: '#120E0C', lid: false }, e) +
          '<ellipse cx="-9" cy="12" rx="9" ry="7" fill="#BDBDB6"/><ellipse cx="9" cy="12" rx="9" ry="7" fill="#BDBDB6"/>' +
          '<path d="M-4 6 q4 -3 8 0 q-1 4 -4 5 q-3 -1 -4 -5z" fill="#2A2422"/>' + P.whiskerDots(12) + whiskers(12, '#F2F0EA', 24, 14) +
          (e === 'squish' ? '<ellipse cx="0" cy="22" rx="3" ry="2.4" fill="#3A2A2A"/>' : '') + sweat(e)
      };
    },
    8: function (e, id) { // 海豚
      var c = C('#6F8496', '#A6B6C4', '#465A6A');
      return {
        back: '<path d="M-4 -48 q14 -24 30 -12 q-10 4 -8 14z" fill="#5C7082" stroke="#3A4C5A" stroke-width="1.4"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.35 }) + '<path d="M-50 6 Q-20 -4 10 10 Q36 20 50 6 A50 50 0 0 1 -50 6z" fill="#DDE3E8" opacity="0.95"/>',
        front: '<path d="M34 6 q24 0 26 8 q-2 8 -26 6z" fill="#8FA2B2" stroke="#465A6A" stroke-width="1.2"/><path d="M36 14 h22" stroke="#465A6A" stroke-width="1"/>' +
          eye(12, -4, { rx: 5, iris: '#1E1A18' }, e) + eye(-18, -6, { rx: 4.5, iris: '#1E1A18' }, e) +
          '<ellipse cx="-4" cy="-38" rx="3" ry="1.6" fill="#3A4C5A"/>' + sweat(e)
      };
    },
    9: function (e, id) { // 鯊魚
      var c = C('#6E7F8C', '#9EAFBC', '#43525E');
      return {
        back: '<path d="M-14 -46 q16 -36 34 -4z" fill="#5C6D7A" stroke="#36444E" stroke-width="1.4" stroke-linejoin="round"/><path d="M46 -2 l18 -14 l-6 18 l6 18 l-18 -12z" fill="#5C6D7A" stroke="#36444E" stroke-width="1.2"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.28 }) + '<path d="M-50 6 Q0 -2 50 6 A50 50 0 0 1 -50 6z" fill="#EEF0F0"/>' +
          '<path d="M30 -8 q-3 8 0 16 M35 -9 q-3 8 0 16 M40 -8 q-3 8 0 16" stroke="#36444E" stroke-width="1.4" fill="none" opacity="0.7"/>',
        front: eyes(18, -12, { rx: 4.5, iris: '#0E0C0C', lid: false }, e) +
          (e === 'normal' ? '<path d="M-20 18 Q0 28 20 18 Q0 22 -20 18z" fill="#4A2A2E"/><path d="M-16 19 l3 4 l3 -3 l3 4 l3 -3 l3 4 l3 -3 l3 4 l3 -3 l3 3" fill="#fff" stroke="#9A9090" stroke-width="0.6"/>'
            : '<path d="M-14 20 q14 ' + (e === 'squish' ? 8 : -2) + ' 28 0" stroke="#36444E" stroke-width="2" fill="none"/>') + sweat(e)
      };
    },
    10: function (e, id) { // 鯨魚（座頭鯨）
      var c = C('#2F3D55', '#56698A', '#1A2232');
      return {
        back: '<path d="M0 -50 q-4 -14 -14 -20 M0 -50 q0 -16 0 -24 M0 -50 q4 -14 14 -20" stroke="#BEE6FF" stroke-width="3.6" fill="none" stroke-linecap="round"/>' +
          '<circle cx="-15" cy="-72" r="3.4" fill="#BEE6FF"/><circle cx="0" cy="-76" r="3.4" fill="#BEE6FF"/><circle cx="15" cy="-72" r="3.4" fill="#BEE6FF"/>' +
          '<path d="M-48 20 q-20 6 -24 22 q16 2 28 -10z M48 20 q20 6 24 22 q-16 2 -28 -10z" fill="#3A4A66" stroke="#1A2232" stroke-width="1.2"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.3 }) + '<path d="M-44 18 Q0 8 44 18 A50 50 0 0 1 -44 18z" fill="#A9B4C2"/>' +
          '<path d="M-36 24 Q0 16 36 24 M-32 30 Q0 22 32 30 M-26 36 Q0 30 26 36 M-18 42 Q0 37 18 42" stroke="#6E7C8E" stroke-width="1.3" fill="none"/>' +
          '<g fill="#4A5A78"><circle cx="-14" cy="-30" r="2.4"/><circle cx="-4" cy="-36" r="2.4"/><circle cx="8" cy="-34" r="2.4"/><circle cx="18" cy="-28" r="2.4"/><circle cx="-22" cy="-22" r="2"/></g>',
        front: eyes(26, 2, { rx: 4.5, iris: '#0E0C10', lid: false }, e) +
          (e === 'squish' ? '<ellipse cx="0" cy="12" rx="4" ry="3" fill="#0E1018"/>' : '<path d="M-30 12 Q0 20 30 12" stroke="#141A26" stroke-width="1.8" fill="none"/>') + sweat(e)
      };
    }
  };

  var ZOO = ['chick', 'mouse', 'rabbit', 'cat', 'dog', 'pig', 'sheep', 'panda', 'lion', 'elephant'];

  /* ---------- 甜點：寫實的動物臉＋甜點質感身體 ---------- */
  function dessert(level, id, sp) {
    var out = '';
    switch (level) {
      case 1:
        sp.back = '<path d="M-44 0 l-22 -16 l4 14 l-6 6 l6 6 l-4 14 l22 -16z M44 0 l22 -16 l-4 14 l6 6 l-6 6 l4 14 l-22 -16z" fill="#F7A6C8" stroke="#C25C8A" stroke-width="1.4" stroke-linejoin="round"/>' +
          '<path d="M-60 -10 l10 8 M-60 10 l10 -8 M60 -10 l-10 8 M60 10 l-10 -8" stroke="#C25C8A" stroke-width="1" opacity="0.6"/>' + (sp.back || '');
        out = '<path d="M-44 -22 Q0 -4 44 -22 M-48 0 Q0 18 48 0 M-42 22 Q0 38 42 22" stroke="#FFFFFF" stroke-width="4" fill="none" opacity="0.45"/>' +
          '<ellipse cx="-18" cy="-28" rx="14" ry="7" fill="#fff" opacity="0.55" transform="rotate(-28 -18 -28)"/>';
        break;
      case 2:
        out = '<path d="M-50 -4 h100 v10 h-100z" fill="#FFF8EC"/>' +
          '<path d="M-50 -6 q4 3 8 0 q4 3 8 0 q4 3 8 0 q4 3 8 0 q4 3 8 0 q4 3 8 0 q4 3 8 0 q4 3 8 0 q4 3 8 0 q4 3 8 0 q4 3 8 0 q4 3 8 0 q4 3 8 0" stroke="#D88AAE" stroke-width="2.4" fill="none"/>' +
          '<path d="M-50 8 q4 -3 8 0 q4 -3 8 0 q4 -3 8 0 q4 -3 8 0 q4 -3 8 0 q4 -3 8 0 q4 -3 8 0 q4 -3 8 0 q4 -3 8 0 q4 -3 8 0 q4 -3 8 0 q4 -3 8 0 q4 -3 8 0" stroke="#D88AAE" stroke-width="2.4" fill="none"/>';
        break;
      case 3:
        out = '<circle r="47" fill="none" stroke="#E8C49A" stroke-width="6" opacity="0.55"/>' + (function () { var s = '', r = prng('mallow'); for (var i = 0; i < 40; i++) { var a = r() * 6.28, d = r() * 46; s += '<circle cx="' + f1(Math.cos(a) * d) + '" cy="' + f1(Math.sin(a) * d) + '" r="0.9" fill="#FFFFFF"/>'; } return s; })();
        break;
      case 4:
        out = '<defs>' + grad('cr' + id, '#B56A2A', '#7A3A12') + '</defs>' +
          '<path d="M-48 -14 Q-48 -50 0 -50 Q48 -50 48 -14 q-6 8 -10 0 q-4 14 -10 2 q-6 10 -12 0 q-6 14 -12 2 q-6 10 -12 0 q-6 12 -12 0 q-4 8 -8 0 q-6 8 -10 0z" fill="url(#cr' + id + ')"/>' +
          '<path d="M-30 -40 q20 -8 40 -4" stroke="#F0B47A" stroke-width="3" fill="none" opacity="0.7" stroke-linecap="round"/>';
        break;
      case 5:
        out = '<path d="M-49 -6 Q-46 -48 0 -50 Q46 -48 49 -6 q-8 6 -12 -2 q-6 10 -14 0 q-6 12 -14 0 q-6 10 -14 0 q-6 12 -14 0 q-6 8 -12 4z" fill="#F48DB6" stroke="#C25C8A" stroke-width="1.2"/>' +
          '<path d="M-30 -38 q20 -8 40 -4" stroke="#FFD0E2" stroke-width="3" fill="none" stroke-linecap="round"/>' + P.sprinkles('donut', -10, ['#5AC8FA', '#FFE45C', '#7ED957', '#FFFFFF', '#B79BFF']);
        break;
      case 6:
        sp.over = '<path d="M-40 22 L40 22 L32 52 L-32 52 Z" fill="#8FCFEA" stroke="#3E8FB4" stroke-width="1.6" stroke-linejoin="round"/>' +
          '<path d="M-30 22 l-4 30 M-18 22 l-2 30 M-6 22 v30 M6 22 v30 M18 22 l2 30 M30 22 l4 30" stroke="#3E8FB4" stroke-width="1.2"/>' +
          '<path d="M-42 22 q6 -6 12 0 q6 -6 12 0 q6 -6 12 0 q6 -6 12 0 q6 -6 12 0 q6 -6 12 0 q6 -6 12 0" stroke="#F6C4CF" stroke-width="5" fill="none"/>';
        out = P.sprinkles('cup', -18, ['#FFFFFF', '#FFE45C', '#9B7BFF']);
        break;
      case 7:
        sp.over = '<path d="M-26 40 q2 12 -2 16 q-4 -2 -2 -16 M14 42 q4 10 0 14 q-4 -2 -2 -14 M-4 44 q2 8 -1 10" stroke="#FFF7E6" stroke-width="7" stroke-linecap="round" fill="none"/>';
        out = '<path d="M-30 46 l30 18 l30 -18z" fill="#D9A15A" stroke="#9C6A2C" stroke-width="1.2"/><path d="M-20 52 l20 -6 l20 6 M-10 58 l10 -6 l10 6" stroke="#9C6A2C" stroke-width="1" fill="none"/>';
        break;
      case 8:
        out = '<path d="M-50 -12 Q0 -2 50 -12 M-50 8 Q0 18 50 8 M-46 28 Q0 38 46 28" stroke="#9C5A22" stroke-width="3" fill="none" opacity="0.8"/>' +
          '<path d="M-50 -10 Q0 0 50 -10 M-50 10 Q0 20 50 10" stroke="#F6D29A" stroke-width="1.4" fill="none"/>' +
          '<rect x="-10" y="-52" width="20" height="10" rx="2" fill="#FFF0A0" stroke="#D9B44A" stroke-width="1.2"/>' +
          '<path d="M-24 -46 q-4 14 0 22 q3 6 5 -2 q1 -10 8 -18" fill="#B5651D" opacity="0.65"/>';
        break;
      case 9:
        sp.over = '<path d="M0 -48 q-16 -2 -14 -18 q4 -10 14 -6 q10 -4 14 6 q2 16 -14 18z" fill="#E8344C" stroke="#A3202F" stroke-width="1.2"/>' +
          '<g fill="#FFE07A"><circle cx="-6" cy="-60" r="0.9"/><circle cx="4" cy="-62" r="0.9"/><circle cx="0" cy="-54" r="0.9"/><circle cx="8" cy="-56" r="0.9"/><circle cx="-8" cy="-54" r="0.9"/></g>' +
          '<path d="M-8 -70 l8 -6 l8 6 l-8 -2z" fill="#4FA83A"/>';
        out = '<path d="M-50 26 Q0 34 50 26" stroke="#F8A6C0" stroke-width="7" fill="none"/>';
        break;
      case 10:
        sp.over = [-18, 0, 18].map(function (x) {
          return '<rect x="' + (x - 3) + '" y="-70" width="6" height="20" rx="2" fill="#FFF" stroke="#E46C9A" stroke-width="1.2"/><path d="M' + (x - 3) + ' -64 l6 -3 M' + (x - 3) + ' -58 l6 -3" stroke="#E46C9A" stroke-width="1.4"/>' +
            '<path d="M' + x + ' -72 q-5 -6 0 -13 q5 7 0 13z" fill="#FFB43C" stroke="#E07A12" stroke-width="1"/>';
        }).join('');
        out = '<path d="M-50 -16 Q0 -6 50 -16 M-48 24 Q0 34 48 24" stroke="#F49CC4" stroke-width="7" fill="none"/>' + P.sprinkles('bday', 36, ['#FFE45C', '#7ED957', '#5AC8FA']);
        break;
    }
    return out;
  }
  var SWEET_COL = [C('#F8D85A', '#FFF6B8', '#D4A824'), C('#F6A6C6', '#FFD7E6', '#C9688E'), C('#FFF7FA', '#FFFFFF', '#E4D6D2'), C('#F4D07A', '#FFEDB8', '#C99A3A'),
    C('#E2AA6A', '#F6D2A0', '#A86E34'), C('#F7B9C6', '#FFE2E8', '#D07E90'), C('#F8EEDC', '#FFFFFF', '#D8C8AA'), C('#E8B66E', '#F8DBA8', '#A8723A'), C('#FFF3E6', '#FFFFFF', '#E2CFB6'), C('#BCD8F4', '#E6F2FF', '#7EA6D2')];

  /* ---------- 太空：寫實的動物臉＋太空配色與配件 ---------- */
  var SPACE = [
    { sp: 'chick', col: C('#F7DA5C', '#FFF6B8', '#C9A21E'), acc: function () { return '<path d="M0 -48 v-12" stroke="#C9A21E" stroke-width="2.4"/>' + P.star(0, -66, 10, '#FFF07A'); } },
    { sp: 'rabbit', col: C('#D6CCF2', '#F2EEFF', '#9A8CC8'), front: function () { return '<path d="M-6 -36 a10 10 0 1 0 12 -2 a7.5 7.5 0 1 1 -12 2z" fill="#FFE45C" stroke="#C9A21E" stroke-width="1.2"/>'; } },
    { sp: 'cat', col: C('#9AD56A', '#CFF0A8', '#5A9A34'), opt: { stripe: '#4A8A2A', iris: '#E05AC8', muzzle: '#E8F8D8' },
      acc: function () { return '<path d="M-14 -46 Q-20 -62 -26 -68 M14 -46 Q20 -62 26 -68" stroke="#4C8A2E" stroke-width="2.4" fill="none" stroke-linecap="round"/><circle cx="-26" cy="-68" r="4.5" fill="#FF6FB5"/><circle cx="26" cy="-68" r="4.5" fill="#FF6FB5"/>'; } },
    { sp: 'dog', col: C('#C98D52', '#E8B985', '#8C5A2B'), helmet: true },
    { sp: 'pig', col: C('#F2A4BA', '#FCD2DE', '#C46C86'), acc: function () { return '<path d="M-48 10 l-14 22 l16 -4z M48 10 l14 22 l-16 -4z" fill="#E8485C" stroke="#A32438" stroke-width="1.4" stroke-linejoin="round"/>'; }, flame: true },
    { sp: 'hedgehog' },
    { sp: 'sheep', wool: '#EEE6FF', col: C('#D8CCEE', '#F2ECFF', '#9A8CC0'), ring: true },
    { sp: 'panda', col: C('#E2DAFF', '#F6F2FF', '#A89ADA'), patch: '#2A2060', galaxy: true },
    { sp: 'lion', col: C('#F2C66E', '#FFE6A8', '#B88A30'), mane: ['#1F5E9E', '#2E86C8', '#5CC0F0'], comet: true },
    { sp: 'elephant', col: C('#5B4E92', '#8C7EC8', '#352A62'), stars: true }
  ];

  function build(world, level, expr) {
    var id = 'k' + (uid++), e = expr || 'normal', sp;
    if (world === 'ocean') sp = OCEAN[level](e, id);
    else if (world === 'sweets') {
      sp = level === 9 ? SPECIES.lion(e, id, SWEET_COL[8], ['#F4A6C0', '#FFC8DA', '#FFE6EF'])
        : SPECIES[ZOO[level - 1]](e, id, SWEET_COL[level - 1]);
      sp.ball = ball(SWEET_COL[level - 1], id + 's', { smooth: true, gloss: 0.3 }) + dessert(level, id, sp);
    } else if (world === 'space') {
      var d = SPACE[level - 1];
      sp = d.sp === 'sheep' ? SPECIES.sheep(e, id, d.col, d.wool) : d.sp === 'panda' ? SPECIES.panda(e, id, d.col, d.patch)
        : d.sp === 'lion' ? SPECIES.lion(e, id, d.col, d.mane) : d.sp === 'hedgehog' ? SPECIES.hedgehog(e, id) : SPECIES[d.sp](e, id, d.col, d.opt);
      if (d.acc) sp.back = d.acc() + (sp.back || '');
      if (d.front) sp.front = d.front() + sp.front;
      if (d.helmet) sp.overTop = '<circle r="60" fill="#CFEFFF" opacity="0.22" stroke="#E8F7FF" stroke-width="2.4"/><path d="M-40 -40 A56 56 0 0 1 -8 -57" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.8"/><path d="M-60 0 h-6 M60 0 h6" stroke="#9AB0C8" stroke-width="5"/>';
      if (d.flame) sp.over = '<path d="M-10 48 q10 28 20 0 q-10 8 -20 0z" fill="#FFB43C" stroke="#E07A12" stroke-width="1.2"/><path d="M-5 50 q5 14 10 0" fill="#FFE45C"/>';
      if (d.ring) {
        sp.back = '<ellipse cx="0" cy="6" rx="70" ry="15" fill="none" stroke="#E8A050" stroke-width="6" transform="rotate(-14)"/>' + sp.back;
        sp.over = '<path d="M-68 6 A70 15 0 0 0 68 6" fill="none" stroke="#F2B866" stroke-width="6" transform="rotate(-14)"/>';
      }
      if (d.galaxy) sp.ball += '<path d="M-36 24 q20 -30 52 -12 q-30 -4 -42 16z" fill="#7B5CFF" opacity="0.45"/>' + P.star(-30, -30, 3.5, '#FFFFFF') + P.star(32, 30, 3, '#FFF07A') + P.star(26, -36, 2.5, '#FFFFFF');
      if (d.comet) sp.back = '<path d="M-40 30 Q-84 54 -100 40 Q-76 30 -60 4z" fill="#7CE0FF" opacity="0.7"/>' + sp.back;
      if (d.stars) sp.ball += P.star(-30, -24, 3.5, '#FFFFFF') + P.star(26, -34, 3, '#FFF07A') + P.star(34, 18, 3.5, '#FFFFFF') + P.star(-38, 20, 2.5, '#FFF07A');
    } else sp = SPECIES[ZOO[level - 1]](e, id);
    return sp;
  }

  function svg(world, level, expr, opts) {
    opts = opts || {};
    var sp = build(world, level, expr);
    var parts = [sp.back || '', sp.ball || '', sp.front || '', sp.over || '', sp.overTop || ''];
    if (opts.number) parts.push('<circle cx="34" cy="-36" r="13" fill="#fff" stroke="#2B2233" stroke-width="2.4"/><text x="34" y="-31" text-anchor="middle" font-family="Arial,sans-serif" font-weight="700" font-size="16" fill="#2B2233">' + level + '</text>');
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-80 -80 160 160" width="160" height="160">' + parts.join('') + '</svg>';
  }

  /* ---------- 點陣快取（瀏覽器） ---------- */
  var cache = {};
  function image(world, level, expr, opts) {
    opts = opts || {};
    var key = world + level + (expr || 'normal') + (opts.number ? 'n' : '');
    if (cache[key]) return cache[key];
    var img = new Image();
    img.decoding = 'async';
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg(world, level, expr, opts));
    cache[key] = img;
    return img;
  }
  function preload(world) {
    for (var l = 1; l <= 10; l++) ['normal', 'squish', 'nervous'].forEach(function (e) { image(world, l, e); });
  }

  /** 道具圖示 */
  function itemSvg(type) {
    if (type === 'rainbow') {
      var cols = ['#FF5C5C', '#FFA53C', '#FFE45C', '#6FD96F', '#5AB8FF', '#9B7BFF'];
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120"><defs><clipPath id="rb"><circle r="46"/></clipPath><radialGradient id="rg" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#fff" stop-opacity="0.6"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity="0.25"/></radialGradient></defs>' +
        '<g clip-path="url(#rb)">' + cols.map(function (c, i) { return '<rect x="-50" y="' + (-50 + i * 17) + '" width="100" height="18" fill="' + c + '"/>'; }).join('') + '</g>' +
        '<circle r="46" fill="url(#rg)"/><circle r="46" fill="none" stroke="#6A4FA8" stroke-width="2"/>' + P.star(0, 0, 14, '#FFFFFF') + '</svg>';
    }
    if (type === 'bomb') {
      var cat = SPECIES.cat('normal', 'bomb', C('#3A3A44', '#6A6A78', '#1A1A22'), { stripe: '#22222A', iris: '#F2C23A', muzzle: '#55556A' });
      return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-70 -70 140 140">' +
        '<path d="M14 -46 q12 -16 26 -10" stroke="#8A6A3A" stroke-width="4" fill="none" stroke-linecap="round"/>' + P.star(42, -58, 9, '#FFB43C') +
        cat.back + cat.ball + cat.front + '</svg>';
    }
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="-60 -60 120 120">' +
      '<rect x="-36" y="-30" width="72" height="66" rx="10" fill="#C98B4E" stroke="#7A4E22" stroke-width="3"/>' +
      '<path d="M-36 -10 h72 M-36 12 h72" stroke="#7A4E22" stroke-width="1.4" opacity="0.6"/>' +
      '<path d="M-48 -20 q-8 20 0 40 M-56 -10 q-6 10 0 20 M48 -20 q8 20 0 40 M56 -10 q6 10 0 20" stroke="#5AB8FF" stroke-width="4" fill="none" stroke-linecap="round"/>' +
      '<circle cx="-12" cy="2" r="12" fill="#F4CC45" stroke="#B9932A" stroke-width="2"/><circle cx="14" cy="10" r="14" fill="#F0AFA8" stroke="#C45A82" stroke-width="2"/></svg>';
  }
  function itemImage(type) {
    var key = 'item-' + type;
    if (cache[key]) return cache[key];
    var img = new Image();
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(itemSvg(type));
    cache[key] = img;
    return img;
  }

  var api = { svg: svg, image: image, preload: preload, itemSvg: itemSvg, itemImage: itemImage, shade: shade };
  root.MZArt = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof self !== 'undefined' ? self : this);
