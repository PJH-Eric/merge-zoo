/* ===== animals-more.js — 冰原、叢林、恐龍三個世界的 30 隻角色（偏寫實，接在 animals.js 之後載入）===== */
(function (root) {
  'use strict';
  var Art = root.MZArt || require('./animals.js');
  var K = Art.kit, shade = Art.shade;
  var ball = K.ball, eye = K.eye, eyes = K.eyes, sweat = K.sweat, mouthY = K.mouthY, whiskers = K.whiskers, P = K.P, C = K.C, prng = K.prng, f1 = K.f1;

  function spots(seed, n, col, rmin, rmax, op, ring) {
    var r = prng(seed), s = '';
    for (var i = 0; i < n; i++) {
      var a = r() * Math.PI * 2, d = 10 + r() * 36, x = Math.cos(a) * d, y = Math.sin(a) * d, rr = rmin + r() * (rmax - rmin);
      s += ring ? '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(rr) + '" fill="none" stroke="' + col + '" stroke-width="' + f1(rr * 0.55) + '" opacity="' + op + '"/>' +
        '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(rr * 0.35) + '" fill="' + col + '" opacity="' + (op * 0.6) + '"/>'
        : '<circle cx="' + f1(x) + '" cy="' + f1(y) + '" r="' + f1(rr) + '" fill="' + col + '" opacity="' + op + '"/>';
    }
    return s;
  }
  function scales(seed, col) {
    var r = prng(seed), s = '';
    for (var i = 0; i < 60; i++) {
      var a = r() * Math.PI * 2, d = r() * 46, x = Math.cos(a) * d, y = Math.sin(a) * d;
      s += 'M' + f1(x - 3) + ' ' + f1(y) + ' q3 -3 6 0';
    }
    return '<path d="' + s + '" fill="none" stroke="' + col + '" stroke-width="1" opacity="0.45"/>';
  }
  function nostrils(y, col, dx) { dx = dx || 5; return '<ellipse cx="' + (-dx) + '" cy="' + y + '" rx="1.8" ry="1.2" fill="' + col + '"/><ellipse cx="' + dx + '" cy="' + y + '" rx="1.8" ry="1.2" fill="' + col + '"/>'; }
  function grin(y, w, col, expr, teeth) {
    if (expr === 'squish') return '<ellipse cx="0" cy="' + (y + 3) + '" rx="4" ry="3.2" fill="#4A2222"/>';
    var s = '<path d="M' + (-w) + ' ' + y + ' Q0 ' + (y + (expr === 'nervous' ? 2 : 7)) + ' ' + w + ' ' + y + '" fill="none" stroke="' + col + '" stroke-width="1.8" stroke-linecap="round"/>';
    if (teeth) { var t = ''; for (var x = -w + 4; x < w - 2; x += 5) t += 'M' + x + ' ' + (y + 1.5) + ' l2 3.5 l2 -3.5'; s += '<path d="' + t + '" fill="#FFFDF2" stroke="#BDB6A0" stroke-width="0.6"/>'; }
    return s;
  }

  /* ---------- 冰原 ---------- */
  var POLAR = {
    1: function (e, id) { // 小企鵝
      var c = C('#9EA4AA', '#D8DCDF', '#5E646A');
      return { back: '<path d="M-48 6 q-12 14 -6 28 q8 -8 10 -18z M48 6 q12 14 6 28 q-8 -8 -10 -18z" fill="#7E848A"/>' +
        '<path d="M-14 46 l-6 8 h12z M14 46 l6 8 h-12z" fill="#5A4A3A"/>',
        ball: ball(c, id, { furLen: 7, seed: 'pchick' }) + '<path d="M0 -26 C-26 -30 -32 -6 -24 10 C-16 22 -4 18 0 10 C4 18 16 22 24 10 C32 -6 26 -30 0 -26z" fill="#F4F4F2" opacity="0.95"/>',
        front: eyes(13, -8, { rx: 5, iris: '#141012', lid: false }, e) + '<path d="M-5 2 l5 -3 l5 3 l-5 6z" fill="#2A2A2E"/>' + sweat(e) };
    },
    2: function (e, id) { // 旅鼠
      var c = C('#B8865A', '#E2BC94', '#7A5232');
      return { back: P.roundEar(-28, -34, 9, c, '#E8B0A0', id) + P.roundEar(28, -34, 9, c, '#E8B0A0', id),
        ball: ball(c, id, { belly: '#F2E4D0', bellyY: 22, bellyRx: 28, bellyRy: 22, furLen: 4, seed: 'lem' }) + '<path d="M0 -50 C-6 -30 -4 -14 0 -6 C4 -14 6 -30 0 -50z" fill="#3A2A20" opacity="0.6"/>',
        front: eyes(15, -6, { rx: 5.5, iris: '#0E0A08', lid: false }, e) + '<ellipse cx="0" cy="9" rx="4" ry="3" fill="#C9787A"/>' + mouthY(15, '#6A3A30', e, 4) + whiskers(11, '#F8F2E8', 22, 8) + sweat(e) };
    },
    3: function (e, id) { // 北極兔
      var c = C('#F2F3F2', '#FFFFFF', '#BFC6CC');
      return { back: P.longEar(-1, c, '#EFC8C4', '#2A2A2E') + P.longEar(1, c, '#EFC8C4', '#2A2A2E'),
        ball: ball(c, id, { furLen: 5, seed: 'ahare' }),
        front: eyes(20, -8, { rx: 6.5, ry: 7, iris: '#5A3A22' }, e) + '<path d="M-4 8 q4 -3 8 0 l-4 3z" fill="#D88A8C"/>' + mouthY(14, '#6B4038', e, 5) + whiskers(12, '#BFC6CC', 22, 9) + sweat(e) };
    },
    4: function (e, id) { // 北極狐
      var c = C('#F4F2EE', '#FFFFFF', '#C8C4BC');
      return { back: '<path d="M-44 -10 L-36 -50 L-14 -40 Z M44 -10 L36 -50 L14 -40 Z" fill="#F4F2EE" stroke="#B8B2A6" stroke-width="1.4" stroke-linejoin="round"/><path d="M-37 -20 L-33 -42 L-21 -38 Z M37 -20 L33 -42 L21 -38 Z" fill="#D8C8C0"/>',
        ball: ball(c, id, { furLen: 7, seed: 'afox' }) + '<path d="M-14 0 Q0 30 14 0 Q0 8 -14 0z" fill="#E6E0D6"/>',
        front: eyes(15, -8, { rx: 6, ry: 5, iris: '#B8862A' }, e) + P.dogNose(10) + mouthY(18, '#5A4A40', e, 5) + whiskers(15, '#8A8070', 20, 10) + sweat(e) };
    },
    5: function (e, id) { // 雪鴞
      var c = C('#F6F6F2', '#FFFFFF', '#C6C8C8');
      var fl = spots('owl', 22, '#2A2A2E', 1, 2.4, 0.7);
      return { back: '',
        ball: ball(c, id, { furLen: 4, seed: 'owl' }) + fl + '<path d="M-40 -14 Q-20 -30 0 -18 Q20 -30 40 -14" fill="none" stroke="#C6C8C8" stroke-width="1.4"/>' +
          '<circle cx="-16" cy="-6" r="14" fill="#FFFFFF" opacity="0.8"/><circle cx="16" cy="-6" r="14" fill="#FFFFFF" opacity="0.8"/>',
        front: eyes(16, -6, { rx: 8.5, iris: '#F2C21E', rim: '#1A1A1A', lid: e === 'normal' }, e) + '<path d="M-4 4 q4 -2 8 0 q-1 8 -4 10 q-3 -2 -4 -10z" fill="#2A2A2E"/>' + sweat(e) };
    },
    6: function (e, id) { // 皇帝企鵝
      var c = C('#2A2C34', '#5A5E6A', '#111216');
      return { back: '<path d="M-48 8 q-12 16 -4 30 q8 -10 10 -22z M48 8 q12 16 4 30 q-8 -10 -10 -22z" fill="#1E2028"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.3 }) +
          '<path d="M0 -14 C-30 -16 -40 20 -26 40 Q0 54 26 40 C40 20 30 -16 0 -14z" fill="#F6F4EE"/>' +
          '<path d="M-36 -6 q-6 10 4 22 q8 -6 6 -18z M36 -6 q6 10 -4 22 q-8 -6 -6 -18z" fill="#F2B42E" opacity="0.95"/>' +
          '<path d="M-20 -4 q20 -6 40 0 q-4 14 -20 14 q-16 0 -20 -14z" fill="#FFF3C4" opacity="0.7"/>',
        front: eyes(15, -18, { rx: 4.5, iris: '#121214', lid: false }, e) +
          '<path d="M-3 -10 L0 -12 L3 -10 L2 8 L0 12 L-2 8z" fill="#1E1E22"/><path d="M-2 0 L0 1 L2 0 L1.6 6 L0 8 L-1.6 6z" fill="#E8862E"/>' + sweat(e) };
    },
    7: function (e, id) { // 北極狼
      var c = C('#E6E8EA', '#FFFFFF', '#A8AEB4');
      return { back: '<path d="M-44 -12 L-34 -58 L-12 -42 Z M44 -12 L34 -58 L12 -42 Z" fill="#E2E4E6" stroke="#9AA0A6" stroke-width="1.4" stroke-linejoin="round"/><path d="M-36 -22 L-32 -48 L-20 -40 Z M36 -22 L32 -48 L20 -40 Z" fill="#B8A8A4"/>',
        ball: ball(c, id, { furLen: 6, seed: 'wolf' }) + '<path d="M-10 -40 Q0 -10 -16 10 Q0 30 16 10 Q0 -10 10 -40z" fill="#F8F8F8" opacity="0.8"/>' +
          '<path d="M-30 -20 q8 -6 16 -2 M30 -20 q-8 -6 -16 -2" stroke="#9AA0A6" stroke-width="2" fill="none"/>',
        front: eyes(15, -10, { rx: 6, ry: 5, iris: '#D8A630' }, e) + P.dogNose(10) + mouthY(18, '#3A3436', e, 6) + sweat(e) };
    },
    8: function (e, id) { // 馴鹿
      var c = C('#8C6A4E', '#BA9878', '#5A4230');
      function antler(s) {
        return '<path d="M' + (s * 18) + ' -42 C' + (s * 24) + ' -60 ' + (s * 30) + ' -68 ' + (s * 44) + ' -74 M' + (s * 26) + ' -58 L' + (s * 16) + ' -72 M' + (s * 34) + ' -66 L' + (s * 30) + ' -78 M' + (s * 38) + ' -70 L' + (s * 52) + ' -64" stroke="#E2CDA4" stroke-width="5" fill="none" stroke-linecap="round"/>' +
          '<path d="M' + (s * 18) + ' -42 C' + (s * 24) + ' -60 ' + (s * 30) + ' -68 ' + (s * 44) + ' -74" stroke="#B09A70" stroke-width="1.2" fill="none"/>';
      }
      return { back: antler(-1) + antler(1) + '<ellipse cx="-44" cy="-20" rx="12" ry="6" fill="#8C6A4E" stroke="#5A4230" transform="rotate(25 -44 -20)"/><ellipse cx="44" cy="-20" rx="12" ry="6" fill="#8C6A4E" stroke="#5A4230" transform="rotate(-25 44 -20)"/>',
        ball: ball(c, id, { belly: '#D8C4A8', bellyY: 20, bellyRx: 20, bellyRy: 22, furLen: 3, seed: 'deer' }) + '<path d="M-6 -48 Q0 -20 -10 0 Q0 6 10 0 Q0 -20 6 -48z" fill="#6E5038" opacity="0.4"/>',
        front: eyes(18, -10, { rx: 6.5, iris: '#1E140E' }, e) + '<ellipse cx="0" cy="14" rx="9" ry="6.5" fill="#2E2220"/><ellipse cx="-3" cy="12" rx="2.4" ry="1" fill="#fff" opacity="0.4"/>' + mouthY(25, '#3A2820', e, 5) + sweat(e) };
    },
    9: function (e, id) { // 海象
      var c = C('#B98668', '#DDB49A', '#7E5440');
      return { back: '<path d="M-46 22 q-16 10 -10 22 q12 -2 16 -14z M46 22 q16 10 10 22 q-12 -2 -16 -14z" fill="#9A6A50"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.18 }) + '<path d="M-30 -30 q10 -4 20 0 M10 -32 q10 -2 18 2 M-36 -12 q6 4 6 10 M30 -14 q-6 4 -6 10" stroke="#7E5440" stroke-width="1" fill="none" opacity="0.6"/>',
        front: eyes(19, -16, { rx: 4.2, iris: '#1E140E' }, e) +
          '<ellipse cx="-11" cy="6" rx="13" ry="10" fill="#C99A7E"/><ellipse cx="11" cy="6" rx="13" ry="10" fill="#C99A7E"/>' + P.whiskerDots(4) + P.whiskerDots(9) +
          '<path d="M-8 12 q-2 22 -4 30 q4 2 6 0 q0 -14 2 -30z M8 12 q2 22 4 30 q-4 2 -6 0 q0 -14 -2 -30z" fill="#FBF6E6" stroke="#C8BC9A" stroke-width="1"/>' +
          '<ellipse cx="0" cy="-4" rx="4" ry="2.4" fill="#4A2E24"/>' + whiskers(8, '#F4E6D0', 22, 18) + sweat(e) };
    },
    10: function (e, id) { // 北極熊
      var c = C('#F2ECDC', '#FFFFFF', '#C8BEA2');
      return { back: P.roundEar(-34, -34, 11, c, '#D8CEB4', id) + P.roundEar(34, -34, 11, c, '#D8CEB4', id),
        ball: ball(c, id, { furLen: 5, seed: 'pbear' }) + '<ellipse cx="0" cy="12" rx="20" ry="15" fill="#FBF8EE"/>',
        front: eyes(17, -10, { rx: 4.6, iris: '#1A1210' }, e) + '<path d="M-9 2 q9 -5 18 0 q0 7 -9 10 q-9 -3 -9 -10z" fill="#141012"/><ellipse cx="-3" cy="2" rx="3" ry="1.2" fill="#fff" opacity="0.5"/>' + mouthY(17, '#2A2224', e, 5) + sweat(e) };
    }
  };

  /* ---------- 叢林 ---------- */
  var JUNGLE = {
    1: function (e, id) { // 樹蛙
      var c = C('#5EBF42', '#A6E886', '#2E7A1E');
      return { back: '<g fill="#F28A2E"><circle cx="-30" cy="48" r="4"/><circle cx="-22" cy="51" r="4"/><circle cx="22" cy="51" r="4"/><circle cx="30" cy="48" r="4"/></g>' +
        '<circle cx="-20" cy="-38" r="15" fill="#5EBF42" stroke="#2E7A1E" stroke-width="1.4"/><circle cx="20" cy="-38" r="15" fill="#5EBF42" stroke="#2E7A1E" stroke-width="1.4"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.4, belly: '#F4F2C8', bellyY: 26, bellyRx: 30, bellyRy: 20 }) + '<path d="M-46 0 q10 8 20 4 M46 0 q-10 8 -20 4" stroke="#2E62C8" stroke-width="4" fill="none" opacity="0.7"/>',
        front: eye(-20, -40, { rx: 10, iris: '#E8342E', pupil: 'slit', lid: false }, e) + eye(20, -40, { rx: 10, iris: '#E8342E', pupil: 'slit', lid: false }, e) +
          nostrils(-6, '#1E4A12', 4) + grin(6, 26, '#1E4A12', e) + sweat(e) };
    },
    2: function (e, id) { // 變色龍
      var c = C('#3FBF8E', '#9CEBC8', '#1E7A58');
      function turret(x) { return '<ellipse cx="' + x + '" cy="-8" rx="11" ry="11" fill="#5ACB9A" stroke="#1E7A58" stroke-width="1.4"/><path d="M' + (x - 9) + ' -12 q9 -4 18 0 M' + (x - 10) + ' -4 q10 4 20 0" stroke="#1E7A58" stroke-width="1" fill="none" opacity="0.6"/>'; }
      return { back: '<path d="M-26 -42 Q0 -84 26 -42z" fill="#3FBF8E" stroke="#1E7A58" stroke-width="1.4"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.3 }) + scales('cham', '#1E7A58') + '<path d="M-48 8 Q0 -2 48 8 M-44 20 Q0 12 44 20" stroke="#F2D24A" stroke-width="3" fill="none" opacity="0.7"/>',
        front: turret(-22) + turret(22) + eye(-22, -8, { rx: 4.2, iris: '#1A1A10', lid: false }, e) + eye(22, -8, { rx: 4.2, iris: '#1A1A10', lid: false }, e) + grin(18, 22, '#155A40', e) + sweat(e) };
    },
    3: function (e, id) { // 巨嘴鳥
      var c = C('#1F1F26', '#4A4A54', '#0A0A0E');
      return { back: '',
        ball: ball(c, id, { smooth: true, gloss: 0.25 }) + '<path d="M-30 4 Q0 -10 30 4 Q26 40 0 46 Q-26 40 -30 4z" fill="#FFF0A8"/><path d="M-26 34 Q0 50 26 34" stroke="#E8342E" stroke-width="5" fill="none"/>',
        front: '<circle cx="-24" cy="-16" r="9" fill="#5AB8F0"/><circle cx="24" cy="-16" r="9" fill="#5AB8F0"/>' + eyes(24, -16, { rx: 4.5, iris: '#1A1A20', lid: false }, e) +
          '<path d="M-14 -24 Q0 -30 14 -24 Q30 4 8 26 Q0 30 -8 26 Q-30 4 -14 -24z" fill="#F7A62A" stroke="#9A5A12" stroke-width="1.4"/>' +
          '<path d="M-10 -20 Q0 -26 10 -20 Q16 -10 12 0 Q0 -6 -12 0 Q-16 -10 -10 -20z" fill="#7AC84A" opacity="0.85"/><path d="M-6 22 Q0 30 6 22 L4 18 Q0 22 -4 18z" fill="#1A1A1A"/>' +
          (e === 'squish' ? '<path d="M-12 8 h24" stroke="#9A5A12" stroke-width="1.6"/>' : '<path d="M-14 6 Q0 10 14 6" stroke="#9A5A12" stroke-width="1.2" fill="none"/>') + sweat(e) };
    },
    4: function (e, id) { // 松鼠猴
      var c = C('#C9A46A', '#E8CC96', '#8A6A3A');
      return { back: P.roundEar(-40, -14, 10, C('#F4EEE2'), '#E0D0C0', id) + P.roundEar(40, -14, 10, C('#F4EEE2'), '#E0D0C0', id),
        ball: ball(c, id, { furLen: 4, seed: 'smonk' }) + '<path d="M0 -40 C-16 -40 -18 -30 -12 -24 C-30 -22 -32 0 -20 10 C-10 18 10 18 20 10 C32 0 30 -22 12 -24 C18 -30 16 -40 0 -40z" fill="#3A3A3E"/>' +
          '<ellipse cx="-14" cy="-8" rx="11" ry="12" fill="#FAF6EE"/><ellipse cx="14" cy="-8" rx="11" ry="12" fill="#FAF6EE"/><ellipse cx="0" cy="14" rx="12" ry="9" fill="#1E1E22"/>',
        front: eyes(13, -8, { rx: 5.5, iris: '#4A2A14' }, e) + nostrils(10, '#4A4A4E', 3) + grin(18, 5, '#5A5A5E', e) + sweat(e) };
    },
    5: function (e, id) { // 樹懶
      var c = C('#A08A70', '#C8B498', '#6A5A46');
      return { back: '',
        ball: ball(c, id, { furLen: 7, seed: 'sloth' }) + '<ellipse cx="0" cy="2" rx="30" ry="26" fill="#E8DCC4"/>' +
          '<path d="M-28 -4 Q-20 -14 -8 -6 Q-12 6 -24 4z M28 -4 Q20 -14 8 -6 Q12 6 24 4z" fill="#3A2C20"/>',
        front: eyes(16, -4, { rx: 4.2, iris: '#1A120C', lid: false }, e) + '<ellipse cx="0" cy="8" rx="5" ry="3.6" fill="#2A1E18"/>' +
          (e === 'squish' ? '<ellipse cx="0" cy="19" rx="3.6" ry="3" fill="#4A2A22"/>' : '<path d="M-10 16 Q0 24 10 16" stroke="#4A3428" stroke-width="2" fill="none" stroke-linecap="round"/>') + sweat(e) };
    },
    6: function (e, id) { // 貘
      var c = C('#5A5258', '#8A8288', '#34303A');
      return { back: P.roundEar(-34, -36, 11, c, '#9A9298', id).replace(/stroke-width="1.4"/, 'stroke-width="1.4"') + P.roundEar(34, -36, 11, c, '#9A9298', id) +
        '<circle cx="-34" cy="-36" r="11" fill="none" stroke="#F4F0EA" stroke-width="2"/><circle cx="34" cy="-36" r="11" fill="none" stroke="#F4F0EA" stroke-width="2"/>',
        ball: ball(c, id, { furLen: 2, seed: 'tapir', smooth: true }),
        front: eyes(19, -12, { rx: 4.4, iris: '#1A1416' }, e) +
          '<path d="M-12 -2 C-14 18 -8 30 0 32 C8 30 14 18 12 -2 Z" fill="#6A626A" stroke="#34303A" stroke-width="1.4"/><path d="M-10 8 h20 M-9 14 h18 M-7 20 h14" stroke="#34303A" stroke-width="0.9" opacity="0.6"/>' +
          nostrils(28, '#1A1618', 3) + sweat(e) };
    },
    7: function (e, id) { // 美洲豹
      var c = C('#D9A54A', '#F2CE86', '#9A6A24');
      return { back: P.roundEar(-32, -36, 11, c, '#2A2018', id) + P.roundEar(32, -36, 11, c, '#2A2018', id),
        ball: ball(c, id, { furLen: 3, seed: 'jag' }) + spots('jag', 18, '#3A2414', 3, 5, 0.85, true) + '<ellipse cx="0" cy="16" rx="18" ry="14" fill="#F8EEDC"/>',
        front: eyes(16, -8, { rx: 6.5, ry: 6, iris: '#B8C030' }, e) + P.catNose(8, '#C4786A') + mouthY(16, '#3A2014', e, 5) + P.whiskerDots(15) + whiskers(15, '#FFFFFF', 22, 12) + sweat(e) };
    },
    8: function (e, id) { // 老虎
      var c = C('#E68A2E', '#F6B868', '#A85414');
      return { back: P.roundEar(-34, -36, 12, c, '#F6F0E6', id) + P.roundEar(34, -36, 12, c, '#F6F0E6', id),
        ball: ball(c, id, { furLen: 4, seed: 'tiger' }) +
          '<path d="M-40 -10 Q-26 -12 -22 2 Q-20 24 0 30 Q20 24 22 2 Q26 -12 40 -10 Q36 34 0 44 Q-36 34 -40 -10z" fill="#FAF4EA"/>' +
          P.stripes('M-6 -46 l3 12 M6 -46 l-3 12 M0 -48 v10 M-20 -40 l6 8 M20 -40 l-6 8 M-48 -6 l14 4 M-48 6 l12 0 M48 -6 l-14 4 M48 6 l-12 0 M-36 -26 l10 6 M36 -26 l-10 6', '#1E1612', 3.2) +
          '<path d="M-22 -22 q6 -4 12 0 M22 -22 q-6 -4 -12 0" stroke="#FAF4EA" stroke-width="3" fill="none"/>',
        front: eyes(16, -10, { rx: 6.5, ry: 5.5, iris: '#E0A82A' }, e) + P.catNose(8, '#D88878') + mouthY(16, '#2A1A14', e, 6) + P.whiskerDots(15) + whiskers(15, '#FFFFFF', 24, 12) + sweat(e) };
    },
    9: function (e, id) { // 紅毛猩猩
      var c = C('#C4622A', '#E8945A', '#843A14');
      var hair = '', r = prng('orang');
      for (var i = 0; i < 30; i++) { var a = r() * Math.PI * 2, d = 46 + r() * 6; hair += 'M' + f1(Math.cos(a) * 42) + ' ' + f1(Math.sin(a) * 42) + ' Q' + f1(Math.cos(a + 0.1) * d) + ' ' + f1(Math.sin(a + 0.1) * d) + ' ' + f1(Math.cos(a + 0.05) * (d + 8)) + ' ' + f1(Math.sin(a + 0.05) * (d + 8)); }
      return { back: '<path d="' + hair + '" stroke="#C4622A" stroke-width="3" fill="none" stroke-linecap="round"/>',
        ball: ball(c, id, { furLen: 8, seed: 'orang' }) + '<ellipse cx="0" cy="6" rx="28" ry="30" fill="#6A4232"/><ellipse cx="0" cy="18" rx="18" ry="14" fill="#8A5A44"/>',
        front: '<path d="M-22 -14 q10 -6 18 0 M22 -14 q-10 -6 -18 0" stroke="#3A221A" stroke-width="2" fill="none"/>' + eyes(11, -6, { rx: 4.4, iris: '#2A1810' }, e) +
          nostrils(10, '#2A1810', 3) + grin(20, 10, '#2A1810', e) + sweat(e) };
    },
    10: function (e, id) { // 大猩猩
      var c = C('#2C2C30', '#5A5A60', '#121214');
      return { back: P.roundEar(-40, -8, 8, c, '#3E3A3C', id) + P.roundEar(40, -8, 8, c, '#3E3A3C', id),
        ball: ball(c, id, { furLen: 5, seed: 'gorilla' }) + '<path d="M-40 -44 Q0 -60 40 -44" stroke="#8A8A92" stroke-width="5" fill="none" opacity="0.5"/>' +
          '<path d="M-28 -16 Q0 -28 28 -16 Q34 20 0 36 Q-34 20 -28 -16z" fill="#3E3A3E"/>',
        front: '<path d="M-26 -14 Q-13 -24 0 -14 Q13 -24 26 -14" stroke="#1A1A1C" stroke-width="5" fill="none" stroke-linecap="round"/>' +
          eyes(12, -6, { rx: 4.4, iris: '#5A3A22', rim: '#0A0A0A' }, e) +
          '<path d="M-10 4 q10 -6 20 0 q2 8 -10 10 q-12 -2 -10 -10z" fill="#2A262A"/>' + nostrils(8, '#0A0A0A', 4) + grin(22, 10, '#121214', e) + sweat(e) };
    }
  };

  /* ---------- 恐龍 ---------- */
  var DINO = {
    1: function (e, id) { // 恐龍蛋（寶寶從裂縫偷看）
      var c = C('#F1E6C8', '#FFFBEE', '#C2B08A');
      return { back: '',
        ball: ball(c, id, { smooth: true, gloss: 0.35 }) + spots('egg', 16, '#9A7A4A', 1.5, 4, 0.55) +
          '<path d="M-46 -6 l10 -8 l8 8 l10 -10 l8 10 l10 -8 l10 8 l10 -10 l8 10 l10 -6 L48 -26 Q0 -70 -48 -26z" fill="#2A3A1E"/>' +
          '<path d="M-46 -6 l10 -8 l8 8 l10 -10 l8 10 l10 -8 l10 8 l10 -10 l8 10 l10 -6" fill="none" stroke="#C2B08A" stroke-width="2"/>',
        front: '<ellipse cx="0" cy="-22" rx="26" ry="16" fill="#6AA84A"/>' + eyes(10, -24, { rx: 5, iris: '#E8B02A', lid: false }, e) + sweat(e) };
    },
    2: function (e, id) { // 翼龍
      var c = C('#D98A4A', '#F2B87E', '#94521E');
      return { back: '<path d="M-10 -40 Q-40 -70 -70 -62 Q-40 -50 -26 -30z" fill="#C0702E" stroke="#94521E" stroke-width="1.4"/>' +
        '<path d="M-46 -4 Q-80 -10 -78 20 Q-60 10 -44 18z M46 -4 Q80 -10 78 20 Q60 10 44 18z" fill="#C88A5E" stroke="#94521E" stroke-width="1.4"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.25 }) + scales('ptero', '#94521E'),
        front: eyes(16, -14, { rx: 5.5, iris: '#E8C030', pupil: 'slit' }, e) +
          '<path d="M-6 -2 L48 10 L-4 16 Z" fill="#E8B07A" stroke="#94521E" stroke-width="1.4" stroke-linejoin="round"/><path d="M-4 8 L46 10" stroke="#94521E" stroke-width="1"/>' + nostrils(0, '#5A2A10', 3) + sweat(e) };
    },
    3: function (e, id) { // 迅猛龍
      var c = C('#A89A62', '#D2C690', '#6A5E34');
      return { back: '<path d="M-10 -46 Q0 -66 10 -46 M-20 -44 Q-16 -64 -4 -48 M20 -44 Q16 -64 4 -48" stroke="#8A4A2A" stroke-width="5" fill="none" stroke-linecap="round"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.2 }) + scales('raptor', '#5A4E2A') + P.stripes('M-30 -30 l8 10 M-38 -16 l10 6 M30 -30 l-8 10 M38 -16 l-10 6', '#6A4A2A', 3),
        front: '<path d="M-28 -14 q8 -6 16 -2 M28 -14 q-8 -6 -16 -2" stroke="#4A3E22" stroke-width="2.4" fill="none"/>' + eyes(17, -8, { rx: 5.5, ry: 5, iris: '#E8A020', pupil: 'slit' }, e) +
          nostrils(6, '#3A2E18', 4) + grin(18, 20, '#3A2E18', e, true) + sweat(e) };
    },
    4: function (e, id) { // 甲龍
      var c = C('#8E7A5A', '#B8A480', '#5A4A32');
      var bumps = '', r = prng('anky');
      for (var i = 0; i < 18; i++) { var a = -Math.PI + r() * Math.PI, d = 26 + r() * 18; bumps += '<ellipse cx="' + f1(Math.cos(a) * d) + '" cy="' + f1(Math.sin(a) * d) + '" rx="5" ry="4" fill="#A8946C" stroke="#5A4A32" stroke-width="1"/>'; }
      return { back: '<path d="M-48 -10 l-14 -6 l10 12z M48 -10 l14 -6 l-10 12z M-44 14 l-14 4 l12 6z M44 14 l14 4 l-12 6z" fill="#D8C8A0" stroke="#5A4A32" stroke-width="1.2"/>',
        ball: ball(c, id, { smooth: true }) + bumps + '<ellipse cx="0" cy="18" rx="24" ry="18" fill="#B8A480"/>',
        front: eyes(15, 4, { rx: 4.6, iris: '#3A2A14' }, e) + nostrils(18, '#3A2A18', 5) + grin(28, 12, '#3A2A18', e) + sweat(e) };
    },
    5: function (e, id) { // 劍龍
      var c = C('#7E9A5E', '#AAC488', '#4E6A36');
      var plates = '';
      [-60, -30, 0, 30, 60].forEach(function (deg, i) {
        var a = (deg - 90) * Math.PI / 180, x = Math.cos(a) * 46, y = Math.sin(a) * 46, tx = Math.cos(a) * 70, ty = Math.sin(a) * 70;
        plates += '<path d="M' + f1(x - Math.sin(a) * 9) + ' ' + f1(y + Math.cos(a) * 9) + ' L' + f1(tx) + ' ' + f1(ty) + ' L' + f1(x + Math.sin(a) * 9) + ' ' + f1(y - Math.cos(a) * 9) + 'Z" fill="' + (i % 2 ? '#E2683A' : '#F08A4A') + '" stroke="#9A3E1E" stroke-width="1.4" stroke-linejoin="round"/>';
      });
      return { back: plates, ball: ball(c, id, { smooth: true, gloss: 0.2 }) + scales('stego', '#3E5A2A') + '<ellipse cx="0" cy="18" rx="22" ry="16" fill="#C2D4A0"/>',
        front: eyes(18, -4, { rx: 5, iris: '#C8A030' }, e) + nostrils(14, '#2E4220', 5) + grin(24, 12, '#2E4220', e) + sweat(e) };
    },
    6: function (e, id) { // 副櫛龍
      var c = C('#4FA898', '#88D2C4', '#2A6E62');
      return { back: '<path d="M10 -40 C30 -80 70 -76 74 -64 C64 -60 40 -64 24 -34z" fill="#E8783A" stroke="#9A3E1E" stroke-width="1.6"/><path d="M18 -42 C34 -70 60 -70 70 -64" stroke="#FFB070" stroke-width="2" fill="none"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.2 }) + scales('para', '#2A6E62') + P.stripes('M-40 -20 l10 4 M-44 -4 l10 2 M40 -20 l-10 4', '#2A6E62', 3),
        front: eyes(17, -10, { rx: 5.5, iris: '#E0A82A' }, e) +
          '<path d="M-20 6 Q0 -2 20 6 Q22 22 0 26 Q-22 22 -20 6z" fill="#E8D8A8" stroke="#8A7A4A" stroke-width="1.4"/>' + nostrils(8, '#5A4A2A', 6) +
          (e === 'squish' ? '<ellipse cx="0" cy="20" rx="4" ry="3" fill="#5A3A2A"/>' : '<path d="M-14 18 Q0 22 14 18" stroke="#8A7A4A" stroke-width="1.4" fill="none"/>') + sweat(e) };
    },
    7: function (e, id) { // 三角龍
      var c = C('#8A9A7A', '#B6C4A4', '#56664A');
      var knobs = '';
      for (var i = 0; i <= 10; i++) { var a = Math.PI + i / 10 * Math.PI; knobs += '<circle cx="' + f1(Math.cos(a) * 70) + '" cy="' + f1(Math.sin(a) * 70 + 4) + '" r="5" fill="#E8D8A8" stroke="#8A7A4A" stroke-width="1"/>'; }
      return { back: '<path d="M-70 4 A70 70 0 0 1 70 4z" fill="#C2783E" stroke="#7A4420" stroke-width="2"/><path d="M-56 4 A56 56 0 0 1 56 4" fill="none" stroke="#E8A060" stroke-width="5" opacity="0.6"/>' + knobs,
        ball: ball(c, id, { smooth: true, gloss: 0.2 }) + scales('trike', '#46563A'),
        front: '<path d="M-20 -24 L-30 -62 L-12 -28z M20 -24 L30 -62 L12 -28z" fill="#F4ECD4" stroke="#A89A70" stroke-width="1.4" stroke-linejoin="round"/>' +
          eyes(18, -14, { rx: 5, iris: '#C88A2A' }, e) + '<path d="M-6 2 L0 -16 L6 2z" fill="#F4ECD4" stroke="#A89A70" stroke-width="1.4"/>' +
          '<path d="M-10 18 Q0 12 10 18 L0 30z" fill="#6A6A5A"/>' + nostrils(8, '#3A4430', 7) + sweat(e) };
    },
    8: function (e, id) { // 棘龍
      var c = C('#6A7A8E', '#9AA8BA', '#3E4A5A');
      var sail = '';
      for (var i = 0; i < 7; i++) { var a = Math.PI + 0.35 + i / 6 * (Math.PI - 0.7); sail += 'M' + f1(Math.cos(a) * 44) + ' ' + f1(Math.sin(a) * 44) + ' L' + f1(Math.cos(a) * 74) + ' ' + f1(Math.sin(a) * 74); }
      return { back: '<path d="M-60 -32 Q-50 -76 0 -76 Q50 -76 60 -32 L40 -20 L-40 -20z" fill="#D8743A" opacity="0.85" stroke="#8A3E1A" stroke-width="1.4"/><path d="' + sail + '" stroke="#8A3E1A" stroke-width="2.4"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.2 }) + scales('spino', '#3E4A5A'),
        front: eyes(19, -18, { rx: 4.6, iris: '#E8B02A', pupil: 'slit' }, e) +
          '<path d="M-14 -6 Q0 -10 14 -6 L12 32 Q0 40 -12 32z" fill="#8494A8" stroke="#3E4A5A" stroke-width="1.4"/>' + nostrils(26, '#2A3240', 4) +
          (e === 'squish' ? '' : '<path d="M-12 8 l2 4 l2 -4 l2 4 l2 -4 l2 4 l2 -4 l2 4 l2 -4 l2 4 l2 -4 l2 4" fill="none" stroke="#FFFDF2" stroke-width="1.2"/>') + sweat(e) };
    },
    9: function (e, id) { // 腕龍
      var c = C('#6FA86A', '#A6D29E', '#3E6E3A');
      return { back: '',
        ball: ball(c, id, { smooth: true, gloss: 0.22 }) + spots('brachio', 14, '#3E6E3A', 2, 5, 0.45) + '<path d="M-14 -50 Q0 -66 14 -50" fill="#5E965A" stroke="#3E6E3A" stroke-width="1.4"/>' +
          '<ellipse cx="0" cy="22" rx="26" ry="18" fill="#C4DEB4"/>',
        front: eyes(20, -10, { rx: 6, iris: '#6A4A22' }, e) + nostrils(-40, '#2E4A2A', 5) + grin(20, 14, '#2E4A2A', e) + sweat(e) };
    },
    10: function (e, id) { // 暴龍
      var c = C('#7A8A4E', '#A6B67A', '#4A5A2A');
      return { back: '<path d="M-40 26 q-12 6 -10 14 q6 0 12 -8 M40 26 q12 6 10 14 q-6 0 -12 -8" stroke="#5A6A36" stroke-width="5" fill="none" stroke-linecap="round"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.2 }) + scales('trex', '#3A4A22') + P.stripes('M-34 -36 l6 10 M-22 -44 l4 10 M34 -36 l-6 10 M22 -44 l-4 10', '#4A3A22', 3),
        front: '<path d="M-30 -18 q10 -10 22 -4 M30 -18 q-10 -10 -22 -4" stroke="#3A4422" stroke-width="4" fill="none" stroke-linecap="round"/>' +
          eyes(19, -10, { rx: 5, ry: 4.4, iris: '#E8B02A', pupil: 'slit' }, e) + nostrils(-2, '#2A3218', 6) +
          (e === 'squish' ? '<ellipse cx="0" cy="22" rx="6" ry="4" fill="#5A2222"/>'
            : '<path d="M-32 10 Q0 ' + (e === 'nervous' ? 22 : 30) + ' 32 10" fill="#7A2A2A" stroke="#3A4422" stroke-width="2"/>' +
              '<path d="M-28 12 l3 6 l3 -5 l3 6 l3 -5 l3 6 l3 -5 l3 6 l3 -5 l3 6 l3 -5 l3 6 l3 -5 l3 5 l3 -5 l3 6 l3 -5 l3 5" fill="#FFFDF2" stroke="#BDB6A0" stroke-width="0.6"/>') + sweat(e) };
    }
  };

  /* ---------- 農場 ---------- */
  var FARM = {
    1: function (e, id) { // 小鴨
      var c = C('#F6D84E', '#FFF4B0', '#C9A21E');
      return { back: '<path d="M-14 46 l-8 8 h14z M14 46 l8 8 h-14z" fill="#F29A2E"/>',
        ball: ball(c, id, { furLen: 6, seed: 'duck' }),
        front: eyes(15, -12, { rx: 4.8, iris: '#141010', lid: false }, e) +
          '<path d="M-14 0 Q0 -8 14 0 Q16 8 0 12 Q-16 8 -14 0z" fill="#F29A3A" stroke="#B8611B" stroke-width="1.2"/><path d="M-12 4 Q0 8 12 4" stroke="#B8611B" stroke-width="1" fill="none"/>' +
          '<circle cx="-4" cy="0" r="0.9" fill="#8A4512"/><circle cx="4" cy="0" r="0.9" fill="#8A4512"/>' + (e === 'squish' ? '<ellipse cx="0" cy="12" rx="3" ry="2" fill="#8A3A12"/>' : '') + sweat(e) };
    },
    2: function (e, id) { // 天竺鼠
      var c = C('#D89A5A', '#F2C890', '#9A6230');
      return { back: '<path d="M-34 -30 q-12 -6 -14 6 q6 6 14 2z M34 -30 q12 -6 14 6 q-6 6 -14 2z" fill="#C88A6A" stroke="#7A4A30" stroke-width="1.2"/>',
        ball: ball(c, id, { furLen: 5, seed: 'guinea' }) + '<path d="M-50 -4 Q-20 -30 0 -50 Q-6 -10 -2 30 Q-30 30 -50 -4z" fill="#FAF4EA" opacity="0.92"/>' +
          '<path d="M20 -44 Q40 -30 46 -4 Q30 4 16 -6z" fill="#3A2A20" opacity="0.8"/>',
        front: eyes(17, -8, { rx: 5.2, iris: '#140C0A', lid: false }, e) + '<ellipse cx="0" cy="8" rx="3.6" ry="2.6" fill="#D88A8C"/>' + mouthY(14, '#6A3A30', e, 4) + whiskers(10, '#F8F2E8', 20, 8) + sweat(e) };
    },
    3: function (e, id) { // 公雞
      var c = C('#F4F0E6', '#FFFFFF', '#C8BEA8');
      return { back: '<path d="M-14 -44 q-4 -14 6 -14 q0 -10 10 -6 q6 -8 12 2 q8 0 4 14z" fill="#E8342E" stroke="#9A1A1A" stroke-width="1.4"/>' +
        '<path d="M40 -10 q20 -20 26 4 q-10 -4 -14 8 q8 4 6 18 q-12 -10 -18 -12z" fill="#2A4A8A" opacity="0.85"/>',
        ball: ball(c, id, { furLen: 4, seed: 'rooster' }) + '<path d="M-30 20 Q0 40 30 20 Q20 46 0 48 Q-20 46 -30 20z" fill="#C8862E" opacity="0.7"/>',
        front: eyes(14, -14, { rx: 4.6, iris: '#C88A1E' }, e) +
          '<path d="M-6 -4 L8 0 L-6 6z" fill="#F2B23A" stroke="#A8721A" stroke-width="1.2"/>' +
          '<path d="M-4 6 q-4 10 2 14 q6 -2 4 -12z" fill="#E8342E" stroke="#9A1A1A" stroke-width="1"/>' + sweat(e) };
    },
    4: function (e, id) { // 鵝
      var c = C('#F8F6F0', '#FFFFFF', '#CFCABE');
      return { back: '<path d="M-48 4 q-12 10 -8 24 q8 -6 12 -16z M48 4 q12 10 8 24 q-8 -6 -12 -16z" fill="#E6E2D8"/>',
        ball: ball(c, id, { furLen: 3, seed: 'goose', gloss: 0.25 }),
        front: eyes(16, -14, { rx: 4.8, iris: '#2A4A6A' }, e) +
          '<path d="M-10 -6 Q0 -12 10 -6 L8 8 Q0 14 -8 8z" fill="#F28A2E" stroke="#B85A12" stroke-width="1.4"/><path d="M-6 -8 Q0 -14 6 -8 L4 -2 Q0 0 -4 -2z" fill="#E8742A"/>' +
          (e === 'squish' ? '<ellipse cx="0" cy="12" rx="3" ry="2.4" fill="#7A3A12"/>' : '<path d="M-8 6 Q0 10 8 6" stroke="#B85A12" stroke-width="1.2" fill="none"/>') + sweat(e) };
    },
    5: function (e, id) { // 山羊
      var c = C('#F2EDE2', '#FFFFFF', '#C4BAA6');
      return { back: '<path d="M-14 -44 Q-22 -70 -38 -72 Q-26 -60 -24 -42z M14 -44 Q22 -70 38 -72 Q26 -60 24 -42z" fill="#B8A684" stroke="#7A6A4A" stroke-width="1.4"/>' +
        '<ellipse cx="-44" cy="-14" rx="14" ry="6" fill="#EDE6D8" stroke="#A89A80" transform="rotate(20 -44 -14)"/><ellipse cx="44" cy="-14" rx="14" ry="6" fill="#EDE6D8" stroke="#A89A80" transform="rotate(-20 44 -14)"/>',
        ball: ball(c, id, { furLen: 4, seed: 'goat' }) + '<path d="M-8 30 Q0 52 8 30z" fill="#E2DACA" stroke="#B8AC94" stroke-width="1"/>',
        front: eyes(17, -10, { rx: 6, ry: 5, iris: '#C8A030', pupil: 'bar' }, e) + '<path d="M-6 10 q6 -4 12 0 q-2 5 -6 6 q-4 -1 -6 -6z" fill="#C89A8A"/>' + mouthY(20, '#6A4A3A', e, 5) + sweat(e) };
    },
    6: function (e, id) { // 羊駝
      var c = C('#EEDCC0', '#FFF6E8', '#BFA684');
      var w = '', r = prng('alpaca');
      for (var i = 0; i < 9; i++) { var a = -Math.PI * 0.85 + i / 8 * Math.PI * 0.7; w += '<circle cx="' + f1(Math.cos(a) * 44) + '" cy="' + f1(Math.sin(a) * 44) + '" r="' + f1(10 + r() * 3) + '"/>'; }
      return { back: '<path d="M-26 -36 L-30 -64 L-16 -42z M26 -36 L30 -64 L16 -42z" fill="#E6D2B4" stroke="#A88C66" stroke-width="1.4" stroke-linejoin="round"/>',
        ball: ball(c, id, { furLen: 5, seed: 'alpaca' }) + '<g fill="#F8EEDC" stroke="#C8B490" stroke-width="1">' + w + '</g>' +
          '<ellipse cx="0" cy="14" rx="18" ry="16" fill="#F6EAD6"/>',
        front: eyes(17, -6, { rx: 6.5, iris: '#1A120E' }, e) + '<path d="M-5 12 q5 -3 10 0 l-5 4z" fill="#4A3A30"/>' + mouthY(18, '#5A4434', e, 5) + sweat(e) };
    },
    7: function (e, id) { // 驢子
      var c = C('#9A9086', '#C4BCB2', '#655C54');
      return { back: '<path d="M-18 -42 Q-30 -88 -16 -86 Q-8 -70 -8 -44z M18 -42 Q30 -88 16 -86 Q8 -70 8 -44z" fill="#9A9086" stroke="#5A524A" stroke-width="1.4"/>' +
        '<path d="M-14 -50 Q-22 -80 -15 -80 M14 -50 Q22 -80 15 -80" stroke="#3A3430" stroke-width="2" fill="none"/>',
        ball: ball(c, id, { furLen: 3, seed: 'donkey' }) + '<ellipse cx="0" cy="18" rx="22" ry="18" fill="#F0ECE6"/><circle cx="-16" cy="-10" r="10" fill="#E6E0D8" opacity="0.6"/><circle cx="16" cy="-10" r="10" fill="#E6E0D8" opacity="0.6"/>',
        front: eyes(16, -10, { rx: 5.5, iris: '#1A120E' }, e) + nostrils(16, '#4A403A', 7) + mouthY(26, '#4A403A', e, 6) + sweat(e) };
    },
    8: function (e, id) { // 馬
      var c = C('#9A5A2E', '#C88A5A', '#5E3416');
      return { back: '<path d="M-24 -38 L-30 -64 L-12 -44z M24 -38 L30 -64 L12 -44z" fill="#8A4E26" stroke="#4A2810" stroke-width="1.4" stroke-linejoin="round"/>' +
        '<path d="M-8 -48 Q0 -70 14 -60 Q8 -50 18 -44 Q4 -38 -8 -48z" fill="#2A1A10"/>',
        ball: ball(c, id, { furLen: 2, seed: 'horse', smooth: true, gloss: 0.25 }) + '<path d="M-4 -46 Q0 -10 -8 20 Q0 26 8 20 Q0 -10 4 -46z" fill="#FAF4EC"/>' +
          '<ellipse cx="0" cy="26" rx="16" ry="12" fill="#6A3A1E"/>',
        front: eyes(19, -8, { rx: 6, iris: '#1A0E08' }, e) + nostrils(26, '#1A0E08', 6) + sweat(e) };
    },
    9: function (e, id) { // 乳牛
      var c = C('#F6F4F0', '#FFFFFF', '#C8C2B8');
      return { back: '<path d="M-24 -40 q-14 -14 -8 -24 q4 10 14 14z M24 -40 q14 -14 8 -24 q-4 10 -14 14z" fill="#F4ECD8" stroke="#B8AC90" stroke-width="1.2"/>' +
        '<ellipse cx="-46" cy="-14" rx="14" ry="7" fill="#2A2426" transform="rotate(18 -46 -14)"/><ellipse cx="46" cy="-14" rx="14" ry="7" fill="#F6F4F0" stroke="#C8C2B8" transform="rotate(-18 46 -14)"/>',
        ball: ball(c, id, { smooth: true, gloss: 0.2 }) + '<path d="M-50 -10 Q-40 -40 -14 -30 Q-10 -14 -26 -6 Q-40 4 -50 -10z" fill="#2A2426"/><path d="M20 -48 Q40 -40 36 -24 Q24 -20 16 -30z" fill="#2A2426"/><path d="M30 20 Q46 18 44 34 Q34 40 28 30z" fill="#2A2426"/>' +
          '<ellipse cx="0" cy="22" rx="22" ry="16" fill="#F2B4B4" stroke="#C47E7E" stroke-width="1.2"/>',
        front: eyes(17, -10, { rx: 5.6, iris: '#1A120E' }, e) + '<ellipse cx="-8" cy="22" rx="3" ry="4" fill="#9A5A5A"/><ellipse cx="8" cy="22" rx="3" ry="4" fill="#9A5A5A"/>' + sweat(e) };
    },
    10: function (e, id) { // 水牛
      var c = C('#4E4A4C', '#7A7678', '#2A2628');
      return { back: '<path d="M-20 -36 C-50 -60 -78 -40 -70 -10 C-64 -24 -50 -40 -26 -26z M20 -36 C50 -60 78 -40 70 -10 C64 -24 50 -40 26 -26z" fill="#6E665E" stroke="#3A342E" stroke-width="1.6"/>' +
        '<path d="M-60 -36 q8 -4 12 2 M-66 -24 q8 -4 12 2 M60 -36 q-8 -4 -12 2 M66 -24 q-8 -4 -12 2" stroke="#3A342E" stroke-width="1" fill="none"/>',
        ball: ball(c, id, { furLen: 2, seed: 'buffalo', smooth: true, gloss: 0.18 }) + '<ellipse cx="0" cy="22" rx="20" ry="15" fill="#3A3436"/>',
        front: eyes(19, -8, { rx: 5, iris: '#2A1A12' }, e) + nostrils(22, '#141012', 7) + mouthY(32, '#141012', e, 6) + sweat(e) };
    }
  };
  Art.register('farm', FARM);
  Art.register('polar', POLAR);
  Art.register('jungle', JUNGLE);
  Art.register('dino', DINO);
})(typeof self !== 'undefined' ? self : this);
