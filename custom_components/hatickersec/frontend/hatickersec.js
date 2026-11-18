// HATickerSec — Breaking News feeds for Home Assistant.
// Glass news tickers: the dashboard card (custom:hatickersec-card), the tickers
// docked across every Home Assistant screen, alert pop-ups and chimes.
// Loaded on every Home Assistant page by the HATickerSec integration.

(() => {
if (window.__hatickersecLoaded) return;
window.__hatickersecLoaded = true;

const VERSION = '1.0.2';
const PANEL_PATH = '/hatickersec';

// ── This device ─────────────────────────────────────────────────────
// Docked tickers, pop-ups and chimes can be switched off per device (kept in this browser).
const DEVICE_KEY = 'hatickersec.device';
const DEVICE_DEFAULTS = { dock: true, popups: true, sound: true };
function deviceGet() {
  try { return { ...DEVICE_DEFAULTS, ...JSON.parse(localStorage.getItem(DEVICE_KEY) || '{}') }; }
  catch { return { ...DEVICE_DEFAULTS }; }
}
function deviceSet(next) {
  try { localStorage.setItem(DEVICE_KEY, JSON.stringify({ ...deviceGet(), ...next })); } catch {}
  dock.update();
}
window.hatickersecDevice = { get: deviceGet, set: deviceSet };

// ── Styles (inside a shadow root) ───────────────────────────────────
const TICKER_CSS = `
:host { --bar-h: 38px; --gap: 2px; --font: 17px; --alpha: 0.82; }
* { box-sizing: border-box; margin: 0; padding: 0; }
.root { font-family: "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif; user-select: none; -webkit-font-smoothing: antialiased; }
.bars { display: flex; flex-direction: column; gap: var(--gap); }
.bars > * { flex-shrink: 0; }
.scroll { overflow-x: hidden; overflow-y: auto; }
.scroll::-webkit-scrollbar { width: 10px; }
.scroll::-webkit-scrollbar-track { background: rgba(0,0,0,.35); }
.scroll::-webkit-scrollbar-thumb { background: rgba(140,170,255,.55); border-radius: 6px; border: 2px solid transparent; background-clip: padding-box; }

.bar {
  --c: #4fa3ff; position: relative; display: flex; align-items: stretch;
  height: var(--bar-h); flex: 0 0 var(--bar-h); overflow: hidden;
  background:
    linear-gradient(180deg, rgba(255,255,255,.10) 0%, rgba(255,255,255,.02) 48%, rgba(0,0,0,.10) 100%),
    linear-gradient(90deg, color-mix(in srgb, var(--c) 22%, transparent) 0%, transparent 28%),
    rgba(12, 16, 28, var(--alpha));
  border-top: 1px solid rgba(255,255,255,.16); border-bottom: 1px solid rgba(0,0,0,.35);
}
.bar::after { content: ""; position: absolute; inset: 0 0 auto 0; height: 1px; background: linear-gradient(90deg, var(--c), transparent 60%); opacity: .9; pointer-events: none; }
.label {
  flex: 0 0 auto; display: flex; align-items: center; gap: 8px; padding: 0 16px 0 14px;
  font-size: calc(var(--font) * .78); font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: #fff;
  background: linear-gradient(180deg, color-mix(in srgb, var(--c) 72%, #fff 0%) 0%, color-mix(in srgb, var(--c) 55%, #000) 100%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,.35), 6px 0 18px -6px color-mix(in srgb, var(--c) 70%, transparent);
  clip-path: polygon(0 0, 100% 0, calc(100% - 10px) 100%, 0 100%);
  text-shadow: 0 1px 2px rgba(0,0,0,.45); white-space: nowrap; cursor: default;
}
.label .dot { width: 7px; height: 7px; border-radius: 50%; background: #fff; box-shadow: 0 0 8px #fff; animation: pulse 2.4s ease-in-out infinite; }
.label .tr { font-size: .8em; font-weight: 600; letter-spacing: .02em; padding: 1px 5px; border-radius: 4px; background: rgba(0,0,0,.28); text-transform: none; }
.hide-label .label { display: none; }
@keyframes pulse { 50% { opacity: .35; box-shadow: 0 0 2px #fff; } }
.viewport { position: relative; flex: 1 1 auto; overflow: hidden;
  -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 28px, #000 calc(100% - 28px), transparent 100%);
  mask-image: linear-gradient(90deg, transparent 0, #000 28px, #000 calc(100% - 28px), transparent 100%); }
.track { position: absolute; top: 0; bottom: 0; left: 0; display: flex; align-items: center; white-space: nowrap; will-change: transform; }
.run { display: flex; align-items: center; }
.item { display: inline-flex; align-items: center; gap: 8px; padding: 0 4px; font-size: var(--font); font-weight: 500; color: rgba(255,255,255,.94);
  text-shadow: 0 1px 2px rgba(0,0,0,.55); cursor: pointer; border-radius: 6px; transition: color .15s, background .15s; }
.item:hover { color: #fff; background: rgba(255,255,255,.08); }
.item .age { font-size: .72em; font-weight: 600; color: rgba(255,255,255,.5); }
.item .new { font-size: .66em; font-weight: 800; letter-spacing: .08em; padding: 2px 6px; border-radius: 4px; color: #fff;
  background: linear-gradient(180deg, #ff4d4d, #c4161c); box-shadow: 0 0 10px rgba(255,60,60,.55); }
.sep { padding: 0 18px; font-size: calc(var(--font) * .55); color: var(--c); text-shadow: 0 0 6px var(--c); }
.msg { display: flex; align-items: center; height: 100%; padding-left: 18px; font-size: calc(var(--font) * .85); color: rgba(255,255,255,.6); font-style: italic; white-space: nowrap; }
.msg.err { color: #ffb4a8; }
.cat-head { --c: #4fa3ff; flex: 0 0 22px; height: 22px; display: flex; align-items: center; gap: 8px; padding: 0 12px;
  font-size: 11px; font-weight: 700; letter-spacing: .1em; text-transform: uppercase; color: rgba(255,255,255,.92); cursor: pointer;
  background: linear-gradient(90deg, color-mix(in srgb, var(--c) 55%, transparent) 0%, color-mix(in srgb, var(--c) 14%, transparent) 30%, transparent 70%), rgba(8, 11, 20, calc(var(--alpha) + .08));
  border-top: 1px solid color-mix(in srgb, var(--c) 60%, transparent); text-shadow: 0 1px 2px rgba(0,0,0,.6); }
.cat-head:hover { filter: brightness(1.25); }
.cat-head .chev { width: 10px; color: var(--c); font-size: 12px; }
.cat-head .icon { font-size: 12px; letter-spacing: 0; }
.cat-head .count { font-weight: 600; letter-spacing: .04em; text-transform: none; color: rgba(255,255,255,.55); }
.click-through .cat-head { cursor: default; }
.bar.in-cat .label { padding-left: 22px; }
.bar.merged .label { letter-spacing: .05em; cursor: pointer; }
.bar.merged.fixed .label { cursor: default; }
.bar.merged .label:hover { filter: brightness(1.2); }
.bar.merged .label .dot { display: none; }
.item .src { font-size: .62em; font-weight: 800; letter-spacing: .06em; text-transform: uppercase; padding: 2px 6px; border-radius: 4px;
  color: #fff; background: color-mix(in srgb, var(--sc) 55%, rgba(0,0,0,.4)); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--sc) 80%, transparent); }
.item mark { color: #1a1300; background: linear-gradient(180deg, #ffe58a, #f6c344); border-radius: 4px; padding: 0 4px; text-shadow: none; font-weight: 700; }
.item.kw { background: rgba(246,195,68,.10); box-shadow: inset 0 0 0 1px rgba(246,195,68,.35); }
.item.brk { color: #fff; background: linear-gradient(180deg, rgba(220,30,40,.42), rgba(150,10,20,.42)); box-shadow: inset 0 0 0 1px rgba(255,90,90,.55); }
.item .brk-tag { font-size: .66em; font-weight: 900; letter-spacing: .1em; padding: 2px 7px; border-radius: 4px; color: #fff;
  background: linear-gradient(180deg, #ff2d3a, #a8000c); box-shadow: 0 0 12px rgba(255,40,50,.75); animation: brkblink 1.1s steps(2, start) infinite; }
@keyframes brkblink { 50% { opacity: .55; } }
.item.glow { animation: glowpulse 1.4s ease-in-out 3; }
.item.glow-gold { --g: rgba(255,205,70,.95); }
.item.glow-red { --g: rgba(255,50,60,.95); }
@keyframes glowpulse { 0%, 100% { box-shadow: 0 0 0 0 transparent; }
  50% { box-shadow: 0 0 18px 4px var(--g), inset 0 0 0 1px var(--g); background-color: color-mix(in srgb, var(--g) 22%, transparent); } }
.click-through .item { cursor: default; }
.click-through .item:hover { background: none; }
.notice { display: flex; align-items: center; gap: 10px; height: var(--bar-h); padding: 0 16px; color: rgba(255,255,255,.65); font-style: italic;
  font-size: calc(var(--font) * .8); background: rgba(12,16,28,var(--alpha)); border-top: 1px solid rgba(255,255,255,.16); }
`;

const POPUP_CSS = `
* { box-sizing: border-box; margin: 0; padding: 0; }
.stack { position: fixed; right: 8px; display: flex; flex-direction: column-reverse; gap: 8px; z-index: 2147483001; pointer-events: none;
  font-family: "Segoe UI Variable Text", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif; user-select: none; }
.card { --c: #4fa3ff; position: relative; display: flex; width: min(404px, calc(100vw - 16px)); height: 108px; overflow: hidden; cursor: pointer; pointer-events: auto;
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255,255,255,.12), rgba(255,255,255,.03) 50%, rgba(0,0,0,.12)),
    linear-gradient(90deg, color-mix(in srgb, var(--c) 26%, transparent), transparent 45%), rgba(12,16,30,.94);
  border: 1px solid rgba(255,255,255,.16);
  box-shadow: 0 10px 30px rgba(0,0,0,.45), 0 0 0 1px color-mix(in srgb, var(--c) 35%, transparent), inset 0 1px 0 rgba(255,255,255,.18);
  backdrop-filter: blur(14px); animation: slidein .35s cubic-bezier(.2,.9,.3,1.2); }
.card.out { animation: slideout .3s ease-in forwards; }
@keyframes slidein { from { transform: translateX(110%); opacity: 0; } }
@keyframes slideout { to { transform: translateX(110%); opacity: 0; } }
.card.brk { --c: #ff2d3a; animation: slidein .35s cubic-bezier(.2,.9,.3,1.2), redpulse 1.4s ease-in-out .35s 3; }
@keyframes redpulse { 50% { box-shadow: 0 10px 30px rgba(0,0,0,.45), 0 0 22px 4px rgba(255,45,58,.75), inset 0 1px 0 rgba(255,255,255,.18); } }
.stripe { flex: 0 0 6px; background: linear-gradient(180deg, var(--c), color-mix(in srgb, var(--c) 50%, #000)); box-shadow: 0 0 12px var(--c); }
.body { flex: 1; min-width: 0; padding: 10px 12px; display: flex; flex-direction: column; gap: 4px; }
.head { display: flex; align-items: center; gap: 8px; }
.head img { width: 18px; height: 18px; border-radius: 5px; }
.agency { font-size: 11px; font-weight: 800; letter-spacing: .08em; text-transform: uppercase; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.why { font-size: 10.5px; font-weight: 800; letter-spacing: .06em; padding: 2px 7px; border-radius: 5px; color: #1a1300; background: linear-gradient(180deg, #ffe58a, #f6c344); white-space: nowrap; }
.card.brk .why { color: #fff; background: linear-gradient(180deg, #ff2d3a, #a8000c); box-shadow: 0 0 10px rgba(255,40,50,.6); }
.close { all: unset; margin-left: auto; cursor: pointer; color: rgba(255,255,255,.55); font-size: 13px; padding: 2px 6px; border-radius: 6px; }
.close:hover { color: #fff; background: rgba(255,255,255,.12); }
.title { color: #fff; font-size: 14.5px; font-weight: 600; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-shadow: 0 1px 2px rgba(0,0,0,.5); }
.foot { font-size: 11px; color: rgba(255,255,255,.5); margin-top: auto; }
.timer { position: absolute; left: 6px; right: 0; bottom: 0; height: 2px; background: var(--c); transform-origin: left; opacity: .8; }
`;

// ── Helpers ─────────────────────────────────────────────────────────
function el(tag, cls, txt) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (txt !== undefined) e.textContent = txt;
  return e;
}
const escapeRe = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const keyOf = it => it.link || it.title;
const glowed = new Map();   // headline -> passes it has glowed on (per screen)

function ago(ms) {
  if (!ms) return '';
  const m = Math.max(0, Math.round((Date.now() - ms) / 60000));
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return h < 48 ? `${h}h` : `${Math.round(h / 24)}d`;
}

// Headline text with the matched keywords wrapped in <mark>.
function titleWithMarks(title, keywords) {
  const t = el('span', 't');
  if (!keywords || !keywords.length) { t.textContent = title; return t; }
  const parts = keywords.map(k => k.endsWith('*') ? escapeRe(k.slice(0, -1)) + '[\\p{L}\\p{N}]*' : escapeRe(k));
  const re = new RegExp(`(${parts.join('|')})`, 'giu');
  let last = 0;
  for (const m of title.matchAll(re)) {
    if (m.index > last) t.append(title.slice(last, m.index));
    t.append(el('mark', '', m[0]));
    last = m.index + m[0].length;
  }
  t.append(title.slice(last));
  return t;
}

function openLink(url) {
  if (/^https?:\/\//i.test(url || '')) window.open(url, '_blank', 'noopener');
}

function openPanel() {
  if (!client.isAdmin()) return;
  history.pushState(null, '', PANEL_PATH);
  window.dispatchEvent(new CustomEvent('location-changed', { detail: { replace: false } }));
}

// ── Chimes (Web Audio, no sound files) ──────────────────────────────
// A note: [frequency Hz, start s, length s, wave, loudness 0–1, glide-to Hz]
const CHIMES = {
  bell: { normal: [[784, 0, .9, 'sine', 1], [1175, .16, .9, 'sine', 1]],
          breaking: [[880, 0, .9, 'sine', 1], [660, .16, .9, 'sine', 1], [880, .32, .9, 'sine', 1]] },
  glass: { normal: [[1568, 0, 1.4, 'sine', .9], [3136, 0, .5, 'sine', .25], [1568, .28, 1, 'sine', .3]],
           breaking: [[1760, 0, 1.2, 'sine', .9], [3520, 0, .4, 'sine', .25], [1760, .18, 1, 'sine', .6], [1760, .36, 1, 'sine', .35]] },
  marimba: { normal: [[523, 0, .35, 'sine', 1], [659, .11, .35, 'sine', 1], [784, .22, .5, 'sine', 1]],
             breaking: [[1047, 0, .3, 'sine', 1], [784, .1, .3, 'sine', 1], [659, .2, .3, 'sine', 1], [523, .3, .5, 'sine', 1]] },
  sonar: { normal: [[1400, 0, .5, 'sine', 1, 900], [1400, .35, .4, 'sine', .35, 900]],
           breaking: [[1600, 0, .4, 'sine', 1, 1000], [1600, .22, .4, 'sine', .8, 1000], [1600, .44, .5, 'sine', .45, 1000]] },
  newsflash: { normal: [[988, 0, .12, 'triangle', 1.1], [988, .16, .12, 'triangle', 1.1], [1319, .32, .45, 'triangle', 1.1]],
               breaking: [[1319, 0, .1, 'square', .6], [1319, .13, .1, 'square', .6], [1319, .26, .1, 'square', .6], [1760, .42, .5, 'triangle', 1.1]] }
};
let audioCtx = null;
function audio() {
  try { audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); } catch { return null; }
  if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
  return audioCtx;
}
// Browsers only allow sound after the page has been touched once: unlock on the first tap or key.
['pointerdown', 'keydown', 'touchstart'].forEach(ev => window.addEventListener(ev, () => audio(), { once: true, capture: true, passive: true }));

function chime({ volume = 0.5, breaking = false, sound = 'bell' } = {}) {
  const ctx = audio();
  if (!ctx) return;
  try {
    const now = ctx.currentTime + 0.02;
    const set = CHIMES[sound] || CHIMES.bell;
    const soften = ctx.createBiquadFilter();       // square waves are harsh: round them off
    soften.type = 'lowpass'; soften.frequency.value = 3500;
    soften.connect(ctx.destination);
    for (const [f, at, len, type, loud, glide] of (breaking ? set.breaking : set.normal)) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, now + at);
      if (glide) o.frequency.exponentialRampToValueAtTime(glide, now + at + len);
      const t0 = now + at;
      g.gain.setValueAtTime(0, t0);
      // Squared curve so the slider sounds even: 10% is a whisper, 100% is clear.
      g.gain.linearRampToValueAtTime(0.4 * loud * volume * volume, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + len);
      o.connect(g).connect(soften);
      o.start(t0); o.stop(t0 + len + 0.05);
    }
  } catch {}
}
window.hatickersecChime = chime;

// ── One scrolling bar ───────────────────────────────────────────────
class Bar {
  constructor(view, data) {
    this.view = view;
    this.id = data.id;
    this.items = [];
    this.pending = null;
    this.x = 0;
    this.runW = 0;
    this.hover = false;

    this.root = el('div', 'bar');
    this.label = el('div', 'label');
    this.viewport = el('div', 'viewport');
    this.track = el('div', 'track');
    this.viewport.appendChild(this.track);
    this.root.append(this.label, this.viewport);

    this.root.addEventListener('mouseenter', () => { this.hover = true; });
    this.root.addEventListener('mouseleave', () => { this.hover = false; });
    this.root.addEventListener('contextmenu', e => { if (client.isAdmin()) { e.preventDefault(); openPanel(); } });
    this.label.addEventListener('click', () => { if (this.data && this.data.cat && !this.data.fixed) client.toggleCategory(this.data.cat); });
    this.track.addEventListener('click', e => {
      const it = e.target.closest('.item');
      if (it && it.dataset.link) openLink(it.dataset.link);
    });
    this.update(data, true);
  }

  get cfg() { return client.cfg || { display: { speed: 90, showTime: true, newMinutes: 30, pauseOnHover: true }, alerts: {}, translation: {} }; }

  update(data, first = false) {
    this.data = data;
    this.all = data.items || [];
    this.root.style.setProperty('--c', data.color || '#4fa3ff');
    this.label.replaceChildren(el('span', 'dot'), el('span', '', data.name));
    if (data.title) this.label.title = data.title;
    if (data.translated) {
      const t = el('span', 'tr', `${(data.lang || '').toUpperCase()}→${(this.cfg.translation?.target || 'en').toUpperCase()}`);
      t.title = 'Headlines translated';
      this.label.appendChild(t);
    }
    if (this.cfg.display.onlyNew) this.label.appendChild(el('span', 'tr', 'NEW only'));
    this.refreshView(first);
  }

  // Headlines to scroll right now, after the "only NEW" filter.
  visible() {
    const d = this.cfg.display;
    if (!d.onlyNew) return this.all;
    const win = (d.newMinutes > 0 ? d.newMinutes : 30) * 60000;
    return this.all.filter(i => i.date && Date.now() - i.date < win);
  }

  showMessage(text, isError) {
    this.items = [];
    this.pending = null;
    this.runW = 0;
    this.needsRender = false;
    this.track.style.transform = 'none';
    this.track.replaceChildren(el('div', isError ? 'msg err' : 'msg', text));
  }

  refreshView(force = false) {
    const vis = this.visible();
    if (!vis.length) {
      const d = this.cfg.display, data = this.data;
      if (this.all.length && d.onlyNew) {
        const mins = d.newMinutes > 0 ? d.newMinutes : 30;
        this.showMessage(`No new ${data.title || data.name} headlines in the last ${mins} minutes — waiting for fresh news`, false);
      } else if (data.error) {
        this.showMessage(`Couldn't reach ${data.title || data.name} (${data.error}) — will retry`, true);
      } else if (data.loaded) {
        this.showMessage(`${data.title || data.name} has no headlines right now — checking again at the next update`, false);
      } else {
        this.showMessage('Loading headlines…', false);
      }
      return;
    }
    if (force || !this.items.length) {
      this.items = vis;
      this.pending = null;
      this.render();
      this.x = this.viewport.clientWidth || this.view.width();   // slide in from the right
    } else {
      this.pending = vis;   // swapped in at the next loop so nothing jumps
    }
  }

  buildRun() {
    const run = el('div', 'run');
    const d = this.cfg.display;
    const a = this.cfg.alerts || {};
    for (const it of this.items) {
      const span = el('span', 'item');
      span.dataset.link = it.link || '';
      if (it.original && this.cfg.translation?.showOriginalOnHover) span.title = it.original;
      const al = it.alert;
      if (al && al.breaking) span.classList.add('brk');
      if (al && al.keywords.length && a.highlight) span.classList.add('kw');
      if (it.flash && (glowed.get(keyOf(it)) || 0) < (a.glowPasses ?? 3)) span.classList.add('glow', al && al.breaking ? 'glow-red' : 'glow-gold');
      if (al && al.breaking) span.appendChild(el('span', 'brk-tag', 'BREAKING'));
      else if (it.date && d.newMinutes > 0 && Date.now() - it.date < d.newMinutes * 60000) span.appendChild(el('span', 'new', 'NEW'));
      if (it.source) {
        const chip = el('span', 'src', it.source.name);
        chip.style.setProperty('--sc', it.source.color || '#888');
        span.appendChild(chip);
      }
      span.appendChild(titleWithMarks(it.title, al && a.highlight ? al.keywords : []));
      if (d.showTime && it.date) span.appendChild(el('span', 'age', ago(it.date)));
      run.appendChild(span);
      run.appendChild(el('span', 'sep', '◆'));
    }
    return run;
  }

  render() {
    const first = this.buildRun();
    this.track.replaceChildren(first);
    const w = first.getBoundingClientRect().width;
    if (!this.root.isConnected || w < 20) {
      // Not on screen yet, so it can't be measured: try again next frame.
      this.runW = 0;
      this.needsRender = true;
      return;
    }
    this.needsRender = false;
    this.runW = w;
    // Enough copies to always cover the width (never more than 4).
    const copies = Math.min(4, Math.ceil((this.viewport.clientWidth || this.view.width()) / this.runW) + 1);
    for (let i = 0; i < copies; i++) this.track.appendChild(first.cloneNode(true));
  }

  tick(dt) {
    if (this.needsRender && this.root.isConnected && this.items.length) {
      this.render();
      if (this.runW) this.x = this.viewport.clientWidth || this.view.width();
    }
    if (!this.runW) return;
    const d = this.cfg.display;
    const stop = this.cfg.paused || (this.hover && d.pauseOnHover && !(this.view.dock && d.clickThrough));
    if (!stop) this.x -= (d.speed || 90) * dt;
    if (this.x <= -this.runW) {
      this.x += this.runW;
      for (const it of this.items) if (it.flash) glowed.set(keyOf(it), (glowed.get(keyOf(it)) || 0) + 1);
      // Re-apply the filter each loop so headlines that stop being NEW drop off.
      const next = this.visible();
      if (!next.length) { this.refreshView(); return; }
      this.items = next; this.pending = null;
      this.render();                          // also refreshes "12m" ages
      if (this.x <= -this.runW) this.x = 0;
    }
    this.track.style.transform = `translate3d(${Math.round(this.x * 2) / 2}px,0,0)`;
  }
}

// ── A set of tickers (one card, or the docked tickers) ──────────────
const views = new Set();

class TickerView {
  constructor(host, { dock = false, include = null } = {}) {
    this.host = host;           // element whose shadow root holds .root
    this.dock = dock;
    this.include = include;     // card option: only these source ids / categories
    this.bars = new Map();
    this.headers = new Map();
    this.root = el('div', 'root');
    this.barsEl = el('div', 'bars');
    this.root.appendChild(this.barsEl);
    this.prevOnlyNew = null;
    views.add(this);
  }

  destroy() { views.delete(this); }
  width() { return this.root.clientWidth || window.innerWidth; }

  wanted(row) {
    if (!this.include || !this.include.length) return true;
    const ids = [row.cat, row.kind === 'bar' ? row.bar.id : null].filter(Boolean);
    return ids.some(x => this.include.includes(x));
  }

  applyConfig(c) {
    const d = c.display;
    const style = this.host.style;
    style.setProperty('--bar-h', `${d.barHeight}px`);
    style.setProperty('--gap', `${d.gap}px`);
    style.setProperty('--font', `${d.fontSize}px`);
    style.setProperty('--alpha', d.opacity);
    this.root.classList.toggle('hide-label', !d.showLabel);
    this.root.classList.toggle('click-through', this.dock && !!d.clickThrough);
    const restart = this.prevOnlyNew !== !!d.onlyNew;
    this.prevOnlyNew = !!d.onlyNew;
    for (const b of this.bars.values()) {
      if (!b.data) continue;
      if (restart) b.update(b.data, true);
      else { b.update(b.data, false); if (b.items.length) b.render(); }   // keep scroll position
    }
  }

  headerEl(row) {
    let h = this.headers.get(row.cat);
    if (!h) {
      h = el('div', 'cat-head');
      h.addEventListener('click', () => client.toggleCategory(h.dataset.cat));
      h.addEventListener('contextmenu', e => { if (client.isAdmin()) { e.preventDefault(); openPanel(); } });
      this.headers.set(row.cat, h);
    }
    h.dataset.cat = row.cat;
    h.style.setProperty('--c', row.color);
    h.title = row.collapsed ? 'Click to show each source on its own bar' : 'Click to combine into one bar';
    h.replaceChildren(
      el('span', 'chev', row.collapsed ? '▸' : '▾'),
      el('span', 'icon', row.icon),
      el('span', 'name', row.title || row.cat),
      el('span', 'count', `${row.count} source${row.count === 1 ? '' : 's'}${row.collapsed ? ' · combined' : ''}`)
    );
    return h;
  }

  applyNews(view) {
    const rows = (view.rows || []).filter(r => this.wanted(r));
    this.rowCount = rows.length;
    this.rowsHeight = rows.reduce((s, r) => s + (r.kind === 'header' ? 22 : (client.cfg?.display.barHeight || 38)), 0)
      + Math.max(0, rows.length - 1) * (client.cfg?.display.gap ?? 2);
    const barIds = rows.filter(r => r.kind === 'bar').map(r => r.bar.id);
    const cats = rows.filter(r => r.kind === 'header').map(r => r.cat);
    for (const [id, b] of this.bars) if (!barIds.includes(id)) { b.root.remove(); this.bars.delete(id); }
    for (const [cat, h] of this.headers) if (!cats.includes(cat)) { h.remove(); this.headers.delete(cat); }
    if (this.noticeEl) { this.noticeEl.remove(); this.noticeEl = null; }
    rows.forEach(r => {
      if (r.kind === 'header') { this.barsEl.appendChild(this.headerEl(r)); return; }
      const data = r.bar;
      let b = this.bars.get(data.id);
      if (b) b.update(data, !!(view.force && view.force.includes(data.id)));
      else { b = new Bar(this, data); this.bars.set(data.id, b); }
      b.root.classList.toggle('in-cat', !!r.cat);
      b.root.classList.toggle('merged', !!r.merged);
      b.root.classList.toggle('fixed', !!(r.bar && r.bar.fixed));
      this.barsEl.appendChild(b.root);   // keeps display order
    });
    if (!rows.length) this.notice('No news sources yet — open HATickerSec in the sidebar to add some.');
  }

  notice(text) {
    for (const b of this.bars.values()) b.root.remove();
    for (const h of this.headers.values()) h.remove();
    this.bars.clear(); this.headers.clear();
    if (!this.noticeEl) { this.noticeEl = el('div', 'notice'); this.barsEl.appendChild(this.noticeEl); }
    this.noticeEl.textContent = text;
  }

  tick(dt) { for (const b of this.bars.values()) b.tick(dt); }
  relayout() { for (const b of this.bars.values()) if (b.items.length) b.render(); }
  recheck() { for (const b of this.bars.values()) if (!b.items.length && b.data) b.refreshView(); }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (!document.hidden) for (const v of views) v.tick(dt);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
// Bars waiting for NEW headlines check again every 30 seconds.
setInterval(() => { for (const v of views) v.recheck(); }, 30000);
window.addEventListener('resize', () => { for (const v of views) v.relayout(); dock.place(); });

// ── Connection to Home Assistant (one subscription for the whole page) ──
const client = {
  hass: null, conn: null, cfg: null, news: null, unsub: null, failed: null,

  setHass(hass) {
    if (!hass || !hass.connection) return;
    this.hass = hass;
    if (this.conn === hass.connection) return;
    this.conn = hass.connection;
    this.subscribe();
  },

  isAdmin() { return !!(this.hass && this.hass.user && this.hass.user.is_admin); },

  async subscribe() {
    if (this.unsub) { try { (await this.unsub)(); } catch {} this.unsub = null; }
    this.failed = null;
    try {
      this.unsub = await this.conn.subscribeMessage(m => this.onMessage(m), { type: 'hatickersec/subscribe' });
    } catch (err) {
      this.failed = err && err.code === 'unknown_command'
        ? 'HATickerSec isn’t set up yet — add it under Settings → Devices & services.'
        : `HATickerSec isn’t available (${(err && (err.message || err.code)) || 'error'}).`;
      for (const v of views) v.notice(this.failed);
      dock.update();
      setTimeout(() => { if (this.failed) this.subscribe(); }, 60000);
    }
  },

  onMessage(m) {
    switch (m.kind) {
      case 'config':
        this.cfg = m.config;
        cards.forEach(c => c.refreshState());
        for (const v of views) { v.applyConfig(this.cfg); if (this.news && !v.off) v.applyNews(this.news); }
        dock.update();
        break;
      case 'news':
        this.news = m.view;
        cards.forEach(c => c.refreshState());
        for (const v of views) if (!v.off) v.applyNews(this.news);
        dock.update();
        break;
      case 'chime':
        if (deviceGet().sound && (!this.cfg || this.cfg.active)) chime(m);
        break;
      case 'popup':
        if (deviceGet().popups) popups.show(m.popup);
        break;
    }
  },

  toggleCategory(cat) { this.hass && this.hass.callWS({ type: 'hatickersec/category', category: cat }).catch(() => {}); },
  setFlag(key, value) { this.hass && this.hass.callWS({ type: 'hatickersec/set_flag', key, value }).catch(() => {}); }
};
window.hatickersecClient = client;


// ── Docked tickers (top or bottom of every Home Assistant screen) ───
class HATickerSecDock extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    const style = el('style'); style.textContent = TICKER_CSS + `
      :host { position: fixed; left: 0; right: 0; display: none; }
      .root { height: 100%; }
      .root.scroll { height: 100%; }`;
    this.view = new TickerView(this, { dock: true });
    this.view.root.classList.add('scroll');
    this.shadowRoot.append(style, this.view.root);
  }
}

const dock = {
  elm: null,
  visible() {
    const c = client.cfg;
    if (!c || client.failed || !c.active || c.hidden || !deviceGet().dock) return false;
    if (!['top', 'bottom'].includes(c.display.position)) return false;
    // Not on the login page or the kiosk-less "print" views.
    if (!document.querySelector('home-assistant')) return false;
    return !!(client.news && (client.news.rows || []).length);
  },
  update() {
    const show = this.visible();
    if (show && !this.elm) {
      ensureDefined();
      const elm = document.createElement('hatickersec-dock');
      if (!elm.view) return;   // not defined yet: tried again in two seconds
      this.elm = elm;
      document.body.appendChild(this.elm);
      if (client.cfg) this.elm.view.applyConfig(client.cfg);
      if (client.news) this.elm.view.applyNews(client.news);
    }
    if (!this.elm) { this.reserve(0); return; }
    this.elm.style.display = show ? 'block' : 'none';
    this.place();
    popups.place();
  },
  // Like a docked taskbar: Home Assistant makes room so the tickers never cover
  // its toolbars, sidebar or buttons. Uses Home Assistant's own safe-area hook (the one its
  // phone apps use for the status and navigation bars). The sidebar only honors the top
  // inset, so it gets a small fix of its own when the tickers sit at the bottom.
  reserve(h, pos) {
    const root = document.documentElement.style;
    for (const side of ['top', 'bottom']) {
      const v = `--app-safe-area-inset-${side}`;
      if (h && pos === side) root.setProperty(v, `calc(${h}px + env(safe-area-inset-${side}, 0px))`);
      else if (this.reserved === side) root.removeProperty(v);
    }
    this.sidebarFix(h && pos === 'bottom' ? h : 0);
    this.reserved = h ? pos : null;
  },
  sidebarFix(h) {
    const main = document.querySelector('home-assistant')?.shadowRoot?.querySelector('home-assistant-main');
    const sb = main?.shadowRoot?.querySelector('ha-sidebar');
    if (!sb || !sb.shadowRoot) return;
    let st = sb.shadowRoot.getElementById('hatickersec-fix');
    if (!h) { if (st) { st.remove(); sb.style.removeProperty('height'); } return; }
    if (!st) { st = document.createElement('style'); st.id = 'hatickersec-fix'; sb.shadowRoot.appendChild(st); }
    sb.style.height = `calc(100% - ${h}px)`;
    st.textContent = `.panels-list { height: calc(100vh - var(--header-height, 56px) - var(--safe-area-inset-top, 0px) - ${h}px) !important; }`;
  },
  height() { return this.elm && this.elm.style.display !== 'none' ? this.elm.getBoundingClientRect().height : 0; },
  place() {
    if (!this.elm || !client.cfg) return;
    const d = client.cfg.display;
    const full = this.elm.view.rowsHeight || d.barHeight;
    // Never taller than the set share of the screen — the rest scrolls.
    const cap = Math.max(d.barHeight, Math.round(window.innerHeight * (d.maxHeightPct || 50) / 100));
    const h = Math.min(full, cap);
    const s = this.elm.style;
    s.height = `${h}px`;
    s.top = d.position === 'top' ? '0' : '';
    s.bottom = d.position === 'bottom' ? '0' : '';
    // On top of dialogs, or below them.
    s.zIndex = d.alwaysOnTop ? '2147483000' : '6';
    s.pointerEvents = d.clickThrough ? 'none' : '';
    this.reserve(s.display === 'none' ? 0 : h, d.position);
  }
};

// ── Alert pop-ups (bottom-right corner, newest at the bottom) ───────
const popups = {
  host: null, stack: null, list: [],
  ensure() {
    if (this.host) return;
    this.host = document.createElement('div');
    this.host.id = 'hatickersec-popups';
    const root = this.host.attachShadow({ mode: 'open' });
    const style = el('style'); style.textContent = POPUP_CSS;
    this.stack = el('div', 'stack');
    root.append(style, this.stack);
    document.body.appendChild(this.host);
    this.place();
  },
  place() {
    if (!this.stack) return;
    const bottom = client.cfg && client.cfg.display.position === 'bottom' ? dock.height() : 0;
    this.stack.style.bottom = `${bottom + 8}px`;
  },
  show(d) {
    this.ensure();
    while (this.list.length >= 4) this.list.shift().remove();
    const card = el('div', 'card');
    card.style.setProperty('--c', d.color || '#4fa3ff');
    if (d.breaking) card.classList.add('brk');
    const img = el('img'); img.src = `/hatickersec_static/icon.svg?v=${VERSION}`; img.alt = '';
    const close = el('button', 'close', '✕'); close.title = 'Dismiss';
    const head = el('div', 'head');
    head.append(img, el('span', 'agency', d.agency || 'HATickerSec'), el('span', 'why', d.why || ''), close);
    const body = el('div', 'body');
    body.append(head, el('div', 'title', d.title || ''), el('div', 'foot', d.foot || 'Click to read the full story'));
    const timer = el('div', 'timer');
    card.append(el('div', 'stripe'), body, timer);
    this.stack.appendChild(card);
    this.list.push(card);

    const LIFE = (d.seconds || 10) * 1000;
    let left = LIFE, lastT = performance.now(), hover = false, closing = false;
    const done = () => {
      if (closing) return;
      closing = true;
      card.classList.add('out');
      setTimeout(() => { card.remove(); this.list = this.list.filter(x => x !== card); }, 280);
    };
    card.addEventListener('mouseenter', () => { hover = true; });
    card.addEventListener('mouseleave', () => { hover = false; });
    close.addEventListener('click', e => { e.stopPropagation(); done(); });
    card.addEventListener('click', () => {
      if (d.action === 'update') {
        if (client.isAdmin()) client.hass.callWS({ type: 'hatickersec/update/install' }).catch(() => {});
        else openPanel();
      } else if (d.showTickers) client.setFlag('hidden', false);
      else if (d.link) openLink(d.link);
      done();
    });
    // Sticky pop-ups (update available) stay until they're closed.
    if (d.sticky) timer.style.display = 'none';
    else (function tick(now) {
      if (!hover) left -= now - lastT;
      lastT = now;
      timer.style.transform = `scaleX(${Math.max(0, left / LIFE)})`;
      if (left <= 0) done(); else requestAnimationFrame(tick);
    })(performance.now());
  }
};

// ── Dashboard card ──────────────────────────────────────────────────
const cards = new Set();

class HATickerSecCard extends HTMLElement {
  setConfig(config) {
    this.config = { ...(config || {}) };
    if (this.view) { this.view.include = this.config.include || null; if (client.news) this.view.applyNews(client.news); }
    this.applySize();
  }

  set hass(hass) {
    this._hass = hass;
    client.setHass(hass);
    if (!this.view) this.build();
  }

  build() {
    this.attachShadow({ mode: 'open' });
    const style = el('style');
    style.textContent = TICKER_CSS + `
      :host { display: block; }
      ha-card { overflow: hidden; background: transparent; border: 0; box-shadow: none; }
      ha-card.framed { background: var(--ha-card-background, var(--card-background-color)); border-radius: var(--ha-card-border-radius, 12px);
        border: var(--ha-card-border-width, 1px) solid var(--ha-card-border-color, var(--divider-color)); }
      .title { padding: 10px 14px 8px; font: 600 15px/1.2 var(--ha-font-family-body, Roboto, sans-serif); color: var(--primary-text-color); }`;
    this.card = document.createElement('ha-card');
    this.titleEl = el('div', 'title');
    this.view = new TickerView(this, { include: (this.config || {}).include || null });
    this.card.append(this.titleEl, this.view.root);
    this.shadowRoot.append(style, this.card);
    cards.add(this);
    if (client.cfg) this.view.applyConfig(client.cfg);
    this.refreshState();
    if (client.news && !this.view.off) this.view.applyNews(client.news);
    this.applySize();
    this.ro = new ResizeObserver(() => this.view.relayout());
    this.ro.observe(this.view.root);
  }

  applySize() {
    if (!this.view) return;
    const c = this.config || {};
    this.card.classList.toggle('framed', !!c.title);
    this.titleEl.textContent = c.title || '';
    this.titleEl.style.display = c.title ? '' : 'none';
    const mh = Number(c.max_height) || 0;
    this.view.root.classList.toggle('scroll', !!mh);
    this.view.root.style.maxHeight = mh ? `${mh}px` : '';
  }

  refreshState() {
    if (!this.view) return;
    const c = client.cfg;
    const off = client.failed || (c && !c.active);
    if (off) {
      this.view.off = true;
      this.view.notice(client.failed || 'HATickerSec is switched off — turn it on to see headlines.');
    } else if (this.view.off) {
      this.view.off = false;
      if (client.news) this.view.applyNews(client.news);
    }
  }

  connectedCallback() { if (this.view) { views.add(this.view); cards.add(this); } }
  disconnectedCallback() { if (this.view) { views.delete(this.view); cards.delete(this); } }

  getCardSize() { return Math.max(1, Math.ceil(((this.view && this.view.rowsHeight) || 40) / 50)); }
  getGridOptions() { return { columns: 'full', min_columns: 6, rows: 'auto' }; }
  static getStubConfig() { return {}; }
  static getConfigElement() { return document.createElement('hatickersec-card-editor'); }
}

// Simple editor: title, max height, which sources/categories.
class HATickerSecCardEditor extends HTMLElement {
  setConfig(config) { this.config = { ...(config || {}) }; this.render(); }
  set hass(h) { this._hass = h; if (!this.form) this.render(); else this.form.hass = h; }
  render() {
    if (!this._hass || !this.config) return;
    if (!this.form) {
      this.form = document.createElement('ha-form');
      this.form.computeLabel = s => ({ title: 'Title (optional)', max_height: 'Maximum height in pixels (0 = show every bar)', include: 'Only show these (leave empty for all)' })[s.name] || s.name;
      this.form.addEventListener('value-changed', e => {
        const v = { ...e.detail.value };
        Object.keys(v).forEach(k => { if (v[k] === '' || v[k] === 0 || (Array.isArray(v[k]) && !v[k].length)) delete v[k]; });
        this.config = { type: 'custom:hatickersec-card', ...v };
        this.dispatchEvent(new CustomEvent('config-changed', { detail: { config: this.config }, bubbles: true, composed: true }));
      });
      this.appendChild(this.form);
    }
    const opts = [];
    for (const r of (client.news && client.news.rows) || []) {
      if (r.kind === 'header') opts.push({ value: r.cat, label: `${r.icon} ${r.title} (whole category)` });
      else if (r.bar) opts.push({ value: r.cat && r.merged ? r.cat : r.bar.id, label: r.bar.name.replace(/^▸\s*/, '') });
    }
    this.form.hass = this._hass;
    this.form.data = this.config;
    this.form.schema = [
      { name: 'title', selector: { text: {} } },
      { name: 'max_height', selector: { number: { min: 0, max: 2000, step: 10, mode: 'box', unit_of_measurement: 'px' } } },
      { name: 'include', selector: { select: { multiple: true, options: opts } } }
    ];
  }
}

window.customCards = window.customCards || [];
if (!window.customCards.some(c => c.type === 'hatickersec-card')) {
  window.customCards.push({ type: 'hatickersec-card', name: 'HATickerSec', description: 'Breaking News feeds — glass scrolling news tickers', preview: true,
    documentationURL: 'https://github.com/Degederon/HATickerSec' });
}

// Home Assistant's frontend can swap its custom-element registry while it starts, so make
// sure our elements are defined in the one the page ends up using (checked again below).
const ELEMENTS = [['hatickersec-dock', HATickerSecDock], ['hatickersec-card', HATickerSecCard], ['hatickersec-card-editor', HATickerSecCardEditor]];
function ensureDefined() {
  for (const [name, cls] of ELEMENTS) {
    if (window.customElements.get(name)) continue;
    try { window.customElements.define(name, cls); }
    catch { try { window.customElements.define(name, class extends cls {}); } catch {} }
  }
}
ensureDefined();

// Docked tickers and pop-ups don't live in a card, so find Home Assistant's own hass.
// (Started last, once everything above exists.)
function findHass() {
  const ha = document.querySelector('home-assistant');
  if (ha && ha.hass) client.setHass(ha.hass);
}
setInterval(() => { ensureDefined(); findHass(); dock.place(); }, 2000);   // also re-applies the room for the tickers after Home Assistant redraws
findHass();
window.addEventListener('location-changed', () => setTimeout(ensureDefined));
[50, 250, 1000].forEach(ms => setTimeout(ensureDefined, ms));

console.info(`%c HATickerSec %c ${VERSION} `, 'background:#e8192c;color:#fff;font-weight:700;border-radius:3px 0 0 3px', 'background:#14204d;color:#fff;border-radius:0 3px 3px 0');
})();
