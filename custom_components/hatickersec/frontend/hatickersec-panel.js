// HATickerSec — settings panel for Home Assistant (the PC app's Settings window).
// Every change is saved automatically and applied live on every screen.
(() => {
const STYLE = `:host {
  --bg: #0b1020;
  --glass: rgba(255,255,255,.06);
  --glass-2: rgba(255,255,255,.10);
  --line: rgba(255,255,255,.12);
  --text: #eef2ff;
  --muted: rgba(226,232,255,.62);
  --accent: #5b8cff;
  --accent-2: #a46bff;
  --ok: #34d399;
  --bad: #ff6b6b;
  --r: 16px;
}

* { box-sizing: border-box; }
:host { display: block; position: relative; height: 100%; overflow: hidden; overflow: clip;
  background: radial-gradient(1200px 700px at 10% -10%, #1b2550 0%, transparent 60%), var(--bg);
  color: var(--text);
  font: 14px/1.45 "Segoe UI Variable Text", "Segoe UI", system-ui, sans-serif;
  overflow: hidden;
}

.blob { position: absolute; border-radius: 50%; filter: blur(90px); opacity: .45; pointer-events: none; z-index: 0; }
.b1 { width: 520px; height: 520px; background: #3b5bff; top: -160px; right: -120px; }
.b2 { width: 420px; height: 420px; background: #9b4dff; bottom: -160px; left: 18%; opacity: .32; }
.b3 { width: 300px; height: 300px; background: #ff4d6d; top: 40%; right: 20%; opacity: .16; }

.glass {
  background: linear-gradient(180deg, rgba(255,255,255,.09), rgba(255,255,255,.035));
  border: 1px solid var(--line);
  border-radius: var(--r);
  backdrop-filter: blur(22px) saturate(140%);
  box-shadow: 0 10px 40px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.12);
}

.shell { position: relative; z-index: 1; display: flex; height: 100%; gap: 18px; padding: 18px; }

/* Sidebar */
.side { width: 240px; flex: 0 0 240px; display: flex; flex-direction: column; padding: 18px 12px; }
.brand { display: flex; gap: 12px; align-items: center; padding: 0 8px 18px; }
.brand img { width: 42px; height: 42px; border-radius: 10px; }
.brand-name { font-weight: 700; font-size: 16px; }
.brand-sub { color: var(--muted); font-size: 12px; }
nav { display: flex; flex-direction: column; gap: 4px; }
.nav {
  all: unset; display: flex; gap: 10px; align-items: center; cursor: pointer;
  padding: 10px 12px; border-radius: 10px; color: var(--muted); font-weight: 600;
}
.nav:hover { background: var(--glass); color: var(--text); }
.nav.active { background: linear-gradient(90deg, rgba(91,140,255,.28), rgba(164,107,255,.12)); color: #fff; box-shadow: inset 0 0 0 1px rgba(255,255,255,.12); }
.side-foot { margin-top: auto; padding: 8px; }
.save-state { font-size: 12px; color: var(--ok); margin-bottom: 10px; }
.save-state.dirty { color: #fbbf24; }
.hint { font-size: 12px; color: var(--muted); }

/* Main */
main { flex: 1; overflow-y: auto; padding: 4px 8px 40px 2px; }
main::-webkit-scrollbar { width: 10px; }
main::-webkit-scrollbar-thumb { background: rgba(255,255,255,.12); border-radius: 10px; border: 3px solid transparent; background-clip: content-box; }
.tab { display: none; }
.tab.active { display: block; animation: fade .25s ease; }
@keyframes fade { from { opacity: 0; transform: translateY(6px); } }
header h1 { margin: 6px 0 4px; font-size: 26px; letter-spacing: -.01em; }
header p { margin: 0 0 18px; color: var(--muted); }
h2 { margin: 0; font-size: 15px; }
.card { padding: 18px; margin-bottom: 16px; }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.muted { color: var(--muted); margin: 0 0 12px; }
.small { font-size: 12px; }
.pill { font-size: 12px; padding: 3px 10px; border-radius: 99px; background: var(--glass-2); color: var(--muted); }
.empty { color: var(--muted); padding: 10px 2px; }
.row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

/* Inputs */
input, select {
  font: inherit; color: var(--text);
  background: rgba(0,0,0,.28); border: 1px solid var(--line); border-radius: 10px;
  padding: 8px 10px; outline: none; width: 100%;
}
input:focus, select:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(91,140,255,.25); }
select option { background: #151b33; }
input[type=color] { padding: 2px; height: 36px; width: 46px; cursor: pointer; }
.search { max-width: 280px; }

.btn {
  font: inherit; font-weight: 600; cursor: pointer; border-radius: 10px; padding: 8px 14px;
  border: 1px solid var(--line); color: var(--text); background: var(--glass-2);
}
.btn:hover { background: rgba(255,255,255,.16); }
.btn.primary { border: 0; background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #fff; box-shadow: 0 6px 20px rgba(91,140,255,.35); }
.btn.primary:hover { filter: brightness(1.1); }
.btn.small { padding: 4px 10px; font-size: 12px; }
.icon-btn { all: unset; cursor: pointer; padding: 4px 7px; border-radius: 8px; color: var(--muted); }
.icon-btn:hover { background: var(--glass-2); color: #fff; }

.test-result { font-size: 13px; color: var(--muted); }
.test-result.ok { color: var(--ok); }
.test-result.bad { color: var(--bad); }

/* Enabled list */
.enabled-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 8px; }
.enabled-list li {
  display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 12px;
  background: rgba(0,0,0,.22); border: 1px solid var(--line);
}
.enabled-list li.dragging { opacity: .4; }
.enabled-list li.over { border-color: var(--accent); }
.grip { cursor: grab; color: var(--muted); padding: 0 4px; font-size: 16px; }
.swatch { width: 30px !important; height: 30px; flex: 0 0 30px; border-radius: 8px; }
.enabled-list .lbl { flex: 1; max-width: 300px; }
.enabled-list .meta { flex: 1; color: var(--muted); font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status { width: 9px; height: 9px; border-radius: 50%; background: #64748b; flex: 0 0 9px; }
.status.ok { background: var(--ok); box-shadow: 0 0 8px var(--ok); }
.status.bad { background: var(--bad); box-shadow: 0 0 8px var(--bad); }

/* Catalog */
.region { margin-bottom: 16px; }
.region-head { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.region-head h3 { margin: 0 !important; }
.region-note { font-size: 11px; font-weight: 600; color: #22d3ee; border: 1px solid rgba(34,211,238,.45); border-radius: 999px; padding: 2px 9px; }
.region-count { font-size: 12px; color: var(--muted); margin-right: auto; }
.btn:disabled { opacity: .35; cursor: default; }
.region h3 { margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: .1em; color: var(--muted); }
.cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 10px; }
.agency {
  position: relative; display: flex; align-items: center; gap: 10px; padding: 10px 12px;
  border-radius: 12px; background: rgba(0,0,0,.2); border: 1px solid var(--line); cursor: pointer;
  transition: border-color .15s, background .15s;
}
.agency:hover { background: rgba(255,255,255,.06); }
.agency.on { border-color: color-mix(in srgb, var(--c) 70%, transparent); background: color-mix(in srgb, var(--c) 12%, rgba(0,0,0,.2)); }
.agency .chip { width: 10px; height: 28px; border-radius: 4px; background: var(--c); box-shadow: 0 0 10px color-mix(in srgb, var(--c) 60%, transparent); }
.agency .nm { flex: 1; font-weight: 600; }
.agency .lang { font-size: 11px; padding: 1px 6px; border-radius: 6px; background: var(--glass-2); color: var(--muted); }
.agency .check { width: 22px; height: 22px; border-radius: 7px; border: 1px solid var(--line); display: grid; place-items: center; font-size: 13px; }
.agency.on .check { background: var(--c); border-color: transparent; color: #000; font-weight: 800; }

/* Custom form */
.custom-form { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 12px; }
.custom-form label { display: flex; flex-direction: column; gap: 4px; font-size: 12px; color: var(--muted); min-width: 140px; }
.custom-form label.grow { flex: 1; min-width: 260px; }

/* Display / fields */
.grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 26px; }
.field { display: flex; flex-direction: column; gap: 8px; }
.flabel { color: var(--muted); font-size: 13px; }
.flabel b { color: var(--text); margin-left: 4px; }
.seg { display: flex; background: rgba(0,0,0,.28); border: 1px solid var(--line); border-radius: 10px; padding: 3px; }
.seg button { all: unset; flex: 1; text-align: center; padding: 6px 8px; border-radius: 8px; cursor: pointer; color: var(--muted); font-weight: 600; }
.seg button.on { background: linear-gradient(135deg, var(--accent), var(--accent-2)); color: #fff; }

input[type=range] { -webkit-appearance: none; appearance: none; height: 6px; padding: 0; border: 0; background: rgba(255,255,255,.12); border-radius: 6px; }
input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 0 0 4px rgba(91,140,255,.45); cursor: pointer; }

.toggles { display: flex; flex-direction: column; gap: 12px; }
.tgl { display: flex; align-items: center; gap: 12px; cursor: pointer; color: var(--muted); }
.tgl b { color: var(--text); font-weight: 600; }
.tgl input { display: none; }
.tgl i { position: relative; width: 40px; height: 22px; flex: 0 0 40px; border-radius: 99px; background: rgba(255,255,255,.15); transition: background .2s; }
.tgl i::after { content: ""; position: absolute; top: 3px; left: 3px; width: 16px; height: 16px; border-radius: 50%; background: #fff; transition: transform .2s; }
.tgl input:checked + i { background: linear-gradient(135deg, var(--accent), var(--accent-2)); }
.tgl input:checked + i::after { transform: translateX(18px); }

.prov { display: none; }
.prov.show { display: flex; }

textarea {
  font: inherit; color: var(--text); width: 100%; resize: vertical;
  background: rgba(0,0,0,.28); border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; outline: none;
}
textarea:focus { border-color: var(--accent); box-shadow: 0 0 0 3px rgba(91,140,255,.25); }
input[type=time] { color-scheme: dark; }
.agency.test-ok   { box-shadow: inset 0 0 0 2px rgba(52,211,153,.7); }
.agency.test-bad  { box-shadow: inset 0 0 0 2px rgba(255,107,107,.8); }
.agency.testing   { opacity: .6; }

.demo-grid { display: flex; flex-direction: column; gap: 14px; }
.demo-grid .flabel { margin-bottom: 6px; }

.credit { margin-top: 14px; padding-top: 12px; border-top: 1px solid var(--line); font-size: 12px; color: var(--muted); line-height: 1.5; }
.credit b { color: var(--text); font-weight: 600; }

a.credit { display: block; text-decoration: none; cursor: pointer; border-radius: 0 0 8px 8px; transition: color .15s; }
a.credit:hover, a.credit:hover b { color: #fff; }
a.credit .yt { color: #ff4e45; font-weight: 600; }

/* Master on/off switch */
.master { display: flex; align-items: center; gap: 12px; margin: 0 4px 16px; padding: 12px 12px; border-radius: 14px; cursor: pointer;
  background: linear-gradient(135deg, rgba(34,197,94,.20), rgba(34,197,94,.06)); border: 1px solid rgba(34,197,94,.45); transition: all .2s; }
.master input { display: none; }
.master i { position: relative; width: 46px; height: 26px; flex: 0 0 46px; border-radius: 99px; background: rgba(255,255,255,.18); transition: background .2s; }
.master i::after { content: ""; position: absolute; top: 3px; left: 3px; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform .2s; box-shadow: 0 2px 6px rgba(0,0,0,.4); }
.master input:checked + i { background: linear-gradient(135deg, #22c55e, #16a34a); box-shadow: 0 0 14px rgba(34,197,94,.55); }
.master input:checked + i::after { transform: translateX(20px); }
.master b { display: block; font-size: 13.5px; }
.master small { display: block; font-size: 11px; color: var(--muted); }
.master.off { background: rgba(255,255,255,.04); border-color: var(--line); }
.master.off b { color: var(--muted); }

/* Settings that don't apply right now (e.g. Monitor when tickers are in a window). */
.dimmed { opacity: .38; pointer-events: none; filter: grayscale(.6); transition: opacity .2s; }

/* Home Assistant panel */
:host { box-sizing: border-box; padding-top: var(--safe-area-inset-top, 0px); padding-bottom: var(--safe-area-inset-bottom, 0px); }
.topbar { display: none; align-items: center; gap: 6px; height: 48px; padding: 0 8px; position: relative; z-index: 2; color: var(--text); }
.topbar .t { font-weight: 700; font-size: 18px; }
:host([narrow]) .topbar { display: flex; }
:host([narrow]) .shell { flex-direction: column; height: calc(100% - 48px); padding: 8px; gap: 10px; overflow-y: auto; }
:host([narrow]) .side { width: auto; flex: 0 0 auto; }
:host([narrow]) .side nav { flex-direction: row; flex-wrap: wrap; }
:host([narrow]) .side-foot .hint, :host([narrow]) .credit { display: none; }
:host([narrow]) main { overflow: visible; }
:host([narrow]) .grid2 { grid-template-columns: 1fr; }
:host([narrow]) .enabled-list .meta { display: none; }
input[type=color] { min-width: 46px; }
.side-foot .ver { font-size: 11px; color: var(--muted); margin-top: 8px; }
`;
const BODY = `
  <div class="blob b1"></div><div class="blob b2"></div><div class="blob b3"></div>

  <div class="shell">
    <aside class="side glass">
      <div class="brand">
        <img src="/hatickersec_static/icon.svg" alt="">
        <div>
          <div class="brand-name">HATickerSec</div>
          <div class="brand-sub">Home Assistant</div>
        </div>
      </div>
      <label class="master" id="masterWrap" title="Turn HATickerSec on or off (also the HATickerSec switch entity)">
        <input type="checkbox" id="master"><i></i>
        <span><b id="masterText">HATickerSec is ON</b><small id="masterSub">Tickers, headlines and alerts are running</small></span>
      </label>
      <nav>
        <button class="nav active" data-tab="agencies"><span>📰</span>News agencies</button>
        <button class="nav" data-tab="display"><span>🖥️</span>Display</button>
        <button class="nav" data-tab="alerts"><span>🔔</span>Alerts</button>
        <button class="nav" data-tab="updates"><span>🔄</span>Updates</button>
        <button class="nav" data-tab="translation"><span>🌐</span>Translation</button>
      </nav>
      <div class="side-foot">
        <div id="saveState" class="save-state">All changes saved</div>
        <div class="hint">Right-click any ticker to open these settings.<br>The <b>Hide docked tickers</b> switch hides or shows the docked tickers.</div>
        <a class="credit" id="creditLink" href="https://www.youtube.com/@epomd" target="_blank" rel="noopener" title="EPOMD Training Labs, EZ Tools and More — YouTube">Created by <b>Jay Appell</b><br>11/2026 · <span class="yt">▶ YouTube</span></a>
      </div>
    </aside>

    <main>
      <!-- ── Agencies ─────────────────────────────────────────── -->
      <section class="tab active" id="tab-agencies">
        <header>
          <h1>News agencies</h1>
          <p>Each agency you add gets its own scrolling bar. Drag to change the order — the top of the list is the top bar.</p>
        </header>

        <div class="glass card">
          <div class="card-head">
            <h2>Your tickers</h2>
            <span id="enabledCount" class="pill"></span>
          </div>
          <ul id="enabledList" class="enabled-list"></ul>
          <div id="enabledEmpty" class="empty">No agencies yet — add some from the list below.</div>
        </div>

        <div class="glass card">
          <div class="card-head">
            <h2>Add agencies</h2>
            <div class="row">
              <button id="testAll" class="btn ghost small">Test all agencies</button>
              <input id="search" class="search" type="search" placeholder="Search agencies or categories…">
            </div>
          </div>
          <div id="testAllResult" class="test-result" style="margin:-6px 0 12px"></div>
          <div id="catalog"></div>
        </div>

        <div class="glass card">
          <div class="card-head"><h2>Add a custom feed</h2></div>
          <p class="muted">Paste any RSS or Atom feed address — most news sites have one (look for “RSS” at the bottom of their page).</p>
          <div class="custom-form">
            <label>Name<input id="cName" placeholder="My local paper"></label>
            <label class="grow">Feed address<input id="cUrl" placeholder="https://example.com/rss.xml"></label>
            <label>Language<select id="cLang" class="lang-select"></select></label>
            <label>Color<input id="cColor" type="color" value="#4fa3ff"></label>
          </div>
          <div class="row">
            <button id="cTest" class="btn ghost">Test feed</button>
            <button id="cAdd" class="btn primary">Add feed</button>
            <span id="cResult" class="test-result"></span>
          </div>
        </div>
      </section>

      <!-- ── Display ──────────────────────────────────────────── -->
      <section class="tab" id="tab-display">
        <header>
          <h1>Display</h1>
          <p>Changes show on the tickers right away.</p>
        </header>
        <div class="glass card grid2">
          <div class="field">
            <div class="flabel">Position</div>
            <div class="seg" id="position">
              <button data-v="top">Top of screen</button>
              <button data-v="bottom">Bottom of screen</button>
              <button data-v="card">Dashboard cards only</button>
            </div>
            <div class="muted small" style="margin-top:6px">Top or bottom docks the tickers across every Home Assistant screen. The HATickerSec dashboard card works with any choice — add it from a dashboard with “Add card → HATickerSec”.</div>
          </div>
          
          <div class="field range"><div class="flabel">Tickers may use up to <b id="maxHeightPctV"></b></div><input id="maxHeightPct" type="range" min="10" max="100" step="5"><div class="muted small">of the screen height when docked. More tickers than fit get a scrollbar.</div></div>
          <div class="field range"><div class="flabel">Bar height <b id="barHeightV"></b></div><input id="barHeight" type="range" min="24" max="80" step="1"></div>
          <div class="field range"><div class="flabel">Text size <b id="fontSizeV"></b></div><input id="fontSize" type="range" min="11" max="40" step="1"></div>
          <div class="field range"><div class="flabel">Scroll speed <b id="speedV"></b></div><input id="speed" type="range" min="20" max="300" step="5"></div>
          <div class="field range"><div class="flabel">Background opacity <b id="opacityV"></b></div><input id="opacity" type="range" min="0.2" max="1" step="0.02"></div>
          <div class="field range"><div class="flabel">Space between bars <b id="gapV"></b></div><input id="gap" type="range" min="0" max="12" step="1"></div>
          <div class="field range"><div class="flabel">“NEW” tag for headlines younger than <b id="newMinutesV"></b></div><input id="newMinutes" type="range" min="0" max="180" step="5"></div>
        </div>
        <div class="glass card toggles">
          <label class="tgl"><input type="checkbox" id="onlyNew"><i></i><span><b>Show only NEW headlines</b> — just the ones younger than the “NEW” time above (also the “Show only NEW headlines” switch)</span></label>
          <label class="tgl"><input type="checkbox" id="showLabel"><i></i><span><b>Show agency name</b> on the left of each bar</span></label>
          <label class="tgl"><input type="checkbox" id="showTime"><i></i><span><b>Show age</b> of each headline (e.g. 12m)</span></label>
          <label class="tgl"><input type="checkbox" id="pauseOnHover"><i></i><span><b>Pause on hover</b> so a headline can be read and clicked</span></label>
          <label class="tgl"><input type="checkbox" id="alwaysOnTop"><i></i><span><b>Keep docked tickers on top</b> of Home Assistant dialogs and menus — turn off to let them appear in front of the tickers</span></label>
          <label class="tgl"><input type="checkbox" id="clickThrough"><i></i><span><b>Click-through</b> — the docked bars ignore the mouse, so you can click what's underneath</span></label>
          
        </div>
        <div class="glass card">
          <div class="card-head"><h2>This device</h2><span class="pill">Only this browser or tablet</span></div>
          <p class="muted">Every screen with Home Assistant open shows HATickerSec. Switch parts off for just this device — handy for a phone, or a wall tablet that should stay quiet at night.</p>
          <div class="toggles">
            <label class="tgl"><input type="checkbox" id="devDock"><i></i><span><b>Show docked tickers</b> on this device</span></label>
            <label class="tgl"><input type="checkbox" id="devPopups"><i></i><span><b>Show alert pop-ups</b> on this device</span></label>
            <label class="tgl"><input type="checkbox" id="devSound"><i></i><span><b>Play chimes</b> on this device</span></label>
          </div>
          <p class="muted small" style="margin-top:12px">Browsers only play sound after the page has been tapped once. A wall tablet in kiosk mode plays chimes after its first touch.</p>
        </div>
      </section>

      <!-- ── Alerts ───────────────────────────────────────────── -->
      <section class="tab" id="tab-alerts">
        <header>
          <h1>Alerts</h1>
          <p>Make the headlines that matter to you stand out — and let you know even when the tickers are hidden.</p>
        </header>

        <div class="glass card">
          <div class="card-head"><h2>Preview</h2><span class="pill">See what each part looks like</span></div>
          <div class="demo-grid">
            <div>
              <div class="flabel">On the ticker <span class="small">(sample slides into your top bar for a minute)</span></div>
              <div class="row">
                <button class="btn ghost demo" data-k="new">NEW headline</button>
                <button class="btn ghost demo" data-k="keyword">Keyword headline</button>
                <button class="btn ghost demo" data-k="breaking">Breaking headline</button>
                <button class="btn ghost demo" data-k="glow">Glow</button>
              </div>
            </div>
            <div>
              <div class="flabel">Pop-ups &amp; sound</div>
              <div class="row">
                <button class="btn ghost demo" data-k="popup-keyword">Keyword pop-up</button>
                <button class="btn ghost demo" data-k="popup-breaking">Breaking pop-up</button>
                <button class="btn ghost demo" data-k="ha">HA notification</button>
                <button class="btn ghost demo" data-k="chime">Chime</button>
                <button class="btn ghost demo" data-k="chime-breaking">Breaking chime</button>
              </div>
            </div>
            <div>
              <div class="flabel">All together</div>
              <div class="row">
                <button class="btn primary demo" data-k="everything">Simulate a breaking alert</button>
              </div>
            </div>
          </div>
          <div id="demoResult" class="test-result" style="margin-top:10px"></div>
        </div>

        <div class="glass card">
          <div class="card-head"><h2>Keyword alerts</h2></div>
          <p class="muted">One word or phrase per line. Matches whole words, any capitalization. End a word with <b>*</b> to catch variations — <b>hurrican*</b> matches hurricane and hurricanes.</p>
          <textarea id="keywords" rows="5" placeholder="Steelers&#10;Oak Creek&#10;hurrican*&#10;recall&#10;ransomware"></textarea>
          <div class="toggles" style="margin-top:14px">
            <label class="tgl"><input type="checkbox" id="highlight"><i></i><span><b>Highlight</b> matching headlines and mark the keyword in gold</span></label>
            <label class="tgl"><input type="checkbox" id="notifyKeywords"><i></i><span><b>Pop-up alert</b> when a new keyword headline arrives — works even when the tickers are hidden</span></label>
          </div>
        </div>

        <div class="glass card">
          <div class="card-head"><h2>Breaking news</h2></div>
          <div class="toggles">
            <label class="tgl"><input type="checkbox" id="breaking"><i></i><span><b>Detect breaking headlines</b> — shown in red with a BREAKING tag</span></label>
            <label class="tgl"><input type="checkbox" id="breakingFront"><i></i><span><b>Move them to the front</b> of their agency's bar</span></label>
            <label class="tgl"><input type="checkbox" id="notifyBreaking"><i></i><span><b>Pop-up alert</b> for breaking headlines</span></label>
          </div>
          <p class="muted" style="margin-top:14px">A headline is breaking when it starts with one of these (one per line):</p>
          <textarea id="breakingWords" rows="6"></textarea>
        </div>

        <div class="glass card">
          <div class="card-head"><h2>How alerts pop up</h2></div>
          <div class="seg" id="notifyStyle" style="max-width:640px">
            <button data-v="popup">HATickerSec pop-up</button>
            <button data-v="ha">Home Assistant notification</button>
            <button data-v="both">Both</button>
          </div>
          <p class="muted small" style="margin-top:10px">The HATickerSec pop-up slides in at the bottom-right corner of every open Home Assistant screen. A Home Assistant notification lands in the notification list (the bell in the sidebar), and can also go to your phone or a notify service such as HouseCall.</p>
          <div class="field" style="margin:4px 0 12px;max-width:520px"><div class="flabel">Also send Home Assistant notifications to (optional)</div><input id="notifyService" placeholder="notify.mobile_app_my_phone"></div>
          <div class="row"><button id="testNotify" class="btn ghost">Test alert</button><span id="notifyResult" class="test-result"></span></div>
        </div>

        <div class="glass card">
          <div class="card-head"><h2>Glow &amp; sound</h2></div>
          <div class="toggles">
            <label class="tgl"><input type="checkbox" id="chime"><i></i><span><b>Play a chime</b> when a new keyword or breaking headline arrives (breaking news gets a more urgent version)</span></label>
          </div>
          <div class="grid2" style="margin-top:16px">
            <div class="field range"><div class="flabel">Glow new alerts <b id="glowPassesV"></b></div><input id="glowPasses" type="range" min="0" max="10" step="1"><div class="muted small">How many times a brand-new alert headline pulses as it scrolls by</div></div>
            <div class="field"></div>
            <div class="field"><div class="flabel">Chime sound</div><select id="chimeSound">
              <option value="bell">Soft bell</option>
              <option value="glass">Glass ping</option>
              <option value="marimba">Marimba</option>
              <option value="sonar">Sonar blip</option>
              <option value="newsflash">News flash</option>
            </select></div>
            <div class="field range"><div class="flabel">Chime volume <b id="chimeVolumeV"></b></div><input id="chimeVolume" type="range" min="0.05" max="1" step="0.05"></div>
          </div>
          <div class="row" style="margin-top:12px"><button id="testChime" class="btn ghost">Play chime</button><button id="testChimeBreaking" class="btn ghost">Play breaking</button><span id="alertTestResult" class="test-result"></span></div>
          <div class="toggles" style="margin-top:16px">
            <label class="tgl"><input type="checkbox" id="quietHours"><i></i><span><b>Quiet hours</b> — no chime between these times (highlights and notifications still work)</span></label>
          </div>
          <div class="row" style="margin-top:10px">
            <label class="flabel">From <input id="quietFrom" type="time" style="width:130px"></label>
            <label class="flabel">to <input id="quietTo" type="time" style="width:130px"></label>
          </div>
        </div>
      </section>

      <!-- ── Updates ──────────────────────────────────────────── -->
      <section class="tab" id="tab-updates">
        <header>
          <h1>Updates</h1>
          <p>How often headlines are fetched and how many are shown.</p>
        </header>
        <div class="glass card grid2">
          <div class="field range"><div class="flabel">Check for news every <b id="refreshMinutesV"></b></div><input id="refreshMinutes" type="range" min="1" max="60" step="1"></div>
          <div class="field range"><div class="flabel">Headlines per agency <b id="maxPerAgencyV"></b></div><input id="maxPerAgency" type="range" min="3" max="50" step="1"></div>
          <div class="field range"><div class="flabel">Skip headlines older than <b id="maxAgeHoursV"></b></div><input id="maxAgeHours" type="range" min="0" max="72" step="1"></div>
          <div class="field"><div class="flabel">&nbsp;</div><button id="refreshNow" class="btn ghost">Refresh now</button></div>
        </div>

        <div class="glass card">
          <div class="card-head"><h2>App updates</h2><span id="updVersion" class="pill"></span></div>
          <p class="muted">HATickerSec checks for a newer version by itself and offers to install it. After installing, restart Home Assistant.</p>

          <div class="toggles" style="margin-top:14px">
            <label class="tgl"><input type="checkbox" id="autoCheck"><i></i><span><b>Check for updates automatically</b> when the app starts and every few hours</span></label>
          </div>
          <div class="row" style="margin-top:14px">
            <button id="updCheck" class="btn ghost">Check for updates</button>
            <button id="updInstall" class="btn primary" style="display:none">Install update</button>
            <span id="updStatus" class="test-result"></span>
          </div>
        </div>
      </section>

      <!-- ── Translation ──────────────────────────────────────── -->
      <section class="tab" id="tab-translation">
        <header>
          <h1>Translation</h1>
          <p>Headlines from agencies in other languages are translated before they scroll. Hover a translated headline to see the original.</p>
        </header>
        <div class="glass card toggles">
          <label class="tgl"><input type="checkbox" id="trEnabled"><i></i><span><b>Translate headlines</b> that aren't already in my language</span></label>
          <label class="tgl"><input type="checkbox" id="trHover"><i></i><span><b>Show the original</b> when hovering a translated headline</span></label>
        </div>
        <div class="glass card grid2">
          <div class="field"><div class="flabel">Translate into</div><select id="trTarget" class="lang-select no-auto"></select></div>
          <div class="field">
            <div class="flabel">Translation service</div>
            <select id="trProvider">
              <option value="google">Google Translate — free, no key</option>
              <option value="mymemory">MyMemory — free, no key (daily limit)</option>
              <option value="libre">LibreTranslate — your own or hosted server</option>
              <option value="deepl">DeepL — needs a free or paid API key</option>
            </select>
          </div>
          <div class="field prov prov-mymemory"><div class="flabel">Email (optional — raises the free limit to 50,000 characters a day)</div><input id="mymemoryEmail" placeholder="you@example.com"></div>
          <div class="field prov prov-libre"><div class="flabel">LibreTranslate server</div><input id="libreUrl" placeholder="https://libretranslate.com"></div>
          <div class="field prov prov-libre"><div class="flabel">API key (if the server needs one)</div><input id="libreKey" type="password"></div>
          <div class="field prov prov-deepl"><div class="flabel">DeepL API key</div><input id="deeplKey" type="password" placeholder="xxxxxxxx-xxxx-…:fx"></div>
        </div>
        <div class="row">
          <button id="trTest" class="btn ghost">Test translation</button>
          <span id="trResult" class="test-result"></span>
        </div>
        <p class="muted small">The Google option uses Google's free public web endpoint. It needs no account but isn't an official API and may slow down if used very heavily. Translations are cached, so each headline is only translated once.</p>
      </section>
    </main>
  </div>

  `;

async function initSettings(root, api) {

const $ = s => root.querySelector(s);
const $$ = s => [...root.querySelectorAll(s)];

const LANGS = {
  auto: 'Detect automatically', en: 'English', es: 'Spanish', fr: 'French', de: 'German', it: 'Italian',
  pt: 'Portuguese', nl: 'Dutch', pl: 'Polish', sv: 'Swedish', ru: 'Russian', uk: 'Ukrainian',
  tr: 'Turkish', ar: 'Arabic', he: 'Hebrew', hi: 'Hindi', ja: 'Japanese', ko: 'Korean', zh: 'Chinese'
};

let S, PRESETS, STATUS = {};
const TESTED = {};   // id -> 'ok' | 'bad' | 'testing' (from Test all agencies)
let saveTimer;

// ── Helpers ─────────────────────────────────────────────────────
function el(tag, attrs = {}, ...kids) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k === 'style') e.style.cssText = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else if (v !== undefined && v !== null) e.setAttribute(k, v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined) e.append(k);
  return e;
}

function allAgencies() {
  return [...PRESETS, ...S.custom.map(c => ({ region: 'Custom', ...c }))];
}

// Categories whose sources all scroll in a single bar.
const CONSOLIDATED = {
  'Cyber Breaking News': 'One ticker · consolidated feed',
  'Breaking Across the U.S.': 'One ticker · consolidated feed'
};

function agency(id) {
  const a = allAgencies().find(x => x.id === id);
  return a ? { ...a, ...(S.overrides[id] || {}) } : null;
}

function save() {
  $('#saveState').textContent = 'Saving…';
  $('#saveState').classList.add('dirty');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    S = await api.saveSettings(S);
    $('#saveState').textContent = 'All changes saved';
    $('#saveState').classList.remove('dirty');
  }, 350);
}

// ── Master on/off switch ────────────────────────────────────────
function showMaster(on) {
  $('#master').checked = on;
  $('#masterWrap').classList.toggle('off', !on);
  $('#masterText').textContent = on ? 'HATickerSec is ON' : 'HATickerSec is OFF';
  $('#masterSub').textContent = on ? 'Tickers, headlines and alerts are running' : 'No tickers, headlines or alerts until you turn it on';
}
$('#master').addEventListener('change', () => { S.active = $('#master').checked; showMaster(S.active); api.setActive(S.active); });

// ── Credit link ─────────────────────────────────────────────────

// ── Tabs ────────────────────────────────────────────────────────
$$('.nav').forEach(b => b.addEventListener('click', () => {
  $$('.nav').forEach(n => n.classList.toggle('active', n === b));
  $$('.tab').forEach(t => t.classList.toggle('active', t.id === `tab-${b.dataset.tab}`));
}));

// ── Enabled list (drag to reorder) ──────────────────────────────
let dragId = null;

function renderEnabled() {
  const list = $('#enabledList');
  list.replaceChildren();
  $('#enabledEmpty').style.display = S.enabled.length ? 'none' : 'block';
  $('#enabledCount').textContent = `${S.enabled.length} bar${S.enabled.length === 1 ? '' : 's'}`;

  S.enabled.forEach((id, i) => {
    const a = agency(id);
    if (!a) return;
    const st = STATUS[id];
    const stCls = st ? (st.ok ? 'ok' : 'bad') : '';
    const stTip = st ? (st.ok ? `${st.count} headlines` : `Error: ${st.error}`) : 'Waiting for first update';

    const color = el('input', { type: 'color', class: 'swatch', value: a.color, title: 'Bar color' });
    color.addEventListener('input', () => { setOverride(id, 'color', color.value); renderCatalog(); });

    const label = el('input', { class: 'lbl', value: a.label || a.name, title: 'Name shown on the bar' });
    label.addEventListener('change', () => setOverride(id, 'label', label.value.trim() || a.name));

    const li = el('li', { draggable: 'true', 'data-id': id },
      el('span', { class: 'grip', title: 'Drag to reorder' }, '⋮⋮'),
      el('span', { class: `status ${stCls}`, title: stTip }),
      color,
      label,
      el('span', { class: 'meta', title: a.url }, `${LANGS[a.lang] || a.lang || ''} · ${a.url}`),
      el('button', { class: 'icon-btn', title: 'Move up', onclick: () => move(i, -1) }, '▲'),
      el('button', { class: 'icon-btn', title: 'Move down', onclick: () => move(i, 1) }, '▼'),
      el('button', { class: 'icon-btn', title: 'Remove', onclick: () => toggle(id) }, '✕')
    );

    li.addEventListener('dragstart', () => { dragId = id; li.classList.add('dragging'); });
    li.addEventListener('dragend', () => { dragId = null; li.classList.remove('dragging'); });
    li.addEventListener('dragover', e => { e.preventDefault(); li.classList.add('over'); });
    li.addEventListener('dragleave', () => li.classList.remove('over'));
    li.addEventListener('drop', e => {
      e.preventDefault();
      li.classList.remove('over');
      if (!dragId || dragId === id) return;
      const from = S.enabled.indexOf(dragId);
      S.enabled.splice(from, 1);
      S.enabled.splice(S.enabled.indexOf(id) + (from <= i ? 1 : 0), 0, dragId);
      renderEnabled(); save();
    });
    list.append(li);
  });
}

function move(i, d) {
  const j = i + d;
  if (j < 0 || j >= S.enabled.length) return;
  [S.enabled[i], S.enabled[j]] = [S.enabled[j], S.enabled[i]];
  renderEnabled(); save();
}

function setOverride(id, key, value) {
  S.overrides[id] = { ...(S.overrides[id] || {}), [key]: value };
  save();
}

function toggle(id) {
  const i = S.enabled.indexOf(id);
  if (i >= 0) S.enabled.splice(i, 1); else S.enabled.push(id);
  renderEnabled(); renderCatalog(); save();
}

// ── Catalog ─────────────────────────────────────────────────────
function renderCatalog() {
  const q = $('#search').value.trim().toLowerCase();
  const groups = {};
  for (const a0 of allAgencies()) {
    const a = agency(a0.id);
    if (q && !`${a.name} ${a.region} ${LANGS[a.lang] || ''}`.toLowerCase().includes(q)) continue;
    (groups[a.region] = groups[a.region] || []).push(a);
  }
  const cat = $('#catalog');
  cat.replaceChildren();
  for (const [region, list] of Object.entries(groups)) {
    const cards = el('div', { class: 'cards' });
    for (const a of list) {
      const on = S.enabled.includes(a.id);
      const kids = [
        el('span', { class: 'chip' }),
        el('span', { class: 'nm' }, a.name),
        el('span', { class: 'lang', title: LANGS[a.lang] || '' }, (a.lang || 'auto').toUpperCase()),
        el('span', { class: 'check' }, on ? '✓' : '+')
      ];
      if (a.region === 'Custom') {
        kids.splice(3, 0, el('button', {
          class: 'icon-btn', title: 'Delete custom feed',
          onclick: e => { e.stopPropagation(); deleteCustom(a.id); }
        }, '🗑'));
      }
      const t = TESTED[a.id];
      const tCls = t ? ` ${t.state === 'ok' ? 'test-ok' : t.state === 'bad' ? 'test-bad' : 'testing'}` : '';
      const tip = t && t.msg ? `${a.url}\n${t.msg}` : a.url;
      cards.append(el('div', {
        class: `agency${on ? ' on' : ''}${tCls}`, style: `--c:${a.color}`, title: tip, onclick: () => toggle(a.id)
      }, kids));
    }
    const ids = list.map(a => a.id);
    const onCount = ids.filter(id => S.enabled.includes(id)).length;
    const note = CONSOLIDATED[region];
    const head = el('div', { class: 'region-head' },
      el('h3', {}, region),
      note ? el('span', { class: 'region-note' }, note) : null,
      el('span', { class: 'region-count' }, `${onCount} of ${ids.length} on`),
      el('button', { class: 'btn ghost small', disabled: onCount === ids.length ? '' : null, onclick: () => selectGroup(ids, true) }, 'Select all'),
      el('button', { class: 'btn ghost small', disabled: onCount === 0 ? '' : null, onclick: () => selectGroup(ids, false) }, 'Deselect all'));
    cat.append(el('div', { class: 'region' }, head, cards));
  }
  if (!cat.children.length) cat.append(el('div', { class: 'empty' }, 'No agencies match your search.'));
}

// Turn a whole group on or off (keeps the order of what's already on).
function selectGroup(ids, on) {
  if (on) ids.forEach(id => { if (!S.enabled.includes(id)) S.enabled.push(id); });
  else S.enabled = S.enabled.filter(id => !ids.includes(id));
  renderEnabled(); renderCatalog(); save();
}

function deleteCustom(id) {
  S.custom = S.custom.filter(c => c.id !== id);
  S.enabled = S.enabled.filter(x => x !== id);
  delete S.overrides[id];
  renderEnabled(); renderCatalog(); save();
}

$('#search').addEventListener('input', renderCatalog);

// Test every agency (6 at a time) and outline each card green or red.
$('#testAll').addEventListener('click', async () => {
  const btn = $('#testAll'), out = $('#testAllResult');
  btn.disabled = true;
  const list = allAgencies();
  list.forEach(a => { TESTED[a.id] = { state: 'testing' }; });
  renderCatalog();
  let i = 0, ok = 0, bad = 0;
  async function worker() {
    while (i < list.length) {
      const a = list[i++];
      const r = await api.testFeed(a.url);
      TESTED[a.id] = r.ok && r.count ? { state: 'ok', msg: `✓ ${r.count} headlines` } : { state: 'bad', msg: `✕ ${r.error || 'no headlines'}` };
      r.ok && r.count ? ok++ : bad++;
      out.className = 'test-result';
      out.textContent = `Testing… ${ok + bad} of ${list.length}`;
      renderCatalog();
    }
  }
  await Promise.all(Array.from({ length: 6 }, worker));
  out.className = `test-result ${bad ? 'bad' : 'ok'}`;
  out.textContent = `${ok} working, ${bad} not responding. Green outline = working, red = not working (hover a card for the reason).`;
  btn.disabled = false;
});

// ── Custom feed ─────────────────────────────────────────────────
async function testUrl(url, out) {
  out.className = 'test-result'; out.textContent = 'Testing…';
  const r = await api.testFeed(url);
  if (r.ok) {
    out.className = 'test-result ok';
    out.textContent = `✓ ${r.title || 'Feed'} — ${r.count} headlines${r.language ? ` (${r.language})` : ''}. Latest: “${r.sample[0] || ''}”`;
  } else {
    out.className = 'test-result bad';
    out.textContent = `✕ ${r.error}`;
  }
  return r;
}

$('#cTest').addEventListener('click', () => {
  const url = $('#cUrl').value.trim();
  if (url) testUrl(url, $('#cResult'));
});

$('#cAdd').addEventListener('click', async () => {
  const url = $('#cUrl').value.trim();
  const out = $('#cResult');
  if (!/^https?:\/\//i.test(url)) { out.className = 'test-result bad'; out.textContent = 'Enter a feed address starting with http:// or https://'; return; }
  const r = await testUrl(url, out);
  if (!r.ok) return;
  let lang = $('#cLang').value;
  if (lang === 'auto' && r.language && LANGS[r.language]) lang = r.language;
  const name = $('#cName').value.trim() || r.title || 'Custom feed';
  const id = 'custom-' + Date.now().toString(36);
  S.custom.push({ id, name, url, lang, color: $('#cColor').value });
  S.enabled.push(id);
  $('#cName').value = ''; $('#cUrl').value = '';
  out.textContent += ' — added.';
  renderEnabled(); renderCatalog(); save();
});

// ── Display & updates ───────────────────────────────────────────
const fmt = {
  barHeight: v => `${v}px`, fontSize: v => `${v}px`, speed: v => `${v} px/s`, gap: v => `${v}px`,
  opacity: v => `${Math.round(v * 100)}%`, newMinutes: v => (+v ? `${v} min` : 'off (30 min when showing only NEW)'),
  chimeVolume: v => `${Math.round(v * 100)}%`,
  maxHeightPct: v => `${v}%`,
  glowPasses: v => (+v ? `${v} pass${+v === 1 ? '' : 'es'}` : 'off'),
  refreshMinutes: v => `${v} min`, maxPerAgency: v => `${v}`, maxAgeHours: v => (+v ? `${v} h` : 'no limit')
};

function bindRange(id, section) {
  const input = $('#' + id);
  input.value = S[section][id];
  $(`#${id}V`).textContent = fmt[id](input.value);
  input.addEventListener('input', () => {
    S[section][id] = Number(input.value);
    $(`#${id}V`).textContent = fmt[id](input.value);
    save();
  });
}

function bindCheck(id, get, set) {
  const input = $('#' + id);
  input.checked = !!get();
  input.addEventListener('change', () => { set(input.checked); save(); });
}

// Monitor, screen share and click-through only apply to tickers docked at the
// top or bottom of a screen — dim them when the tickers are in a window.
function dimForWindowMode() {
  const win = S.display.position === 'card';
  const parts = [$('#maxHeightPct').closest('.field'), $('#clickThrough').closest('label'), $('#alwaysOnTop').closest('label')];
  for (const p of parts) {
    if (!p) continue;
    p.classList.toggle('dimmed', win);
    p.title = win ? 'Only used when the tickers are docked at the top or bottom' : '';
    p.querySelectorAll('input, select').forEach(i => { i.disabled = win; });
  }
}

function initDisplay() {
  $$('#position button').forEach(b => {
    b.classList.toggle('on', b.dataset.v === S.display.position);
    b.addEventListener('click', () => {
      S.display.position = b.dataset.v;
      $$('#position button').forEach(x => x.classList.toggle('on', x === b));
      dimForWindowMode();
      save();
    });
  });

  ['barHeight', 'fontSize', 'speed', 'opacity', 'gap', 'newMinutes', 'maxHeightPct'].forEach(id => bindRange(id, 'display'));
  dimForWindowMode();
  ['refreshMinutes', 'maxPerAgency', 'maxAgeHours'].forEach(id => bindRange(id, 'updates'));
  ['onlyNew', 'showLabel', 'showTime', 'pauseOnHover', 'clickThrough'].forEach(id =>
    bindCheck(id, () => S.display[id], v => { S.display[id] = v; }));
  bindCheck('alwaysOnTop', () => S.display.alwaysOnTop !== false, v => { S.display.alwaysOnTop = v; });
  // This device only (kept in this browser, not in Home Assistant).
  const dev = window.hatickersecDevice || { get: () => ({ dock: true, popups: true, sound: true }), set: () => {} };
  [['devDock', 'dock'], ['devPopups', 'popups'], ['devSound', 'sound']].forEach(([id, key]) => {
    const i = $('#' + id);
    i.checked = !!dev.get()[key];
    i.addEventListener('change', () => dev.set({ [key]: i.checked }));
  });

  $('#refreshNow').addEventListener('click', () => api.refresh());
}

// ── Translation ─────────────────────────────────────────────────
function initTranslation() {
  bindCheck('trEnabled', () => S.translation.enabled, v => { S.translation.enabled = v; });
  bindCheck('trHover', () => S.translation.showOriginalOnHover, v => { S.translation.showOriginalOnHover = v; });

  const tgt = $('#trTarget');
  tgt.value = S.translation.target;
  tgt.addEventListener('change', () => { S.translation.target = tgt.value; save(); });

  const prov = $('#trProvider');
  const showProv = () => $$('.prov').forEach(p => p.classList.toggle('show', p.classList.contains(`prov-${prov.value}`)));
  prov.value = S.translation.provider;
  showProv();
  prov.addEventListener('change', () => { S.translation.provider = prov.value; showProv(); save(); });

  ['mymemoryEmail', 'libreUrl', 'libreKey', 'deeplKey'].forEach(id => {
    const i = $('#' + id);
    i.value = S.translation[id] || '';
    i.addEventListener('change', () => { S.translation[id] = i.value.trim(); save(); });
  });

  $('#trTest').addEventListener('click', async () => {
    const out = $('#trResult');
    out.className = 'test-result'; out.textContent = 'Translating “Guten Morgen, die Nachrichten des Tages”…';
    const r = await api.testTranslate(S.translation);
    out.className = `test-result ${r.ok ? 'ok' : 'bad'}`;
    out.textContent = r.ok ? `✓ ${r.text}` : `✕ ${r.error}`;
  });
}

// ── Alerts ──────────────────────────────────────────────────────
function initAlerts() {
  const lines = v => v.split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  $('#keywords').value = (S.alerts.keywords || []).join('\n');
  $('#keywords').addEventListener('change', () => { S.alerts.keywords = lines($('#keywords').value); save(); });
  $('#breakingWords').value = (S.alerts.breakingWords || []).join('\n');
  $('#breakingWords').addEventListener('change', () => { S.alerts.breakingWords = lines($('#breakingWords').value); save(); });

  ['highlight', 'notifyKeywords', 'breaking', 'breakingFront', 'notifyBreaking', 'chime', 'quietHours'].forEach(id =>
    bindCheck(id, () => S.alerts[id], v => { S.alerts[id] = v; }));
  bindRange('chimeVolume', 'alerts');
  bindRange('glowPasses', 'alerts');
  $('#notifyService').value = S.alerts.notifyService || '';
  $('#notifyService').addEventListener('change', () => { S.alerts.notifyService = $('#notifyService').value.trim(); save(); });
  ['quietFrom', 'quietTo'].forEach(id => {
    $('#' + id).value = S.alerts[id];
    $('#' + id).addEventListener('change', () => { S.alerts[id] = $('#' + id).value; save(); });
  });

  const out = $('#alertTestResult');
  // Save right away so the preview plays the sound that is picked.
  const saveNow = async () => { clearTimeout(saveTimer); S = await api.saveSettings(S); $('#saveState').textContent = 'All changes saved'; $('#saveState').classList.remove('dirty'); };
  const play = async kind => {
    await saveNow();
    const r = await api.testAlert(kind);
    out.className = 'test-result';
    out.textContent = r.off ? 'The chime is switched off — turn on “Play a chime” to hear it'
      : r.quiet ? 'Played (it is quiet hours now, so real alerts stay silent until they end)' : '';
  };
  $('#chimeSound').value = S.alerts.chimeSound || 'bell';
  $('#chimeSound').addEventListener('change', () => { S.alerts.chimeSound = $('#chimeSound').value; play('chime'); });
  $('#testChime').addEventListener('click', () => play('chime'));
  $('#testChimeBreaking').addEventListener('click', () => play('chime-breaking'));
  $$('#notifyStyle button').forEach(b => {
    b.classList.toggle('on', b.dataset.v === (S.alerts.notifyStyle || 'popup'));
    b.addEventListener('click', () => {
      S.alerts.notifyStyle = b.dataset.v;
      $$('#notifyStyle button').forEach(x => x.classList.toggle('on', x === b));
      save();
    });
  });
  $('#testNotify').addEventListener('click', async () => {
    const nout = $('#notifyResult');
    nout.className = 'test-result'; nout.textContent = 'Sending…';
    await new Promise(r => setTimeout(r, 400));          // let a just-changed style save first
    const r = await api.testAlert('notify');
    const msgs = [];
    if (r.style !== 'ha') msgs.push('Pop-up shown at the bottom-right of every open Home Assistant screen.');
    if (r.ha) {
      if (!r.ha.ok) msgs.push(`The Home Assistant notification was added, but: ${r.ha.error}`);
      else msgs.push('Home Assistant notification added — open the notification list (the bell in the sidebar).' + (S.alerts.notifyService ? ` Also sent to ${S.alerts.notifyService}.` : ''));
    }
    const bad = r.ha && !r.ha.ok;
    nout.className = `test-result ${bad ? 'bad' : 'ok'}`;
    nout.textContent = msgs.join(' ');
  });
}

// ── App updates ─────────────────────────────────────────────────
function showUpdate(st) {
  $('#updVersion').textContent = `Installed: ${st.current}`;
  if (!st.configured) {
    $('#updStatus').className = 'test-result';
    $('#updStatus').textContent = 'Updates arrive through the Home Assistant Marketplace (or HACS). Nothing to set up.';
    ['#updCheck', '#updInstall'].forEach(id => { $(id).style.display = 'none'; });
    $('#autoCheck').closest('label').style.display = 'none';
    return;
  }
  $('#updCheck').style.display = '';
  $('#autoCheck').closest('label').style.display = '';
  const out = $('#updStatus');
  const msg = {
    idle: '',
    checking: 'Checking…',
    current: `You have the latest version${st.version ? ` (${st.version})` : ''}.`,
    available: `Version ${st.version} is available${st.notes ? ' — ' + st.notes : ''}.`,
    downloading: `Downloading update… ${st.progress || 0}%`,
    installed: `Version ${st.version} is installed — restart Home Assistant to start using it (Settings → System → ⋮ → Restart).`,
    signin: `${st.error ? st.error.charAt(0).toUpperCase() + st.error.slice(1) : 'Couldn’t reach the update folder'} — HATickerSec will try again later.`,
    error: st.error || 'Something went wrong.'
  }[st.status] || '';
  out.className = `test-result ${st.status === 'error' || st.status === 'signin' ? 'bad' : ['available', 'current', 'installed'].includes(st.status) ? 'ok' : ''}`;
  out.textContent = msg;
  $('#updInstall').style.display = st.status === 'available' ? '' : 'none';
  $('#updInstall').textContent = st.version ? `Install ${st.version}` : 'Install update';
}

async function initUpdates(st0) {
  bindCheck('autoCheck', () => S.updates.autoCheck, v => { S.updates.autoCheck = v; });
  $('#updCheck').addEventListener('click', async () => { await saveNowAll(); showUpdate(await api.checkUpdate()); });
  $('#updInstall').addEventListener('click', async () => showUpdate(await api.installUpdate()));
  showUpdate(st0);
}

async function saveNowAll() {
  clearTimeout(saveTimer);
  S = await api.saveSettings(S);
  $('#saveState').textContent = 'All changes saved';
  $('#saveState').classList.remove('dirty');
}

// ── Preview buttons ─────────────────────────────────────────────
function initDemo() {
  const out = $('#demoResult');
  $$('.demo').forEach(b => b.addEventListener('click', async () => {
    const k = b.dataset.k;
    const r = await api.demo(k);
    let msg = '', bad = false;
    if (!r.ok) { msg = r.error; bad = true; }
    else if (r.off) { msg = 'The chime is switched off — turn on “Play a chime” below to hear it.'; }
    else if (r.ha) {
      if (!r.ha.ok) { msg = `Added to Home Assistant's notifications, but: ${r.ha.error}`; bad = true; }
      else msg = 'Home Assistant notification added — open the notification list (the bell in the sidebar).';
    }
    else if (r.bar) msg = `Watch the ${r.bar} bar — the sample slides in from the right.${r.hidden ? ' (Your docked tickers are hidden — turn off “Hide docked tickers” to see them, or look at a HATickerSec card.)' : ''}${r.chimeOff ? ' The chime is off, so no sound.' : ''}`;
    else if (k.startsWith('popup')) msg = 'Look at the bottom-right corner of the screen.';
    else if (r.quiet) msg = 'Played — note it is quiet hours, so real alerts stay silent right now.';
    out.className = `test-result ${bad ? 'bad' : 'ok'}`;
    out.textContent = msg;
  }));
}

// ── Start ───────────────────────────────────────────────────────
const data = await api.getSettings();
S = data.settings; PRESETS = data.presets; STATUS = data.status || {};
showMaster(S.active !== false);
$('.brand-sub').textContent = `Breaking News feeds · v${data.version}`;

$$('.lang-select').forEach(sel => {
  const opts = Object.entries(LANGS).filter(([k]) => !(sel.classList.contains('no-auto') && k === 'auto'));
  sel.replaceChildren(...opts.map(([k, v]) => el('option', { value: k }, v)));
});

renderEnabled();
renderCatalog();
initDisplay();
initTranslation();
initAlerts();
initDemo();
await initUpdates(data.update);

// Live updates from Home Assistant (other screens, switches, refreshes).
return {
  onStatus(st) { STATUS = st; renderEnabled(); },
  onUpdate: showUpdate,
  onSettings(next) {
    // Only the live switches: don't overwrite what's being typed here.
    S.active = next.active; S.paused = next.paused; S.hidden = next.hidden;
    S.display.onlyNew = next.display.onlyNew; S.display.collapsed = next.display.collapsed;
    showMaster(S.active !== false);
    $('#onlyNew').checked = !!S.display.onlyNew;
  }
};

}

class HATickerSecPanel extends HTMLElement {
  set hass(h) {
    this._hass = h;
    if (window.hatickersecClient) window.hatickersecClient.setHass(h);
    if (this.menu) this.menu.hass = h;
    if (!this.started) this.start();
  }
  set narrow(n) {
    this._narrow = n;
    this.toggleAttribute('narrow', !!n);
    if (this.menu) this.menu.narrow = n;
  }
  set panel(p) { this._panel = p; }

  async start() {
    this.started = true;
    const root = this.attachShadow({ mode: 'open' });
    root.innerHTML = `<style>${STYLE}</style><div class="topbar"><span class="mb"></span><span class="t">HATickerSec</span></div>${BODY}`;
    this.menu = document.createElement('ha-menu-button');
    this.menu.hass = this._hass; this.menu.narrow = this._narrow;
    root.querySelector('.mb').appendChild(this.menu);
    const hass = () => this._hass;
    const ws = msg => hass().callWS(msg);
    const api = {
      getSettings: () => ws({ type: 'hatickersec/settings/get' }),
      saveSettings: s => ws({ type: 'hatickersec/settings/save', settings: s }),
      testFeed: url => ws({ type: 'hatickersec/feed_test', url }).catch(e => ({ ok: false, error: e.message || String(e) })),
      demo: kind => ws({ type: 'hatickersec/demo', kind }).catch(e => ({ ok: false, error: e.message || String(e) })),
      testAlert: kind => ws({ type: 'hatickersec/alert_test', kind }).catch(e => ({ ok: false, error: e.message || String(e) })),
      testTranslate: cfg => ws({ type: 'hatickersec/translate_test', cfg }).catch(e => ({ ok: false, error: e.message || String(e) })),
      refresh: () => ws({ type: 'hatickersec/refresh' }),
      setActive: on => ws({ type: 'hatickersec/set_active', on }),
      checkUpdate: () => ws({ type: 'hatickersec/update/check' }),
      installUpdate: () => ws({ type: 'hatickersec/update/install' })
    };
    let live;
    try {
      live = await initSettings(root, api);
    } catch (err) {
      root.querySelector('main').innerHTML = `<div class="glass card"><h2>HATickerSec isn’t ready</h2><p class="muted">${(err && (err.message || err.code)) || err}</p></div>`;
      return;
    }
    this.unsub = await hass().connection.subscribeMessage(m => {
      if (m.kind === 'status') live.onStatus(m.status);
      else if (m.kind === 'settings') live.onSettings(m.settings);
      else if (m.kind === 'update') live.onUpdate(m.state);
    }, { type: 'hatickersec/subscribe' });
  }

  disconnectedCallback() { if (this.unsub) { this.unsub(); this.unsub = null; } this.started = false; if (this.shadowRoot) this.shadowRoot.innerHTML = ''; }
  connectedCallback() { if (this._hass && !this.started && !this.shadowRoot) this.start(); }
}
customElements.get('hatickersec-panel') || customElements.define('hatickersec-panel', HATickerSecPanel);
})();
