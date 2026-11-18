// Statický generátor webu TJ Slovan Rovnosť Krajné: data/ + src/ -> dist/   (node build.js; TODAY=2026-11-18 prepíše dnešný dátum)
// Zostavuje ho kluby-siet/engine/assemble.py zo spoločného jadra v2 a tohto súboru (vzhľad, úvod, stránka Klub).
// Kostra „Tabuľka na titulke“: nováčik bojuje o čelo, preto je hlavným obsahom úvodu celá tabuľka VI. ligy Západ.
// Nad ňou veľké číslo miesta a odstup od lídra, vedľa (na telefóne pod ňou) najbližší zápas, výsledky a program.
// Pod tým dva postupy za sebou. Biela, modrá z dresov, tmavá tlač. Písmo Big Shoulders Display (čísla, titulky) a Lora.
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
