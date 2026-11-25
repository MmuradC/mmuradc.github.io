/* sfx.js — procedural WebAudio sound effects for mmuradc.github.io.
   No audio files: every sound is synthesized (oscillators + noise buffer
   through biquads), so the site stays fully static and file://-safe.

   - AudioContext is created lazily inside the first real user gesture
     (pointer/key) — autoplay policy friendly.
   - Global `[SND ON/OFF]` toggle injected into .site-nav, persisted in
     localStorage. Shortcut: M (ignored while typing in inputs).
   - Hover ticks & click blips are auto-bound via event delegation.
   - Other scripts call:
       MMC_SFX.play('drop')   // water plip
       MMC_SFX.play('pong')   // arcade blip
       MMC_SFX.play('steam')  // cup fizz
       ... (see RECIPES)
   - Self-test:   file://…/sfx-selftest.html   exercises every recipe.
   - Console knobs: window.MMC_SFX.setVolume(0..1)                     */

(function () {
  'use strict';

  const LS_KEY = 'mmc-sfx';
  const VOL = 0.5;

  let enabled = true;
  try { enabled = localStorage.getItem(LS_KEY) !== 'off'; } catch (e) { /* private mode */ }

  let ctx = null;       // AudioContext, lazily created
  let master = null;    // master gain
  let noiseBuf = null;  // shared white-noise buffer

  const lastPlay = Object.create(null);   // per-name throttle
  const THROTTLE_MS = 45;
  let unlocked = false;                   // set by first real user gesture

  function ensure() {
    if (!enabled) return false;
    try {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return false;
        ctx = new AC();
        master = ctx.createGain();
        master.gain.value = enabled ? VOL : 0;
        master.connect(ctx.destination);
      }
      if (ctx.state === 'suspended') {
        const r = ctx.resume();
        if (r && r.catch) r.catch(function () { /* needs gesture; ignore */ });
      }
      return true;
    } catch (e) { return false; }
  }

  function getNoise() {
    if (!noiseBuf) {
      const n = Math.floor(ctx.sampleRate * 0.5);
      noiseBuf = ctx.createBuffer(1, n, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    }
    return noiseBuf;
  }

  /* tone: one oscillator with exp attack/decay and optional pitch drop */
  function tone(o) {
    const t = o.t, g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.g), t + (o.a || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    const osc = ctx.createOscillator();
    osc.type = o.type || 'sine';
    osc.frequency.setValueAtTime(o.f0, t);
    if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.f1), t + o.dur);
    osc.connect(g).connect(o.dest || master);
    osc.start(t); osc.stop(t + o.dur + 0.03);
  }

  /* noise: buffer source through a biquad with exp envelope */
  function noise(o) {
    const t = o.t, src = ctx.createBufferSource();
    src.buffer = getNoise();
    src.loop = true;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, o.g), t + (o.a || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
    let node = src;
    if (o.filter) {
      const f = ctx.createBiquadFilter();
      f.type = o.filter.type || 'bandpass';
      f.frequency.setValueAtTime(o.filter.f0, t);
      if (o.filter.f1) f.frequency.exponentialRampToValueAtTime(Math.max(40, o.filter.f1), t + o.dur);
      f.Q.value = o.filter.q || 1;
      node.connect(f); node = f;
    }
    node.connect(g).connect(o.dest || master);
    src.start(t); src.stop(t + o.dur + 0.03);
  }

  /* ── the recipes ─────────────────────────────────────────────────── */
  const RECIPES = {

    /* water plip: pitch-dropped plink + bandpassed splash + faint echo */
    drop: function (t) {
      const p = 0.75 + Math.random() * 0.6;
      tone({ t: t, type: 'sine', f0: 520 * p, f1: 170 * p, dur: 0.16, g: 0.30 });
      noise({ t: t + 0.01, filter: { type: 'bandpass', f0: 1500 * p, f1: 900, q: 1.2 }, dur: 0.24, g: 0.14 });
      tone({ t: t + 0.12, type: 'sine', f0: 300 * p, f1: 140, dur: 0.10, g: 0.10 });
    },

    /* hover tick: tiny triangle chirp */
    tick: function (t) {
      tone({ t: t, type: 'triangle', f0: 1500, f1: 1200, dur: 0.035, g: 0.05 });
    },

    /* generic UI click */
    click: function (t) {
      tone({ t: t, type: 'square', f0: 330, dur: 0.05, g: 0.09 });
      noise({ t: t, filter: { type: 'highpass', f0: 2500, q: 1 }, dur: 0.025, g: 0.05 });
    },

    /* terminal keystroke */
    type: function (t) {
      noise({ t: t, filter: { type: 'highpass', f0: 2800, q: 1 }, dur: 0.02, g: 0.06 });
      tone({ t: t, type: 'square', f0: 1900, dur: 0.012, g: 0.03 });
    },

    /* command success: little up-blip pair */
    ok: function (t) {
      tone({ t: t, type: 'sine', f0: 620, dur: 0.08, g: 0.08 });
      tone({ t: t + 0.08, type: 'sine', f0: 900, dur: 0.10, g: 0.07 });
    },

    /* command error: dark descending buzz */
    err: function (t) {
      tone({ t: t, type: 'square', f0: 140, f1: 70, dur: 0.20, g: 0.11 });
      tone({ t: t, type: 'sawtooth', f0: 65, dur: 0.18, g: 0.05 });
    },

    /* pong background bounce (quiet — it's ambience) */
    pong: function (t) {
      tone({ t: t, type: 'square', f0: 480 + Math.random() * 80, f1: 330, dur: 0.06, g: 0.035 });
    },

    /* coffee steam fizz (about page) */
    steam: function (t) {
      noise({ t: t, filter: { type: 'bandpass', f0: 700, f1: 1100, q: 0.8 }, dur: 0.55, g: 0.04, a: 0.18 });
    },

    /* terminal clear: autumn-y sweep down */
    clear: function (t) {
      noise({ t: t, filter: { type: 'bandpass', f0: 3800, f1: 250, q: 2.5 }, dur: 0.30, g: 0.06 });
    },

    /* activate/select: two quick square notes (row select etc.) */
    select: function (t) {
      tone({ t: t, type: 'square', f0: 520, dur: 0.05, g: 0.07 });
      tone({ t: t + 0.06, type: 'square', f0: 700, dur: 0.07, g: 0.06 });
    }
  };

  const QUIET_NAMES = { pong: 1 };   // ambience: skip global throttle

  function play(name) {
    if (!enabled || !unlocked) return;
    try {
      if (!ensure() || !ctx) return;
      const fn = RECIPES[name];
      if (!fn) return;
      const now = performance.now();
      if (!QUIET_NAMES[name] && lastPlay[name] && now - lastPlay[name] < THROTTLE_MS) return;
      lastPlay[name] = now;
      fn(ctx.currentTime);
    } catch (e) { /* never break a page because of sound */ }
  }

  function setVolume(v) {
    const val = Math.max(0, Math.min(1, +v || 0));
    if (ctx && master) master.gain.setTargetAtTime(enabled ? val : 0, ctx.currentTime, 0.01);
    return val;
  }

  function toggle() {
    enabled = !enabled;
    try { localStorage.setItem(LS_KEY, enabled ? 'on' : 'off'); } catch (e) {}
    if (ctx && master) master.gain.setTargetAtTime(enabled ? VOL : 0, ctx.currentTime, 0.015);
    return enabled;
  }

  /* ── nav mute button + global delegation ─────────────────────────── */
  function injectToggle() {
    const nav = document.querySelector('.site-nav');
    if (!nav || document.getElementById('sfx-toggle')) return;
    const b = document.createElement('button');
    b.id = 'sfx-toggle';
    b.type = 'button';
    b.className = 'sfx-toggle' + (enabled ? '' : ' off');
    b.textContent = enabled ? '[SND ON]' : '[SND OFF]';
    b.title = 'toggle sound effects (M)';
    b.setAttribute('aria-pressed', String(enabled));
    b.setAttribute('aria-label', 'toggle sound effects');
    b.addEventListener('click', function () {
      const on = toggle();
      b.textContent = on ? '[SND ON]' : '[SND OFF]';
      b.classList.toggle('off', !on);
      b.setAttribute('aria-pressed', String(on));
      if (on) play('select');
    });
    nav.appendChild(b);
  }

  const hoverOK = matchMedia('(hover: hover) and (pointer: fine)').matches;
  let lastHoverEl = null, lastHoverAt = 0;

  document.addEventListener('mouseover', function (e) {
    if (!hoverOK || !enabled) return;
    const el = e.target && e.target.closest
      ? e.target.closest('a, button, .card, .row, .cell') : null;
    if (!el || el === lastHoverEl || el.id === 'sfx-toggle') return;
    lastHoverEl = el;
    const now = performance.now();
    if (now - lastHoverAt < 60) return;
    lastHoverAt = now;
    play('tick');
  });
  document.addEventListener('mouseout', function (e) {
    if (e.target && e.target.closest && e.target.closest('a, button, .card, .row, .cell')) lastHoverEl = null;
  });

  document.addEventListener('click', function (e) {
    const el = e.target && e.target.closest ? e.target.closest('a, button') : null;
    if (el && el.id !== 'sfx-toggle') play(el.getAttribute && el.getAttribute('data-sfx') || 'click');
  }, true);

  document.addEventListener('keydown', function (e) {
    if ((e.key === 'm' || e.key === 'M') &&
        !(e.ctrlKey || e.metaKey || e.altKey)) {
      const t = e.target;
      const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
      if (!typing) { const on = toggle(); syncButtons(on); play('click'); }
    }
  });

  function syncButtons(on) {
    const b = document.getElementById('sfx-toggle');
    if (b) {
      b.textContent = on ? '[SND ON]' : '[SND OFF]';
      b.classList.toggle('off', !on);
      b.setAttribute('aria-pressed', String(on));
    }
  }

  /* unlock on first REAL gesture (autoplay policy). Captured phase so it
     beats page-level handlers on the very first interaction. */
  function unlock() {
    if (!unlocked) { unlocked = true; ensure(); }
  }
  addEventListener('pointerdown', unlock, { once: true, capture: true, passive: true });
  addEventListener('keydown', unlock, { once: true, capture: true });
  addEventListener('touchstart', unlock, { once: true, capture: true, passive: true });

  /* self-test page hook: file://…/sfx-selftest.html */
  try {
    const params = new URLSearchParams(location.search);
    if (params.has('sfx-selftest')) {
      const go = function () {
        if (!ensure() || !ctx) {
          console.info('[sfx] selftest: no playable context (state=' + (ctx ? ctx.state : 'none') + ')');
          return;
        }
        let ok = 0;
        Object.keys(RECIPES).forEach(function (name) {
          try { RECIPES[name](ctx.currentTime); ok++; }
          catch (e) { console.error('[sfx] fail:' + name, e); }
        });
        console.info('[sfx] selftest state=' + ctx.state + ' played=' + ok + '/' + Object.keys(RECIPES).length);
      };
      if (document.readyState === 'complete') setTimeout(go, 350);
      else addEventListener('load', function () { setTimeout(go, 350); });
    }
  } catch (e) { /* URLSearchParams unavailable — skip */ }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', injectToggle);
  } else {
    injectToggle();
  }
  addEventListener('DOMContentLoaded', function () {
    // nav is in markup before us, but wait for it explicitly on hard loads
    injectToggle();
  });

  window.MMC_SFX = { play: play, toggle: toggle, setVolume: setVolume };
})();
