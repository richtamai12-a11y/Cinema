// Servizio Cloudflare per l'app Cinema.
// - fa da ponte verso TMDB (la chiave sta nel secret TMDB_KEY, mai nel codice)
// - legge i feed RSS delle testate italiane e li restituisce come JSON

const ALLOWED_ORIGINS = [
  'https://richtamai12-a11y.github.io',
  'http://localhost:8080',
  'http://127.0.0.1:8080',
];

export const FEEDS = [
  { id: 'cinefilos', name: 'Cinefilos', url: 'https://www.cinefilos.it/feed' },
  { id: 'rollingstone', name: 'Rolling Stone Italia', url: 'https://www.rollingstone.it/cinema-tv/feed/' },
  { id: 'movieplayer', name: 'Movieplayer', url: 'https://movieplayer.it/feed/' },
];

const TMDB = 'https://api.themoviedb.org/3';

// Solo questi percorsi TMDB possono passare dal ponte.
const TMDB_ALLOWED = [
  /^\/movie\/(now_playing|upcoming)$/,
  /^\/movie\/\d+$/,
  /^\/movie\/\d+\/(watch\/providers|release_dates|credits)$/,
  /^\/search\/movie$/,
  /^\/discover\/movie$/,
  /^\/genre\/movie\/list$/,
  /^\/watch\/providers\/movie$/,
];

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const cors = corsHeaders(request.headers.get('Origin'));

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'GET') return json({ error: 'Metodo non consentito' }, 405, cors);

    try {
      const p = url.pathname;
      if (p === '/' || p === '/api/status') {
        return json({ ok: true, chiave_tmdb: Boolean(env.TMDB_KEY) }, 200, cors);
      }
      if (p === '/api/news') {
        return withCors(await cached(request, ctx, 900, () => getNews()), cors);
      }
      if (p === '/api/now-playing') {
        return withCors(await cached(request, ctx, 6 * 3600, () => getNowPlaying(env)), cors);
      }
      if (p === '/api/upcoming') {
        const kind = url.searchParams.get('type') === 'digital' ? 'digital' : 'cinema';
        return withCors(await cached(request, ctx, 6 * 3600, () => getUpcoming(env, kind)), cors);
      }
      if (p.startsWith('/api/tmdb/')) {
        const path = p.slice('/api/tmdb'.length);
        if (!TMDB_ALLOWED.some((re) => re.test(path))) throw new HttpError(404, 'Percorso non consentito');
        const params = Object.fromEntries(url.searchParams);
        delete params.api_key;
        const ttl = path.startsWith('/search') ? 600 : 3 * 3600;
        return withCors(await cached(request, ctx, ttl, () => tmdb(env, path, params)), cors);
      }
      throw new HttpError(404, 'Non trovato');
    } catch (err) {
      const status = err instanceof HttpError ? err.status : 500;
      return json({ error: err.message || 'Errore' }, status, cors);
    }
  },
};

// ---------- utilità HTTP ----------

function corsHeaders(origin) {
  const allow = origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...extra },
  });
}

function withCors(response, cors) {
  const r = new Response(response.body, response);
  for (const [k, v] of Object.entries(cors)) r.headers.set(k, v);
  return r;
}

// Conserva le risposte nella cache di Cloudflare per non chiedere sempre gli stessi dati.
async function cached(request, ctx, ttl, build) {
  const cache = typeof caches !== 'undefined' ? caches.default : null;
  const key = new Request(new URL(request.url).toString(), { method: 'GET' });
  if (cache) {
    const hit = await cache.match(key);
    if (hit) return hit;
  }
  const data = await build();
  const response = json(data, 200, { 'Cache-Control': `public, max-age=${ttl}` });
  if (cache) ctx.waitUntil(cache.put(key, response.clone()));
  return response;
}

// ---------- TMDB ----------

export async function tmdb(env, path, params = {}) {
  const key = String(env.TMDB_KEY || '').trim();
  if (!key) throw new HttpError(500, 'Chiave TMDB mancante: aggiungi il secret TMDB_KEY su Cloudflare');
  const u = new URL(TMDB + path);
  const all = { language: 'it-IT', ...params };
  for (const [k, v] of Object.entries(all)) if (v !== undefined && v !== '') u.searchParams.set(k, v);
  const headers = { Accept: 'application/json' };
  // Funziona sia con la "API Key" corta sia con il "Read Access Token" lungo.
  if (key.startsWith('eyJ')) headers.Authorization = `Bearer ${key}`;
  else u.searchParams.set('api_key', key);
  const r = await fetch(u.toString(), { headers });
  if (!r.ok) {
    if (r.status === 401) throw new HttpError(502, 'TMDB ha rifiutato la chiave: controlla il secret TMDB_KEY');
    throw new HttpError(502, `TMDB ha risposto ${r.status}`);
  }
  return r.json();
}

function todayIT(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 86400000);
  return d.toISOString().slice(0, 10);
}

// Data di uscita italiana (tipi TMDB: 2 limitata, 3 cinema, 4 digitale)
export function italianDate(releaseDates, types) {
  const it = (releaseDates?.results || []).find((r) => r.iso_3166_1 === 'IT');
  if (!it) return null;
  const dates = it.release_dates
    .filter((d) => types.includes(d.type))
    .map((d) => d.release_date.slice(0, 10))
    .sort();
  return dates[0] || null;
}

function slimMovie(m, extra = {}) {
  return {
    id: m.id,
    title: m.title,
    original_title: m.original_title,
    poster_path: m.poster_path,
    backdrop_path: m.backdrop_path,
    release_date: m.release_date,
    genre_ids: m.genre_ids || (m.genres || []).map((g) => g.id),
    ...extra,
  };
}

async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  async function worker() {
    while (i < items.length) {
      const idx = i++;
      try { out[idx] = await fn(items[idx], idx); } catch { out[idx] = null; }
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

function uniqueById(list) {
  const seen = new Set();
  return list.filter((m) => (seen.has(m.id) ? false : (seen.add(m.id), true)));
}

// Film in sala in Italia, con regista, durata e generi già pronti.
async function getNowPlaying(env) {
  const pages = await Promise.all([1, 2].map((page) =>
    tmdb(env, '/movie/now_playing', { region: 'IT', page })));
  const base = uniqueById(pages.flatMap((p) => p.results || [])).slice(0, 40);
  const detailed = await mapLimit(base, 8, (m) =>
    tmdb(env, `/movie/${m.id}`, { append_to_response: 'credits,release_dates' }));
  const results = base.map((m, i) => {
    const d = detailed[i];
    if (!d) return slimMovie(m, { it_date: m.release_date, directors: [], genres: [], runtime: null });
    return slimMovie(d, {
      it_date: italianDate(d.release_dates, [3, 2]) || m.release_date,
      runtime: d.runtime || null,
      genres: (d.genres || []).map((g) => g.name),
      directors: (d.credits?.crew || []).filter((c) => c.job === 'Director').map((c) => c.name),
    });
  });
  // solo i film già usciti in Italia (TMDB include anche quelli in arrivo nei prossimi giorni)
  const today = todayIT();
  const inSala = results.filter((m) => !m.it_date || m.it_date <= today);
  inSala.sort((a, b) => String(b.it_date).localeCompare(String(a.it_date)));
  return { updated: new Date().toISOString(), results: inSala };
}

// Prossime uscite in Italia: al cinema (tipi 2/3) o in digitale/streaming (tipo 4).
async function getUpcoming(env, kind) {
  const types = kind === 'digital' ? [4] : [3, 2];
  const today = todayIT();
  const params = {
    region: 'IT',
    with_release_type: types.join('|'),
    'release_date.gte': today,
    'release_date.lte': todayIT(kind === 'digital' ? 90 : 150),
    sort_by: 'popularity.desc',
  };
  const pages = await Promise.all([1, 2].map((page) => tmdb(env, '/discover/movie', { ...params, page })));
  const base = uniqueById(pages.flatMap((p) => p.results || [])).slice(0, 40);
  const rd = await mapLimit(base, 8, (m) => tmdb(env, `/movie/${m.id}/release_dates`, {}));
  const results = base
    .map((m, i) => slimMovie(m, { it_date: (rd[i] && italianDate(rd[i], types)) || m.release_date }))
    .filter((m) => m.it_date && m.it_date >= today);
  results.sort((a, b) => a.it_date.localeCompare(b.it_date));
  return { updated: new Date().toISOString(), results };
}

// ---------- Notizie (RSS) ----------

async function getNews() {
  const settled = await Promise.allSettled(FEEDS.map(async (f) => {
    const r = await fetch(f.url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CinemaPersonale/1.0)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      cf: { cacheTtl: 600 },
    });
    if (!r.ok) throw new Error(`${f.name}: ${r.status}`);
    return parseFeed(await r.text(), f);
  }));
  const items = [];
  const failed = [];
  settled.forEach((s, i) => {
    if (s.status === 'fulfilled') items.push(...s.value);
    else failed.push(FEEDS[i].name);
  });
  items.sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return {
    updated: new Date().toISOString(),
    sources: FEEDS.map(({ id, name }) => ({ id, name })),
    failed,
    items: items.slice(0, 80),
  };
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', laquo: '«', raquo: '»', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', ndash: '–', mdash: '—', egrave: 'è', eacute: 'é', agrave: 'à', ograve: 'ò', ugrave: 'ù', igrave: 'ì', Egrave: 'È' };

export function decodeEntities(s) {
  return String(s || '').replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => {
    if (e[0] === '#') {
      const code = e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : m;
    }
    return ENTITIES[e] ?? m;
  });
}

function unCdata(s) {
  return String(s || '').replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1').trim();
}

function tag(xml, name) {
  const re = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i');
  const m = xml.match(re);
  return m ? unCdata(m[1]) : '';
}

function stripHtml(s) {
  return decodeEntities(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
}

function firstMatch(s, re) {
  const m = String(s || '').match(re);
  return m ? decodeEntities(m[1]) : null;
}

function safeUrl(u) {
  if (!u) return null;
  let s = u.trim();
  if (s.startsWith('//')) s = 'https:' + s;
  if (s.startsWith('http://')) s = 'https://' + s.slice(7);
  return /^https:\/\//.test(s) ? s : null;
}

export function parseFeed(xml, feed) {
  const blocks = String(xml).match(/<item\b[\s\S]*?<\/item>/gi) || [];
  return blocks.map((b) => {
    const content = tag(b, 'content:encoded');
    const description = tag(b, 'description');
    const image =
      firstMatch(b, /<media:content[^>]*\burl=["']([^"']+)["'][^>]*>/i) ||
      firstMatch(b, /<media:thumbnail[^>]*\burl=["']([^"']+)["']/i) ||
      firstMatch(b, /<enclosure[^>]*\burl=["']([^"']+\.(?:jpe?g|png|webp)[^"']*)["']/i) ||
      firstMatch(content + description, /<img[^>]+\bsrc=["']([^"']+)["']/i);
    const pub = tag(b, 'pubDate') || tag(b, 'dc:date');
    const time = Date.parse(pub);
    return {
      title: stripHtml(tag(b, 'title')),
      link: safeUrl(decodeEntities(tag(b, 'link'))),
      date: Number.isFinite(time) ? new Date(time).toISOString() : null,
      source: feed.name,
      sourceId: feed.id,
      image: safeUrl(image),
      summary: stripHtml(description).slice(0, 220),
    };
  }).filter((i) => i.title && i.link);
}
