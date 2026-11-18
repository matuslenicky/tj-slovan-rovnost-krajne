# Stiahne Big Shoulders Display a Lora (SIL OFL 1.1) z Google Fonts, oreže na latinku strednej Európy,
# uloží WOFF do src/fonts a zapíše src/fonts/fonts.css.   python -I scripts/fonts.py src/fonts
import io, re, sys, urllib.request
from pathlib import Path
from fontTools import subset
from fontTools.ttLib import TTFont

out_dir = Path(sys.argv[1]); out_dir.mkdir(parents=True, exist_ok=True)
FAMILIES = {
    'Big Shoulders Display': 'Big+Shoulders+Display:wght@800',
    'Lora': 'Lora:ital,wght@0,400;0,600;1,400',
}
UNICODES = (list(range(0x20, 0x7F)) + list(range(0xA0, 0x180)) + list(range(0x2000, 0x200C)) +
            list(range(0x2010, 0x2016)) + list(range(0x2018, 0x201F)) +
            [0x2022, 0x2026, 0x202F, 0x2030, 0x2039, 0x203A, 0x2060, 0x20AC, 0x2122, 0x2212, 0x2192, 0x2190])
rules = []
for fam, q in FAMILIES.items():
    css = urllib.request.urlopen(f'https://fonts.googleapis.com/css2?family={q}', timeout=30).read().decode()
    for block in re.findall(r'@font-face\s*{[^}]+}', css):
        style = re.search(r'font-style:\s*(\w+)', block).group(1)
        weight = re.search(r'font-weight:\s*(\d+)', block).group(1)
        url = re.search(r'url\(([^)]+\.ttf)\)', block).group(1)
        font = TTFont(io.BytesIO(urllib.request.urlopen(url, timeout=30).read()))
        opts = subset.Options(); opts.flavor = 'woff'; opts.hinting = False
        opts.layout_features = subset.Options().layout_features + ['tnum', 'lnum', 'case']
        opts.name_IDs = [0, 1, 2, 3, 4, 5, 6]
        s = subset.Subsetter(opts); s.populate(unicodes=UNICODES); s.subset(font)
        # Overpass má v GDEF „·“ (a ¨ ` ´ ¯ ¸) ako značku (trieda 3): HarfBuzz im vynuluje šírku a bodka
        # v „1959 · klub“ prekryje ďalšie slovo. Samostatné (nekombinujúce) znaky dostanú triedu 1.
        if 'GDEF' in font and font['GDEF'].table.GlyphClassDef:
            cd = font['GDEF'].table.GlyphClassDef.classDefs
            for cp, g in font.getBestCmap().items():
                if cd.get(g) == 3 and cp in (0x60, 0xA8, 0xAF, 0xB4, 0xB7, 0xB8): cd[g] = 1
        # Alegreya Sans (aj Cormorant) má predvolene staré (minuskové) číslice; skratka font v CSS vynuluje aj font-feature-settings,
        # preto sa rovné číslice (lnum) zapečú priamo do cmap: číslice 0 – 9 ukazujú na glyfy z funkcie lnum
        if 'GSUB' in font:
            gsub = font['GSUB'].table; cmap = font.getBestCmap(); sub = {}
            for fr in gsub.FeatureList.FeatureRecord:
                if fr.FeatureTag != 'lnum': continue
                for li in fr.Feature.LookupListIndex:
                    for st in gsub.LookupList.Lookup[li].SubTable:
                        st = getattr(st, 'ExtSubTable', st)
                        if hasattr(st, 'mapping'): sub.update(st.mapping)
            for t in font['cmap'].tables:
                for cp in range(0x30, 0x3A):
                    if cp in t.cmap and t.cmap[cp] in sub: t.cmap[cp] = sub[t.cmap[cp]]
        slug = fam.lower().replace(' ', '-')
        name = f'{slug}-{weight}{"i" if style == "italic" else ""}.woff'
        font.flavor = 'woff'; font.save(out_dir / name)
        print(name, (out_dir / name).stat().st_size // 1024, 'KB')
        rules.append(f"@font-face{{font-family:'{fam}';font-style:{style};font-weight:{weight};font-display:swap;src:url({name}) format(\"woff\")}}")
(out_dir / 'fonts.css').write_text('/* Big Shoulders Display, Lora (SIL OFL 1.1), orezané na latinku strednej Európy */\n' + '\n'.join(rules) + '\n', encoding='utf8')
print('fonts.css zapísané')
