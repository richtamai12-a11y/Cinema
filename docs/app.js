/* Kino · web app personale. Nessuna libreria esterna. */
(() => {
'use strict';

const API = String((window.CINEMA_CONFIG || {}).API_URL || '').replace(/\/$/, '');
const IMG = 'https://image.tmdb.org/t/p/';
const app = document.getElementById('app');
const tabbar = document.getElementById('tabbar');
const sheetRoot = document.getElementById('sheet-root');

// ---------- piccole utilità ----------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const MONTHS = ['gennaio', 'febbraio', 'marzo', 'aprile', 'maggio', 'giugno', 'luglio', 'agosto', 'settembre', 'ottobre', 'novembre', 'dicembre'];
const MON3 = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
const DAY3 = ['dom', 'lun', 'mar', 'mer', 'gio', 'ven', 'sab'];

function parseDay(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d);
}
function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function fmtDay(iso, withYear = false) {
  const d = parseDay(iso);
  if (!d) return '';
  const y = withYear || d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${y}`;
}
function fmtShort(iso) {
  const d = parseDay(iso);
  if (!d) return '';
  const y = d.getFullYear() !== new Date().getFullYear() ? ` ${d.getFullYear()}` : '';
  return `${d.getDate()} ${MON3[d.getMonth()]}${y}`;
}
function daysFromToday(iso) {
  const d = parseDay(iso);
  if (!d) return null;
  const t = parseDay(todayISO());
  return Math.round((d - t) / 86400000);
}
function timeAgo(iso) {
  if (!iso) return '';
  const diff = (Date.now() - Date.parse(iso)) / 1000;
  if (diff < 60) return 'adesso';
  if (diff < 3600) return `${Math.floor(diff / 60)} min fa`;
  if (diff < 86400) { const h = Math.floor(diff / 3600); return h === 1 ? '1 ora fa' : `${h} ore fa`; }
  if (diff < 172800) return 'ieri';
  if (diff < 7 * 86400) return `${Math.floor(diff / 86400)} giorni fa`;
  return fmtShort(iso.slice(0, 10));
}
function runtime(min) {
  if (!min) return '';
  const h = Math.floor(min / 60), m = min % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}
const year = (iso) => (iso ? iso.slice(0, 4) : '');

// ---------- icone ----------
const I = {
  search: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>',
  gear: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2"/></svg>',
  back: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 5l-7 7 7 7"/></svg>',
  plus: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  check: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  chev: '<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 5l7 7-7 7"/></svg>',
  home: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l9-7 9 7v9H15v-6H9v6H3z"/></svg>',
  ticket: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/></svg>',
  cal: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="5" width="16" height="15" rx="2" fill="none"/><path d="M4 10h16M9 3v4M15 3v4"/></svg>',
  tv: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8"/></svg>',
  bookmark: '<svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 4h12v17l-6-4-6 4z"/></svg>',
};

// ---------- archivio sul dispositivo ----------
const store = {
  get(key, fallback) {
    try { const v = localStorage.getItem('cinema.' + key); return v ? JSON.parse(v) : fallback; } catch { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem('cinema.' + key, JSON.stringify(value)); } catch { toast('Spazio pieno: impossibile salvare'); }
  },
};
if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});

// lista: { [id]: { id, title, poster_path, release_date, addedAt, seenAt|null } }
const List = {
  all() { return store.get('list', {}); },
  get(id) { return this.all()[id] || null; },
  save(all) { store.set('list', all); },
  addTodo(m) {
    const all = this.all();
    const cur = all[m.id];
    all[m.id] = { ...(cur || {}), ...this.pick(m), addedAt: cur?.addedAt || new Date().toISOString(), seenAt: null };
    this.save(all);
  },
  markSeen(m, date) {
    const all = this.all();
    const cur = all[m.id];
    all[m.id] = { ...(cur || {}), ...this.pick(m), addedAt: cur?.addedAt || new Date().toISOString(), seenAt: date };
    this.save(all);
  },
  remove(id) { const all = this.all(); delete all[id]; this.save(all); },
  pick(m) { return { id: m.id, title: m.title, poster_path: m.poster_path || null, release_date: m.it_date || m.release_date || null }; },
  todo() { return Object.values(this.all()).filter((x) => !x.seenAt).sort((a, b) => String(b.addedAt).localeCompare(String(a.addedAt))); },
  seen() { return Object.values(this.all()).filter((x) => x.seenAt).sort((a, b) => String(b.seenAt).localeCompare(String(a.seenAt))); },
};

const Settings = {
  get() { return { name: 'Riccardo', services: [], ...store.get('settings', {}) }; },
  set(patch) { store.set('settings', { ...this.get(), ...patch }); },
};

// ---------- dati dal servizio ----------
const memo = new Map();
async function api(path, { ttl = 10 * 60 * 1000 } = {}) {
  const hit = memo.get(path);
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  if (!API || API.includes('REPLACE')) throw new Error('Manca l’indirizzo del servizio Cloudflare in config.js');
  const r = await fetch(API + path);
  let data = null;
  try { data = await r.json(); } catch { /* vuoto */ }
  if (!r.ok) throw new Error((data && data.error) || `Errore ${r.status}`);
  memo.set(path, { t: Date.now(), v: data });
  return data;
}
const tmdb = (path, params = {}) => {
  const q = new URLSearchParams(params).toString();
  return api(`/api/tmdb${path}${q ? '?' + q : ''}`);
};
let genresMap = null;
async function genres() {
  if (genresMap) return genresMap;
  try {
    const g = await tmdb('/genre/movie/list');
    genresMap = Object.fromEntries((g.genres || []).map((x) => [x.id, x.name]));
  } catch { genresMap = {}; }
  return genresMap;
}
const genreNames = (m, gm) => (m.genres && m.genres.length ? m.genres : (m.genre_ids || []).map((id) => gm[id]).filter(Boolean));
let providersCache = null;
async function allProviders() {
  if (providersCache) return providersCache;
  const r = await tmdb('/watch/providers/movie', { watch_region: 'IT' });
  providersCache = (r.results || []).sort((a, b) => (a.display_priorities?.IT ?? a.display_priority ?? 99) - (b.display_priorities?.IT ?? b.display_priority ?? 99));
  return providersCache;
}

// ---------- pezzi di interfaccia ----------
function poster(path, title, size = 'w342') {
  return `<div class="poster">${path ? `<img loading="lazy" src="${IMG}${size}${esc(path)}" alt="">` : `<div class="ph">${esc(title)}</div>`}</div>`;
}
const filmHref = (id) => `#/film/${id}`;
function skeleton(n = 3, h = 80) {
  return Array.from({ length: n }, () => `<div class="skel" style="height:${h}px"></div>`).join('');
}
function errorBox(e) {
  return `<div class="err">Non riesco a caricare i dati. ${esc(e.message || e)}</div>`;
}
function inListButton(m, kind = 'plus') {
  const it = List.get(m.id);
  const on = it && !it.seenAt;
  const seen = it && it.seenAt;
  const label = seen ? 'Già visto' : on ? 'Togli da Da vedere' : 'Aggiungi a Da vedere';
  return `<button class="icon-btn outline ${on || seen ? 'on' : ''}" data-act="toggle-todo" data-id="${m.id}" aria-label="${label}" aria-pressed="${on ? 'true' : 'false'}">${on || seen ? I.check : (kind === 'plus' ? I.plus : I.plus)}</button>`;
}
// memorizza i film visti nelle pagine, per poterli aggiungere alla lista senza ricaricare
const filmIndex = new Map();
function remember(list) { for (const m of list || []) if (m && m.id) filmIndex.set(String(m.id), { ...(filmIndex.get(String(m.id)) || {}), ...m }); return list; }

function toast(msg) {
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}

// ---------- barra in basso ----------
const TABS = [
  { id: 'home', href: '#/', label: 'Home', icon: I.home },
  { id: 'cinema', href: '#/cinema', label: 'Al cinema', icon: I.ticket },
  { id: 'uscite', href: '#/uscite', label: 'Uscite', icon: I.cal },
  { id: 'streaming', href: '#/streaming', label: 'Streaming', icon: I.tv },
  { id: 'lista', href: '#/lista', label: 'Lista', icon: I.bookmark },
];
let activeTab = 'home';
function renderTabbar() {
  tabbar.innerHTML = TABS.map((t) => `<a href="${t.href}" class="${t.id === activeTab ? 'on' : ''}" ${t.id === activeTab ? 'aria-current="page"' : ''}>${t.icon}${t.label}</a>`).join('');
}

// ---------- pagine ----------
function greeting() {
  const h = new Date().getHours();
  const name = Settings.get().name;
  const w = h < 6 ? 'Buonanotte' : h < 13 ? 'Buongiorno' : h < 18 ? 'Buon pomeriggio' : 'Buonasera';
  return name ? `${w}, ${name}` : w;
}

async function pageHome(el) {
  el.innerHTML = `<div class="page">
    <header class="home-head">
      <div class="stack" style="gap:2px"><span class="greet">${esc(greeting())}</span><h1>Kino</h1></div>
      <div class="row" style="gap:8px">
        <a class="icon-btn" href="#/cerca" aria-label="Cerca">${I.search}</a>
        <a class="icon-btn" href="#/info" aria-label="Impostazioni e crediti">${I.gear}</a>
      </div>
    </header>
    <section class="section" style="gap:10px">
      <div class="spread"><h2 class="h2">Ultime notizie</h2><a href="#/notizie" class="small">Tutte</a></div>
      <div id="h-news" class="stack" style="gap:10px">${skeleton(3, 46)}</div>
    </section>
    <section class="section">
      <div class="spread"><h2 class="h2">Al cinema questa settimana</h2><a href="#/cinema" class="small">Tutti</a></div>
      <div id="h-cinema" class="hscroll">${Array.from({ length: 4 }, () => '<div class="skel" style="flex:0 0 108px;height:190px"></div>').join('')}</div>
    </section>
    <section class="section" style="gap:10px">
      <div class="spread"><h2 class="h2">In arrivo in Italia</h2><a href="#/uscite" class="small">Calendario</a></div>
      <div id="h-up" class="stack" style="gap:10px">${skeleton(2, 72)}</div>
    </section>
    <p class="tiny">Dati forniti da TMDB · <a href="#/info">Crediti</a></p>
  </div>`;

  api('/api/news').then((d) => {
    const items = (d.items || []).slice(0, 4);
    $('#h-news', el).innerHTML = items.length
      ? items.map((n) => `<a class="news-line" href="${esc(n.link)}" target="_blank" rel="noopener"><span class="t">${esc(n.title)}</span><span class="m">${esc(n.source)} · ${esc(timeAgo(n.date))}</span></a>`).join('')
      : '<div class="empty">Nessuna notizia al momento.</div>';
  }).catch((e) => { const x = $('#h-news', el); if (x) x.innerHTML = errorBox(e); });

  api('/api/now-playing').then((d) => {
    const items = remember(d.results || []).slice(0, 12);
    $('#h-cinema', el).innerHTML = items.map((m) => `<a class="hcard" href="${filmHref(m.id)}">${poster(m.poster_path, m.title)}<span>${esc(m.title)}</span></a>`).join('') || '<div class="empty">Nessun film trovato.</div>';
  }).catch((e) => { const x = $('#h-cinema', el); if (x) x.innerHTML = errorBox(e); });

  Promise.all([api('/api/upcoming?type=cinema'), genres()]).then(([d, gm]) => {
    const items = remember(d.results || []).slice(0, 3);
    $('#h-up', el).innerHTML = items.map((m) => {
      const dt = parseDay(m.it_date);
      return `<div class="rel-row card-row">
        <div class="date-box accent"><b>${String(dt.getDate()).padStart(2, '0')}</b><small>${MON3[dt.getMonth()]}</small></div>
        <a class="info" href="${filmHref(m.id)}"><span class="t">${esc(m.title)}</span><span class="s">${esc([genreNames(m, gm)[0], 'al cinema'].filter(Boolean).join(' · '))}</span></a>
        ${inListButton(m)}
      </div>`;
    }).join('') || '<div class="empty">Nessuna uscita annunciata.</div>';
  }).catch((e) => { const x = $('#h-up', el); if (x) x.innerHTML = errorBox(e); });
}

const cinemaState = { filter: 'all' };
async function pageCinema(el) {
  el.innerHTML = `<div class="page" style="gap:18px">
    <h1 class="h1">Al cinema ora</h1>
    <div class="chips" id="c-chips"></div>
    <div id="c-list" class="stack" style="gap:18px">${skeleton(4, 126)}</div>
    <p class="tiny">Film in sala in Italia secondo TMDB.</p>
  </div>`;
  let data;
  try { data = remember((await api('/api/now-playing')).results || []); } catch (e) { $('#c-list', el).innerHTML = errorBox(e); return; }

  const counts = {};
  data.forEach((m) => (m.genres || []).forEach((g) => { counts[g] = (counts[g] || 0) + 1; }));
  const topGenres = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([g]) => g);

  const draw = () => {
    const f = cinemaState.filter;
    $('#c-chips', el).innerHTML = [['all', 'Tutti'], ['new', 'Novità'], ...topGenres.map((g) => ['g:' + g, g])]
      .map(([k, l]) => `<button class="chip ${f === k ? 'on' : ''}" data-filter="${esc(k)}" aria-pressed="${f === k}">${esc(l)}</button>`).join('');
    let list = data;
    if (f === 'new') list = data.filter((m) => { const d = daysFromToday(m.it_date); return d !== null && d >= -10; });
    else if (f.startsWith('g:')) list = data.filter((m) => (m.genres || []).includes(f.slice(2)));
    $('#c-list', el).innerHTML = list.map((m) => {
      const d = daysFromToday(m.it_date);
      const when = m.it_date ? (d > 0 ? `In sala dal ${fmtDay(m.it_date)} (anteprima)` : `In sala dal ${fmtDay(m.it_date)}`) : '';
      return `<a class="film-row" href="${filmHref(m.id)}">${poster(m.poster_path, m.title)}
        <div class="info">
          <span class="t">${esc(m.title)}</span>
          <span class="s">${esc([(m.genres || [])[0], runtime(m.runtime)].filter(Boolean).join(' · '))}</span>
          <span class="s">${esc(when)}</span>
          ${m.directors && m.directors.length ? `<span class="d">Regia di ${esc(m.directors.join(', '))}</span>` : ''}
        </div></a>`;
    }).join('') || '<div class="empty">Nessun film per questo filtro.</div>';
  };
  draw();
  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-filter]');
    if (!b) return;
    cinemaState.filter = b.dataset.filter;
    draw();
  });
}

const usciteState = { kind: 'cinema' };
function weekBucket(iso) {
  const d = parseDay(iso);
  const t = parseDay(todayISO());
  const monday = new Date(t); monday.setDate(t.getDate() - ((t.getDay() + 6) % 7));
  const diffWeeks = Math.floor((d - monday) / (7 * 86400000));
  if (diffWeeks <= 0) return 'Questa settimana';
  if (diffWeeks === 1) return 'Settimana prossima';
  return MONTHS[d.getMonth()] + (d.getFullYear() !== t.getFullYear() ? ' ' + d.getFullYear() : '');
}
async function pageUscite(el) {
  el.innerHTML = `<div class="page tight">
    <div class="stack" style="gap:4px"><h1 class="h1">Prossime uscite</h1><span class="small muted">Date di uscita in Italia</span></div>
    <div class="segmented" role="tablist">
      <button role="tab" data-kind="cinema">Al cinema</button>
      <button role="tab" data-kind="digital">In streaming</button>
    </div>
    <div id="u-list" class="stack" style="gap:16px"></div>
    <p class="tiny">Date fornite da TMDB: possono cambiare.</p>
  </div>`;
  const draw = async () => {
    $$('.segmented button', el).forEach((b) => { const on = b.dataset.kind === usciteState.kind; b.classList.toggle('on', on); b.setAttribute('aria-selected', on); });
    const box = $('#u-list', el);
    box.innerHTML = skeleton(5, 56);
    try {
      const [d, gm] = await Promise.all([api('/api/upcoming?type=' + usciteState.kind), genres()]);
      const items = remember(d.results || []);
      if (!items.length) {
        box.innerHTML = `<div class="empty">${usciteState.kind === 'digital' ? 'TMDB non ha ancora date di uscita in streaming per l’Italia nei prossimi mesi.' : 'Nessuna uscita annunciata.'}</div>`;
        return;
      }
      let last = '';
      box.innerHTML = items.map((m) => {
        const b = weekBucket(m.it_date);
        const head = b !== last ? `<h2 class="kicker" style="margin-top:${last ? 8 : 4}px">${esc(b)}</h2>` : '';
        last = b;
        const dt = parseDay(m.it_date);
        return `${head}<div class="rel-row">
          <div class="date-box"><b>${String(dt.getDate()).padStart(2, '0')}</b><small>${DAY3[dt.getDay()]}</small></div>
          <a href="${filmHref(m.id)}" style="display:contents">${poster(m.poster_path, '', 'w154')}<span class="info"><span class="t">${esc(m.title)}</span><span class="s">${esc(genreNames(m, gm).slice(0, 2).join(', '))}</span></span></a>
          ${inListButton(m)}
        </div>`;
      }).join('');
    } catch (e) { box.innerHTML = errorBox(e); }
  };
  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-kind]');
    if (!b || b.dataset.kind === usciteState.kind) return;
    usciteState.kind = b.dataset.kind;
    draw();
  });
  draw();
}

async function pageStreaming(el) {
  el.innerHTML = `<div class="page" style="gap:18px">
    <h1 class="h1">Streaming</h1>
    <section class="section" style="gap:10px">
      <h2 class="kicker muted">I tuoi servizi</h2>
      <div class="svc-chips" id="s-svc">${skeleton(1, 38)}</div>
    </section>
    <div id="s-body" class="stack" style="gap:22px"></div>
    <p class="tiny">Dati sullo streaming forniti da JustWatch tramite TMDB.</p>
  </div>`;
  let providers;
  try { providers = await allProviders(); } catch (e) { $('#s-svc', el).innerHTML = errorBox(e); return; }
  const byId = Object.fromEntries(providers.map((p) => [p.provider_id, p]));

  const drawChips = () => {
    const mine = Settings.get().services;
    $('#s-svc', el).innerHTML = mine.filter((id) => byId[id]).map((id) => {
      const p = byId[id];
      return `<button class="svc on" aria-pressed="true" data-svc="${id}" aria-label="${esc(p.provider_name)}: tocca per togliere">${p.logo_path ? `<img src="${IMG}w92${esc(p.logo_path)}" alt="">` : ''}${esc(p.provider_name)}</button>`;
    }).join('') + `<button class="svc add" data-act="svc-pick">+ ${mine.length ? 'Aggiungi' : 'Scegli i tuoi servizi'}</button>`;
  };

  const drawBody = async () => {
    const mine = Settings.get().services.filter((id) => byId[id]);
    const body = $('#s-body', el);
    if (!mine.length) {
      body.innerHTML = '<div class="empty"><b>Scegli i servizi che usi</b> (per esempio Netflix o Prime Video): qui vedrai i film nuovi su quei servizi e quali film della tua lista sono arrivati in streaming.</div>';
      return;
    }
    body.innerHTML = `<section class="section"><h2 class="h2">Novità sui tuoi servizi</h2><div class="grid3" id="s-new">${Array.from({ length: 6 }, () => '<div class="skel" style="aspect-ratio:2/3"></div>').join('')}</div></section>
      <section class="section" style="gap:10px"><h2 class="h2">Dalla tua lista, ora in streaming</h2><div id="s-list" class="stack" style="gap:10px">${skeleton(2, 84)}</div></section>`;

    // Novità: film usciti di recente, uno per servizio a turno
    const today = todayISO();
    Promise.all(mine.slice(0, 6).map((id) => tmdb('/discover/movie', {
      watch_region: 'IT', with_watch_providers: id, with_watch_monetization_types: 'flatrate',
      sort_by: 'primary_release_date.desc', 'primary_release_date.lte': today, 'vote_count.gte': 15, 'with_runtime.gte': 60,
    }).then((r) => (r.results || []).map((m) => ({ ...m, _svc: byId[id].provider_name }))).catch(() => [])))
      .then((lists) => {
        const seen = new Set();
        const out = [];
        for (let i = 0; out.length < 12 && i < 20; i++) {
          for (const l of lists) { const m = l[i]; if (m && !seen.has(m.id)) { seen.add(m.id); out.push(m); } }
        }
        remember(out);
        const box = $('#s-new', el);
        if (box) box.innerHTML = out.slice(0, 12).map((m) => `<a class="gcard" href="${filmHref(m.id)}">${poster(m.poster_path, m.title)}<span class="t">${esc(m.title)}</span><span class="s">${esc(m._svc)}</span></a>`).join('') || '<div class="empty" style="grid-column:1/-1">Nessuna novità trovata.</div>';
      });

    // Lista "Da vedere" incrociata con i servizi
    const todo = List.todo().slice(0, 25);
    const found = await Promise.all(todo.map((f) => tmdb(`/movie/${f.id}/watch/providers`).then((r) => ({ f, it: (r.results || {}).IT })).catch(() => ({ f, it: null }))));
    const rows = [];
    for (const { f, it } of found) {
      if (!it) continue;
      const flat = (it.flatrate || []).find((p) => mine.includes(p.provider_id));
      const rent = (it.rent || []).find((p) => mine.includes(p.provider_id));
      const p = flat || rent;
      if (p) rows.push({ f, text: flat ? `Su ${p.provider_name} · incluso` : `Noleggio su ${p.provider_name}`, incl: !!flat });
    }
    rows.sort((a, b) => b.incl - a.incl);
    const lb = $('#s-list', el);
    if (lb) lb.innerHTML = rows.map(({ f, text, incl }) => `<a class="list-card" href="${filmHref(f.id)}">${poster(f.poster_path, '', 'w154')}<span class="info"><span class="t">${esc(f.title)}</span><span class="s">${esc(text)}</span></span>${incl ? '<span class="badge">INCLUSO</span>' : ''}</a>`).join('')
      || `<div class="empty">${todo.length ? 'Nessun film della tua lista è disponibile sui tuoi servizi, per ora.' : 'Aggiungi film a <b>Da vedere</b> e qui vedrai quando arrivano sui tuoi servizi.'}</div>`;
  };

  el.addEventListener('click', (ev) => {
    const chip = ev.target.closest('[data-svc]');
    if (chip) {
      const id = Number(chip.dataset.svc);
      Settings.set({ services: Settings.get().services.filter((x) => x !== id) });
      drawChips(); drawBody();
      return;
    }
    if (ev.target.closest('[data-act="svc-pick"]')) openServicesSheet(providers, () => { drawChips(); drawBody(); });
  });
  drawChips();
  drawBody();
}

function openServicesSheet(providers, onDone) {
  const mine = new Set(Settings.get().services);
  const draw = () => providers.slice(0, 60).map((p) => `<button class="svc ${mine.has(p.provider_id) ? 'on' : ''}" aria-pressed="${mine.has(p.provider_id)}" data-pick="${p.provider_id}">${p.logo_path ? `<img src="${IMG}w92${esc(p.logo_path)}" alt="">` : ''}${esc(p.provider_name)}</button>`).join('');
  const sh = openSheet(`<h2 class="h2">I tuoi servizi</h2><p class="small muted">Tocca quelli che usi. Puoi cambiarli quando vuoi.</p><div class="svc-chips" id="pick">${draw()}</div><button class="btn primary" data-close>Fatto</button>`, onDone);
  sh.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-pick]');
    if (!b) return;
    const id = Number(b.dataset.pick);
    if (mine.has(id)) mine.delete(id); else mine.add(id);
    Settings.set({ services: providers.map((p) => p.provider_id).filter((x) => mine.has(x)) });
    $('#pick', sh).innerHTML = draw();
  });
}

const notizieState = { src: 'all' };
async function pageNotizie(el) {
  el.innerHTML = `<div class="page tight">
    <div class="titlebar"><a class="icon-btn" href="#/" aria-label="Indietro" data-back>${I.back}</a><h1 class="h1">Notizie</h1></div>
    <div class="chips" id="n-chips"></div>
    <div id="n-list" class="stack" style="gap:16px">${skeleton(1, 240)}${skeleton(4, 64)}</div>
  </div>`;
  let d;
  try { d = await api('/api/news'); } catch (e) { $('#n-list', el).innerHTML = errorBox(e); return; }
  const draw = () => {
    const s = notizieState.src;
    $('#n-chips', el).innerHTML = [['all', 'Tutte'], ...(d.sources || []).map((x) => [x.id, x.name])]
      .map(([k, l]) => `<button class="chip ${s === k ? 'on' : ''}" data-src="${esc(k)}" aria-pressed="${s === k}">${esc(l)}</button>`).join('');
    const items = (d.items || []).filter((n) => s === 'all' || n.sourceId === s);
    if (!items.length) { $('#n-list', el).innerHTML = '<div class="empty">Nessuna notizia da questa testata, per ora.</div>'; return; }
    const heroIdx = Math.max(0, items.findIndex((n) => n.image));
    const hero = items[heroIdx];
    const rest = items.filter((_, i) => i !== heroIdx);
    $('#n-list', el).innerHTML = `
      <a class="news-hero" href="${esc(hero.link)}" target="_blank" rel="noopener">
        ${hero.image ? `<div class="img"><img src="${esc(hero.image)}" alt="" referrerpolicy="no-referrer"></div>` : ''}
        <span class="src">${esc(hero.source)} · ${esc(timeAgo(hero.date))}</span>
        <span class="t">${esc(hero.title)}</span>
      </a>
      <div class="stack">${rest.map((n) => `<a class="news-item" href="${esc(n.link)}" target="_blank" rel="noopener"><span class="txt"><span class="t">${esc(n.title)}</span><span class="m">${esc(n.source)} · ${esc(timeAgo(n.date))}</span></span>${n.image ? `<span class="thumb"><img loading="lazy" src="${esc(n.image)}" alt="" referrerpolicy="no-referrer"></span>` : ''}</a>`).join('')}</div>
      ${d.failed && d.failed.length ? `<p class="tiny">Non raggiungibili ora: ${esc(d.failed.join(', '))}</p>` : ''}`;
  };
  draw();
  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-src]');
    if (!b) return;
    notizieState.src = b.dataset.src;
    draw();
  });
}

const listaState = { tab: 'todo' };
async function pageLista(el) {
  const draw = () => {
    const todo = List.todo(), seen = List.seen();
    const isTodo = listaState.tab === 'todo';
    const items = isTodo ? todo : seen;
    el.innerHTML = `<div class="page tight">
      <h1 class="h1">La mia lista</h1>
      <div class="segmented" role="tablist">
        <button role="tab" data-tab="todo" class="${isTodo ? 'on' : ''}" aria-selected="${isTodo}">Da vedere · ${todo.length}</button>
        <button role="tab" data-tab="seen" class="${!isTodo ? 'on' : ''}" aria-selected="${!isTodo}">Visti · ${seen.length}</button>
      </div>
      <div class="stack" style="gap:12px">
        ${items.map((f) => `<a class="list-card" href="${filmHref(f.id)}">${poster(f.poster_path, '', 'w154')}
          <span class="info"><span class="t">${esc(f.title)}</span><span class="s" data-where="${f.id}">${isTodo ? esc(whereText(f)) : 'Visto il ' + esc(fmtShort(f.seenAt))}</span></span>
          ${isTodo ? `<span aria-hidden="true" class="muted">${I.chev}</span>` : ''}</a>`).join('')
        || `<div class="empty">${isTodo ? 'La lista è vuota. Apri un film e tocca <b>+ Da vedere</b>.' : 'Qui compariranno i film che segni come visti, con la data.'}</div>`}
      </div>
    </div>`;
    if (isTodo) fillWhere(todo, el);
  };
  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-tab]');
    if (!b) return;
    listaState.tab = b.dataset.tab;
    draw();
  });
  draw();
}
function whereText(f) {
  const d = daysFromToday(f.release_date);
  if (d !== null && d > 0) return `Esce il ${fmtDay(f.release_date)}`;
  if (d !== null && d > -60) return 'Al cinema ora';
  return f.release_date ? `Uscito nel ${year(f.release_date)}` : '';
}
// per i film già usciti, controlla se sono sui servizi scelti
async function fillWhere(todo, el) {
  const mine = Settings.get().services;
  if (!mine.length) return;
  for (const f of todo.slice(0, 25)) {
    const d = daysFromToday(f.release_date);
    if (d !== null && d > 0) continue;
    tmdb(`/movie/${f.id}/watch/providers`).then((r) => {
      const it = (r.results || {}).IT || {};
      const flat = (it.flatrate || []).find((p) => mine.includes(p.provider_id));
      const rent = (it.rent || []).find((p) => mine.includes(p.provider_id));
      const span = $(`[data-where="${f.id}"]`, el);
      if (span && (flat || rent)) span.textContent = flat ? `In streaming su ${flat.provider_name}` : `Noleggio su ${rent.provider_name}`;
    }).catch(() => {});
  }
}

async function pageFilm(el, id) {
  const known = filmIndex.get(String(id)) || List.get(id);
  el.innerHTML = `<div class="film-hero"><a class="icon-btn" href="#/" data-back aria-label="Indietro">${I.back}</a></div>
    <div class="film-body"><div class="film-top">${poster(known?.poster_path, known?.title || '')}<div class="meta"><h1>${esc(known?.title || '')}</h1></div></div>${skeleton(1, 46)}${skeleton(1, 120)}</div>`;
  let m;
  try {
    m = await tmdb(`/movie/${id}`, { append_to_response: 'credits,release_dates,watch/providers' });
  } catch (e) { $('.film-body', el).innerHTML = errorBox(e); return; }
  let overview = m.overview;
  if (!overview) { try { overview = (await tmdb(`/movie/${id}`, { language: 'en-US' })).overview; } catch { /* niente */ } }

  const itRel = (m.release_dates?.results || []).find((r) => r.iso_3166_1 === 'IT');
  const itDates = (itRel?.release_dates || []).map((d) => ({ type: d.type, date: d.release_date.slice(0, 10) }));
  const cinemaDate = itDates.filter((d) => d.type === 3 || d.type === 2).map((d) => d.date).sort()[0] || null;
  const digitalDate = itDates.filter((d) => d.type === 4).map((d) => d.date).sort()[0] || null;
  const film = { id: m.id, title: m.title, poster_path: m.poster_path, release_date: cinemaDate || m.release_date, it_date: cinemaDate || m.release_date };
  filmIndex.set(String(m.id), { ...(filmIndex.get(String(m.id)) || {}), ...film });

  const directors = (m.credits?.crew || []).filter((c) => c.job === 'Director').map((c) => c.name);
  const cast = (m.credits?.cast || []).slice(0, 12);
  const prov = m['watch/providers']?.results?.IT || null;
  const mine = Settings.get().services;
  const meta = [year(m.release_date), runtime(m.runtime), (m.genres || []).slice(0, 2).map((g) => g.name).join(', ')].filter(Boolean).join(' · ');

  const cinD = daysFromToday(cinemaDate);
  let cinemaBox = '';
  if (cinemaDate && cinD > 0) cinemaBox = `<div class="box" style="flex-direction:row;justify-content:space-between;align-items:center"><span class="stack" style="gap:2px"><span class="t">Al cinema</span><span class="small muted">Esce il ${esc(fmtDay(cinemaDate, true))}</span></span><span class="badge">PRESTO</span></div>`;
  else if (cinemaDate && cinD > -75 && !(prov && prov.flatrate)) cinemaBox = `<a class="box" href="#/cinema" style="flex-direction:row;justify-content:space-between;align-items:center"><span class="stack" style="gap:2px"><span class="t">Al cinema</span><span class="small muted">In sala dal ${esc(fmtDay(cinemaDate))}</span></span><span class="badge">IN SALA</span></a>`;

  const provGroup = (arr, label) => (arr || []).slice().sort((a, b) => (mine.includes(b.provider_id) - mine.includes(a.provider_id)) || (a.display_priority - b.display_priority))
    .map((p) => `<span class="prov ${mine.includes(p.provider_id) ? 'mine' : ''}">${p.logo_path ? `<img src="${IMG}w92${esc(p.logo_path)}" alt="">` : ''}${esc(p.provider_name)} · ${label}</span>`).join('');
  const provHtml = prov ? provGroup(prov.flatrate, 'abbonamento') + provGroup(prov.free, 'gratis') + provGroup(prov.ads, 'con pubblicità') + provGroup(prov.rent, 'noleggio') + provGroup(prov.buy, 'acquisto') : '';
  const streamBox = provHtml
    ? `<div class="box"><span class="t">In streaming</span><div class="prov-list">${provHtml}</div>${prov.link ? `<a class="small" href="${esc(prov.link)}" target="_blank" rel="noopener">Dettagli su TMDB</a>` : ''}<span class="tiny">Fonte: JustWatch</span></div>`
    : `<div class="box"><span class="t">In streaming</span><span class="small muted">${digitalDate && daysFromToday(digitalDate) > 0 ? `Atteso in digitale dal ${esc(fmtDay(digitalDate, true))}` : 'Non ancora disponibile in Italia.'}</span></div>`;

  const backdrop = m.backdrop_path ? `<img src="${IMG}w780${esc(m.backdrop_path)}" alt="">` : '';
  el.innerHTML = `<div class="film-hero">${backdrop}<a class="icon-btn" href="#/" data-back aria-label="Indietro">${I.back}</a></div>
  <div class="film-body">
    <div class="film-top">${poster(m.poster_path, m.title)}
      <div class="meta">
        <h1>${esc(m.title)}</h1>
        ${m.original_title && m.original_title !== m.title ? `<span class="small muted">${esc(m.original_title)}</span>` : ''}
        <span class="small muted">${esc(meta)}</span>
        ${directors.length ? `<span class="small dir">Regia di <b>${esc(directors.join(', '))}</b></span>` : ''}
      </div>
    </div>
    <div class="btn-row" id="f-btns"></div>
    <section class="section" style="gap:10px"><h2 class="h2" style="font-size:24px">Dove vederlo</h2>${cinemaBox}${streamBox}</section>
    ${overview ? `<section class="section" style="gap:6px"><h2 class="h2" style="font-size:24px">Trama</h2><p class="plot ${overview.length > 260 ? 'clamp' : ''}" id="f-plot">${esc(overview)}</p>${overview.length > 260 ? '<button class="link-btn" data-act="more">Leggi tutto</button>' : ''}</section>` : ''}
    ${cast.length ? `<section class="section" style="gap:10px"><h2 class="h2" style="font-size:24px">Cast</h2><div class="cast">${cast.map((c) => `<div class="p"><div class="ph">${c.profile_path ? `<img loading="lazy" src="${IMG}w185${esc(c.profile_path)}" alt="">` : ''}</div>${esc(c.name)}<span>${esc(c.character || '')}</span></div>`).join('')}</div></section>` : ''}
    <p class="tiny">Dati e immagini forniti da TMDB. Questa app usa l’API di TMDB ma non è approvata né certificata da TMDB.</p>
  </div>`;

  const drawBtns = () => {
    const it = List.get(m.id);
    const todo = it && !it.seenAt;
    const seen = it && it.seenAt;
    $('#f-btns', el).innerHTML = seen
      ? `<button class="btn primary" data-act="seen">Visto il ${esc(fmtShort(it.seenAt))}</button><button class="btn" data-act="todo">Rivedere</button>`
      : `<button class="btn ${todo ? '' : 'primary'}" data-act="todo">${todo ? '✓ In Da vedere' : '+ Da vedere'}</button><button class="btn" data-act="seen">Segna come visto</button>`;
  };
  drawBtns();
  el.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'more') { $('#f-plot', el).classList.remove('clamp'); b.remove(); }
    if (act === 'todo') {
      const it = List.get(m.id);
      if (it && !it.seenAt) { List.remove(m.id); toast('Tolto dalla lista'); } else { List.addTodo(film); toast('Aggiunto a Da vedere'); }
      drawBtns();
    }
    if (act === 'seen') openSeenSheet(film, drawBtns);
  });
}

function openSeenSheet(film, onDone) {
  const it = List.get(film.id);
  const cur = it?.seenAt || todayISO();
  const sh = openSheet(`<h2 class="h2">${it?.seenAt ? 'Visto' : 'Segna come visto'}</h2>
    <label class="field"><span class="small muted">Quando l’hai visto?</span><input type="date" id="seen-date" value="${esc(cur)}" max="${todayISO()}"></label>
    <button class="btn primary" data-act="save">Salva</button>
    ${it?.seenAt ? '<button class="btn" data-act="unseen">Togli dai visti</button>' : ''}
    <button class="btn" data-close>Annulla</button>`, onDone);
  sh.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'save') {
      const v = $('#seen-date', sh).value || todayISO();
      List.markSeen(film, v);
      toast('Segnato come visto');
    } else if (b.dataset.act === 'unseen') {
      List.remove(film.id);
      toast('Tolto dai visti');
    }
    closeSheet();
  });
}

let sheetDone = null;
function openSheet(html, onDone) {
  sheetDone = onDone || null;
  sheetRoot.innerHTML = `<div class="sheet-bg" data-close-bg><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${html}</div></div>`;
  const sh = $('.sheet', sheetRoot);
  sheetRoot.onclick = (ev) => {
    if (ev.target.matches('[data-close-bg]') || ev.target.closest('[data-close]')) closeSheet();
  };
  return sh;
}
function closeSheet() {
  sheetRoot.innerHTML = '';
  const fn = sheetDone; sheetDone = null;
  if (fn) fn();
}

const searchState = { q: '' };
async function pageCerca(el) {
  el.innerHTML = `<div class="page tight">
    <div class="titlebar"><a class="icon-btn" href="#/" data-back aria-label="Indietro">${I.back}</a>
      <label class="search-field">${I.search}<input id="q" type="search" placeholder="Cerca un film" autocomplete="off" enterkeyhint="search" aria-label="Cerca un film" value="${esc(searchState.q)}"></label></div>
    <div id="r" class="stack" style="gap:14px"></div>
  </div>`;
  const input = $('#q', el);
  const out = $('#r', el);
  let timer = null, seq = 0;
  const run = async () => {
    const q = input.value.trim();
    searchState.q = q;
    if (q.length < 2) { out.innerHTML = '<p class="small muted">Scrivi il titolo di un film.</p>'; return; }
    const my = ++seq;
    out.innerHTML = skeleton(4, 90);
    try {
      const r = await tmdb('/search/movie', { query: q, region: 'IT', include_adult: 'false' });
      if (my !== seq) return;
      const list = remember(r.results || []);
      out.innerHTML = list.map((m) => `<a class="film-row" href="${filmHref(m.id)}" style="gap:12px">${poster(m.poster_path, m.title, 'w154').replace('class="poster"', 'class="poster" style="width:60px;height:90px;border-radius:8px"')}<div class="info"><span class="t">${esc(m.title)}</span><span class="s">${esc([year(m.release_date), m.original_title !== m.title ? m.original_title : ''].filter(Boolean).join(' · '))}</span></div></a>`).join('') || '<div class="empty">Nessun film trovato.</div>';
    } catch (e) { if (my === seq) out.innerHTML = errorBox(e); }
  };
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 350); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') { clearTimeout(timer); run(); input.blur(); } });
  run();
  if (!searchState.q) setTimeout(() => input.focus(), 50);
}

async function pageInfo(el) {
  const s = Settings.get();
  const counts = { todo: List.todo().length, seen: List.seen().length };
  el.innerHTML = `<div class="page">
    <div class="titlebar"><a class="icon-btn" href="#/" data-back aria-label="Indietro">${I.back}</a><h1 class="h1">Impostazioni</h1></div>
    <label class="field"><span>Il tuo nome (per il saluto)</span><input id="name" value="${esc(s.name)}" autocomplete="given-name"></label>
    <section class="section">
      <h2 class="h2">La tua lista</h2>
      <p class="small muted">${counts.todo} da vedere, ${counts.seen} visti. La lista è salvata solo su questo telefono: ogni tanto fai una copia.</p>
      <div class="btn-row"><button class="btn" data-act="export">Salva una copia</button><button class="btn" data-act="import">Ripristina copia</button></div>
      <input type="file" id="imp" accept="application/json,.json" hidden>
    </section>
    <section class="section">
      <h2 class="h2">Crediti</h2>
      <img class="tmdb-logo" src="https://www.themoviedb.org/assets/2/v4/logos/v2/blue_short-8e7b30f73a4020692ccca9c88bafe5dcb6f8a62a4c6bc55cd9ba82bb2cd95f6c.svg" alt="The Movie Database (TMDB)" onerror="this.remove()">
      <p class="small muted" style="line-height:1.5">Dati e immagini dei film forniti da <a href="https://www.themoviedb.org" target="_blank" rel="noopener">TMDB</a>. Questa app usa l’API di TMDB ma non è approvata né certificata da TMDB.</p>
      <p class="small muted" style="line-height:1.5">Disponibilità in streaming fornita da <a href="https://www.justwatch.com/it" target="_blank" rel="noopener">JustWatch</a>.</p>
      <p class="small muted" style="line-height:1.5">Notizie da Cinefilos, Rolling Stone Italia e Movieplayer: ogni notizia apre il sito originale.</p>
    </section>
    <p class="tiny">App personale, non pubblicata. Versione 1.0</p>
  </div>`;
  $('#name', el).addEventListener('change', (e) => { Settings.set({ name: e.target.value.trim() }); toast('Salvato'); });
  el.addEventListener('click', async (ev) => {
    const b = ev.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'export') {
      const data = JSON.stringify({ app: 'cinema', version: 1, savedAt: new Date().toISOString(), list: List.all(), settings: Settings.get() }, null, 1);
      const file = new File([data], `kino-lista-${todayISO()}.json`, { type: 'application/json' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'Copia lista Kino' }); } catch { /* annullato */ }
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(file); a.download = file.name; a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      }
    }
    if (b.dataset.act === 'import') $('#imp', el).click();
  });
  $('#imp', el).addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const d = JSON.parse(await f.text());
      if (d.app !== 'cinema' || typeof d.list !== 'object') throw new Error();
      List.save({ ...List.all(), ...d.list });
      if (d.settings) Settings.set({ services: d.settings.services || [] });
      toast('Lista ripristinata');
      route();
    } catch { toast('File non valido'); }
  });
}

// ---------- azioni comuni ----------
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-act="toggle-todo"]');
  if (t) {
    ev.preventDefault();
    const id = t.dataset.id;
    const it = List.get(id);
    if (it && it.seenAt) { toast('L’hai già visto'); return; }
    if (it) { List.remove(id); toast('Tolto dalla lista'); }
    else {
      const m = filmIndex.get(String(id));
      if (!m) return;
      List.addTodo(m); toast('Aggiunto a Da vedere');
    }
    const on = !it;
    t.classList.toggle('on', on);
    t.setAttribute('aria-pressed', on);
    t.setAttribute('aria-label', on ? 'Togli da Da vedere' : 'Aggiungi a Da vedere');
    t.innerHTML = on ? I.check : I.plus;
    return;
  }
  const back = ev.target.closest('[data-back]');
  if (back && history.length > 1 && navStack > 0) { ev.preventDefault(); history.back(); }
});

// ---------- navigazione ----------
const scrollPos = {};
let navStack = 0;
let currentKey = null;
const ROUTES = [
  [/^\/$/, 'home', pageHome],
  [/^\/cinema$/, 'cinema', pageCinema],
  [/^\/uscite$/, 'uscite', pageUscite],
  [/^\/streaming$/, 'streaming', pageStreaming],
  [/^\/lista$/, 'lista', pageLista],
  [/^\/notizie$/, 'home', pageNotizie],
  [/^\/cerca$/, null, pageCerca],
  [/^\/info$/, 'home', pageInfo],
  [/^\/film\/(\d+)$/, null, pageFilm],
];
function route() {
  const path = (location.hash || '#/').slice(1) || '/';
  if (currentKey) scrollPos[currentKey] = window.scrollY;
  const [re, tab, fn] = ROUTES.find(([r]) => r.test(path)) || ROUTES[0];
  const m = path.match(re) || [];
  if (tab) activeTab = tab;
  renderTabbar();
  const fresh = document.createElement('div');
  app.replaceChildren(fresh);
  closeSheetSilently();
  currentKey = path;
  const res = fn(fresh, m[1]);
  const y = scrollPos[path] || 0;
  window.scrollTo(0, 0);
  if (y) Promise.resolve(res).then(() => requestAnimationFrame(() => window.scrollTo(0, y)));
}
function closeSheetSilently() { sheetDone = null; sheetRoot.innerHTML = ''; }
window.addEventListener('hashchange', () => { navStack++; route(); });
route();

// ---------- funzionamento offline ----------
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
})();
