# TJ Slovan Rovnosť Krajné – návrh webu

Návrh nového webu futbalového klubu TJ Slovan Rovnosť Krajné. **Nie je to oficiálna stránka klubu.** Ukážka má v hlavičke pás s týmto upozornením a vyhľadávače ju neindexujú (`noindex`).

Ukážka: https://matuslenicky.github.io/tj-slovan-rovnost-krajne/ · administrácia (ukážka bez ukladania): https://matuslenicky.github.io/tj-slovan-rovnost-krajne/admin/

## Vzhľad

**„Tabuľka na titulke“ (dizajn v2, 18. 11. 2026).** Biela, modrá z dresov, tmavá tlač. Písmo Big Shoulders Display (čísla, titulky) a Lora (text).

- úvod: veľké číslo miesta vo VI. lige Západ a odstup od lídra; hlavným obsahom je celá tabuľka ligy, vedľa nej (na telefóne nad ňou) najbližší zápas a pod ním výsledky a program,
- pás „Dva postupy za sebou“ so sezónami 2024/25 a 2025/26,
- história od roku 1934, ročníky, úspechy, ihrisko a obec sú na stránke Klub,
- menu na telefóne je biela plocha cez celú obrazovku.

Web sa skladá zo spoločného jadra v2 (`kluby-siet/engine`: `python assemble.py <web>`), vlastný je `src/site.js` (úvod, Klub, nastavenia) a `src/css/skin.css`.

## Obsah a zdroje

- Zápasy, výsledky, strelci, karty, počty divákov, zostavy dospelých, tabuľky a súpisky 3 tímov (áčko, U19, U15) zo Sportnetu (Futbalnet), verejné API súťaží (`scripts/sportnet.mjs` → `data/sportnet.json`). Vek hráčov sa neukladá, zostavy len pri dospelých.
- Ročníky áčka 2014/15 – 2025/26 z konečných tabuliek na Sportnete, tituly 2024/25 (8. liga Juh ObFZ Trenčín, bez prehry) a 2025/26 (7. liga ObFZ Trenčín). Ihrisko (kapacita, rozmery) podľa Sportnetu (`data/klub.json`).
- História klubu od roku 1934 zo stránky TJ na webe obce Krajné, jeseň 2025 z Krajnianskych novín 4/2025. Obec podľa webu obce (História, Symboly).
- E-mail zo Sportnetu. Vlastný web ani sociálne siete klubu sme nenašli (18. 11. 2026).
- Erb klubu a erby súperov zo Sportnetu (`scripts/logos.py`). Patria príslušným klubom.
- Písmo Big Shoulders Display a Lora, licencia SIL Open Font License 1.1 (`scripts/fonts.py`, rovné číslice sú zapečené do písma).

## Zostavenie

Statický generátor bez závislostí (Node 20+, Python 3 s Pillow na erby a fontTools na písmo):

```
python C:\Users\lenic\kluby-siet\engine\assemble.py .   # zloží build.js a site.css zo spoločného jadra
node scripts/sportnet.mjs        # zápasy, tabuľky a súpisky (FULL=1 stiahne znova aj detaily zápasov)
python -I scripts/logos.py       # erby súperov a náš erb do src/img (FORCE=1 stiahne znova)
node build.js                    # data/ + src/ -> dist/ (TODAY=2026-11-18 prepíše dnešný dátum)
node scripts/serve.mjs dist 5455 # náhľad na http://127.0.0.1:5455/ (?nolr = bez obnovovania, s CSP)
node scripts/deploy.mjs          # nasadenie dist/ na vetvu gh-pages (GitHub Pages)
```

Výsledky sa po zápasoch aktualizujú samé cez GitHub Actions (`.github/workflows/sportnet.yml`). Ročníky v `data/klub.json` treba po sezóne doplniť ručne.
