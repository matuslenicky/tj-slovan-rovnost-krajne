// Statický generátor webu TJ Slovan Rovnosť Krajné: data/ + src/ -> dist/   (node build.js; TODAY=2026-11-18 prepíše dnešný dátum)
// Zostavuje ho kluby-siet/engine/assemble.py zo spoločného jadra v2 a tohto súboru (vzhľad, úvod, stránka Klub).
// Kostra „Tabuľka na titulke“: nováčik bojuje o čelo, preto je hlavným obsahom úvodu celá tabuľka VI. ligy Západ.
// Nad ňou veľké číslo miesta a odstup od lídra, vedľa (na telefóne pod ňou) najbližší zápas, výsledky a program.
// Pod tým dva postupy za sebou. Biela, modrá z dresov, tmavá tlač. Písmo Big Shoulders Display (čísla, titulky) a Lora.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'dist');
const rd = (f, def) => { const p = path.join(ROOT, 'data', f); return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : def; };
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const club = rd('klub.json');
const sn = rd('sportnet.json');
const SPACE = config.sportnet.appSpace;

// ---- pomocné -------------------------------------------------------------------------------------
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const local = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const todayISO = () => local.format(new Date()).slice(0, 10);
const TODAY = process.env.TODAY || todayISO();
const DAYS = ['nedeľa', 'pondelok', 'utorok', 'streda', 'štvrtok', 'piatok', 'sobota'];
const DAYS_S = ['ne', 'po', 'ut', 'st', 'št', 'pi', 'so'];
const MONTHS = ['január', 'február', 'marec', 'apríl', 'máj', 'jún', 'júl', 'august', 'september', 'október', 'november', 'december'];
const MONTHS_G = ['januára', 'februára', 'marca', 'apríla', 'mája', 'júna', 'júla', 'augusta', 'septembra', 'októbra', 'novembra', 'decembra'];
const dObj = (iso) => new Date(iso + 'T12:00:00Z');
const dShort = (iso) => { const d = dObj(iso); return `${d.getUTCDate()}. ${d.getUTCMonth() + 1}.`; };
const dDay = (iso) => DAYS_S[dObj(iso).getUTCDay()];
const DAYS_ACC = ['v nedeľu', 'v pondelok', 'v utorok', 'v stredu', 'vo štvrtok', 'v piatok', 'v sobotu'];
const dWhen = (iso) => { const d = dObj(iso); return `${DAYS_ACC[d.getUTCDay()]} ${d.getUTCDate()}. ${MONTHS_G[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const dLong = (iso) => { const d = dObj(iso); return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()}. ${MONTHS_G[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const dDate = (iso) => { const d = dObj(iso); return `${d.getUTCDate()}. ${MONTHS_G[d.getUTCMonth()]} ${d.getUTCFullYear()}`; };
const dFull = (iso) => { const d = dObj(iso); return `${d.getUTCDate()}. ${d.getUTCMonth() + 1}. ${d.getUTCFullYear()}`; };
const monthKey = (iso) => iso.slice(0, 7);
const monthName = (key) => { const [y, m] = key.split('-').map(Number); return `${MONTHS[m - 1]} ${y}`; };
// okamih výkopu s posunom časového pásma (letný čas) pre odpočet v prehliadači
function isoLocal(date, time = '12:00') {
  const [y, mo, d] = date.split('-').map(Number), [h, mi] = time.split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, d, h, mi);
  const [ld, lt] = local.format(new Date(guess)).split(' ');
  const shown = Date.UTC(...ld.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0)), ...lt.split(':').map(Number));
  const off = (shown - guess) / 6e4;
  return `${date}T${time}:00+${String(Math.floor(off / 60)).padStart(2, '0')}:${String(off % 60).padStart(2, '0')}`;
}
const acc = (league) => league.replace(/\bliga\b/, 'ligu'); // 4. pád: hrajú IV. ligu
const vLige = (league) => `${/^IV\./.test(league) ? 'vo' : 'v'} ${esc(league.replace(/\bliga\b/, 'lige'))}`; // 6. pád: vo IV. lige, v VII. lige
const SEASON = sn.season.replace(/^(\d{4})\/\d\d(\d\d)$/, '$1/$2');
const plural = (n, a, b, c) => `${n} ${n === 1 ? a : n >= 2 && n <= 4 ? b : c}`; // číslo a slovo bez zlomu riadka („4 body“)
const zo = (n) => `${/^(4|6|7|1[467]|[467]\d)$/.test(String(n)) ? 'zo' : 'z'} ${n}`; // „zo 16“, „z 11“ (podľa výslovnosti čísla)
const num = (n) => Number(n).toLocaleString('sk-SK');
const nazov = (n) => club.nazvy?.[n] || n; // čitateľný názov súpera (úradné názvy a veľké písmená zo Sportnetu)

// ---- súťaže, tímy, zápasy ------------------------------------------------------------------------
const compName = (name) => club.sutaze[name] || club.sutaze[name.replace(/\s+/g, ' ').trim()] || name.replace(/\s+/g, ' ').replace(/-ObFZ TN/, ' ObFZ Trenčín').replace(/\s*Macron \| yoursport\s*/, ' ').replace(/-/g, ' ').trim();
const ROUND = (r) => (/^\d+$/.test(r) ? `${r}. kolo` : String(r || '').replace(/\.\s*kolo/i, '. kolo').replace(/Kolo/, 'kolo').replace(/^Kvalifika/, 'kvalifika')); // stojí za čiarkou: „…, kvalifikačné stretnutie“
const teams = sn.teams.map((t) => {
  // ligová súťaž = časť s najväčšou tabuľkou (áčko má v tej istej súťaži aj kvalifikačné stretnutie s tabuľkou o 2 tímoch)
  const league = t.competitions.filter((c) => !c.cup).sort((a, b) => (sn.tables[b.key]?.rows.length || 0) - (sn.tables[a.key]?.rows.length || 0))[0];
  // tabuľka prípraviek bez zapísaných výsledkov (všetci 0:0, body len za účasť) by klamala, preto sa neukazuje
  const raw = league ? sn.tables[league.key] : null;
  // ak náš klub výsledky prípravky nezapisuje (len 0:0), poradie by ho stavalo na chvost, preto tiež bez tabuľky
  const ourRaw = raw?.rows.find((r) => r.our);
  const prepNoScore = /^U(\d|1[01])\b/.test(t.short) && ourRaw && !ourRaw.gf && !ourRaw.ga;
  const table = raw && raw.rows.some((r) => r.gf || r.ga) && !prepNoScore ? raw : null;
  const pos = table?.rows.find((r) => r.our);
  return {
    ...t, url: `timy/${t.slug}/`, code: t.adult ? t.slug[0] : norm(t.short).replace(/-/g, ''),
    full: t.adult ? t.short : `${t.sub} ${t.short}`,
    leagueName: league ? compName(league.name) : '', leagueKey: league?.key || '', table, pos: pos?.pos || null, of: table?.rows.length || 0,
  };
});
// tímy bez zápasu v sezóne (napr. prihlásený tím bez súťaže) sa na webe neukazujú
for (let i = teams.length - 1; i >= 0; i--) if (!sn.matches.some((m) => m.team === teams[i].slug)) teams.splice(i, 1);
const bySlug = Object.fromEntries(teams.map((t) => [t.slug, t]));
// kolo bez súpera (voľno) vedie Sportnet ako zápas s prázdnym súperom: na webe by z neho bol riadok bez mena
const PART = Object.fromEntries(sn.teams.flatMap((t) => t.competitions.map((x) => [x.key, x.part || '']))); // názov časti súťaže (napr. Kvalifikačné stretnutie)
const matches = sn.matches.filter((m) => String(m.opponent || '').trim() && bySlug[m.team]).map((m) => {
  const t = bySlug[m.team];
  const past = m.played || m.date < TODAY;
  let gf = null, ga = null, res = null;
  // prípravky (U11 a mladší) výsledok nezapisujú, Sportnet pri nich dáva 0:0 bez gólov
  if (m.score === '0:0' && !(m.goals || []).length && /^U(\d|1[01])\b/.test(t.short)) m = { ...m, score: null };
  if (m.score) { const [h, a] = m.score.split(':').map(Number); [gf, ga] = m.home ? [h, a] : [a, h]; res = gf > ga ? 'w' : gf < ga ? 'l' : 'd'; }
  const opponent = nazov(m.opponent);
  const slug = `${m.date}-${t.code}-${norm(opponent)}`;
  return { ...m, opponent, past, gf, ga, res, slug, url: `zapasy/${slug}/`, comp: compName(m.competition), roundName: ROUND(m.round) || (/kvalifik/i.test(PART[m.comp] || '') ? 'kvalifikácia' : ''), teamObj: t, cup: /cup|pohár/i.test(m.competition) };
});
const teamMatches = (slug) => matches.filter((m) => m.team === slug);
const upcoming = matches.filter((m) => !m.past);
const results = matches.filter((m) => m.past).reverse();
const RES = { w: 'Výhra', d: 'Remíza', l: 'Prehra' };
const RES_S = { w: 'V', d: 'R', l: 'P' };
const isPrep = (t) => /^U(\d|1[01])\b/.test(t.short); // prípravky (U11 a mladší) výsledky nezapisujú
const noScore = (m) => (isPrep(m.teamObj) ? 'Výsledky prípraviek sa nezapisujú' : 'Sportnet výsledok neuvádza');

// strelci tímu v sezóne (vlastné góly sa nerátajú)
function scorers(slug) {
  const c = new Map();
  for (const m of teamMatches(slug)) for (const g of m.goals || []) if (g.side === 'our' && g.kind !== 'own' && g.player) c.set(g.player, (c.get(g.player) || 0) + 1);
  return [...c].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'sk'));
}
function record(slug, filter = () => true) {
  const r = { w: 0, d: 0, l: 0, gf: 0, ga: 0, n: 0 };
  for (const m of teamMatches(slug)) if (m.res && filter(m)) { r[m.res]++; r.gf += m.gf; r.ga += m.ga; r.n++; }
  return r;
}

// ---- erby ----------------------------------------------------------------------------------------
const CREST_R = 315 / 320; // pomer strán erbu (šírka / výška), dopočíta assemble.py
const logoFile = (space) => space && fs.existsSync(path.join(SRC, 'img', 'kluby', `${space}.webp`));
const initials = (name) => String(name).replace(/^(TJ|OŠK|OFK|ŠK|FK|FC|MFK|MŠK|PFK|TFK|PŠK|ZFC|OTJ|AFC|TTS|Telovýchovná jednota)\s+/i, '').split(/[\s-]+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
function logo(space, name, R, size = 40, eager = false) {
  if (space === SPACE) return `<img class="logo" src="${R}img/erb-128.webp" alt="" width="${Math.round(size * CREST_R)}" height="${size}"${eager ? '' : ' loading="lazy"'} decoding="async">`;
  if (logoFile(space)) return `<img class="logo" src="${R}img/kluby/${space}.webp" alt="" width="${size}" height="${size}"${eager ? '' : ' loading="lazy"'} decoding="async">`;
  return `<span class="logo logo--txt" aria-hidden="true">${esc(initials(name))}</span>`;
}

// ---- ikony (Lucide, ISC) -------------------------------------------------------------------------
const ico = (p, cls = 'i') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
const I = {
  mail: ico('<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>'),
  phone: ico('<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>'),
  pin: ico('<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>'),
  route: ico('<circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/>'),
  cal: ico('<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>'),
  ext: ico('<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>'),
  arrow: ico('<path d="M5 12h14M13 6l6 6-6 6"/>'),
  menu: ico('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  close: ico('<path d="M18 6 6 18M6 6l12 12"/>'),
  ball: ico('<circle cx="12" cy="12" r="10"/><path d="m12 7 4.2 3-1.6 5H9.4L7.8 10z"/><path d="M12 2v5M21.5 9.5 16.2 10M18 20l-3.4-5M6 20l3.4-5M2.5 9.5l5.3.5"/>'),
  trophy: ico('<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.7V17c0 .6-.5 1-1 1.2C7.8 18.8 7 20.2 7 22M14 14.7V17c0 .6.5 1 1 1.2 1.2.6 2 2 2 3.8M18 2H6v7a6 6 0 0 0 12 0z"/>'),
  music: ico('<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>'),
  users: ico('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>'),
};

// ---- CSP a rozloženie (spoločné jadro v2, kluby-siet/engine/engine.js) ---------------------------
// Jadro nevnucuje vzhľad: kostru úvodu, hlavičku (SKIN.nav), zoznam zápasov (SKIN.list), písmo a farby určuje web
// v src/site.js (SKIN, NAV, DESC, úvod a stránka Klub) a v src/css/skin.css. Inline atribút style CSP nepustí.
// .flt: zoznam zápasov s filtrom v adrese (?tim=, ?kde=) je neviditeľný, kým ho site.mjs nevyfiltruje (inak skáče)
const HEAD_JS = `var d=document.documentElement;d.classList.add('js');if(/[?&](tim|kde)=/.test(location.search)){d.classList.add('flt');addEventListener('load',function(){d.classList.remove('flt')})}`;
const sha256 = (s) => `'sha256-${crypto.createHash('sha256').update(s, 'utf8').digest('base64')}'`;
const CONNECT = ["'self'", ...(config.supabase?.url ? [new URL(config.supabase.url).origin] : [])];
const CSP = [
  "default-src 'none'", `script-src 'self' ${sha256(HEAD_JS)}`, "style-src 'self'", "img-src 'self' data:", "font-src 'self'",
  `connect-src ${CONNECT.join(' ')}`, "base-uri 'none'", "form-action 'none'", "object-src 'none'", "manifest-src 'self'",
].join('; ');

const ST = club.stadion || club.ihrisko;
const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${ST.geo.join(',')}`;
const mapyUrl = `https://mapy.com/fnc/v1/showmap?mapset=basic&amp;center=${ST.geo[1]},${ST.geo[0]}&amp;zoom=16&amp;marker=true`;
const A = teams[0];
const YEAR = Number(TODAY.slice(0, 4));
const nextHome = upcoming.find((m) => m.home && m.team === A.slug);
const nextA = upcoming.find((m) => m.team === A.slug);
const lastA = [...teamMatches(A.slug)].reverse().find((m) => m.past && m.score);
const winterNow = !!nextA && (dObj(nextA.date) - dObj(TODAY)) / 864e5 > 14;
const youth = teams.filter((t) => !t.adult);
const ourName = (t) => (t.adult ? club.nazov : `${club.kratky || club.mesto} ${t.short}`);
// skratka klubu („TJ“, „OFK“) nezostane na konci riadka bez mena
const glueAbbr = (s) => s.replace(/(^|\s)([A-ZÁČĎÉÍĽĹŇÓŔŠŤÚÝŽ]{2,4}-[A-ZÁČĎÉÍĽĹŇÓŔŠŤÚÝŽ]{2,4}) (?=\S)/g, `$1<span class="nw">$2</span>${NB}`).replace(/(^|\s)(TJ|FK|FC|MFK|MFC|OŠK|ŠK|OFK|MŠK|PFK|ZFC|TFK|SDM|AFC|OTJ|ŠC|PŠK|FKS) (?=\S)/g, `$1$2${NB}`);
const venueName = (v) => v.replace(/\s+/g, ' ').trim().replace(/(^|\s)č\.\s*(\d)/g, '$1č. $2');
const pw = (n, a, b, c) => (n === 1 ? a : n >= 2 && n <= 4 ? b : c); // tvar slova podľa počtu
// zápasy na úvod: bez prípraviek (U11 a mladší) a bez opakovaných riadkov (rovnaký súper v ten istý deň)
const homePick = (list, n) => {
  const seen = new Set();
  const cand = list.filter((m) => !isPrep(m.teamObj)).filter((m) => { const k = `${m.date}|${m.opponent}`; if (seen.has(k)) return false; seen.add(k); return true; });
  const a = cand.filter((m) => m.teamObj === A).slice(0, Math.ceil(n / 2));
  const rest = cand.filter((m) => !a.includes(m)).slice(0, n - a.length);
  return cand.filter((m) => a.includes(m) || rest.includes(m)); // áčko má prednosť, poradie zoznamu ostáva
};
const homeUp = (n = 5, skip = []) => homePick(upcoming.filter((m) => ![].concat(skip).includes(m)), n); // skip: zápas, ktorý už úvod zvýrazňuje
const homeRes = (n = 5, skip = []) => homePick(results.filter((x) => x.score && ![].concat(skip).includes(x)), n);
const MON3 = ['jan', 'feb', 'mar', 'apr', 'máj', 'jún', 'júl', 'aug', 'sep', 'okt', 'nov', 'dec'];

// ---- kostra stránky ------------------------------------------------------------------------------
const navItems = (R, active, home = false) => (home ? [['', 'Úvod'], ...NAV] : NAV).map(([u, t]) => `<li><a href="${R}${u}"${active === u && (u || home) ? ' aria-current="page"' : ''}>${t}</a></li>`).join('');
const brand = (R, route, cls = 'brand') => `<a class="${cls}" href="${R}"${route ? '' : ' aria-current="page"'}><img src="${R}img/erb-128.webp" alt="" width="${Math.round(44 * CREST_R)}" height="44"><span class="brand-t"><span class="brand-n">${esc(SKIN.brand)}</span>${SKIN.brandSub ? `<span class="brand-s">${esc(SKIN.brandSub)}</span>` : ''}</span><span class="sr">, úvod</span></a>`;
const menuBtn = `<button class="menu-btn" type="button" aria-expanded="false" aria-controls="menu" aria-haspopup="dialog">${I.menu}<span>Menu</span></button>`;

function layout({ route, title, desc, body, active, bodyClass = '' }) {
  const depth = route.split('/').filter(Boolean).length;
  const R = depth ? '../'.repeat(depth) : './';
  const fullTitle = (config.ukazka ? 'Návrh webu – ' : '') + (route ? `${title} | ${club.nazov}` : `${club.nazov} – ${title}`);
  const canon = config.siteUrl ? `${config.siteUrl}${route}` : '';
  const ld = route ? '' : `<script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org', '@type': 'SportsClub', name: club.nazov, sport: 'Futbal', ...(club.zalozenie ? { foundingDate: String(club.zalozenie) } : {}),
    email: club.kontakt.email,
    address: { '@type': 'PostalAddress', ...(club.adresa.length > 1 ? { streetAddress: club.adresa[0] } : {}), postalCode: (club.adresa.at(-1).match(/^\d{3} ?\d{2}/) || [''])[0], addressLocality: club.mesto, addressCountry: 'SK' },
    location: { '@type': 'StadiumOrArena', name: ST.nazov, geo: { '@type': 'GeoCoordinates', latitude: ST.geo[0], longitude: ST.geo[1] } },
    sameAs: [club.sportnetUrl, club.kontakt.facebook].filter(Boolean),
  }).replace(/</g, '\\u003c')}</script>`;
  const nav = `<nav class="nav" aria-label="Hlavné menu"><ul>${navItems(R, active)}</ul></nav>`;
  const header = SKIN.nav === 'mast'
    ? `<header class="hdr hdr--mast"><div class="wrap hdr-in">${brand(R, route)}${menuBtn}</div><div class="wrap hdr-nav">${nav}</div></header>`
    : `<header class="hdr hdr--${SKIN.nav}"><div class="wrap hdr-in">${brand(R, route)}${SKIN.nav === 'side' ? '' : nav}${menuBtn}</div></header>`;
  const side = SKIN.nav === 'side' ? `<aside class="side" aria-label="Klub">${brand(R, route, 'brand brand--side')}<nav class="side-nav" aria-label="Hlavné menu"><ul>${navItems(R, active, true)}</ul></nav>${nextA ? `<a class="side-next" href="${R}${nextA.url}"><span>Najbližší zápas áčka</span><b>${esc(nextA.opponent)}</b><span>${dDay(nextA.date)} ${dShort(nextA.date)} · ${esc(nextA.time || '')} · ${nextA.home ? 'doma' : 'vonku'}</span></a>` : ''}</aside>` : '';
  const footer = `<footer class="ftr"><div class="wrap ftr-in">
  <div class="ftr-id"><img src="${R}img/erb-128.webp" alt="" width="${Math.round(48 * CREST_R)}" height="48" loading="lazy"><div><p class="ftr-name">${esc(club.nazov)}</p><p>${esc(ST.nazov)}, ${club.adresa.map(esc).join(', ')}</p></div></div>
  <ul class="ftr-links"><li><a href="${mapsUrl}" rel="noopener">Navigovať na ihrisko</a></li><li><a href="mailto:${club.kontakt.email}">${esc(club.kontakt.email).replace('@', '<wbr>@')}</a></li>${club.kontakt.facebook ? `<li><a href="${club.kontakt.facebook}" rel="noopener">Facebook</a></li>` : ''}<li><a href="${club.sportnetUrl}" rel="noopener">Sportnet</a></li></ul>
  <p class="ftr-src">Výsledky zo Sportnetu, aktualizované ${dFull(sn.updated.slice(0, 10))}. ${esc(SKIN.sources || '')}</p>
</div><div class="wrap ftr-bar"><span>© ${new Date().getFullYear()} ${esc(club.pravnyNazov || club.nazov)}</span><a href="${R}ochrana-sukromia/">Ochrana súkromia</a>${config.adminDemo ? `<a href="${R}admin/">Administrácia (ukážka)</a>` : ''}</div></footer>`;
  const inner = `<main id="obsah">\n${body}\n</main>\n${footer}`;
  return `<!doctype html>
<html lang="sk" data-root="${R}"${config.ukazka ? ' class="has-demo"' : ''}>
<head>
<meta charset="utf-8">
<meta http-equiv="Content-Security-Policy" content="${CSP}">
<meta name="referrer" content="strict-origin-when-cross-origin">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(fullTitle)}</title>
<meta name="description" content="${esc(desc || DESC)}">
${config.noindex ? '<meta name="robots" content="noindex">\n' : ''}${canon ? `<link rel="canonical" href="${canon}">\n` : ''}<meta property="og:title" content="${esc(fullTitle)}">
<meta property="og:type" content="website">
<meta property="og:locale" content="sk_SK">
<meta name="theme-color" content="${SKIN.theme}">
<link rel="icon" type="image/png" href="${R}img/favicon.png">
<link rel="apple-touch-icon" href="${R}img/apple-touch-icon.png">
${SKIN.fonts.map((f) => `<link rel="preload" href="${R}fonts/${f}" as="font" type="font/woff" crossorigin>`).join('\n')}
<link rel="stylesheet" href="${R}css/site.css">
<script>${HEAD_JS}</script>
<script type="module" src="${R}js/site.mjs"></script>
${ld}</head>
<body class="${['v2', bodyClass].filter(Boolean).join(' ')}">
<a class="skip" href="#obsah">Preskočiť na obsah</a>
${config.ukazka ? '<p class="demo">Návrh webu · nie je to oficiálna stránka klubu</p>' : ''}
${header}
<dialog class="menu" id="menu" aria-label="Menu"><div class="menu-in">
  <div class="menu-top"><span class="menu-k">${esc(club.nazov)}</span><button class="menu-x" type="button" data-close>${I.close}<span>Zavrieť</span></button></div>
  <ul class="menu-nav">${navItems(R, active, true)}</ul>
</div></dialog>
${SKIN.nav === 'side' ? `<div class="shell">${side}<div class="shell-main">${inner}</div></div>` : inner}
</body>
</html>
`;
}

// ---- spoločné bloky ------------------------------------------------------------------------------
const pageHead = ({ title, sub = '', crumbs = [], R }) => `<section class="phead"><div class="wrap">
  ${crumbs.length ? `<nav class="crumbs" aria-label="Omrvinky"><a href="${R}">Úvod</a>${crumbs.map(([u, x]) => u ? `<a href="${R}${u}">${esc(x)}</a>` : `<span aria-current="page">${esc(x)}</span>`).join('')}</nav>` : ''}
  <h1 class="h1">${glueAbbr(esc(title))}</h1>${sub ? `<p class="phead-sub">${sub}</p>` : ''}
</div></section>`;
const secHead = (h, id, moreLink = '', kicker = '') => `<div class="sec-head"><div>${kicker ? `<p class="kicker">${kicker}</p>` : ''}<h2 class="h2" id="${id}">${h}</h2></div>${moreLink}</div>`;
const more = (href, t) => `<a class="more" href="${href}">${t}${I.arrow}</a>`;
const sc = (m) => (m.score ? `<span class="sc sc--${m.res}"><span class="sr">${RES[m.res]}, </span>${m.gf}:${m.ga}</span>` : `<span class="sc sc--n">–<span class="sr"> ${noScore(m)}</span></span>`);

// zoznam zápasov: jedno značkovanie, vzhľad (riadky, dlaždice, tabuľa) robí skin.css; skóre vždy naše:súper
function fxRow(m, R, { showTeam = true } = {}) {
  const href = m.detail || !m.past ? ` href="${R}${m.url}"` : '';
  const tag = href ? 'a' : 'div';
  const where = m.home ? 'doma' : 'vonku';
  const comp = esc(m.cup ? m.comp : m.roundName || m.comp);
  return `<li class="mrow fx fx--${m.past ? 'res' : 'up'} fx--${m.home ? 'h' : 'a'}${m.past ? ` fx--${m.res || 'n'}` : ''}" data-team="${m.team}" data-where="${where}"><${tag} class="fx-a"${href}>
  <time class="fx-d" datetime="${m.date}"><span class="fx-dd">${dDay(m.date)}</span> <span class="fx-dn">${dObj(m.date).getUTCDate()}.</span> <span class="fx-dm">${dObj(m.date).getUTCMonth() + 1}.</span></time>
  <span class="fx-o"><span class="fx-on">${esc(m.opponent)}</span><span class="fx-k">${showTeam ? `${esc(m.teamObj.short)} · ` : ''}${comp} · ${where}</span></span>
  <span class="fx-r">${m.past ? sc(m) : `<span class="fx-t">${esc(m.time || '–')}</span>`}</span>
</${tag}></li>`;
}
const fxList = (list, R, opts) => `<ol class="fxl${list.length && list.every((m) => m.past) ? ' fxl--res' : ' fxl--up'}">${list.map((m) => fxRow(m, R, opts)).join('')}</ol>`;
const matchList = fxList;

// zápasová karta
function card(m, R, { big = false, label = '', self = false } = {}) {
  const us = { name: ourName(m.teamObj), space: SPACE }, them = { name: m.opponent, space: m.oppSpace };
  const [h, a] = m.home ? [us, them] : [them, us];
  const lbl = label || (m.past ? 'Posledný zápas' : 'Najbližší zápas');
  const side = (t, role) => `<div class="mc-side${t.space === SPACE ? ' is-us' : ''}"><span class="mc-crest">${logo(t.space, t.name, R, big ? 56 : 44, big)}</span><span class="mc-name">${esc(t.name)}</span><span class="sr"> (${role})</span></div>`;
  const mid = m.score ? `<span class="sr">Výsledok </span>${esc(m.score)}` : m.past ? '–' : `<span class="sr">Výkop o </span>${esc(m.time || '–')}`;
  const links = [];
  if (m.score && m.detail && !self) links.push(`<a class="mc-a" href="${R}${m.url}">Priebeh a zostavy${I.arrow}</a>`);
  if (!m.past && !self) links.push(`<a class="mc-a" href="${R}kalendar/zapas-${m.id}.ics" download>${I.cal}Do kalendára</a>`);
  return `<article class="mc${big ? ' mc--big' : ''}">
  <p class="mc-top"><span class="mc-label">${esc(lbl)}</span><span>${esc(m.teamObj.short)} · ${esc(m.comp)}${m.roundName ? `, ${esc(m.roundName)}` : ''}</span></p>
  <div class="mc-row">${side(h, 'domáci')}<p class="mc-mid${m.score ? ` mc-mid--${m.res}` : ''}">${mid}</p>${side(a, 'hostia')}</div>
  <p class="mc-when"><time datetime="${m.date}">${dLong(m.date)}</time>${m.time && !m.past ? ` · ${esc(m.time)}` : ''}${m.venue ? ` · ${glueAbbr(esc(venueName(m.venue)))}` : ''}${m.score ? ` · ${RES[m.res].toLowerCase()}` : ''}</p>
  ${!m.past ? `<p class="mc-cd"><span class="cd" data-kickoff="${isoLocal(m.date, m.time)}" hidden></span></p>` : ''}
  ${links.length ? `<p class="mc-links">${links.join('')}</p>` : ''}
</article>`;
}

function tableHtml(tb, R, { compact = false, caption = '' } = {}) {
  let rows = tb.rows;
  if (compact) { const i = rows.findIndex((r) => r.our); const from = Math.max(0, Math.min(i - 2, rows.length - 5)); rows = rows.slice(from, from + 5); }
  return `<div class="tbl-wrap"><table class="tbl">${caption ? `<caption>${caption}</caption>` : ''}
  <thead><tr><th scope="col"><abbr title="Poradie">#</abbr></th><th scope="col" class="tl">Tím</th><th scope="col"><abbr title="Zápasy">Z</abbr></th><th scope="col" class="hm"><abbr title="Výhry">V</abbr></th><th scope="col" class="hm"><abbr title="Remízy">R</abbr></th><th scope="col" class="hm"><abbr title="Prehry">P</abbr></th><th scope="col">Skóre</th><th scope="col"><abbr title="Body">B</abbr></th></tr></thead>
  <tbody>${rows.map((r) => `<tr${r.our ? ' class="our"' : ''}><td class="pos">${r.pos}</td><th scope="row" class="tl"><span class="tteam">${logo(r.space, r.name, R, 22)}<span>${esc(nazov(r.name))}</span></span></th><td>${r.played}</td><td class="hm">${r.won}</td><td class="hm">${r.draw}</td><td class="hm">${r.lost}</td><td class="nw">${r.gf}:${r.ga}</td><td><b>${r.pts}</b></td></tr>`).join('')}</tbody>
</table></div>`;
}
const formHtml = (slug, n = 5) => {
  const last = teamMatches(slug).filter((m) => m.res).slice(-n);
  return last.length ? `<ol class="form" aria-label="Forma: ${last.length === 1 ? 'posledný zápas' : last.length <= 4 ? `posledné ${last.length} zápasy` : `posledných ${last.length} zápasov`}">${last.map((m) => `<li class="form--${m.res}" title="${dShort(m.date)} ${esc(m.opponent)} ${m.gf}:${m.ga}"><span aria-hidden="true">${RES_S[m.res]}</span><span class="sr">${RES[m.res]} ${esc(m.opponent)} ${m.gf}:${m.ga}</span></li>`).join('')}</ol>` : '';
};
const calBox = (file, R, id) => `<details class="cal" data-cal id="${id}">
  <summary class="btn btn--line">${I.cal}<span>Zápasy do kalendára</span></summary>
  <div class="cal-pop">
    <a class="cal-o" data-webcal href="${R}kalendar/${file}" hidden><b>Odoberať v telefóne</b><span>iPhone, Mac, Outlook</span></a>
    <a class="cal-o" data-gcal href="${R}kalendar/${file}" rel="noopener" hidden><b>Google Kalendár</b><span>aj pre Android</span></a>
    <a class="cal-o" data-ics href="${R}kalendar/${file}" download><b>Stiahnuť .ics</b><span>jednorazovo</span></a>
  </div>
</details>`;
function cardPick(slug) {
  const list = teamMatches(slug);
  const next = list.find((m) => !m.past);
  const last = [...list].reverse().find((m) => m.past && (m.score || isPrep(m.teamObj)));
  const soon = next && (dObj(next.date) - dObj(TODAY)) / 864e5 <= 7;
  return soon ? next : last || next;
}
const coachOf = (t) => t.squad.crew.filter((c) => c.role === 'coach').map((c) => c.name).join(' a ') || t.squad.crew.find((c) => c.role === 'manager')?.name || '';
const coachRole = (t) => { const n = t.squad.crew.filter((c) => c.role === 'coach').length; return n > 1 ? 'tréneri' : n ? 'tréner' : 'vedúci'; };
const teamRows = (R, only = () => true) => `<ul class="teams">${teams.filter(only).map((t) => `<li><a href="${R}${t.url}"><span class="teams-n">${esc(t.short)}</span><span class="teams-s">${esc(t.adult ? 'Muži' : t.sub)}</span><span class="teams-l">${esc(t.leagueName)}</span><span class="teams-p">${t.pos ? `${t.pos}. ${zo(t.of)}` : 'bez tabuľky'}</span></a></li>`).join('')}</ul>`;
const seasonsTable = (list) => `<div class="tbl-wrap"><table class="tbl tbl--roc"><caption class="sr">Ročníky áčka</caption>
  <thead><tr><th scope="col" class="tl">Ročník</th><th scope="col" class="tl">Súťaž</th><th scope="col">Miesto</th><th scope="col" class="hm">Skóre</th><th scope="col">Body</th></tr></thead>
  <tbody>${list.map((x) => `<tr${x.titul || x.naj ? ' class="our"' : ''}><th scope="row" class="tl">${esc(x.rok)}</th><td class="tl">${esc(x.liga)}${x.pozn ? `<small>${esc(x.pozn)}</small>` : ''}</td><td class="nw">${x.poz ? `${x.poz}.<span> ${zo(x.z)}</span>` : '–'}</td><td class="hm nw">${esc(x.skore || '')}</td><td>${x.body ?? ''}</td></tr>`).join('')}</tbody>
</table></div>`;
const facts = (list) => `<dl class="kv">${list.map((f) => `<div><dt>${esc(f.k)}</dt><dd>${esc(f.t)}</dd></div>`).join('')}</dl>`;

// ---- stránky -----------------------------------------------------------------------------------
const pages = [];
const add = (route, opts) => pages.push({ route, ...opts });
const crewRole = { coach: 'Tréner', assist_coach: 'Asistent trénera', coach_goalkeepers: 'Tréner brankárov', manager: 'Vedúci mužstva', doctor: 'Zdravotník', physiotherapist: 'Fyzioterapeut', masseur: 'Masér', club_representative: 'Zástupca klubu', security_manager: 'Hlavný usporiadateľ', other: 'Člen realizačného tímu' };
const POS = [['goalkeeper', 'Brankári'], ['defender', 'Obrancovia'], ['midfielder', 'Stredopoliari'], ['forward', 'Útočníci'], ['', 'Hráči']];
const teamLabel = (t) => (t.adult ? t.full : `${t.short} ${t.sub.toLowerCase()}`);
const winterLine = () => {
  const first = upcoming[0];
  if (!first || (dObj(first.date) - dObj(TODAY)) / 864e5 <= 14) return '';
  return nextA ? `Zimná prestávka. Áčko začína ${dWhen(nextA.date)} ${nextA.home ? 'doma proti' : 'na ihrisku'} ${esc(nextA.opponent)}.` : `Zimná prestávka. Prvý zápas je ${dWhen(first.date)}.`;
};

add('zapasy/', {
  title: 'Zápasy', active: 'zapasy/', desc: `Program a výsledky všetkých tímov ${club.nazov} v sezóne ${SEASON}.`,
  body: (R) => {
    const grp = (list) => {
      const months = new Map();
      for (const m of list) { const k = monthKey(m.date); if (!months.has(k)) months.set(k, []); months.get(k).push(m); }
      return [...months].map(([k, l]) => `<section class="month" data-month><h3 class="month-h">${monthName(k)}</h3>${matchList(l, R)}</section>`).join('');
    };
    return `${pageHead({ title: 'Zápasy', sub: `Ročník ${SEASON}, všetky tímy.`, R, crumbs: [[null, 'Zápasy']] })}
<section class="sec sec--first"><div class="wrap">
  <div class="filters" data-filters>
    <div class="chips" role="group" aria-label="Tím"><button type="button" class="chip" data-f-team="" aria-pressed="true">Všetky</button>${teams.map((t) => `<button type="button" class="chip" data-f-team="${t.slug}" aria-pressed="false">${esc(t.short)}</button>`).join('')}</div>
    <div class="chips" role="group" aria-label="Miesto"><button type="button" class="chip" data-f-where="" aria-pressed="true">Doma aj vonku</button><button type="button" class="chip" data-f-where="doma" aria-pressed="false">Doma</button><button type="button" class="chip" data-f-where="vonku" aria-pressed="false">Vonku</button></div>
  </div>
  <div class="cols2 cols2--list">
    <section aria-labelledby="z-prog"><h2 class="h2" id="z-prog">Program</h2>${upcoming.length ? grp(upcoming) : '<p>Ďalšie zápasy zatiaľ nie sú vyžrebované.</p>'}<p class="empty" data-empty hidden>Pre tento výber nie je naplánovaný žiadny zápas.</p></section>
    <section aria-labelledby="z-vys"><h2 class="h2" id="z-vys">Výsledky</h2>${grp(results)}<p class="empty" data-empty hidden>Pre tento výber zatiaľ nie je žiadny výsledok.</p></section>
  </div>
  <div class="cal-row">${calBox('vsetky.ics', R, 'cal-vsetky')}</div>
</div></section>`;
  },
});

function lineupHtml(l, title) {
  if (!l || (!l.start.length && !l.subs.length)) return '';
  const li = (p) => `<li><span class="ln-nr">${esc(p.nr)}</span><span>${esc(p.name)}${p.c ? ' <abbr class="cap" title="kapitán"><span aria-hidden="true">C</span><span class="sr">kapitán</span></abbr>' : ''}</span></li>`;
  return `<div class="lineup"><h3 class="h4">${esc(title)}</h3><ol class="ln">${l.start.map(li).join('')}</ol>${l.subs.length ? `<p class="ln-h">Náhradníci</p><ol class="ln ln--subs">${l.subs.map(li).join('')}</ol>` : ''}${l.coach ? `<p class="ln-coach">Tréner: ${esc(l.coach)}</p>` : ''}</div>`;
}
for (const m of matches) {
  if (m.past && !m.detail) continue;
  const name = m.home ? `${club.nazov} – ${m.opponent}` : `${m.opponent} – ${club.nazov}`;
  add(m.url, {
    title: `${name}${m.score ? ` ${m.score}` : ''}`, active: 'zapasy/', desc: `${m.teamObj.full}, ${m.comp}, ${dLong(m.date)}.`,
    body: (R) => {
      const ev = [...(m.goals || []).map((g) => ({ ...g, t: 'goal' })), ...(m.cards || []).map((c) => ({ ...c, t: 'card' })), ...((m.lineups?.subs) || []).map((s) => ({ ...s, t: 'sub' }))]
        .sort((a, b) => (parseInt(a.min, 10) || 0) - (parseInt(b.min, 10) || 0));
      const evIcon = (e) => e.t === 'goal' ? `<span class="ev-i ev-goal" aria-hidden="true">${I.ball}</span>` : e.t === 'card' ? `<span class="ev-i ev-card ev-card--${e.kind}" aria-hidden="true"></span>` : '<span class="ev-i ev-sub" aria-hidden="true"><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M2 5h11l-3-3M14 11H3l3 3"/></svg></span>';
      const evText = (e) => e.t === 'goal' ? (e.kind === 'own' ? `Vlastný gól: ${esc(e.player)}` : `Gól: ${esc(e.player)}${e.kind === 'penalty' ? ' (z penalty)' : ''}`) : e.t === 'card' ? `${e.kind === 'yellow' ? 'Žltá karta' : e.kind === 'red' ? 'Červená karta' : 'Druhá žltá a červená'}: ${esc(e.player) || 'hráč neuvedený'}` : `Striedanie: prichádza ${esc(e.in)}, odchádza ${esc(e.out)}`;
      const evSide = (e) => ((e.side === 'our') === m.home ? 'h' : 'a');
      const prevMeet = matches.filter((x) => x.oppSpace === m.oppSpace && x.id !== m.id && x.team === m.team && x.score);
      const snUrl = sn.matches.find((x) => x.id === m.id)?.url;
      return `${pageHead({ title: name, sub: `${esc(m.teamObj.full)} · ${esc(m.comp)}${m.roundName ? `, ${esc(m.roundName)}` : ''}`, R, crumbs: [['zapasy/', 'Zápasy'], [null, dShort(m.date)]] })}
<section class="sec sec--first"><div class="wrap match">
  <div class="match-card">${card(m, R, { big: true, self: true, label: m.score ? 'Konečný výsledok' : 'Zápas' })}</div>
  <div class="match-info">
    ${ev.length ? `<h2 class="h3">Priebeh</h2><ol class="evs">${ev.map((e) => `<li class="ev ev--${evSide(e)}"><span class="ev-min">${esc(e.min)}’</span>${evIcon(e)}<span>${evText(e)}<small>${esc(e.side === 'our' ? club.nazov : m.opponent)}</small></span></li>`).join('')}</ol>` : ''}
    <dl class="kv">
      <div><dt>Dátum</dt><dd>${dLong(m.date)}${m.time ? `, ${esc(m.time)}` : ''}</dd></div>
      ${m.venue ? `<div><dt>Ihrisko</dt><dd>${esc(venueName(m.venue))}</dd></div>` : ''}
      ${m.audience ? `<div><dt>Diváci</dt><dd>${num(m.audience)}</dd></div>` : ''}
      ${m.referee ? `<div><dt>Rozhodca</dt><dd>${esc(m.referee)}</dd></div>` : ''}
    </dl>
    <p class="btns">${m.score && snUrl ? `<a class="btn btn--line" href="${snUrl}" rel="noopener">${I.ext}Zápis na Sportnete</a>` : ''}${!m.past ? `<a class="btn" href="${R}kalendar/zapas-${m.id}.ics" download>${I.cal}Do kalendára</a>${m.home ? `<a class="btn btn--line" href="${mapsUrl}" rel="noopener">${I.route}Navigovať</a>` : ''}` : ''}</p>
  </div>
  ${m.lineups ? `<div class="lineups"><h2 class="h3 lineups-h">Zostavy</h2>${lineupHtml(m.home ? m.lineups.our : m.lineups.opp, m.home ? club.nazov : m.opponent)}${lineupHtml(m.home ? m.lineups.opp : m.lineups.our, m.home ? m.opponent : club.nazov)}</div>` : ''}
  ${prevMeet.length ? `<div class="meet"><h2 class="h3">Ďalšie zápasy s týmto súperom</h2>${matchList(prevMeet, R, { showTeam: false })}</div>` : ''}
</div></section>`;
    },
  });
}

add('tabulky/', {
  title: 'Tabuľky', active: 'tabulky/', desc: `Tabuľky súťaží tímov ${club.nazov} v sezóne ${SEASON}.`,
  body: (R) => `${pageHead({ title: 'Tabuľky', sub: `Ročník ${SEASON}, poradie podľa Sportnetu.`, R, crumbs: [[null, 'Tabuľky']] })}
<section class="sec sec--first"><div class="wrap">
  <nav class="toc" aria-label="Tabuľky tímov">${teams.filter((t) => t.table).map((t) => `<a href="#${t.slug}">${esc(t.short)}</a>`).join('')}</nav>
  ${teams.filter((t) => t.table).map((t) => `<section class="tsec" id="${t.slug}" aria-labelledby="h-${t.slug}">
    ${secHead(esc(t.full), `h-${t.slug}`, more(`${R}${t.url}`, 'Tím'), esc(t.leagueName))}
    ${tableHtml(t.table, R)}
  </section>`).join('')}
  ${teams.some((t) => !t.table) ? `<p class="note">${teams.filter((t) => !t.table).map((t) => esc(t.short)).join(', ')}: ${teams.filter((t) => !t.table).length > 1 ? 'prípravky hrajú' : 'prípravka hrá'} bez tabuľky.</p>` : ''}
</div></section>`,
});

add('timy/', {
  title: 'Tímy', active: 'timy/', desc: `Tímy ${club.nazov} v sezóne ${SEASON}.`,
  body: (R) => `${pageHead({ title: 'Tímy', sub: `${plural(teams.length, 'tím', 'tímy', 'tímov')} v ročníku ${SEASON}.`, R, crumbs: [[null, 'Tímy']] })}
<section class="sec sec--first"><div class="wrap">${teamRows(R)}
  <div class="join"><h2 class="h3">Nábor do mládeže</h2><p>Chcete, aby vaše dieťa hralo futbal v klube? Napíšte nám a dohodneme prvý tréning.</p><p class="btns"><a class="btn" href="mailto:${club.kontakt.email}?subject=${encodeURIComponent('Nábor do mládeže')}">${I.mail}Napísať klubu</a></p></div>
</div></section>`,
});

for (const t of teams) {
  add(t.url, {
    title: t.full, active: 'timy/', desc: `${club.nazov} – ${t.full}: ${t.leagueName}, zápasy, tabuľka a súpiska v sezóne ${SEASON}.`,
    body: (R) => {
      const list = teamMatches(t.slug);
      const nx = list.filter((m) => !m.past), rs = list.filter((m) => m.past).reverse();
      const pick = cardPick(t.slug);
      const rec = record(t.slug);
      const scs = scorers(t.slug);
      const groups = POS.map(([k, h]) => [h, t.squad.athletes.filter((a) => (k ? a.pos === k : !POS.some(([x]) => x && x === a.pos)))]).filter(([, l]) => l.length);
      const nrCount = new Map(); for (const a of t.squad.athletes) nrCount.set(a.nr, (nrCount.get(a.nr) || 0) + 1);
      const nr = (a) => (a.nr !== '' && nrCount.get(a.nr) === 1 ? a.nr : '');
      return `${pageHead({ title: t.full, sub: `${esc(t.leagueName)}${t.pos ? ` · ${t.pos}. miesto ${zo(t.of)}` : ''}${coachOf(t) ? ` · ${coachRole(t)} ${esc(coachOf(t))}` : ''}`, R, crumbs: [['timy/', 'Tímy'], [null, t.short]] })}
<section class="sec sec--first"><div class="wrap team-top">
  ${pick ? `<div>${card(pick, R, { big: true })}</div>` : ''}
  <div class="team-side">
    ${rec.n ? `<p class="stat"><b>${rec.w}–${rec.d}–${rec.l}</b><span>výhry, remízy, prehry · skóre ${rec.gf}:${rec.ga}</span></p>${formHtml(t.slug)}` : '<p>Tím v tomto ročníku zatiaľ nemá výsledky.</p>'}
    ${scs.length && t.adult ? `<h2 class="h4">Strelci</h2><ol class="scorers">${scs.slice(0, 5).map(([n, g]) => `<li><span>${esc(n)}</span><b>${g}</b></li>`).join('')}</ol>` : ''}
    ${calBox(`${t.slug}.ics`, R, `cal-${t.slug}`)}
  </div>
</div></section>
<section class="sec" aria-labelledby="tz-h"><div class="wrap">
  ${secHead('Zápasy', 'tz-h')}
  <div class="cols2">
    <div><h3 class="h3">Program</h3>${nx.length ? matchList(nx, R, { showTeam: false }) : '<p>Ďalšie zápasy zatiaľ nie sú vyžrebované.</p>'}</div>
    <div><h3 class="h3">Výsledky</h3>${rs.length ? matchList(rs, R, { showTeam: false }) : '<p>Tím v tomto ročníku ešte nehral.</p>'}</div>
  </div>
</div></section>
${t.table ? `<section class="sec" aria-labelledby="tt-h"><div class="wrap">${secHead('Tabuľka', 'tt-h', '', esc(t.leagueName))}${tableHtml(t.table, R)}</div></section>` : ''}
${t.squad.athletes.length || t.squad.crew.length ? `<section class="sec" aria-labelledby="ts-h"><div class="wrap">
  ${secHead('Súpiska', 'ts-h')}
  ${groups.map(([h, l]) => `<h3 class="h4 sq-h">${h}</h3><ul class="squad">${l.sort((a, b) => a.name.split(' ').at(-1).localeCompare(b.name.split(' ').at(-1), 'sk')).map((a) => `<li><span class="sq-nr" aria-hidden="true">${esc(nr(a))}</span><span>${esc(a.name)}${a.captain && t.adult ? ' <abbr class="cap" title="kapitán"><span aria-hidden="true">C</span><span class="sr">kapitán</span></abbr>' : ''}</span>${nr(a) ? `<span class="sr">, číslo ${nr(a)}</span>` : ''}</li>`).join('')}</ul>`).join('')}
  ${t.squad.crew.length ? `<h3 class="h4 sq-h">Realizačný tím</h3><ul class="crew">${t.squad.crew.map((c) => `<li><span class="crew-r">${esc(crewRole[c.role] || crewRole.other)}</span><span>${esc(c.name)}</span></li>`).join('')}</ul>` : ''}
  <p class="note">Hráči, ktorí v roku ${sn.updated.slice(0, 4)} nastúpili alebo boli v nominácii (Sportnet).${t.adult ? '' : ' Pri mládeži len mená.'}</p>
</div></section>` : ''}`;
    },
  });
}

add('kontakt/', {
  title: 'Kontakt', active: 'kontakt/', desc: `Kontakt na ${club.nazov}: e-mail, sídlo a ihrisko.`,
  body: (R) => `${pageHead({ title: 'Kontakt', R, crumbs: [[null, 'Kontakt']] })}
<section class="sec sec--first"><div class="wrap contact">
  <div>
    <p class="contact-mail"><a href="mailto:${club.kontakt.email}">${esc(club.kontakt.email).replace('@', '<wbr>@')}</a></p>
    <dl class="kv">
      <div><dt>Klub</dt><dd>${esc(club.pravnyNazov || club.nazov)}</dd></div>
      <div><dt>Adresa</dt><dd>${club.adresa.map(esc).join(', ')}</dd></div>
      <div><dt>Ihrisko</dt><dd>${esc(ST.nazov)}</dd></div>
    </dl>
    <p class="btns"><a class="btn" href="${mapsUrl}" rel="noopener">${I.route}Google Mapy</a><a class="btn btn--line" href="${mapyUrl}" rel="noopener">${I.pin}Mapy.com</a></p>
  </div>
  <ul class="links">
    <li><a href="${club.sportnetUrl}" rel="noopener">Klub na Sportnete</a></li>
    ${club.kontakt.facebook ? `<li><a href="${club.kontakt.facebook}" rel="noopener">Facebook</a></li>` : ''}
    ${(SKIN.links || []).map(([u, t]) => `<li><a href="${u}" rel="noopener">${esc(t)}</a></li>`).join('')}
  </ul>
</div></section>`,
});

add('ochrana-sukromia/', {
  title: 'Ochrana súkromia', desc: `Ako web ${club.nazov} pracuje s údajmi.`,
  body: (R) => `${pageHead({ title: 'Ochrana súkromia', R, crumbs: [[null, 'Ochrana súkromia']] })}
<section class="sec sec--first"><div class="wrap prose">
  <p>Web nepoužíva cookies, analytiku ani reklamné nástroje a nenačítava nič z iných serverov.</p>
  <p>Mená hráčov, trénerov a rozhodcov, výsledky, strelcov, karty a počty divákov preberáme z verejného systému Sportnet (Futbalnet). Vek hráčov nezverejňujeme, pri mládeži uvádzame len mená a zostavy len pri dospelých.</p>
  <p>Opravu alebo odstránenie údajov si môžete vyžiadať na <a href="mailto:${club.kontakt.email}">${esc(club.kontakt.email)}</a>.</p>
</div></section>`,
});

add('404/', {
  title: 'Stránka sa nenašla',
  body: (R) => `${pageHead({ title: 'Stránka sa nenašla', sub: 'Adresa je chybná alebo sa stránka presunula.', R })}
<section class="sec sec--first"><div class="wrap"><p class="btns"><a class="btn" href="${R}">Na úvod</a><a class="btn btn--line" href="${R}zapasy/">Zápasy</a></p></div></section>`,
});

const SKIN = {
  nav: 'bar', theme: '#1d6fb8', brand: 'TJ Slovan Rovnosť Krajné', brandSub: 'futbal od roku 1934',
  fonts: ['big-shoulders-display-800.woff', 'lora-400.woff', 'lora-600.woff'],
  sources: 'História klubu podľa webu obce Krajné a Krajnianskych novín.',
  adminHero: 'Dva postupy za sebou',
  adminFacts: club.kronika.zoznam.map((x) => ({ k: x.rok, t: x.text })),
  links: [[club.obecKlub, 'Klub na webe obce']],
};
const NAV = [['zapasy/', 'Zápasy'], ['tabulky/', 'Tabuľky'], ['timy/', 'Tímy'], ['klub/', 'Klub'], ['kontakt/', 'Kontakt']];
const DESC = `${club.nazov} – futbal v Krajnom od roku ${club.zalozenie}. Zápasy, výsledky, tabuľky a súpisky áčka (${A.leagueName}), dorastu a žiakov. Dva postupy za sebou: 2024/25 a 2025/26.`;

add('', {
  title: `futbal od roku ${club.zalozenie}`, active: '', bodyClass: 'home',
  body: (R) => {
    const n = nextA;
    const rows = A.table?.rows || [];
    const me = rows.find((r) => r.our);
    const lead = rows[0];
    const gap = me && lead && !lead.our ? lead.pts - me.pts : null;
    const lead2 = lead?.our ? me.pts - rows[1].pts : 0;
    const gapTxt = !me ? '' : lead?.our ? `na čele, ${lead2} ${pw(lead2, 'bod', 'body', 'bodov')} pred druhým` : `${gap} ${pw(gap, 'bod', 'body', 'bodov')} za lídrom, ${glueAbbr(esc(lead.name))}`;
    const titles = club.rocniky.zoznam.filter((x) => x.titul).slice(-2);
    const wl = winterLine();
    return `<section class="kr-top"><div class="wrap kr-top-in">
  <h1 class="kr-h1">TJ Slovan Rovnosť Krajné</h1>
  ${me ? `<p class="kr-pos"><span class="kr-n">${me.pos}.</span><span class="kr-pos-t">miesto ${zo(rows.length)}<small>${esc(A.leagueName)}, ${gapTxt}</small></span></p>` : ''}
  <p class="kr-p">Po dvoch postupoch za sebou hrá áčko prvý rok krajskú súťaž.</p>
</div></section>
<section class="sec sec--first"><div class="wrap kr-grid">
  ${A.table ? `<section class="kr-table" aria-labelledby="t-h">
    <h2 class="kr-h2" id="t-h">${esc(A.leagueName)} <span>po ${me ? me.played : ''} ${pw(me ? me.played : 0, 'zápase', 'zápasoch', 'zápasoch').replace(/^\d+ /, '')}</span></h2>
    ${tableHtml(A.table, R)}
    ${more(`${R}tabulky/`, 'Tabuľky dorastu a žiakov')}
  </section>` : ''}
  <aside class="kr-side">
    ${n ? `<section class="kr-next" aria-labelledby="n-h">
      <h2 class="kr-h2" id="n-h">Najbližšie</h2>
      <p class="kr-next-o">${n.home ? 'Krajné – ' : ''}${glueAbbr(esc(n.opponent))}${n.home ? '' : ' – Krajné'}</p>
      <p class="kr-meta"><time datetime="${n.date}">${dLong(n.date)}</time>${n.time ? `, ${esc(n.time)}` : ''} · ${n.home ? 'doma' : 'vonku'}</p>
      ${wl ? '<p class="kr-meta">Po zimnej prestávke.</p>' : `<p class="kr-meta"><span class="cd" data-kickoff="${isoLocal(n.date, n.time)}" hidden></span></p>`}
      <p class="btns"><a class="btn" href="${R}kalendar/zapas-${n.id}.ics" download>${I.cal}Do kalendára</a></p>
    </section>` : ''}
    <section aria-labelledby="r-h"><h2 class="kr-h2" id="r-h">Výsledky</h2>${fxList(homeRes(5), R)}${more(`${R}zapasy/#z-vys`, 'Všetky výsledky')}</section>
    <section aria-labelledby="p-h"><h2 class="kr-h2" id="p-h">Program</h2>${homeUp(4, nextA).length ? fxList(homeUp(4, nextA), R) : '<p>Ďalšie zápasy zatiaľ nie sú vyžrebované.</p>'}${more(`${R}zapasy/`, 'Všetky zápasy')}</section>
  </aside>
</div></section>
${titles.length ? `<section class="sec sec--blue" aria-labelledby="u-h"><div class="wrap">
  <h2 class="kr-h2 kr-h2--inv" id="u-h">Dva postupy za sebou</h2>
  <ol class="kr-ups">${titles.map((x) => `<li><span class="kr-up-y">${esc(x.rok)}</span><span class="kr-up-l">${esc(x.liga)}</span><span class="kr-up-n">${x.skore}</span><span class="kr-up-s">${esc(x.pozn || '')}</span></li>`).join('')}</ol>
  ${more(`${R}klub/`, 'Klub od roku 1934')}
</div></section>` : ''}`;
  },
});

add('klub/', {
  title: 'Klub', active: 'klub/', desc: `${club.nazov}: futbal od roku ${club.zalozenie}, KŠK Krajné v modro-bielych dresoch, dva postupy za sebou 2024/25 a 2025/26, ročníky áčka, ihrisko a obec.`,
  body: (R) => `${pageHead({ title: 'Klub', sub: `${esc(club.pravnyNazov)}, založená v roku ${club.zalozenie}. Klubové farby: ${esc(club.farby)}.`, R, crumbs: [[null, 'Klub']] })}
<section class="sec sec--first"><div class="wrap cols2">
  <div><h2 class="h2">Od roku 1934</h2>${facts(club.kronika.zoznam.map((x) => ({ k: x.rok, t: x.text })))}</div>
  <div><h2 class="h2">Ročníky áčka</h2>${seasonsTable(club.rocniky.zoznam)}
    <h2 class="h2 h2--gap">Úspechy</h2>${facts(club.uspechy.map((u) => ({ k: u.rok, t: u.text })))}</div>
</div></section>
<section class="sec sec--tint"><div class="wrap cols2">
  <div><h2 class="h2">${esc(ST.nazov)}</h2>${facts(ST.fakty)}</div>
  <div><h2 class="h2">Krajné</h2>${facts(club.obec.fakty)}<p class="note">Zdroje: web obce Krajné (TJ Slovan Rovnosť Krajné, História, Symboly), Krajnianske noviny 4/2025, Sportnet.</p></div>
</div></section>`,
});

// ---- kalendár (.ics, RFC 5545) ----------------------------------------------------------------
const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const icsFold = (line) => {
  const out = []; let cur = '';
  for (const ch of line) { if (Buffer.byteLength(cur + ch) > 74) { out.push(cur); cur = ' ' + ch; } else cur += ch; }
  out.push(cur);
  return out.join('\r\n');
};
const VTZ = ['BEGIN:VTIMEZONE', 'TZID:Europe/Bratislava',
  'BEGIN:DAYLIGHT', 'TZOFFSETFROM:+0100', 'TZOFFSETTO:+0200', 'TZNAME:CEST', 'DTSTART:19700329T020000', 'RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=-1SU', 'END:DAYLIGHT',
  'BEGIN:STANDARD', 'TZOFFSETFROM:+0200', 'TZOFFSETTO:+0100', 'TZNAME:CET', 'DTSTART:19701025T030000', 'RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=-1SU', 'END:STANDARD',
  'END:VTIMEZONE'];
function ics(list, calName) {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const events = list.map((m) => {
    const us = m.teamObj.adult ? club.nazov : `${club.nazov} ${m.teamObj.short}`;
    const [h, a] = m.home ? [us, m.opponent] : [m.opponent, us];
    const d = m.date.replace(/-/g, '');
    const t = (m.time || '').slice(0, 5);
    const when = t ? [`DTSTART;TZID=Europe/Bratislava:${d}T${t.replace(':', '')}00`, 'DURATION:PT2H'] : [`DTSTART;VALUE=DATE:${d}`];
    const desc = [m.comp + (m.roundName ? `, ${m.roundName}` : ''), m.home ? 'Domáci zápas' : 'Zápas vonku'].join('\n');
    return ['BEGIN:VEVENT', `UID:zapas-${m.id}@${config.sportnet.club}.sportnet`, `DTSTAMP:${stamp}`, ...when,
      `SUMMARY:${icsEsc(`${m.teamObj.short}: ${h} – ${a}${m.score ? ` ${m.score}` : ''}`)}`,
      `DESCRIPTION:${icsEsc(desc)}`, m.venue && `LOCATION:${icsEsc(venueName(m.venue))}`, 'END:VEVENT'].filter(Boolean);
  });
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${club.nazov}//Zapasy//SK`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEsc(calName)}`, 'X-WR-TIMEZONE:Europe/Bratislava', ...VTZ, ...events.flat(), 'END:VCALENDAR'].map(icsFold).join('\r\n') + '\r\n';
}

// ---- ukážka administrácie (dist/admin/demo.json pre src/admin/admin.js) ------------------------------
function writeAdminDemo() {
  // rovnaký tvar dát ako administrácia OK Častkovce (src/admin/admin.js je spoločný základ)
  const R = '../';
  const snById = Object.fromEntries(sn.matches.map((m) => [m.id, m]));
  const people = (t) => t.squad.athletes.map((a) => ({ name: a.name, number: a.nr === '' ? '' : String(a.nr), role: '', photo: null }));
  const demo = {
    club: { nazov: club.nazov, crest: `${R}img/erb-128.webp` },
    updated: sn.updated, season: sn.season,
    teams: teams.map((t) => ({ slug: t.slug, short: t.short, sub: t.adult ? 'Muži' : t.sub })),
    matches: matches.map((m) => ({
      id: m.id, team: m.team, date: m.date, time: m.time, home: m.home, opponent: m.opponent, competition: m.comp, part: '',
      round: (/\d+/.exec(m.round) || [''])[0], played: m.past, score: m.score, goals: m.goals || [], cards: m.cards || [],
      venue: venueName(m.venue || ''), url: snById[m.id]?.url || null, gallery: null, video: null,
    })),
    rosters: Object.fromEntries(teams.map((t) => [t.slug, people(t).map(({ name, number, photo }) => ({ name, number, photo }))])),
    news: [],
    info: {
      nazov: club.nazov, pravnyNazov: club.pravnyNazov, adresa: club.adresa, osoba: '', telefon: '', email: club.kontakt.email,
      facebook: club.kontakt.facebook || '', ico: '', ucet: '', stadion: { nazov: ST.nazov, kapacita: '', rozmery: '', vip: '' },
    },
    allTeams: teams.map((t) => ({
      slug: t.slug, short: t.short, sub: t.adult ? 'Muži' : t.sub, league: t.leagueName, url: t.url, photo: null,
      groups: [{ title: 'Hráči', people: people(t) }, { title: 'Realizačný tím', people: t.squad.crew.map((c) => ({ name: c.name, number: '', role: crewRole[c.role] || crewRole.other, photo: null })) }],
    })),
    coaches: [],
    pages: {
      historia: { title: 'Klub', url: 'klub/', html: `<ul>${(SKIN.adminFacts || []).map((h) => `<li><b>${esc(h.k)}</b> – ${esc(h.t)}</li>`).join('')}</ul>` },
      rocniky: { title: 'Ročníky áčka', url: 'klub/', html: `<ul>${(club.rocniky?.zoznam || []).map((x) => `<li>${esc(x.rok)} ${esc(x.liga)}: ${x.poz ? `${x.poz}. miesto` : 'bez umiestnenia'}</li>`).join('')}</ul>` },
      'ochrana-sukromia': { title: 'Ochrana súkromia', url: 'ochrana-sukromia/', html: '<p>Web nepoužíva cookies, analytiku ani reklamné nástroje.</p>' },
    },
    home: {
      heroTitle: club.nazov, heroText: `${SKIN.adminHero || club.nazov}. Áčko hrá ${acc(A.leagueName)}.`, hero: null,
      stadion: { title: ST.nazov, text: (ST.fakty || []).map((u) => u.text || u.t).join(' ') },
    },
    galleries: [], videos: [], fanshop: { pozn: '', email: club.kontakt.email, produkty: [] }, partners: [],
  };
  fs.writeFileSync(path.join(OUT, 'admin', 'demo.json'), JSON.stringify(demo));
}

// ---- zápis -------------------------------------------------------------------------------------
// obsah dist/ sa maže po súboroch: koreň môže držať náhľadový server (fs.watch) alebo otvorený terminál
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.rmSync(path.join(OUT, f), { recursive: true, force: true });
const copy = (from, to) => { if (fs.existsSync(from)) fs.cpSync(from, to, { recursive: true }); };
copy(path.join(SRC, 'img'), path.join(OUT, 'img'));
copy(path.join(SRC, 'fonts'), path.join(OUT, 'fonts'));
copy(path.join(SRC, 'js'), path.join(OUT, 'js'));
copy(path.join(ROOT, 'media', 'foto-web'), path.join(OUT, 'foto'));
if (config.adminDemo !== false && fs.existsSync(path.join(SRC, 'admin', 'index.html'))) { copy(path.join(SRC, 'admin'), path.join(OUT, 'admin')); writeAdminDemo(); }
fs.rmSync(path.join(OUT, 'fonts', 'fonts.css'), { force: true });
fs.mkdirSync(path.join(OUT, 'css'), { recursive: true });
const fontsCss = fs.readFileSync(path.join(SRC, 'fonts', 'fonts.css'), 'utf8').replace(/url\(([^)]+)\)/g, 'url(../fonts/$1)');
fs.writeFileSync(path.join(OUT, 'css', 'site.css'), fontsCss + fs.readFileSync(path.join(SRC, 'css', 'site.css'), 'utf8'));

// slovenská sadzba v texte stránok (nie v <script>, <style> ani v atribútoch): jednopísmenová predložka alebo spojka
// nezostane na konci riadka („v Trenčíne“), skóre „1 : 0“, čísla „2 730“, dátumy, „V. liga“ a „1. miesto“ sa nerozdelia
const NB = ' ';
const typo = (html) => html.split(/(<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>)/).map((part, i) => (i % 2 ? part : part.replace(/>([^<]+)</g, (m, t) => '>' + t
  .replace(/(?<=^|[\s(„])([AaIiKkOoSsUuVvZz])[ \t]+(?=\S)/g, `$1${NB}`)
  .replace(/(?<=^|[\s(])(zo|vo|so|ku) (?=\S)/g, `$1${NB}`) // „zo 16“, „vo IV. lige“
  .replace(/ · /g, `${NB}· `) // oddeľovač „·“ nezačne riadok
  .replace(/(\d) : (\d)/g, `$1${NB}:${NB}$2`)
  .replace(/ - /g, ' – ') // spojovník medzi medzerami (názvy klubov a ihrísk zo Sportnetu) -> pomlčka
  .replace(/\b(U\d{1,2}) ([A-D])\b/g, `$1${NB}$2`) // „U15 A“ sa nerozdelí
  .replace(/([a-záäčďéíĺľňóôŕšťúýž]) (U\d{1,2})\b/g, `$1${NB}$2`) // „dorast U19“, „prípravky U11“ sa nerozdelí
  .replace(/(\d) (?=(?:rok|roky|rokov|rokoch|divák|diváci|divákov|bod|body|bodov|tím|tímy|tímov|mužstiev|vzorkami|m²|výhra|výhry|výhier|výhrami|prehra|prehry|prehier|víťazstiev|zápasov|gólov)(?![a-záäčďéíĺľňóôŕšťúýž]))/g, `$1${NB}`) // „400 divákov“, „23 rokov“
  .replace(/(?<=^|[\s(])(po|ut|st|št|pi|so|ne) (?=\d{1,2}\.)/g, `$1${NB}`) // „ne 15. 11.“
  .replace(/(\d\.) (?=(?:kol[oae]|miest[oea])\b)/g, `$1${NB}`)
  .replace(/(?<![\d.])(\d{1,2}\.) (?=[a-záäčďéíĺľňóôŕšťúýž])/g, `$1${NB}`) // „14. storočia“, „3. mieste“ (radová číslovka s podstatným menom)
  .replace(/(?<=^|[\s(])sv\. (?=\S)/g, `sv.${NB}`) // „sv. Juraja“
  .replace(/(\d\.) (?=[A-D] tried)/g, `$1${NB}`) // „1. A triedu“
  .replace(/\bpred n\. l\./g, `pred${NB}n.${NB}l.`)
  .replace(/\b(\d{1,2}\.) (?=(?:\d{1,2}\.|januára|februára|marca|apríla|mája|júna|júla|augusta|septembra|októbra|novembra|decembra)(?!\d))/g, `$1${NB}`) // „7. marca“, „15. 11.“
  .replace(/\b([IVX]{1,4}\.) (?=lig)/g, `$1${NB}`) // „V. liga“
  .replace(/\b(\d{3}) (\d{2})\b/g, `$1${NB}$2`) // PSČ 913 11
  .replace(/(\d) (\d{3})(?!\d)/g, `$1${NB}$2`) + '<'))).join('');
for (const p of pages) {
  const depth = p.route.split('/').filter(Boolean).length;
  const R = depth ? '../'.repeat(depth) : './';
  const html = typo(layout({ ...p, body: p.body(R) }));
  const file = path.join(OUT, p.route, 'index.html');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
}
// GitHub Pages: 404 v koreni (absolútne cesty, lebo sa zobrazuje na ľubovoľnej adrese)
const BASE = process.env.BASE_PATH || config.basePath || '/';
const notFound = fs.readFileSync(path.join(OUT, '404', 'index.html'), 'utf8').replace(/(href|src|data-root)="(\.\.\/)+/g, `$1="${BASE}`);
fs.writeFileSync(path.join(OUT, '404.html'), notFound);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');
fs.writeFileSync(path.join(OUT, '.gitattributes'), '*.ics -text\n'); // RFC 5545 chce CRLF, git na Windowse by ho zmenil

// kalendáre .ics: každý tím, všetky zápasy a jednotlivé budúce zápasy
fs.mkdirSync(path.join(OUT, 'kalendar'), { recursive: true });
for (const t of teams) fs.writeFileSync(path.join(OUT, 'kalendar', `${t.slug}.ics`), ics(teamMatches(t.slug), `${club.nazov} – ${t.full}`));
fs.writeFileSync(path.join(OUT, 'kalendar', 'vsetky.ics'), ics(matches, `${club.nazov} – všetky zápasy`));
for (const m of upcoming) fs.writeFileSync(path.join(OUT, 'kalendar', `zapas-${m.id}.ics`), ics([m], `${club.nazov} – ${m.teamObj.full}`));
console.log(`Hotovo: ${pages.length} stránok -> dist/ (dnes = ${TODAY})`);
