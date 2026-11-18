// Všetky údaje o súťažiach zo Sportnetu (Futbalnet, verejné API súťaží) -> data/sportnet.json
//   node scripts/sportnet.mjs            – aktuálna sezóna; detail zápasu (góly, karty, zostavy) len pre zápasy, ktoré ho ešte nemajú
//   FULL=1 node scripts/sportnet.mjs     – stiahne znova aj detaily už uložených zápasov
//   node scripts/sportnet.mjs --if-due   – len ak sa podľa rozpisu nejaký zápas skončil a chýba jeho výsledok (GitHub Actions)
// Zdroj: https://sutaze.api.sportnet.online/api/v2 (bez kľúča, rovnaké údaje ako sportnet.sme.sk/futbalnet/k/<klub>/).
// Klub sa nastavuje v config.json (sportnet.appSpace); tímy sa pomenujú samy podľa názvu na Sportnete.
// Súkromie: vek hráčov sa neukladá; zostavy (nominácie) len pri dospelých tímoch.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'data', 'sportnet.json');
const config = JSON.parse(fs.readFileSync(path.join(ROOT, 'config.json'), 'utf8'));
const API = 'https://sutaze.api.sportnet.online/api/v2';
const SPACE = config.sportnet.appSpace;
const FULL = !!process.env.FULL;

async function get(url, tries = 3) {
  for (let i = 1; ; i++) {
    try {
      const r = await fetch(API + url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(25000) });
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      return await r.json();
    } catch (e) {
      if (i >= tries) throw e;
      await new Promise((ok) => setTimeout(ok, 1500 * i));
    }
  }
}
const pause = (ms = 150) => new Promise((ok) => setTimeout(ok, ms)); // šetrne k API

// dátum a čas výkopu v slovenskom čase (Sportnet dáva UTC)
const local = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Bratislava', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });
const toLocal = (iso) => { const [d, t] = local.format(new Date(iso)).split(' '); return { date: d, time: t }; };
const minute = (t) => (t ? String(t).replace(/:00$/, '').replace(/^0(?=\d)/, '') : '');
const CARD = { yellow_card: 'yellow', red_card: 'red', second_yellow_card: 'yellow-red', yellow_red_card: 'yellow-red' };
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// „Dospelí (A)“ -> a-muzstvo / A-mužstvo, „U15 - Starší žiaci (A)“ -> u15-starsi-ziaci / U15 Starší žiaci;
// písmeno (B) sa nechá v názve, len ak má klub v rovnakej kategórii aj (A)
function teamNames(t, all) {
  const over = config.sportnet.teams?.[t.displayName];
  const m = /^(U\d+)\s*-\s*([^()]+?)\s*(?:\((\w)\))?$/.exec(t.displayName);
  let slug, short, sub, order;
  if (t.ageCategory === 'ADULTS' || /^Dospelí/.test(t.displayName)) {
    const cat = (/\((\w)\)/.exec(t.displayName)?.[1] || t.category || 'A').toUpperCase();
    slug = `${cat.toLowerCase()}-muzstvo`; short = `${cat}-mužstvo`; sub = 'Muži'; order = cat.charCodeAt(0) - 65;
  } else if (m && t.gender === 'F') {
    // dievčatá: Sportnet im dáva rovnaký názov ako chlapcom („U19 - Starší dorast“), líšia sa len poľom gender
    const age = m[1].replace(/^U0/, 'U');
    const F = { 'Starší dorast': 'Staršie dorastenky', 'Mladší dorast': 'Mladšie dorastenky', 'Starší žiaci': 'Staršie žiačky', 'Mladší žiaci': 'Mladšie žiačky' };
    slug = norm(`${age} dievcata${m[3] ? ' ' + m[3] : ''}`); short = `${age} dievčatá${m[3] ? ` ${m[3]}` : ''}`; sub = F[m[2].trim()] || m[2].trim();
    order = 100 - Number(age.slice(1)) + 0.8;
  } else if (m) {
    // dvojička = rovnaká kategória s písmenom (B); A-tím má na Sportnete písmeno len niekedy („U19 - Starší dorast“ + „… (B)“)
    // dievčenské tímy s rovnakým názvom sa za dvojičku nepočítajú
    const base = (s) => s.replace(/\s*\(\w\)\s*$/, '').trim();
    const twin = all.some((o) => o !== t && o.gender !== 'F' && base(o.displayName) === base(t.displayName));
    const age = m[1].replace(/^U0/, 'U'), letter = m[3] || (twin ? 'A' : '');
    slug = norm(`${age} ${m[2]}${twin ? ' ' + letter : ''}`); short = age + (twin ? ` ${letter}` : ''); sub = m[2].trim();
    order = 100 - Number(age.slice(1)) + (letter && letter !== 'A' ? (letter.charCodeAt(0) - 65) * 0.25 : 0);
  } else {
    slug = norm(t.displayName); short = t.displayName; sub = ''; order = 200;
  }
  return { slug, short, sub, order, adult: t.ageCategory === 'ADULTS' || /^Dospelí/.test(t.displayName), ...over };
}

const prev = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, 'utf8')) : { matches: [] };
const prevById = new Map((prev.matches || []).map((m) => [m.id, m]));
const today = process.env.NOW ? new Date(process.env.NOW) : new Date(); // NOW=2026-11-08T15:30 na skúšku

// --if-due: Sportnet sa kontaktuje, len keď sa podľa uloženého rozpisu nejaký zápas skončil a jeho výsledok ešte nemáme
// (od 1 h 40 min po výkope do 14 h; neskôr ho zachytí denné úplné stiahnutie). Inak skončí bez sťahovania.
if (process.argv.includes('--if-due')) {
  const kickoff = (m) => {
    const [y, mo, d] = m.date.split('-').map(Number), [h, mi] = (m.time || '12:00').split(':').map(Number);
    const guess = Date.UTC(y, mo - 1, d, h, mi);
    const [ld, lt] = local.format(new Date(guess)).split(' ');
    const shown = Date.UTC(...ld.split('-').map((x, i) => Number(x) - (i === 1 ? 1 : 0)), ...lt.split(':').map(Number));
    return guess - (shown - guess);
  };
  const now = today.getTime();
  const due = (prev.matches || []).filter((m) => (!m.played || !m.detail) && now >= kickoff(m) + 100 * 6e4 && now <= kickoff(m) + 14 * 36e5);
  if (!due.length) { console.log('Sportnet: žiadny skončený zápas bez výsledku, nesťahujem'); process.exit(0); }
  console.log(`Sportnet: na kontrolu ${due.map((m) => `${m.team} ${m.date} ${m.time} ${m.opponent}`).join('; ')}`);
}

const { teams: allTeams } = await get(`/public/${SPACE}/teams?limit=300`);
const withSeason = allTeams.filter((t) => t.season);
const season = withSeason.map((t) => t.season).find((s) => new Date(s.dateFrom) <= today && today <= new Date(s.dateTo));
if (!season) throw new Error('Sportnet: nenašla sa aktuálna sezóna');
// mládež hrá súťaže krajského/oblastného zväzu: sezóna má iné _id, ale rovnaký názov (2026/2027)
const current = withSeason.filter((t) => t.season.name === season.name);

const teams = [];
const matches = [];
const tables = {};
const logos = new Map(); // appSpace -> názov klubu (erby stiahne scripts/logos.py)
logos.set(SPACE, current[0]?.name?.replace(/\s+B$/, '') || SPACE);
let details = 0;

const lineup = (nom) => {
  const ath = (nom?.athletes || []).map((a) => ({ name: a.sportnetUser?.name || '', nr: a.additionalData?.nr ?? '', pos: a.additionalData?.position || '', c: !!a.additionalData?.captain, sub: !!a.additionalData?.substitute }));
  const coach = (nom?.crew || []).find((c) => c.position === 'coach')?.sportnetUser?.name || '';
  return { start: ath.filter((a) => !a.sub), subs: ath.filter((a) => a.sub), coach };
};

for (const t of current) {
  const names = teamNames(t, current);
  const team = { ...names, id: t._id, sportnetName: t.displayName, union: t.season.appSpace, competitions: [], squad: { athletes: [], crew: [] } };
  teams.push(team);

  // súpiska: hráči nominovaní v tomto kalendárnom roku + realizačný tím (vek sa zámerne neukladá)
  try {
    const sq = await get(`/public/${SPACE}/teams/${t._id}/squad`);
    const seen = new Set();
    team.squad.athletes = (sq.athletes || []).map((a) => ({ id: a.sportnetUser?._id, name: a.sportnetUser?.name || '', nr: a.additionalData?.nr ?? '', pos: a.additionalData?.position || '', captain: !!a.additionalData?.captain }))
      .filter((a) => a.name && !seen.has(a.id) && seen.add(a.id));
    const seenC = new Set();
    team.squad.crew = (sq.crew || []).map((c) => ({ name: c.sportnetUser?.name || '', role: c.position || '' }))
      .filter((c) => c.name && !seenC.has(c.name + c.role) && seenC.add(c.name + c.role));
  } catch (e) { console.warn(`Sportnet: súpiska ${t.displayName} nedostupná (${e.message})`); }
  await pause();

  const list = (await get(`/futbalnet/matches?teamIds=${t._id}&limit=300`)).matches || [];
  for (const m of list) {
    const home = m.homeTeam?._id === t._id;
    const opp = home ? m.awayTeam : m.homeTeam;
    const { date, time } = toLocal(m.startDate);
    const played = m.matchState === 'ODOHRATY';
    const old = prevById.get(m._id);
    if (opp?.appSpace) logos.set(opp.appSpace, opp.name);
    const compKey = `${m.competition?._id}/${m.competitionPart?._id}`;
    if (m.competition?._id && !team.competitions.some((c) => c.key === compKey)) {
      team.competitions.push({ key: compKey, competitionId: m.competition._id, partId: m.competitionPart?._id, name: m.competition.name, part: m.competitionPart?.name || '', cup: /cup|pohár/i.test(`${m.competition.name} ${m.competitionPart?.name}`) });
    }
    const row = {
      id: m._id, team: names.slug, date, time, home, opponent: opp?.name || '', oppSpace: opp?.appSpace || '', comp: compKey,
      competition: m.competition?.name || '', round: m.round?.name || '', played,
      score: null, goals: [], cards: [], venue: old?.venue || '', url: old?.url || null,
    };
    if (played && typeof m.homeTeam?.score === 'number' && typeof m.awayTeam?.score === 'number') row.score = `${m.homeTeam.score}:${m.awayTeam.score}`;
    if (!played && m.sportGround?.name) row.venue = m.sportGround.name;
    // detail (zápis o stretnutí): góly, karty, ihrisko, zostavy; stiahne sa raz, potom sa berie z uloženého súboru
    if (played && (FULL || !old?.detail)) {
      const d = await get(`/matches/${m._id}`);
      details++;
      const ev = d.protocol?.events || [];
      const side = (teamId) => (teamId === t._id ? 'our' : 'opp');
      // vlastný gól má v API typ „dropped“ (tím = tím hráča, gól sa počíta súperovi); „goal_own“ ostáva pre istotu
      row.goals = ev.filter((e) => e.eventType === 'goal').map((e) => ({ min: minute(e.eventTime), player: e.player?.name || '', side: side(e.team), kind: e.type === 'dropped' || e.type === 'goal_own' ? 'own' : e.type === 'goal_penalty' ? 'penalty' : 'goal' }));
      row.cards = ev.filter((e) => CARD[e.eventType]).map((e) => ({ min: minute(e.eventTime), player: e.player?.name || '', side: side(e.team), kind: CARD[e.eventType] }));
      if (Array.isArray(d.score) && d.score.length === 2) row.score = `${d.score[0]}:${d.score[1]}`;
      if (Array.isArray(d.scoreByPhases) && d.scoreByPhases[0]?.length === 2) row.half = d.scoreByPhases[0].join(':');
      row.venue = d.sportGround?.name || row.venue;
      row.url = /^https:\/\/sportnet\.sme\.sk\//.test(d.detailUrl || '') ? d.detailUrl : null;
      row.referee = (d.managers || []).find((x) => /^Rozhodca$/i.test(x.type?.value || ''))?.user?.name || '';
      if (Number(d.protocol?.audience) > 0) row.audience = Number(d.protocol.audience); // počet divákov zo zápisu
      if (names.adult) {
        const ourNom = (d.nominations || []).find((n) => n.teamId === t._id), oppNom = (d.nominations || []).find((n) => n.teamId !== t._id);
        const subs = ev.filter((e) => e.eventType === 'substitution').map((e) => ({ min: minute(e.eventTime), out: e.player?.name || '', in: e.replacement?.name || '', side: side(e.team) }));
        row.lineups = { our: lineup(ourNom), opp: lineup(oppNom), subs };
      }
      row.detail = true;
      await pause();
    } else if (old?.detail) {
      for (const k of ['goals', 'cards', 'venue', 'url', 'half', 'referee', 'lineups', 'audience']) if (old[k] !== undefined) row[k] = old[k];
      row.detail = true;
    }
    matches.push(row);
  }
  await pause();
}

// tabuľky súťaží (nie pohár, nie prípravky bez výsledkov)
for (const team of teams) {
  for (const c of team.competitions) {
    if (c.cup || tables[c.key]) continue;
    try {
      const { results } = await get(`/public/competitions/${c.competitionId}/parts/${c.partId}/results`);
      if (!results?.length || results.every((r) => !r.stats?.matches?.played)) continue;
      tables[c.key] = {
        name: c.name, part: c.part, team: team.slug,
        rows: results.map((r, i) => {
          const sp = r.team?.organization?._id || '';
          if (sp) logos.set(sp, r.team.organization.name || r.team.name);
          return { pos: i + 1, name: r.team?.name || '', space: sp, our: sp === SPACE, played: r.stats?.matches?.played ?? 0, won: r.stats?.matches?.won ?? 0, draw: r.stats?.matches?.draw ?? 0, lost: r.stats?.matches?.lost ?? 0, gf: r.stats?.goals?.given ?? 0, ga: r.stats?.goals?.received ?? 0, pts: r.stats?.points ?? 0, out: !!r.team?.resignation };
        }),
      };
    } catch (e) { console.warn(`Sportnet: tabuľka ${c.name} nedostupná (${e.message})`); }
    await pause();
  }
}

teams.sort((a, b) => a.order - b.order);
matches.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time) || a.team.localeCompare(b.team));
const out = {
  source: 'Sportnet / Futbalnet', appSpace: SPACE, season: season.name, updated: new Date().toISOString(),
  teams, matches, tables, clubs: Object.fromEntries([...logos].sort()),
};
const strip = (o) => JSON.stringify({ ...o, updated: 0 });
const changed = strip(prev) !== strip(out);
if (changed) fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n');
console.log(`Sportnet ${season.name}: ${teams.length} tímov, ${matches.length} zápasov (${matches.filter((m) => m.played).length} odohraných), ${Object.keys(tables).length} tabuliek, nových detailov ${details}${changed ? ', uložené' : ', bez zmeny'}`);
