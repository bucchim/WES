const fs = require('fs');
const path = require('path');
const D = require('./d.js');

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const KEY = { 'Confermato': 'ok', 'Da verificare': 'chk', 'Non specificato': 'na' };
function parseStato(s) {
  const m = s.match(/^(Confermato|Da verificare|Non specificato)\s*(?:\((.*)\))?$/);
  return { label: m[1], key: KEY[m[1]], detail: m[2] ? m[2] : '' };
}

// una tinta per sezione: [hue, saturazione]
const HUES = {
  A1: [214, 46], A2: [18, 58], B: [150, 36], C: [268, 40], D: [338, 42],
  E1: [88, 36], E2: [300, 34], F: [186, 40], G1: [240, 38], G2: [30, 24], V: [222, 8]
};

function quoteBlock(cit) {
  const c = cit.trim();
  if (c === 'n.a.') return '';
  if (c === 'Vedi Sezione A') return '<p class="det">Vedi sezione B.</p>';
  const parts = c.split(/ \/ /).map((p) => p.trim()).filter(Boolean);
  return `<details><summary>Citazione testuale</summary><div class="q">${parts.map((p) => `<p>${esc(p)}</p>`).join('')}</div></details>`;
}

function tile(r) {
  const [name, val, ref, cit, stato] = r;
  const st = parseStato(stato);
  let shown = val.trim();
  const inner = shown.match(/^Non specificato \((.*)\)$/);
  if (inner) shown = inner[1].charAt(0).toUpperCase() + inner[1].slice(1) + '.';
  shown = shown.replace('vedi Sezione A', 'vedi sezione B');
  const bare = shown === 'Non specificato';
  return `<article class="tile" data-st="${st.key}">
  <h3>${esc(name)}</h3>
  ${bare ? '' : `<p class="val">${esc(shown)}</p>`}
  <div class="meta">${ref === 'n.a.' ? '<span></span>' : `<span class="ref">${esc(ref)}</span>`}<span class="chip ${st.key}">${esc(st.label)}</span></div>
  ${st.detail ? `<p class="det">${esc(st.detail)}</p>` : ''}
  ${quoteBlock(cit)}
</article>`;
}

function counts(rows) {
  const c = { ok: 0, chk: 0, na: 0 };
  rows.forEach((r) => { c[parseStato(r[4]).key]++; });
  return c;
}

const GNAME = { ok: 'Confermato', chk: 'Da verificare', na: 'Non specificato' };
function grouped(rows) {
  const out = [];
  const n = counts(rows);
  let last = null;
  rows.forEach((r) => {
    const k = parseStato(r[4]).key;
    if (k !== last) { out.push(`<div class="grp ${k}" data-st="${k}"><span class="gl ${k}"></span><b>${GNAME[k]}</b><span>${n[k]}</span></div>`); last = k; }
    out.push(tile(r));
  });
  return out.join('\n');
}

let total = { ok: 0, chk: 0, na: 0 };
const cardsHtml = [];
const navHtml = [];

const F1 = new Set([
  'Oblò o finestratura sulle porte', 'Angoli arrotondati sulle pedane', 'Pedane: altezza max e rampa',
  'Portata del pavimento', 'Ancoraggi al suolo', 'Impianti elettrici',
  'Scale dei piani occupati', 'Scale, numero e soglia', 'Avviso di capienza',
  'Corridoio antincendio tra soppalchi', 'Rilevatore ed estintore sui piani superiori',
  'Apparecchiature antincendio', 'Protezione dei macchinari', 'Accessibilità'
]);
// D confluisce in C; le lettere successive scorrono di una posizione
(function () {
  const iC = D.sections.findIndex((x) => x.title[0] === 'C');
  const iD = D.sections.findIndex((x) => x.title[0] === 'D');
  const C = D.sections[iC];
  const Dd = D.sections[iD];
  C.rows = C.rows.concat(Dd.rows.map((r) => ["Alimentazione elettrica dall'alto"].concat(r.slice(1))));
  C.title = "C. Appendimenti e alimentazione dall'alto";
  C.note = Dd.note;
  C.noteSt = 'na';
  D.sections.splice(iD, 1);
})();
const NEWLETTER = { A: 'A', B: 'B', C: 'C', E: 'D', F: 'E', G: 'F', H: 'G' };
const isA2 = (r) => /^(Altezza max elementi sospesi|Soppalchi)/.test(r[0]);
const isH1 = (r) => /^(Allestimento|Disallestimento)/.test(r[0]);
const SPLITS = {
  A: [
    { title: 'Altezze per tipo di stand', pick: (r) => !isA2(r) },
    { title: 'Sospensioni e soppalchi', pick: isA2, note: true }
  ],
  F: [
    { title: 'Sicurezza e antincendio', pick: (r) => F1.has(r[0]) },
    { title: 'Forma, finiture e operatività', pick: (r) => !F1.has(r[0]) }
  ],
  H: [
    { title: 'Montaggio e smontaggio', pick: isH1 },
    { title: 'Accessi e mezzi', pick: (r) => !isH1(r) }
  ]
};

const LETTERS = 'ABCDEFGHIJKLMNOP';
let seq = 0;
D.sections.forEach((s) => {
  const oldLetter = s.title[0];
  const letter = NEWLETTER[oldLetter];
  const secTitle = s.title.replace(/^[A-H]\.\s*/, '');
  const parts = SPLITS[oldLetter] || [{ title: secTitle, pick: () => true, note: true }];
  const used = new Set();
  parts.forEach((part, i) => {
    const code = parts.length > 1 ? letter + (i + 1) : letter;
    const [h, sat] = HUES[code];
    const RANK = { ok: 0, chk: 1, na: 2 };
    const rows = s.rows.filter(part.pick)
      .map((r, idx) => ({ r, idx }))
      .sort((x, y) => RANK[parseStato(x.r[4]).key] - RANK[parseStato(y.r[4]).key] || x.idx - y.idx)
      .map((x) => x.r);
    rows.forEach((r) => { if (used.has(r)) throw new Error('riga doppia: ' + r[0]); used.add(r); });
    const c = counts(rows);
    total.ok += c.ok; total.chk += c.chk; total.na += c.na;
    const L = LETTERS[seq++];
    const id = 'sez-' + L.toLowerCase();
    navHtml.push(`<a class="nav-l" href="#${id}" data-sec="${L}" style="--h:${h};--s:${sat}%" aria-label="Sezione ${L}: ${esc(part.title)}"><span>${L}</span></a>`);
    cardsHtml.push(`<section class="card" id="${id}" data-sec="${L}" style="--h:${h};--s:${sat}%" aria-labelledby="${id}-t">
  <header class="rail">
    <p class="letter" aria-hidden="true">${L}</p>
    <h2 id="${id}-t">${esc(part.title)}</h2>
    <ul class="counts" aria-label="Stato delle voci">
      <li><span class="chip ok">Confermato</span><b>${c.ok}</b></li>
      <li><span class="chip chk">Da verificare</span><b>${c.chk}</b></li>
      <li><span class="chip na">Non specificato</span><b>${c.na}</b></li>
    </ul>
  </header>
  <div class="body">
    <div class="tiles">
      ${grouped(rows)}
    </div>
    ${part.note && s.note ? `<p class="note" data-st="${s.noteSt || 'chk'}"><b>Nota</b>${esc(s.note)}</p>` : ''}
  </div>
</section>`);
  });
  if (used.size !== s.rows.length) throw new Error('righe perse nella sezione ' + letter);
});

// nona scheda: punti da verificare
const [vh, vs] = HUES.V;
navHtml.push(`<a class="nav-l" href="#sez-v" data-sec="V" style="--h:${vh};--s:${vs}%" aria-label="Punti da verificare"><span>!</span></a>`);
const missing = D.missingList.split(/;\s*/).filter(Boolean);
cardsHtml.push(`<section class="card" id="sez-v" data-sec="V" style="--h:${vh};--s:${vs}%" aria-labelledby="sez-v-t">
  <header class="rail">
    <p class="letter" aria-hidden="true">!</p>
    <h2 id="sez-v-t">Punti da verificare</h2>
    <p class="rail-note">Causa di ogni dubbio e modo per chiuderlo. Il primo punto incide sulle quote del progetto.</p>
  </header>
  <div class="body">
    <div class="tiles">
      <div class="grp chk" data-st="chk"><span class="gl chk"></span><b>Da verificare</b><span>${D.verifyRows.length}</span></div>
      ${D.verifyRows.map((r) => `<article class="tile" data-st="chk">
        <h3>${esc(r[0])}</h3>
        <p class="lab">Causa</p><p class="val">${esc(r[1])}</p>
        <p class="lab">Come risolverlo</p><p class="val">${esc(r[2])}</p>
        <div class="meta"><span></span><span class="chip chk">Da verificare</span></div>
      </article>`).join('\n')}
      <div class="grp na" data-st="na"><span class="gl na"></span><b>Non specificato</b><span>${missing.length}</span></div>
      <article class="tile wide" data-st="na">
        <h3>Parametri non specificati nelle fonti</h3>
        <p class="val">Da chiedere a Show Management (exhibit@npe.org) o da cercare nell'Exhibitor Resource Center.</p>
        <ul class="pills">${missing.map((m) => `<li>${esc(m)}</li>`).join('')}</ul>
        <div class="meta"><span></span><span class="chip na">Non specificato</span></div>
      </article>
    </div>
  </div>
</section>`);

const all = total.ok + total.chk + total.na;

const html = `<title>NPE2027 Schede tecniche</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@700;800&family=IBM+Plex+Mono:wght@400;500&family=Source+Sans+3:wght@400;500;600;700&display=swap">
<style>
/* Layout: otto schede orizzontali a tutta larghezza, una per sezione. Binario a sinistra (lettera, titolo, conteggi), tessere a destra. Ogni scheda ha la sua tinta. */
:root {
  --font-display: "Big Shoulders Display", "Arial Narrow", "Helvetica Neue", Arial, sans-serif;
  --font-body: "Source Sans 3", "Segoe UI", system-ui, -apple-system, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;

  --bg: hsl(220 10% 94%);
  --fg: hsl(222 20% 14%);
  --muted: hsl(222 10% 38%);
  --bar: hsl(220 10% 94% / .94);
  --btn: hsl(0 0% 100%);
  --btn-line: hsl(220 10% 78%);
  --btn-on: hsl(222 20% 14%);
  --btn-on-fg: hsl(220 10% 96%);

  --card-l: 91%;
  --alt-d: -4%;
  --card-fg-l: 13%;
  --card-mut-l: 34%;
  --card-ac-l: 31%;
  --tile: hsl(0 0% 100% / .6);
  --chip: hsl(0 0% 100% / .88);

  --ok: #15803d;
  --warn: #92400e;
  --na: #b42318;
  --na-bg: #d92d20;
  --na-fg: #ffffff;
  --ok-bg: #15803d;
  --ok-fg: #ffffff;
  --warn-bg: #f5a524;
  --warn-fg: #2b1a00;
  --tile-ok: hsl(0 0% 100% / .82);
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: hsl(222 14% 9%);
    --fg: hsl(220 14% 92%);
    --muted: hsl(220 8% 66%);
    --bar: hsl(222 14% 9% / .94);
    --btn: hsl(222 12% 14%);
    --btn-line: hsl(222 10% 28%);
    --btn-on: hsl(220 14% 92%);
    --btn-on-fg: hsl(222 14% 9%);
    --card-l: 17%;
    --alt-d: 5%;
    --card-fg-l: 93%;
    --card-mut-l: 72%;
    --card-ac-l: 74%;
    --tile: hsl(0 0% 100% / .06);
    --chip: hsl(0 0% 100% / .1);
    --ok: #4ade80;
    --warn: #fbbf24;
    --na: #fca5a5;
    --na-bg: #f87171;
    --na-fg: #2a0606;
    --ok-bg: #4ade80;
    --ok-fg: #052e16;
    --warn-bg: #fbbf24;
    --warn-fg: #2b1a00;
    --tile-ok: hsl(0 0% 100% / .09);
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: hsl(222 14% 9%);
  --fg: hsl(220 14% 92%);
  --muted: hsl(220 8% 66%);
  --bar: hsl(222 14% 9% / .94);
  --btn: hsl(222 12% 14%);
  --btn-line: hsl(222 10% 28%);
  --btn-on: hsl(220 14% 92%);
  --btn-on-fg: hsl(222 14% 9%);
  --card-l: 17%;
  --alt-d: 5%;
  --card-fg-l: 93%;
  --card-mut-l: 72%;
  --card-ac-l: 74%;
  --tile: hsl(0 0% 100% / .06);
  --chip: hsl(0 0% 100% / .1);
  --ok: #4ade80;
  --warn: #fbbf24;
  --na: #fca5a5;
  --na-bg: #f87171;
  --na-fg: #2a0606;
  --ok-bg: #4ade80;
  --ok-fg: #052e16;
  --warn-bg: #fbbf24;
  --warn-fg: #2b1a00;
  --tile-ok: hsl(0 0% 100% / .09);
  color-scheme: dark;
}

* { box-sizing: border-box; }
body {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-body);
  font-size: 16px;
  line-height: 1.5;
  padding-block: 0 56px;
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
  -webkit-text-size-adjust: 100%;
}
body::before {
  content: "";
  position: fixed;
  inset: 0 0 auto;
  height: env(safe-area-inset-top, 0px);
  z-index: 10;
  background: var(--bg);
}
.wrap { max-width: 1240px; margin: 0 auto; }

/* testata */
.top { padding: 40px 0 26px; }
.eyebrow { margin: 0 0 10px; font: 500 12px/1 var(--font-mono); letter-spacing: .08em; text-transform: uppercase; color: var(--muted); }
h1 {
  margin: 0;
  font: 800 clamp(46px, 9vw, 104px)/.9 var(--font-display);
  letter-spacing: -.005em;
  text-transform: uppercase;
  text-wrap: balance;
}
h1 span { font-weight: 700; color: var(--muted); }
.sub { margin: 16px 0 0; max-width: 62ch; font-size: 18px; color: var(--fg); }
.facts { display: flex; flex-wrap: wrap; gap: 6px 22px; margin: 14px 0 0; padding: 0; list-style: none; font-size: 14px; color: var(--muted); }
.facts li { min-width: 0; }

/* barra comandi */
.bar {
  position: sticky;
  top: env(safe-area-inset-top, 0px);
  z-index: 20;
  display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px 20px;
  padding: 10px 0;
  background: var(--bar);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.nav { display: flex; flex-wrap: wrap; gap: 6px; }
.nav-l {
  display: grid; place-items: center;
  min-width: 36px; height: 36px; padding: 0 7px; border-radius: 8px;
  background: hsl(var(--h) var(--s) var(--card-l));
  color: hsl(var(--h) calc(var(--s) + 12%) var(--card-ac-l));
  text-decoration: none;
  font: 800 19px/1 var(--font-display);
  border: 1px solid hsl(var(--h) var(--s) 50% / .35);
}
.nav-l:hover { border-color: hsl(var(--h) calc(var(--s) + 12%) var(--card-ac-l)); }
.filters { display: flex; flex-wrap: wrap; gap: 6px; }
.filters button {
  font: 600 14px/1 var(--font-body);
  color: var(--fg); background: var(--btn);
  border: 1px solid var(--btn-line); border-radius: 999px;
  padding: 9px 14px; cursor: pointer;
  display: inline-flex; align-items: center; gap: 8px;
}
.filters button b { font-weight: 600; color: var(--muted); font-variant-numeric: tabular-nums; }
.filters button[aria-pressed="true"] { background: var(--btn-on); color: var(--btn-on-fg); border-color: var(--btn-on); }
.filters button[aria-pressed="true"] b { color: inherit; opacity: .8; }
.filters button:focus-visible, .nav-l:focus-visible, summary:focus-visible { outline: 2px solid var(--fg); outline-offset: 2px; }

/* schede */
.cards { display: flex; flex-direction: column; gap: 18px; margin-top: 14px; }
.card {
  --bgc: hsl(var(--h) var(--s) var(--card-l));
  --fgc: hsl(var(--h) 24% var(--card-fg-l));
  --mutc: hsl(var(--h) 14% var(--card-mut-l));
  --acc: hsl(var(--h) calc(var(--s) + 12%) var(--card-ac-l));
  display: grid;
  grid-template-columns: minmax(210px, 260px) minmax(0, 1fr);
  gap: 18px 34px;
  padding: clamp(18px, 3vw, 32px);
  border-radius: 18px;
  background: var(--bgc);
  color: var(--fgc);
  scroll-margin-top: 76px;
}
.letter.two { font-size: clamp(84px, 11vw, 124px); }
.rail { min-width: 0; align-self: start; display: flex; flex-direction: column; gap: 10px; }
.letter { margin: 0; font: 800 clamp(96px, 14vw, 152px)/.8 var(--font-display); color: var(--acc); }
.card h2 { margin: 0; font: 700 30px/1.02 var(--font-display); text-transform: uppercase; letter-spacing: .01em; text-wrap: balance; }
.counts { margin: 6px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 6px; }
.counts li { display: flex; align-items: center; gap: 10px; }
.counts b { font: 700 18px/1 var(--font-display); font-variant-numeric: tabular-nums; }
.rail-note { margin: 4px 0 0; font-size: 14px; color: var(--mutc); }

.body { min-width: 0; }
.tiles { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 280px), 1fr)); gap: 10px; align-items: start; }
.tile {
  min-width: 0;
  display: flex; flex-direction: column; gap: 6px;
  padding: 14px 15px 13px;
  border-radius: 10px;
  background: var(--tile);
  border: 1px solid hsl(var(--h) 24% 40% / .18);
}
.tile.wide { grid-column: 1 / -1; }
.tile[data-st="ok"] { background: var(--tile-ok); border-color: color-mix(in srgb, var(--ok) 40%, transparent); }
.tile[data-st="chk"] { background: color-mix(in srgb, var(--warn-bg) 26%, var(--tile-ok)); border: 2px solid var(--warn-bg); padding: 13px 14px 12px; }
.tile[data-st="na"] {
  background-color: color-mix(in srgb, var(--na-bg) 20%, var(--tile-ok));
  border: 2px solid var(--na-bg);
  padding: 13px 14px 12px;
}
.tile h3 { margin: 0; font: 700 14px/1.25 var(--font-body); letter-spacing: .01em; }
.tile .val { margin: 0; font-size: 15px; line-height: 1.4; overflow-wrap: anywhere; }
.tile .lab { margin: 4px 0 -2px; font: 500 11px/1 var(--font-mono); letter-spacing: .06em; text-transform: uppercase; color: var(--mutc); }
.tile .lab:first-of-type { margin-top: 0; }
.meta { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 6px 10px; margin-top: 2px; }
.ref { font: 400 12px/1.3 var(--font-mono); color: var(--mutc); min-width: 0; overflow-wrap: anywhere; }
.det { margin: 0; font-size: 13px; color: var(--mutc); }

.chip {
  display: inline-flex; align-items: center; gap: 7px; white-space: nowrap;
  padding: 4px 11px 4px 9px; border-radius: 999px;
  font: 700 12px/1.2 var(--font-body);
  border: 1.5px solid transparent;
}
.chip::before { content: ""; width: 9px; height: 9px; flex: none; background: currentColor; }
.chip.ok { background: var(--ok-bg); color: var(--ok-fg); }
.chip.ok::before { border-radius: 50%; }
.chip.chk { background: var(--warn-bg); color: var(--warn-fg); }
.chip.chk::before { clip-path: polygon(50% 0, 100% 100%, 0 100%); width: 10px; height: 9px; }
.chip.na { background: var(--na-bg); color: var(--na-fg); }
.chip.na::before { background: none; border: 1.5px solid currentColor; border-radius: 50%; }

/* glifo di stato, senza etichetta */
.gl { display: inline-block; width: 10px; height: 10px; flex: none; }
.gl.ok { background: var(--ok); border-radius: 50%; }
.gl.chk { background: var(--warn); clip-path: polygon(50% 0, 100% 100%, 0 100%); height: 10px; }
.gl.na { border: 1.5px solid var(--na); border-radius: 50%; }

/* intestazioni di gruppo dentro la scheda */
.grp { grid-column: 1 / -1; display: flex; align-items: center; gap: 9px; margin-top: 8px; font: 500 12px/1 var(--font-mono); letter-spacing: .07em; text-transform: uppercase; }
.grp:first-child { margin-top: 0; }
.grp b { font-weight: 600; }
.grp::after { content: ""; flex: 1; border-top: 2px solid currentColor; opacity: .45; }
.grp.ok { color: var(--ok); }
.grp.chk { color: var(--warn); }
.grp.na { color: var(--na); }

/* legenda in testata */
.legend { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr)); gap: 10px 22px; margin: 22px 0 0; padding: 14px 0 0; list-style: none; border-top: 1px solid var(--btn-line); font-size: 14px; color: var(--muted); }
.legend li { display: grid; grid-template-columns: 10px minmax(0, 1fr); gap: 4px 10px; align-items: baseline; }
.legend b { color: var(--fg); font-weight: 700; }
.legend span.t { grid-column: 2; }

details { margin-top: 2px; }
summary { cursor: pointer; font: 500 12px/1.4 var(--font-mono); color: var(--mutc); letter-spacing: .02em; list-style: none; width: fit-content; padding: 2px 0; }
summary::-webkit-details-marker { display: none; }
summary::before { content: "+"; display: inline-block; width: 1.2em; }
details[open] summary::before { content: "\\2212"; }
summary:hover { color: var(--fgc); }
.q { margin-top: 6px; padding-top: 8px; border-top: 1px solid hsl(var(--h) 24% 40% / .22); display: flex; flex-direction: column; gap: 8px; }
.q p { margin: 0; font: 400 12.5px/1.5 var(--font-mono); color: var(--fgc); overflow-wrap: anywhere; }

.note { margin: 12px 0 0; padding: 12px 14px; border-radius: 10px; font-size: 14.5px; background: var(--tile); border: 1px solid color-mix(in srgb, var(--warn) 60%, transparent); }
.note[data-st="na"] { border-color: color-mix(in srgb, var(--na-bg) 65%, transparent); }
.note b { display: block; margin-bottom: 2px; font: 500 11px/1.4 var(--font-mono); letter-spacing: .06em; text-transform: uppercase; color: var(--mutc); }

.pills { display: flex; flex-wrap: wrap; gap: 6px; margin: 2px 0 0; padding: 0; list-style: none; }
.pills li { padding: 5px 10px; border-radius: 999px; font-size: 13px; background: var(--chip); border: 1px solid color-mix(in srgb, var(--na-bg) 55%, transparent); }

.foot { margin: 26px 0 0; max-width: 78ch; font-size: 13.5px; color: var(--muted); }
.empty { margin: 22px 0 0; padding: 16px; border: 1px dashed var(--btn-line); border-radius: 12px; color: var(--muted); }

@media (max-width: 900px) {
  .card { grid-template-columns: minmax(0, 1fr); gap: 14px; }
  .rail { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 18px; row-gap: 6px; align-items: end; }
  .letter { grid-row: 1 / span 2; font-size: 92px; }
  .letter.two { font-size: 76px; }
  .card h2 { font-size: 26px; align-self: end; }
  .counts { grid-column: 2; flex-direction: row; flex-wrap: wrap; gap: 6px 12px; margin: 0; }
  .rail-note { grid-column: 2; }
}
@media (max-width: 700px) {
  .bar { position: static; }
  .top { padding-top: 28px; }
}
@media (min-width: 901px) {
  .rail { position: sticky; top: calc(env(safe-area-inset-top, 0px) + 74px); }
}
@media (prefers-reduced-motion: no-preference) {
  .nav-l, .filters button { transition: border-color .15s, background-color .15s; }
}
</style>

<div class="wrap">
  <header class="top">
    <p class="eyebrow">Progetto EVOLUTION · uso interno</p>
    <h1>NPE2027 <span>The Plastics Show</span></h1>
    <p class="sub">Prescrizioni tecniche che vincolano la progettazione dello stand, una scheda per sezione.</p>
    <ul class="facts">
      <li>Orlando, Orange County Convention Center</li>
      <li>3-7 maggio 2027</li>
      <li>Unità del regolamento: ft, sf, in, lb, PSF</li>
    </ul>
    <ul class="legend" aria-label="Legenda degli stati">
      <li><span class="gl ok"></span><span><b>Confermato.</b> La citazione contiene il dato alla lettera.</span></li>
      <li><span class="gl chk"></span><span><b>Da verificare.</b> Passaggio ambiguo, condizionato o da comporre con altri.</span></li>
      <li><span class="gl na"></span><span><b>Non specificato.</b> Le fonti non trattano il parametro.</span></li>
    </ul>
  </header>

  <div class="bar" role="navigation" aria-label="Sezioni e filtri">
    <nav class="nav" aria-label="Vai alla sezione">
      ${navHtml.join('\n      ')}
    </nav>
    <div class="filters" role="group" aria-label="Filtra per stato">
      <button type="button" data-filter="all" aria-pressed="true" id="f-all">Tutte <b>${all}</b></button>
      <button type="button" data-filter="ok" aria-pressed="false" id="f-ok"><span class="gl ok"></span>Confermato <b>${total.ok}</b></button>
      <button type="button" data-filter="chk" aria-pressed="false" id="f-chk"><span class="gl chk"></span>Da verificare <b>${total.chk}</b></button>
      <button type="button" data-filter="na" aria-pressed="false" id="f-na"><span class="gl na"></span>Non specificato <b>${total.na}</b></button>
    </div>
  </div>

  <main class="cards" id="cards">
    ${cardsHtml.join('\n    ')}
  </main>

  <p class="foot">Fonti: NPE2027 Show Rules &amp; Regulations e Appendice A (Booth Types, Dimensions, Display Measurement Rules). Ogni valore rimanda alla frase originale, apribile da Citazione testuale. Il Target Floor Plan e i documenti dell'Exhibitor Resource Center non sono tra le fonti.</p>
</div>

<script>
(function () {
  var buttons = Array.prototype.slice.call(document.querySelectorAll('[data-filter]'));
  var tiles = Array.prototype.slice.call(document.querySelectorAll('.tile, .grp'));
  var notes = Array.prototype.slice.call(document.querySelectorAll('.note'));
  var cards = Array.prototype.slice.call(document.querySelectorAll('.card'));
  var navs = Array.prototype.slice.call(document.querySelectorAll('.nav-l'));
  function apply(f) {
    tiles.forEach(function (t) { t.hidden = f !== 'all' && t.getAttribute('data-st') !== f; });
    notes.forEach(function (n) { n.hidden = f !== 'all' && n.getAttribute('data-st') !== f; });
    cards.forEach(function (c) {
      c.hidden = c.querySelector('.tile:not([hidden])') === null;
    });
    navs.forEach(function (n) {
      var sec = n.getAttribute('data-sec');
      n.hidden = !cards.some(function (c) { return c.getAttribute('data-sec') === sec && !c.hidden; });
    });
    buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === f)); });
  }
  buttons.forEach(function (b) {
    b.addEventListener('click', function () { apply(b.getAttribute('data-filter')); });
  });
})();
</script>
`;

const out = path.join(__dirname, 'npe2027-schede.html');
fs.writeFileSync(out, html);
console.log('written', out, html.length, 'bytes', total);
