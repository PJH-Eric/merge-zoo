/* ===== kit.js — 自繪 UI 元件（按鈕、開關、滑桿、捲動區、彈窗、選單、提示）=====
 * 元件內部保留語意標籤與 ARIA，但外觀與互動全部自行封裝，不顯示瀏覽器預設控制項與原生捲軸。
 */
(function (root) {
  'use strict';
  var d = root.document;
  var t = function (k, p) { return root.I18N.t(k, p); };

  function h(tag, attrs) {
    var el = d.createElement(tag);
    if (attrs) for (var k in attrs) {
      var v = attrs[k];
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (var i = 2; i < arguments.length; i++) append(el, arguments[i]);
    return el;
  }
  function append(el, c) {
    if (c == null || c === false) return;
    if (Array.isArray(c)) { c.forEach(function (x) { append(el, x); }); return; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? d.createTextNode(String(c)) : c);
  }

  /* ---------- 圖示（簡單線條 SVG） ---------- */
  var PATHS = {
    back: 'M15 5 L8 12 L15 19', pause: 'M8 5 v14 M16 5 v14', play: 'M8 5 L19 12 L8 19 Z',
    globe: 'M12 3 a9 9 0 1 0 0.01 0 Z M3 12 h18 M12 3 c-4 4 -4 14 0 18 M12 3 c4 4 4 14 0 18',
    gear: 'M12 8.5 a3.5 3.5 0 1 0 0.01 0 Z M12 2.5 v3 M12 18.5 v3 M2.5 12 h3 M18.5 12 h3 M5.3 5.3 l2.1 2.1 M16.6 16.6 l2.1 2.1 M5.3 18.7 l2.1 -2.1 M16.6 7.4 l2.1 -2.1',
    close: 'M6 6 L18 18 M18 6 L6 18', home: 'M4 11 L12 4 L20 11 M6 10 v9 h12 v-9', refresh: 'M19 8 a8 8 0 1 0 1 6 M19 3 v5 h-5',
    star: 'M12 3 l2.7 5.6 6.1 .8 -4.4 4.3 1 6.1 -5.4 -2.9 -5.4 2.9 1 -6.1 -4.4 -4.3 6.1 -.8 Z',
    lock: 'M7 11 v-3 a5 5 0 0 1 10 0 v3 M5 11 h14 v9 h-14 Z', book: 'M4 5 h6 a2 2 0 0 1 2 2 v12 a2 2 0 0 0 -2 -2 h-6 Z M20 5 h-6 a2 2 0 0 0 -2 2 v12 a2 2 0 0 1 2 -2 h6 Z',
    trophy: 'M8 4 h8 v5 a4 4 0 0 1 -8 0 Z M8 6 h-3 a3 3 0 0 0 3 4 M16 6 h3 a3 3 0 0 1 -3 4 M12 13 v4 M8 20 h8 M10 17 h4',
    chart: 'M5 20 v-6 M10 20 v-11 M15 20 v-8 M20 20 v-14 M3 20 h19', help: 'M9 9 a3 3 0 1 1 4 2.8 c-1 .5 -1 1 -1 2.2 M12 17.5 v.5 M12 3 a9 9 0 1 0 0.01 0 Z',
    rotL: 'M7 7 a8 8 0 1 1 -2 7 M7 2 v5 h5', rotR: 'M17 7 a8 8 0 1 0 2 7 M17 2 v5 h-5',
    check: 'M5 12 l5 5 L19 7', next: 'M9 5 L16 12 L9 19', calendar: 'M4 6 h16 v14 h-16 Z M4 10 h16 M8 3 v5 M16 3 v5',
    flag: 'M6 21 v-17 M6 4 h11 l-2 4 2 4 h-11', crown: 'M4 18 h16 l1 -10 -5 4 -4 -7 -4 7 -5 -4 Z'
  };
  function icon(name, cls) {
    var p = PATHS[name] || '';
    var fill = name === 'play' || name === 'star' || name === 'crown' ? 'currentColor' : 'none';
    return h('span', { class: 'ico ' + (cls || ''), 'aria-hidden': 'true',
      html: '<svg viewBox="0 0 24 24" width="24" height="24"><path d="' + p + '" fill="' + fill + '" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
  }

  /* ---------- 按鈕 ---------- */
  function button(opts) {
    var b = h('button', { type: 'button', class: 'btn ' + (opts.variant ? 'btn-' + opts.variant : 'btn-soft') + (opts.class ? ' ' + opts.class : ''),
      'aria-label': opts.aria || null, title: opts.title || null, disabled: opts.disabled || null, onclick: function (e) {
        if (root.GameAudio) root.GameAudio.sfx('click');
        if (opts.onClick) opts.onClick(e);
      } });
    if (opts.icon) append(b, icon(opts.icon));
    if (opts.label != null) append(b, h('span', { class: 'btn-label', text: opts.label }));
    if (opts.sub) append(b, h('span', { class: 'btn-sub', text: opts.sub }));
    return b;
  }
  function iconButton(name, label, onClick, cls) {
    return button({ icon: name, aria: label, title: label, onClick: onClick, variant: 'icon', class: cls });
  }

  /* ---------- 開關 ---------- */
  function toggle(label, value, onChange, note) {
    var sw = h('button', { type: 'button', class: 'switch', role: 'switch', 'aria-checked': value ? 'true' : 'false' },
      h('span', { class: 'switch-track' }, h('span', { class: 'switch-thumb' })));
    var lab = h('span', { class: 'row-label' }, label, note ? h('small', { class: 'row-note', text: note }) : null);
    var row = h('div', { class: 'setting-row' }, lab, sw);
    var id = 'sw' + Math.random().toString(36).slice(2, 8);
    lab.id = id; sw.setAttribute('aria-labelledby', id);
    sw.addEventListener('click', function () {
      value = !value;
      sw.setAttribute('aria-checked', value ? 'true' : 'false');
      if (root.GameAudio) root.GameAudio.sfx('click');
      onChange(value);
    });
    row.set = function (v) { value = v; sw.setAttribute('aria-checked', v ? 'true' : 'false'); };
    return row;
  }

  /* ---------- 滑桿 ---------- */
  function slider(label, value, onChange) {
    var id = 'sl' + Math.random().toString(36).slice(2, 8);
    var fill = h('span', { class: 'slider-fill' }), thumb = h('span', { class: 'slider-thumb' });
    var out = h('span', { class: 'slider-val' });
    var track = h('div', { class: 'slider', role: 'slider', tabindex: '0', 'aria-labelledby': id, 'aria-valuemin': '0', 'aria-valuemax': '100' },
      h('span', { class: 'slider-track' }, fill), thumb);
    function set(v, fire) {
      value = Math.max(0, Math.min(1, Math.round(v * 20) / 20));
      fill.style.width = (value * 100) + '%';
      thumb.style.left = (value * 100) + '%';
      track.setAttribute('aria-valuenow', String(Math.round(value * 100)));
      out.textContent = Math.round(value * 100) + '%';
      if (fire) onChange(value);
    }
    function fromEvent(e) {
      var r = track.getBoundingClientRect();
      set((e.clientX - r.left) / r.width, true);
    }
    track.addEventListener('pointerdown', function (e) {
      track.setPointerCapture(e.pointerId); fromEvent(e);
      function move(ev) { fromEvent(ev); }
      function up() { track.removeEventListener('pointermove', move); track.removeEventListener('pointerup', up); track.removeEventListener('pointercancel', up); }
      track.addEventListener('pointermove', move); track.addEventListener('pointerup', up); track.addEventListener('pointercancel', up);
    });
    track.addEventListener('keydown', function (e) {
      var k = e.key;
      if (k === 'ArrowLeft' || k === 'ArrowDown') { set(value - 0.05, true); e.preventDefault(); }
      else if (k === 'ArrowRight' || k === 'ArrowUp') { set(value + 0.05, true); e.preventDefault(); }
      else if (k === 'Home') { set(0, true); e.preventDefault(); }
      else if (k === 'End') { set(1, true); e.preventDefault(); }
    });
    set(value, false);
    var row = h('div', { class: 'setting-row setting-slider' }, h('span', { class: 'row-label', id: id, text: label }), h('div', { class: 'slider-wrap' }, track, out));
    row.set = function (v) { set(v, false); };
    return row;
  }

  /* ---------- 自繪捲動區 ---------- */
  function scrollArea(content, cls) {
    var view = h('div', { class: 'sa-view', tabindex: '0' }, content);
    var thumb = h('div', { class: 'sa-thumb' });
    var bar = h('div', { class: 'sa-bar', 'aria-hidden': 'true' }, thumb);
    var wrap = h('div', { class: 'sa ' + (cls || '') }, view, bar);
    function update() {
      var ch = view.clientHeight, sh = view.scrollHeight;
      if (sh <= ch + 1) { bar.classList.add('hidden'); return; }
      bar.classList.remove('hidden');
      var th = Math.max(36, ch * ch / sh);
      var top = (view.scrollTop / (sh - ch)) * (ch - th);
      thumb.style.height = th + 'px';
      thumb.style.transform = 'translateY(' + top + 'px)';
    }
    view.addEventListener('scroll', update, { passive: true });
    var ro = root.ResizeObserver ? new root.ResizeObserver(update) : null;
    if (ro) { ro.observe(view); ro.observe(content); }
    root.addEventListener('resize', update);
    thumb.addEventListener('pointerdown', function (e) {
      e.preventDefault();
      thumb.setPointerCapture(e.pointerId);
      var startY = e.clientY, startTop = view.scrollTop;
      function move(ev) {
        var ch = view.clientHeight, sh = view.scrollHeight, th = thumb.offsetHeight;
        view.scrollTop = startTop + (ev.clientY - startY) * (sh - ch) / Math.max(1, ch - th);
      }
      function up() { thumb.removeEventListener('pointermove', move); thumb.removeEventListener('pointerup', up); }
      thumb.addEventListener('pointermove', move); thumb.addEventListener('pointerup', up);
    });
    bar.addEventListener('pointerdown', function (e) {
      if (e.target !== bar) return;
      var r = bar.getBoundingClientRect();
      view.scrollTop += (e.clientY < r.top + thumb.offsetTop ? -1 : 1) * view.clientHeight * 0.85;
    });
    setTimeout(update, 30);
    wrap.view = view; wrap.update = update;
    return wrap;
  }

  /* ---------- 彈窗：遮罩、焦點鎖定、Esc 關閉、關閉後回原焦點 ---------- */
  var layer = null, stack = [];
  function modal(opts) {
    if (!layer) layer = d.getElementById('modal-layer');
    var prev = d.activeElement;
    var titleId = 'mt' + Math.random().toString(36).slice(2, 8);
    var body = h('div', { class: 'modal-body' }, opts.content);
    var closeBtn = opts.noClose ? null : iconButton('close', t('common.close'), function () { close(); }, 'modal-x');
    var box = h('div', { class: 'modal ' + (opts.class || ''), role: 'dialog', 'aria-modal': 'true', 'aria-labelledby': titleId },
      h('div', { class: 'modal-head' }, h('h2', { id: titleId, class: 'modal-title', text: opts.title || '' }), closeBtn),
      scrollArea(body, 'modal-scroll'),
      opts.actions ? h('div', { class: 'modal-actions' }, opts.actions) : null);
    var scrim = h('div', { class: 'modal-scrim' + (opts.scrimClass ? ' ' + opts.scrimClass : '') }, box);
    scrim.addEventListener('pointerdown', function (e) { if (e.target === scrim && !opts.noClose) close(); });
    var api = { el: box, close: close, closed: false };
    function key(e) {
      if (stack[stack.length - 1] !== api) return;
      var share = d.querySelector('.result-share-dialog-layer');
      if (share && !share.hidden) return;   // 分享視窗開著：Esc 與 Tab 交給它處理
      if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); if (!opts.noClose) close(); else if (opts.onEscape) opts.onEscape(); return; }
      if (e.key === 'Tab') {
        var f = box.querySelectorAll('button:not([disabled]), [tabindex="0"], a[href]');
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && d.activeElement === first) { last.focus(); e.preventDefault(); }
        else if (!e.shiftKey && d.activeElement === last) { first.focus(); e.preventDefault(); }
      }
    }
    function close() {
      if (api.closed) return;
      api.closed = true;
      d.removeEventListener('keydown', key, true);
      scrim.remove();
      stack.splice(stack.indexOf(api), 1);
      layer.classList.toggle('active', stack.length > 0);
      if (opts.onClose) opts.onClose();
      if (prev && prev.focus && d.body.contains(prev)) prev.focus({ preventScroll: true });
    }
    d.addEventListener('keydown', key, true);
    layer.appendChild(scrim);
    layer.classList.add('active');
    stack.push(api);
    setTimeout(function () {
      var f = box.querySelector(opts.focus || '.modal-actions .btn, .modal-body button, .modal-x');
      (f || box).focus({ preventScroll: true });
    }, 20);
    return api;
  }
  function modalOpen() { return stack.length > 0; }

  /* ---------- 下拉選單（語言） ---------- */
  function menu(anchor, items, onPick, current) {
    var list = h('div', { class: 'menu', role: 'listbox', tabindex: '-1' });
    var prev = d.activeElement;
    items.forEach(function (it) {
      var opt = h('button', { type: 'button', class: 'menu-item' + (it.value === current ? ' on' : ''), role: 'option',
        'aria-selected': it.value === current ? 'true' : 'false', text: it.label,
        onclick: function () { done(); onPick(it.value); } });
      list.appendChild(opt);
    });
    var scrim = h('div', { class: 'menu-scrim' }, list);
    d.getElementById('modal-layer').appendChild(scrim);
    var r = anchor.getBoundingClientRect();
    list.style.top = (r.bottom + 6) + 'px';
    list.style.right = Math.max(8, root.innerWidth - r.right) + 'px';
    scrim.addEventListener('pointerdown', function (e) { if (e.target === scrim) done(); });
    function key(e) {
      var opts = Array.prototype.slice.call(list.children), i = opts.indexOf(d.activeElement);
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); opts[(i + 1) % opts.length].focus(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); opts[(i - 1 + opts.length) % opts.length].focus(); }
    }
    function done() { d.removeEventListener('keydown', key, true); scrim.remove(); anchor.setAttribute('aria-expanded', 'false'); if (prev && prev.focus) prev.focus(); }
    d.addEventListener('keydown', key, true);
    anchor.setAttribute('aria-expanded', 'true');
    (list.querySelector('.on') || list.firstChild).focus();
  }

  /* ---------- 提示 ---------- */
  function toast(text, kind) {
    var host = d.getElementById('toasts');
    while (host.children.length >= 2) host.removeChild(host.firstChild);   // 同時最多兩則，避免蓋住遊戲
    var el = h('div', { class: 'toast ' + (kind || ''), role: 'status' }, text);
    host.appendChild(el);
    setTimeout(function () { el.classList.add('out'); }, 2200);
    setTimeout(function () { el.remove(); }, 2700);
  }

  root.Kit = { h: h, append: append, icon: icon, button: button, iconButton: iconButton, toggle: toggle, slider: slider,
    scrollArea: scrollArea, modal: modal, modalOpen: modalOpen, menu: menu, toast: toast };
})(typeof self !== 'undefined' ? self : this);
