// Správanie klubového webu (bez knižníc): menu v dialógu, filtre zápasov, odpočet do výkopu, kalendár.
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

// ---- menu na telefóne: modálny <dialog> cez celú obrazovku (Esc, „Zavrieť“ a klik na odkaz ho zatvoria, fokus sa vráti na tlačidlo) ----
const menuBtn = $('.menu-btn'), menu = $('#menu');
if (menuBtn && menu && typeof menu.showModal === 'function') {
  const close = () => { if (menu.open) menu.close(); };
  menuBtn.addEventListener('click', () => { menu.showModal(); menuBtn.setAttribute('aria-expanded', 'true'); document.documentElement.classList.add('menu-open'); });
  menu.addEventListener('close', () => { menuBtn.setAttribute('aria-expanded', 'false'); document.documentElement.classList.remove('menu-open'); menuBtn.focus(); });
  $('[data-close]', menu).addEventListener('click', close);
  // klik na odkaz alebo mimo panelu (cieľom je samotný <dialog>) menu zavrie
  menu.addEventListener('click', (e) => {
    if (e.target.closest('a')) return close();
    if (e.target === menu) close();
  });
  matchMedia('(min-width: 1000px)').addEventListener('change', (e) => { if (e.matches) close(); }); // od 1000 px je menu v hlavičke (site.css)
}

// ---- odpočet do výkopu ----
const plural = (n, a, b, c) => `${n} ${n === 1 ? a : n >= 2 && n <= 4 ? b : c}`;
function tick() {
  for (const el of $$('.cd[data-kickoff]')) {
    const ms = Date.parse(el.dataset.kickoff) - Date.now();
    if (Number.isNaN(ms) || ms > 14 * 864e5) { el.hidden = true; continue; }
    el.hidden = false;
    if (ms <= 0) { el.textContent = ms > -105 * 60e3 ? 'Práve sa hrá' : 'Zápas sa skončil, výsledok čoskoro'; continue; }
    const d = Math.floor(ms / 864e5), h = Math.floor((ms % 864e5) / 36e5), m = Math.floor((ms % 36e5) / 6e4);
    el.textContent = d >= 1 ? `Výkop o ${plural(d, 'deň', 'dni', 'dní')}${d < 3 ? ` a ${plural(h, 'hodinu', 'hodiny', 'hodín')}` : ''}` : `Výkop o ${h ? plural(h, 'hodinu', 'hodiny', 'hodín') + ' ' : ''}${plural(m, 'minútu', 'minúty', 'minút')}`;
  }
}
if ($('.cd[data-kickoff]')) { tick(); setInterval(tick, 30e3); }

// ---- filtre zápasov (tím, doma/vonku), zapamätané v adrese ----
const filters = $('[data-filters]');
if (filters) {
  filters.hidden = false;
  const q = new URLSearchParams(location.search);
  const state = { team: q.get('tim') || '', where: q.get('kde') || '' };
  const apply = () => {
    $$('[data-f-team]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fTeam === state.team)));
    $$('[data-f-where]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.fWhere === state.where)));
    for (const li of $$('.mrow')) li.hidden = (state.team && li.dataset.team !== state.team) || (state.where && li.dataset.where !== state.where);
    for (const m of $$('[data-month]')) m.hidden = !$$('.mrow', m).some((li) => !li.hidden);
    for (const col of $$('.cols2--list > section')) { const e = $('[data-empty]', col); if (e) e.hidden = $$('.mrow', col).some((li) => !li.hidden); }
    const p = new URLSearchParams();
    if (state.team) p.set('tim', state.team);
    if (state.where) p.set('kde', state.where);
    history.replaceState(null, '', p.toString() ? `?${p}` : location.pathname);
  };
  filters.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    if ('fTeam' in b.dataset) state.team = b.dataset.fTeam;
    if ('fWhere' in b.dataset) state.where = b.dataset.fWhere;
    apply();
  });
  if ($(`[data-f-team="${CSS.escape(state.team)}"]`) && $(`[data-f-where="${CSS.escape(state.where)}"]`)) apply();
  else { state.team = ''; state.where = ''; apply(); }
  document.documentElement.classList.remove('flt'); // zoznam je vyfiltrovaný, môže sa ukázať (pozri HEAD_JS v build.js)
  // na telefóne je pás tímov posuvný: zvolený tím z adresy (napr. U13 B) posunúť do stredu, inak nie je vidieť, čo je vybraté
  const on = $('[data-f-team][aria-pressed="true"]'), strip = on?.parentElement;
  if (state.team && strip && strip.scrollWidth > strip.clientWidth) strip.scrollLeft += on.getBoundingClientRect().left - strip.getBoundingClientRect().left - (strip.clientWidth - on.offsetWidth) / 2;
}

// ---- kalendár zápasov: odber cez webcal a Google Kalendár (potrebujú úplnú adresu .ics) ----
for (const box of $$('[data-cal]')) {
  const ics = $('[data-ics]', box);
  const abs = new URL(ics.getAttribute('href'), location.href);
  if (!/^https?:$/.test(abs.protocol) || /^(localhost|127\.)/.test(abs.hostname)) continue;
  const webcal = abs.href.replace(/^https?:/, 'webcal:');
  const w = $('[data-webcal]', box), g = $('[data-gcal]', box);
  w.href = webcal; w.hidden = false;
  g.href = `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcal)}`; g.hidden = false;
}
document.addEventListener('click', (e) => { $$('[data-cal][open]').forEach((d) => { if (!d.contains(e.target)) d.open = false; }); });
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  $$('[data-cal][open]').forEach((d) => { d.open = false; $('summary', d).focus(); });
});

// ---- záložky (data-tabs): bez JS sú všetky panely pod sebou, s JS jeden panel a ovládanie šípkami ----
for (const box of $$('[data-tabs]')) {
  const tabs = $$('[role="tab"]', box), panels = $$('[role="tabpanel"]', box);
  if (!tabs.length || tabs.length !== panels.length) continue;
  const pick = (i, focus) => {
    tabs.forEach((t, j) => { t.setAttribute('aria-selected', String(i === j)); t.tabIndex = i === j ? 0 : -1; panels[j].hidden = i !== j; });
    if (focus) tabs[i].focus();
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => pick(i));
    t.addEventListener('keydown', (e) => {
      const last = tabs.length - 1;
      const to = { ArrowRight: i === last ? 0 : i + 1, ArrowLeft: i === 0 ? last : i - 1, Home: 0, End: last }[e.key];
      if (to !== undefined) { e.preventDefault(); pick(to, true); }
    });
  });
  box.classList.add('tabs-on');
  pick(0);
}
