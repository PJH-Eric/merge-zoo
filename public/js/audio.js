/* ===== audio.js — Web Audio 程式合成音效與 BGM（不使用外部音檔，沒有授權問題）=====
 * 合成音效：「啵」聲依等級變音高（小動物高、大動物低），每個世界換音色。
 * BGM：木琴童謠風主旋律，四個世界換樂器變奏（木琴／水泡／音樂盒／合成器）。
 */
(function (root) {
  'use strict';
  var ctx = null, master = null, sfxGain = null, bgmGain = null;
  var vol = { bgm: 0.6, sfx: 0.8 };
  var bgm = { world: null, timer: null, step: 0, next: 0, playing: false };

  var TIMBRE = {
    zoo: { wave: 'triangle', partial: 3.9, pGain: 0.35, decay: 0.28, glide: 0 },
    ocean: { wave: 'sine', partial: 2, pGain: 0.12, decay: 0.35, glide: 0.6 },
    sweets: { wave: 'sine', partial: 4, pGain: 0.45, decay: 0.7, glide: 0 },
    space: { wave: 'square', partial: 1.005, pGain: 0.5, decay: 0.32, glide: -0.2, filter: 1800 },
    polar: { wave: 'sine', partial: 5.2, pGain: 0.4, decay: 0.6, glide: 0 },
    jungle: { wave: 'triangle', partial: 2.8, pGain: 0.3, decay: 0.22, glide: -0.1 },
    dino: { wave: 'sawtooth', partial: 0.5, pGain: 0.5, decay: 0.4, glide: -0.3, filter: 900 },
    farm: { wave: 'triangle', partial: 3, pGain: 0.35, decay: 0.3, glide: 0.1 }
  };

  function ensure() {
    if (ctx) return ctx;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfxGain = ctx.createGain(); sfxGain.gain.value = vol.sfx * 0.6; sfxGain.connect(master);
    bgmGain = ctx.createGain(); bgmGain.gain.value = vol.bgm * 0.22; bgmGain.connect(master);
    return ctx;
  }
  /** 第一次使用者手勢後解鎖 */
  function unlock() {
    var c = ensure();
    if (c && c.state === 'suspended') c.resume();
  }
  function setVolume(kind, v) {
    vol[kind] = Math.max(0, Math.min(1, v));
    if (!ctx) return;
    if (kind === 'sfx') sfxGain.gain.setTargetAtTime(vol.sfx * 0.6, ctx.currentTime, 0.02);
    if (kind === 'bgm') bgmGain.gain.setTargetAtTime(vol.bgm * 0.22, ctx.currentTime, 0.05);
  }
  function midi(n) { return 440 * Math.pow(2, (n - 69) / 12); }

  function tone(freq, at, dur, opts, dest) {
    opts = opts || {};
    var c = ctx, t = at;
    var g = c.createGain();
    var out = g;
    if (opts.filter) {
      var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = opts.filter;
      g.connect(f); out = f;
    }
    out.connect(dest || sfxGain);
    var peak = opts.gain || 0.5;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var o = c.createOscillator();
    o.type = opts.wave || 'sine';
    o.frequency.setValueAtTime(freq, t);
    if (opts.glide) o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * (1 + opts.glide)), t + dur * 0.8);
    o.connect(g); o.start(t); o.stop(t + dur + 0.05);
    if (opts.partial) {
      var o2 = c.createOscillator(), g2 = c.createGain();
      o2.type = 'sine'; o2.frequency.setValueAtTime(freq * opts.partial, t);
      g2.gain.value = opts.pGain || 0.3;
      o2.connect(g2); g2.connect(g); o2.start(t); o2.stop(t + dur + 0.05);
    }
  }
  function noise(at, dur, gain, freq) {
    var c = ctx, len = Math.floor(c.sampleRate * dur);
    var buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (var i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var s = c.createBufferSource(); s.buffer = buf;
    var f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq || 900;
    var g = c.createGain(); g.gain.value = gain || 0.4;
    s.connect(f); f.connect(g); g.connect(sfxGain); s.start(at);
  }

  function sfx(name, o) {
    if (!ensure() || ctx.state !== 'running' || vol.sfx <= 0) return;
    o = o || {};
    var now = ctx.currentTime + 0.005;
    var tb = TIMBRE[o.world] || TIMBRE.zoo;
    switch (name) {
      case 'pop': {
        // 等級越大音越低：第 1 級 ≈ C6，第 10 級 ≈ C4
        var lv = o.level || 1;
        var f = midi(84 - (lv - 1) * 2.6);
        tone(f, now, tb.decay + lv * 0.02, { wave: tb.wave, partial: tb.partial, pGain: tb.pGain, glide: tb.glide || 0.25, gain: 0.45, filter: tb.filter });
        tone(f * 1.5, now + 0.05, 0.12, { wave: 'sine', gain: 0.15 });
        if (o.combo > 1) tone(f * 2, now + 0.09, 0.14, { wave: 'sine', gain: 0.12 + o.combo * 0.02 });
        break;
      }
      case 'drop': tone(midi(76), now, 0.09, { wave: 'sine', glide: -0.3, gain: 0.18 }); break;
      case 'impact': tone(midi(52), now, 0.07, { wave: 'sine', gain: Math.min(0.2, 0.05 + (o.speed || 3) * 0.015), glide: -0.4 }); break;
      case 'bonus':
        [72, 76, 79, 84, 88].forEach(function (n, i) { tone(midi(n), now + i * 0.07, 0.35, { wave: 'triangle', partial: 2, pGain: 0.2, gain: 0.35 }); });
        noise(now + 0.3, 0.5, 0.25, 3000); break;
      case 'bomb': noise(now, 0.6, 0.7, 700); tone(80, now, 0.4, { wave: 'sine', glide: -0.5, gain: 0.6 }); break;
      case 'shake': for (var i = 0; i < 4; i++) noise(now + i * 0.07, 0.08, 0.25, 1600); break;
      case 'thaw': tone(midi(91), now, 0.25, { wave: 'sine', gain: 0.25 }); tone(midi(96), now + 0.06, 0.3, { wave: 'sine', gain: 0.2 }); break;
      case 'gain': [79, 84, 91].forEach(function (n, i) { tone(midi(n), now + i * 0.06, 0.22, { wave: 'triangle', gain: 0.3 }); }); break;
      case 'tick': tone(midi(81), now, 0.12, { wave: 'triangle', gain: 0.35 }); break;
      case 'go': tone(midi(86), now, 0.16, { wave: 'triangle', gain: 0.35 }); tone(midi(93), now + 0.12, 0.25, { wave: 'triangle', gain: 0.35 }); break;
      case 'win': [72, 76, 79, 84].forEach(function (n, i) { tone(midi(n), now + i * 0.12, 0.4, { wave: 'triangle', partial: 2, pGain: 0.2, gain: 0.4 }); }); break;
      case 'lose': [72, 67, 64, 60].forEach(function (n, i) { tone(midi(n), now + i * 0.14, 0.35, { wave: 'triangle', gain: 0.3 }); }); break;
      case 'click': tone(midi(88), now, 0.05, { wave: 'sine', gain: 0.15 }); break;
      case 'poke': tone(midi(72), now, 0.16, { wave: 'sine', glide: 0.5, gain: 0.3 }); break;
      case 'swap': tone(midi(79), now, 0.08, { wave: 'triangle', gain: 0.2 }); tone(midi(84), now + 0.06, 0.1, { wave: 'triangle', gain: 0.2 }); break;
      case 'deny': tone(midi(55), now, 0.15, { wave: 'square', gain: 0.08, filter: 900 }); break;
      case 'danger': tone(midi(70), now, 0.15, { wave: 'square', gain: 0.08, filter: 1200 }); break;
      case 'bubble': tone(midi(80), now, 0.2, { wave: 'sine', glide: 0.8, gain: 0.25 }); break;
      case 'achv': [84, 88, 91, 96].forEach(function (n, i) { tone(midi(n), now + i * 0.08, 0.3, { wave: 'sine', partial: 2, pGain: 0.15, gain: 0.3 }); }); break;
    }
  }

  /* ---------- BGM ---------- */
  // 主旋律（同一段，四個世界換樂器）：C 大調童謠風，每格八分音符；null＝休止
  var MELODY = [72, 76, 79, 76, 77, 76, 74, null, 71, 74, 77, 74, 76, 74, 72, null,
    72, 76, 79, 81, 79, 77, 76, 74, 72, 74, 76, 74, 72, null, 67, null];
  var BASS = [48, null, 55, null, 53, null, 55, null, 50, null, 55, null, 48, null, 55, null,
    48, null, 55, null, 53, null, 57, null, 50, null, 55, null, 48, null, 43, null];
  var VOICE = {
    zoo: { wave: 'triangle', partial: 3.9, pGain: 0.3, dur: 0.32, bass: 'triangle' },
    ocean: { wave: 'sine', partial: 2, pGain: 0.1, dur: 0.5, bass: 'sine', glide: 0.03 },
    sweets: { wave: 'sine', partial: 4, pGain: 0.5, dur: 0.9, bass: 'sine', octave: 12 },
    space: { wave: 'square', partial: 1.006, pGain: 0.6, dur: 0.4, bass: 'sawtooth', filter: 1500 },
    polar: { wave: 'sine', partial: 5.2, pGain: 0.35, dur: 0.8, bass: 'sine', octave: 12 },
    jungle: { wave: 'triangle', partial: 2.8, pGain: 0.3, dur: 0.22, bass: 'triangle' },
    dino: { wave: 'sawtooth', partial: 0.5, pGain: 0.4, dur: 0.35, bass: 'sawtooth', filter: 1000, octave: -12 },
    farm: { wave: 'triangle', partial: 3, pGain: 0.35, dur: 0.25, bass: 'triangle' }
  };
  var STEP_SEC = 60 / 108 / 2;

  function schedule() {
    if (!bgm.playing || !ctx) return;
    var v = VOICE[bgm.world] || VOICE.zoo;
    while (bgm.next < ctx.currentTime + 0.25) {
      var i = bgm.step % MELODY.length;
      var n = MELODY[i], b = BASS[i];
      if (n != null) tone(midi(n + (v.octave || 0)), bgm.next, v.dur, { wave: v.wave, partial: v.partial, pGain: v.pGain, gain: 0.35, glide: v.glide, filter: v.filter }, bgmGain);
      if (b != null) tone(midi(b), bgm.next, v.dur * 1.2, { wave: v.bass, gain: 0.28, filter: v.filter || 900 }, bgmGain);
      bgm.step++;
      bgm.next += STEP_SEC;
    }
  }
  function playBgm(world) {
    if (!ensure()) return;
    if (bgm.playing && bgm.world === world) return;
    stopBgm();
    bgm.world = world; bgm.playing = true; bgm.step = 0; bgm.next = ctx.currentTime + 0.1;
    bgm.timer = root.setInterval(schedule, 90);
  }
  function stopBgm() {
    bgm.playing = false;
    if (bgm.timer) root.clearInterval(bgm.timer);
    bgm.timer = null;
  }
  function pauseAll(paused) {
    if (!ctx) return;
    if (paused) ctx.suspend(); else ctx.resume();
  }

  root.GameAudio = { unlock: unlock, sfx: sfx, playBgm: playBgm, stopBgm: stopBgm, setVolume: setVolume, pauseAll: pauseAll, get ctx() { return ctx; } };
})(typeof self !== 'undefined' ? self : this);
