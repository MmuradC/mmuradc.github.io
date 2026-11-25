/* transitions.js — fade between pages for mmuradc.github.io
   ────────────────────────────────────────────────────────────────────────
   How it works (no framework, works on file:// and GitHub Pages):
   • A full-screen overlay sits at opacity 0.
   • Clicking an internal link fades the overlay in, then navigates.
   • The next page reads sessionStorage on load: if we arrived via a fade,
     it starts with the overlay opaque and fades it out — so the two halves
     read as one continuous cross-fade.
   • Back/forward restores get the fade too (via the pageshow event).
   • Honours prefers-reduced-motion: instant swap, no fade.
   • Skips: external links, new-tab clicks, anchors, downloads, modified
     clicks, and the language selector.                                    */

(function () {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const FLAG = 'mmc-fade';
  const OUT_MS = 260;   // fade-to-black duration
  const IN_MS = 380;    // fade-from-black duration

  /* ── overlay ─────────────────────────────────────────────────────── */
  const veil = document.createElement('div');
  veil.id = 'page-veil';
  veil.setAttribute('aria-hidden', 'true');
  document.documentElement.appendChild(veil);

  const style = document.createElement('style');
  style.textContent = `
    #page-veil {
      position: fixed;
      inset: 0;
      z-index: 200;
      pointer-events: none;
      opacity: 0;
      background: #120d08;
      transition: opacity ${OUT_MS}ms ease-in;
      will-change: opacity;
    }
    #page-veil.on   { opacity: 1; }
    #page-veil.hold { transition: none; opacity: 1; }
    #page-veil.out  { transition: opacity ${IN_MS}ms ease-out; opacity: 0; }
    /* while fading out, swallow clicks so nothing is half-pressed */
    #page-veil.on, #page-veil.hold { pointer-events: auto; }
    @media (prefers-reduced-motion: reduce) {
      #page-veil { transition: none; }
    }
  `;
  document.head.appendChild(style);

  let arrivedByFade = false;
  try { arrivedByFade = sessionStorage.getItem(FLAG) === '1'; } catch (e) {}

  /* ── fade in on arrival ──────────────────────────────────────────── */
  function fadeIn() {
    if (reduced || !arrivedByFade) { veil.className = ''; return; }
    arrivedByFade = false;
    try { sessionStorage.removeItem(FLAG); } catch (e) {}
    veil.className = 'hold';                 // opaque, no transition
    requestAnimationFrame(() => {
      requestAnimationFrame(() => { veil.className = 'out'; });
      setTimeout(() => { veil.className = ''; }, IN_MS + 60);
    });
  }

  if (document.readyState === 'complete') fadeIn();
  else addEventListener('load', fadeIn);

  /* bfcache restore: play the fade-in again so back feels smooth */
  addEventListener('pageshow', e => {
    if (e.persisted) {
      arrivedByFade = true;
      fadeIn();
    }
  });

  /* ── fade out on internal navigation ─────────────────────────────── */
  function isInternal(a) {
    if (!a || !a.href) return false;
    if (a.target && a.target !== '_self') return false;
    if (a.hasAttribute('download')) return false;
    if (a.id === 'lang-select') return false;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin) return false;
    if (url.pathname === location.pathname && url.search === location.search) return false; // same page
    if (!/\.html?$/.test(url.pathname) && url.pathname !== '/' && !/\/$/.test(url.pathname)) return false;
    return true;
  }

  let leaving = false;
  document.addEventListener('click', e => {
    if (e.defaultPrevented || e.button !== 0) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.target && e.target.closest ? e.target.closest('a') : null;
    if (!isInternal(a)) return;

    if (reduced) return;                     // let the browser navigate directly

    e.preventDefault();
    if (leaving) return;
    leaving = true;

    try { sessionStorage.setItem(FLAG, '1'); } catch (err) {}
    veil.className = 'on';

    let done = false;
    const go = () => {
      if (done) return;
      done = true;
      location.href = a.href;
    };
    setTimeout(go, OUT_MS + 20);
    // safety: never trap the user if something stalls
    setTimeout(go, 900);
  }, true);

  /* keyboard navigation (Enter on a focused link) fires click, so it is covered */
  window.MMC_FADE = { veil: veil };
})();
