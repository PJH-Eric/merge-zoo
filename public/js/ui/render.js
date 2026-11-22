/* ===== render.js — Canvas 畫面：世界背景、箱子、動物、特效 ===== */
(function (root) {
  'use strict';
  var D = root.MZData, Art = root.MZArt;

  function Renderer(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.session = null;
    this.particles = [];
    this.bg = null;
    this.shakeT = 0;
    this.opts = { guide: true, reduceMotion: false, numbers: false };
    this.aiming = false;
  }

  Renderer.prototype.attach = function (session) {
    this.session = session;
    this.particles = [];
    this.bg = null;
    Art.preload(session.world.id);
    this.resize();
  };

  Renderer.prototype.resize = function () {
    var c = this.canvas, rect = c.getBoundingClientRect();
    var dpr = Math.min(2.5, root.devicePixelRatio || 1);
    var w = Math.max(10, Math.round(rect.width)), h = Math.max(10, Math.round(rect.height));
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr); c.height = Math.round(h * dpr);
      this.bg = null;
    }
    this.cw = w; this.ch = h; this.dpr = dpr;
    var s = this.session;
    if (!s) return;
    // 可視範圍：箱子＋上方手持區；可旋轉時保留轉斜後的空間
    // 只留手持動物與箱框需要的空間，讓箱子盡量放大
    var heldR = D.RADII[Math.min(10, s.diff.maxSpawn + 1)];
    var halfW = s.W / 2 + 26, top = D.BOX.SPAWN_Y - heldR - 6, bottom = s.H + 26;
    if (s.canRotate) {
      var ang = s.rotateMax, hw = s.W / 2 + 40, hh = s.H / 2 + 40;
      halfW = Math.max(halfW, Math.cos(ang) * hw + Math.sin(ang) * hh);
      top = Math.min(top, s.H / 2 - (Math.sin(ang) * hw + Math.cos(ang) * hh) - 70);
      bottom = Math.max(bottom, s.H / 2 + Math.sin(ang) * hw + Math.cos(ang) * hh + 10);
    }
    var vw = halfW * 2, vh = bottom - top;
    this.scale = Math.min(w / vw, h / vh);
    this.ox = w / 2;
    this.oy = (h - vh * this.scale) / 2 - top * this.scale;
  };

  /** 螢幕座標 → 物理座標 */
  Renderer.prototype.toWorld = function (px, py) {
    return { x: (px - this.ox) / this.scale, y: (py - this.oy) / this.scale };
  };

  /* ---------- 背景 ---------- */
  Renderer.prototype.drawBackground = function () {
    var s = this.session, w = this.cw, h = this.ch, dpr = this.dpr;
    if (this.bg && this.bgKey === s.world.id + w + 'x' + h) return this.bg;
    var off = root.document.createElement('canvas');
    off.width = Math.round(w * dpr); off.height = Math.round(h * dpr);
    var g = off.getContext('2d');
    g.scale(dpr, dpr);
    var rnd = new root.MZRng.Rng(s.world.id);
    var grd, i;
    switch (s.world.id) {
      case 'ocean':
        grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#8EDCF5'); grd.addColorStop(0.55, '#3EA3D6'); grd.addColorStop(1, '#1C5F96');
        g.fillStyle = grd; g.fillRect(0, 0, w, h);
        g.globalAlpha = 0.12; g.fillStyle = '#fff';
        for (i = 0; i < 5; i++) { var x0 = rnd.range(0, w); g.beginPath(); g.moveTo(x0, 0); g.lineTo(x0 + 60, 0); g.lineTo(x0 + 200, h); g.lineTo(x0 + 80, h); g.fill(); }
        g.globalAlpha = 1;
        g.fillStyle = '#E9D7A8'; g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * 0.9);
        g.quadraticCurveTo(w * 0.3, h * 0.84, w * 0.6, h * 0.9); g.quadraticCurveTo(w * 0.85, h * 0.94, w, h * 0.88); g.lineTo(w, h); g.fill();
        for (i = 0; i < 9; i++) {
          var sx = rnd.range(0, w), sh = rnd.range(60, 160);
          g.strokeStyle = i % 2 ? '#3FA45B' : '#5CC06E'; g.lineWidth = 7; g.lineCap = 'round';
          g.beginPath(); g.moveTo(sx, h); g.bezierCurveTo(sx - 20, h - sh * 0.4, sx + 20, h - sh * 0.7, sx - 5, h - sh); g.stroke();
        }
        g.fillStyle = 'rgba(255,255,255,0.35)';
        for (i = 0; i < 26; i++) { g.beginPath(); g.arc(rnd.range(0, w), rnd.range(0, h * 0.85), rnd.range(2, 7), 0, Math.PI * 2); g.fill(); }
        break;
      case 'sweets':
        grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#FFF0F6'); grd.addColorStop(1, '#FFD1E3');
        g.fillStyle = grd; g.fillRect(0, 0, w, h);
        g.save(); g.globalAlpha = 0.35; g.strokeStyle = '#FFFFFF'; g.lineWidth = 18;
        for (i = -h; i < w + h; i += 56) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); }
        g.restore();
        var cols = ['#FF8DB8', '#FFE45C', '#8FD3F0', '#B79BFF', '#7ED957'];
        for (i = 0; i < 22; i++) {
          g.fillStyle = cols[i % cols.length]; g.globalAlpha = 0.5;
          g.save(); g.translate(rnd.range(0, w), rnd.range(0, h)); g.rotate(rnd.range(0, 3));
          g.beginPath(); g.ellipse(0, 0, 7, 3, 0, 0, Math.PI * 2); g.fill(); g.restore();
        }
        g.globalAlpha = 1;
        g.fillStyle = '#F7A9C4'; g.fillRect(0, h * 0.9, w, h * 0.1);
        g.fillStyle = '#FFFFFF';
        for (i = 0; i < w; i += 36) { g.beginPath(); g.arc(i + 18, h * 0.9, 18, 0, Math.PI); g.fill(); }
        break;
      case 'space':
        grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#0E1033'); grd.addColorStop(1, '#2A2466');
        g.fillStyle = grd; g.fillRect(0, 0, w, h);
        g.globalAlpha = 0.25;
        [['#7B5CFF', 0.2, 0.3, 0.35], ['#FF5CC8', 0.8, 0.65, 0.3], ['#4FB8F0', 0.5, 0.9, 0.4]].forEach(function (n) {
          var rg = g.createRadialGradient(w * n[1], h * n[2], 0, w * n[1], h * n[2], Math.max(w, h) * n[3]);
          rg.addColorStop(0, n[0]); rg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = rg; g.fillRect(0, 0, w, h);
        });
        g.globalAlpha = 1; g.fillStyle = '#fff';
        for (i = 0; i < 120; i++) { g.globalAlpha = rnd.range(0.3, 1); g.beginPath(); g.arc(rnd.range(0, w), rnd.range(0, h), rnd.range(0.5, 1.8), 0, Math.PI * 2); g.fill(); }
        g.globalAlpha = 1;
        g.fillStyle = '#FFB45C'; g.beginPath(); g.arc(w * 0.88, h * 0.14, Math.min(w, h) * 0.07, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#FFE0A8'; g.lineWidth = 4; g.beginPath(); g.ellipse(w * 0.88, h * 0.14, Math.min(w, h) * 0.12, Math.min(w, h) * 0.03, -0.3, 0, Math.PI * 2); g.stroke();
        break;
      default:
        grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#A9DDFB'); grd.addColorStop(0.7, '#E6F7FF'); grd.addColorStop(1, '#E6F7FF');
        g.fillStyle = grd; g.fillRect(0, 0, w, h);
        g.fillStyle = '#FFE48A'; g.beginPath(); g.arc(w * 0.12, h * 0.12, Math.min(w, h) * 0.06, 0, Math.PI * 2); g.fill();
        g.fillStyle = 'rgba(255,255,255,0.9)';
        for (i = 0; i < 5; i++) {
          var cx = rnd.range(0, w), cy = rnd.range(h * 0.05, h * 0.4), cr = rnd.range(14, 26);
          g.beginPath(); g.arc(cx, cy, cr, 0, Math.PI * 2); g.arc(cx + cr, cy + 4, cr * 0.8, 0, Math.PI * 2); g.arc(cx - cr, cy + 6, cr * 0.7, 0, Math.PI * 2); g.fill();
        }
        g.fillStyle = '#B8E07A'; g.beginPath(); g.moveTo(0, h); g.lineTo(0, h * 0.78);
        g.quadraticCurveTo(w * 0.25, h * 0.68, w * 0.5, h * 0.8); g.quadraticCurveTo(w * 0.75, h * 0.7, w, h * 0.76); g.lineTo(w, h); g.fill();
        g.fillStyle = '#8CCB54'; g.fillRect(0, h * 0.88, w, h * 0.12);
        g.fillStyle = '#E6B47A'; g.strokeStyle = '#B07A42'; g.lineWidth = 2;
        for (i = 0; i < w; i += 30) { g.fillRect(i + 4, h * 0.82, 12, h * 0.09); g.strokeRect(i + 4, h * 0.82, 12, h * 0.09); }
        g.fillRect(0, h * 0.85, w, 6);
    }
    this.bg = off;
    this.bgKey = s.world.id + w + 'x' + h;
    return off;
  };

  /* ---------- 特效 ---------- */
  Renderer.prototype.fx = function (ev) {
    var s = this.session, rm = this.opts.reduceMotion;
    var i, n;
    if (ev.type === 'merge' || ev.type === 'bonus') {
      n = rm ? 4 : (ev.type === 'bonus' ? 40 : 10 + ev.level);
      for (i = 0; i < n; i++) {
        var a = Math.random() * Math.PI * 2, sp = (ev.type === 'bonus' ? 5 : 2.5) + Math.random() * 3;
        this.particles.push({ kind: 'star', x: ev.x, y: ev.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 1, life: 0.7 + Math.random() * 0.4, t: 0,
          col: ev.gold ? '#FFD23C' : ['#FFE45C', '#FF8DB8', '#8FD3F0', '#FFFFFF'][i % 4], size: 4 + Math.random() * 5 });
      }
      var txt = '+' + ev.points + (ev.combo > 1 ? '  ×' + ev.combo : '');
      this.particles.push({ kind: 'text', x: ev.x, y: ev.y - 20, vx: 0, vy: -1.2, life: 1.1, t: 0, text: txt, col: ev.combo > 1 ? '#FF5C7A' : '#FFFFFF', big: ev.type === 'bonus' });
      if (ev.type === 'bonus') this.shakeT = rm ? 0 : 0.4;
    } else if (ev.type === 'bomb') {
      this.particles.push({ kind: 'ring', x: ev.x, y: ev.y, life: 0.45, t: 0, r: 120 });
      this.shakeT = rm ? 0 : 0.35;
    } else if (ev.type === 'item' && ev.item === 'shake') {
      this.shakeT = rm ? 0 : 0.5;
    } else if (ev.type === 'bubble') {
      this.particles.push({ kind: 'bubble', x: ev.x, y: ev.y, vx: (Math.random() - 0.5), vy: -3, life: 1.2, t: 0, level: ev.level });
    } else if (ev.type === 'thaw') {
      for (i = 0; i < 8; i++) {
        var b = Math.random() * Math.PI * 2;
        this.particles.push({ kind: 'shard', x: ev.x, y: ev.y, vx: Math.cos(b) * 3, vy: Math.sin(b) * 3 - 2, life: 0.6, t: 0, size: 6 });
      }
    }
    void s;
  };

  /* ---------- 主繪製 ---------- */
  Renderer.prototype.draw = function (dt) {
    var s = this.session, g = this.ctx;
    if (!s) return;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.drawImage(this.drawBackground(), 0, 0, this.cw, this.ch);
    g.save();
    var jx = 0, jy = 0;
    if (this.shakeT > 0) { this.shakeT -= dt; jx = (Math.random() - 0.5) * 8; jy = (Math.random() - 0.5) * 6; }
    g.translate(this.ox + jx, this.oy + jy);
    g.scale(this.scale, this.scale);

    this.drawBox(g, s);
    this.drawStatics(g, s);
    this.drawBodies(g, s);
    this.drawHeld(g, s);
    this.drawParticles(g, dt);
    g.restore();
  };

  Renderer.prototype.boxStyle = function (id) {
    return ({
      zoo: { inner: 'rgba(255,248,232,0.72)', frame: '#C98B4E', frameDark: '#7A4E22', rim: '#E7B27A' },
      ocean: { inner: 'rgba(220,246,255,0.35)', frame: '#BFEFFF', frameDark: '#3E95BE', rim: '#FFFFFF' },
      sweets: { inner: 'rgba(255,250,252,0.7)', frame: '#FF9AC4', frameDark: '#C8578A', rim: '#FFFFFF' },
      space: { inner: 'rgba(40,36,100,0.55)', frame: '#8F96F0', frameDark: '#3B3F7A', rim: '#C9CCFF' }
    })[id];
  };

  Renderer.prototype.drawBox = function (g, s) {
    var st = this.boxStyle(s.world.id), W = s.W, H = s.H, T = D.BOX.WALL;
    g.save();
    g.translate(0, H / 2); g.rotate(s.angle); g.translate(0, -H / 2);
    // 內部
    g.fillStyle = st.inner;
    g.fillRect(-W / 2, 0, W, H);
    // 紅線
    var dangerOn = s.danger > 0;
    var pulse = dangerOn ? 0.55 + 0.45 * Math.sin(s.t * 18) : 1;
    g.strokeStyle = dangerOn ? 'rgba(255,60,80,' + pulse + ')' : 'rgba(232,72,92,0.75)';
    g.lineWidth = dangerOn ? 5 : 3;
    g.setLineDash([14, 10]);
    g.beginPath(); g.moveTo(-W / 2, s.lineY); g.lineTo(W / 2, s.lineY); g.stroke();
    g.setLineDash([]);
    if (dangerOn) {
      g.fillStyle = 'rgba(255,60,80,' + (0.08 + 0.08 * pulse) + ')';
      g.fillRect(-W / 2, 0, W, s.lineY);
    }
    // 框
    var top = -34;
    g.fillStyle = st.frame; g.strokeStyle = st.frameDark; g.lineWidth = 3;
    roundRect(g, -W / 2 - T * 0.6, top, T * 0.6, H - top + T * 0.6, 8); g.fill(); g.stroke();
    roundRect(g, W / 2, top, T * 0.6, H - top + T * 0.6, 8); g.fill(); g.stroke();
    roundRect(g, -W / 2 - T * 0.6, H, W + T * 1.2, T * 0.6, 8); g.fill(); g.stroke();
    g.fillStyle = st.rim; g.globalAlpha = 0.6;
    g.fillRect(-W / 2 - T * 0.45, top + 8, 5, H - top - 16);
    g.fillRect(W / 2 + 6, top + 8, 5, H - top - 16);
    g.globalAlpha = 1;
    if (s.world.id === 'zoo') {
      g.strokeStyle = st.frameDark; g.globalAlpha = 0.35; g.lineWidth = 2;
      for (var y = top + 40; y < H; y += 60) {
        g.beginPath(); g.moveTo(-W / 2 - T * 0.5, y); g.lineTo(-W / 2 - 4, y + 10); g.stroke();
        g.beginPath(); g.moveTo(W / 2 + 4, y); g.lineTo(W / 2 + T * 0.5, y + 10); g.stroke();
      }
      g.globalAlpha = 1;
    }
    g.restore();
  };

  Renderer.prototype.drawStatics = function (g, s) {
    var st = this.boxStyle(s.world.id);
    s.statics.forEach(function (rec) {
      if (rec.kind === 'wall' || rec.kind === 'floor') return;
      var v = rec.body.vertices;
      g.beginPath(); g.moveTo(v[0].x, v[0].y);
      for (var i = 1; i < v.length; i++) g.lineTo(v[i].x, v[i].y);
      g.closePath();
      g.fillStyle = rec.kind === 'paddle' ? '#FFB45C' : (rec.kind === 'platform' ? '#7ED9C8' : st.frame);
      g.strokeStyle = st.frameDark; g.lineWidth = 2.5; g.fill(); g.stroke();
      if (rec.kind === 'paddle') {
        g.fillStyle = st.frameDark; g.beginPath(); g.arc(rec.body.position.x, rec.body.position.y, 6, 0, Math.PI * 2); g.fill();
      }
    });
  };

  Renderer.prototype.exprFor = function (b, s) {
    if (s.contacts[b.id] >= 5 || (s.t - b.mz.hit < 0.18)) return 'squish';
    if (s.danger > 0 || (s.t - b.mz.born > s.grace && s.nearLine(b) && s.state === 'playing')) return s.nearLine(b) ? 'nervous' : 'normal';
    return 'normal';
  };

  Renderer.prototype.drawBodies = function (g, s) {
    var self = this, wid = s.world.id, numbers = this.opts.numbers, rm = this.opts.reduceMotion;
    s.animals().forEach(function (b) {
      var m = b.mz, r = b.circleRadius;
      g.save();
      g.translate(b.position.x, b.position.y);
      var sc = 1;
      if (m.pop != null && s.t - m.pop < 0.25 && !rm) sc = 1 + 0.25 * (1 - (s.t - m.pop) / 0.25);
      var sqx = 1, sqy = 1;
      if (!rm && s.world.squash && s.t - m.hit < 0.3) {
        var k = Math.sin((s.t - m.hit) / 0.3 * Math.PI) * s.world.squash;
        sqx = 1 + k; sqy = 1 - k;
      }
      g.scale(sc * sqx, sc * sqy);
      if (m.gold) {
        g.save();
        g.shadowColor = '#FFD23C'; g.shadowBlur = 18;
        g.fillStyle = 'rgba(255,215,60,0.55)';
        g.beginPath(); g.arc(0, 0, r * 1.12, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      g.rotate(b.angle);
      var img = m.kind === 'animal' ? Art.image(wid, m.level, self.exprFor(b, s), { number: numbers && !m.ice && m.kind === 'animal' && false })
        : Art.itemImage(m.kind);
      var size = m.kind === 'animal' ? r * 3.2 : r * 2.4;
      if (img.complete && img.naturalWidth) g.drawImage(img, -size / 2, -size / 2, size, size);
      else { g.fillStyle = '#ddd'; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill(); }
      g.rotate(-b.angle);
      if (m.gold) {
        var tw = (Math.sin(s.t * 6 + m.id) + 1) / 2;
        drawSpark(g, r * 0.55, -r * 0.6, 5 + tw * 4, '#FFF7C2');
        drawSpark(g, -r * 0.6, r * 0.3, 3 + (1 - tw) * 3, '#FFF7C2');
      }
      if (m.ice) {
        g.fillStyle = 'rgba(190,235,255,0.62)'; g.strokeStyle = '#6FC3EA'; g.lineWidth = 3;
        roundRect(g, -r * 1.08, -r * 1.08, r * 2.16, r * 2.16, r * 0.35); g.fill(); g.stroke();
        g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 3;
        g.beginPath(); g.moveTo(-r * 0.7, -r * 0.4); g.lineTo(-r * 0.3, -r * 0.8); g.moveTo(-r * 0.75, -r * 0.05); g.lineTo(-r * 0.05, -r * 0.8); g.stroke();
      }
      if (numbers && m.kind === 'animal') {
        var nr = Math.max(9, r * 0.32);
        g.fillStyle = '#fff'; g.strokeStyle = '#2B2233'; g.lineWidth = 2;
        g.beginPath(); g.arc(r * 0.62, -r * 0.62, nr, 0, Math.PI * 2); g.fill(); g.stroke();
        g.fillStyle = '#2B2233'; g.font = '700 ' + Math.round(nr * 1.25) + 'px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(m.level), r * 0.62, -r * 0.6);
      }
      g.restore();
    });
  };

  Renderer.prototype.drawHeld = function (g, s) {
    if (s.state === 'over') return;
    var h = s.held(), x = s.aimX, y = D.BOX.SPAWN_Y;
    var r = s.heldRadius();
    var ready = s.cooldown <= 0;
    // 落點預告線
    if (this.opts.guide && s.diff.guide !== false && (s.mode === 'level' || s.diff.guide)) {
      var hit = this.guideHit(s, x, r);
      g.save(); g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2.5; g.setLineDash([8, 8]);
      g.beginPath(); g.moveTo(x, y + r); g.lineTo(x, hit); g.stroke();
      g.strokeStyle = 'rgba(60,60,90,0.35)'; g.lineDashOffset = 8; g.beginPath(); g.moveTo(x, y + r); g.lineTo(x, hit); g.stroke();
      g.restore();
    }
    g.save();
    g.globalAlpha = ready ? 1 : 0.45;
    g.translate(x, y);
    var img = h.item ? Art.itemImage(h.item) : Art.image(s.world.id, h.level, 'normal');
    var size = h.item ? r * 2.4 : r * 3.2;
    if (h.gold) {
      g.fillStyle = 'rgba(255,215,60,0.5)'; g.beginPath(); g.arc(0, 0, r * 1.12, 0, Math.PI * 2); g.fill();
    }
    if (img.complete && img.naturalWidth) g.drawImage(img, -size / 2, -size / 2, size, size);
    g.restore();
  };

  /** 落點虛線：往下找第一個會碰到的動物頂端或箱底 */
  Renderer.prototype.guideHit = function (s, x, r) {
    var best = s.H;
    s.animals().forEach(function (b) {
      var dx = Math.abs(b.position.x - x);
      var rr = b.circleRadius + r;
      if (dx < rr) {
        var top = b.position.y - Math.sqrt(Math.max(0, rr * rr - dx * dx)) + r;
        if (top < best) best = top;
      }
    });
    return Math.max(D.BOX.SPAWN_Y + r * 2, best);
  };

  Renderer.prototype.drawParticles = function (g, dt) {
    var keep = [];
    for (var i = 0; i < this.particles.length; i++) {
      var p = this.particles[i];
      p.t += dt;
      if (p.t >= p.life) continue;
      keep.push(p);
      var k = 1 - p.t / p.life;
      if (p.vx != null) { p.x += p.vx * dt * 60; p.y += p.vy * dt * 60; }
      g.save();
      g.globalAlpha = Math.min(1, k * 1.5);
      if (p.kind === 'star') { p.vy += 0.08; drawSpark(g, p.x, p.y, p.size * k + 1, p.col); }
      else if (p.kind === 'text') {
        g.font = '800 ' + (p.big ? 40 : 26) + 'px system-ui, "PingFang TC", "Microsoft JhengHei", sans-serif';
        g.textAlign = 'center'; g.lineWidth = 6; g.strokeStyle = 'rgba(60,30,60,0.75)'; g.strokeText(p.text, p.x, p.y);
        g.fillStyle = p.col; g.fillText(p.text, p.x, p.y);
      } else if (p.kind === 'ring') {
        g.strokeStyle = '#FFB43C'; g.lineWidth = 10 * k; g.beginPath(); g.arc(p.x, p.y, p.r * (1 - k * 0.7), 0, Math.PI * 2); g.stroke();
      } else if (p.kind === 'bubble') {
        g.strokeStyle = '#BFEFFF'; g.fillStyle = 'rgba(191,239,255,0.3)'; g.lineWidth = 3;
        g.beginPath(); g.arc(p.x, p.y, D.RADII[p.level] * (1 + p.t), 0, Math.PI * 2); g.fill(); g.stroke();
      } else if (p.kind === 'shard') {
        p.vy += 0.15; g.fillStyle = '#CFF1FF'; g.fillRect(p.x, p.y, p.size, p.size);
      }
      g.restore();
    }
    this.particles = keep;
  };

  function roundRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  }
  function drawSpark(g, x, y, r, col) {
    g.fillStyle = col;
    g.beginPath();
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4, rr = i % 2 ? r * 0.38 : r;
      g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath(); g.fill();
  }

  root.MZRender = { Renderer: Renderer };
})(typeof self !== 'undefined' ? self : this);
