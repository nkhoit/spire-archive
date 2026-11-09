#!/usr/bin/env python3
"""Extract Downfall's characters, starter cards and starter relics from an installed Downfall.jar.

Needs Pillow and a JDK (javap). javap only reads the class files, so no mod code is run.
Writes data/mods/downfall/ and images under public/images/sts1/.

Character stats and decks below are transcribed from each character class. Re-check them
with javap if a Downfall update changes a character.
"""
import argparse
import io
import json
import re
import subprocess
import sys
import tempfile
import zipfile
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DEFAULT_JAR = 'C:/Program Files (x86)/Steam/steamapps/workshop/content/646570/1610056683/Downfall.jar'
AUTHOR = 'The Downfall Collab Team'
URL = 'https://steamcommunity.com/sharedfiles/filedetails/?id=1610056683'
PORTRAIT_WIDTH = 900
# Card text placeholders that Downfall defines itself, and the field holding each value.
CUSTOM_PLACEHOLDERS = {'SlimeboundSelfharm': 'baseSelfDamage', 'slime': 'baseSlimed', 'burny': 'baseBurn', 'cool': 'baseCool', 'clm2': 'baseSecondMagic'}
# Numbers the game splices between a relic's description parts, from each relic class.
RELIC_VALUES = {'AbsorbEndCombat': [2, 8], 'SpiritBrand': [4], 'RippedDoll': [2]}


def deck(*cards):
    return [(name, count) for name, count in cards]


CHARACTERS = [
    {'color': 'slimeboss', 'hex': '#8fce6e', 'res': 'slimeboundResources', 'pkg': 'slimebound', 'key': 'Slimebound', 'hp': 65,
     'deck': deck(('Strike_Slimebound', 3), ('Tackle', 1), ('Defend_Slimebound', 4), ('Split', 1), ('CorrosiveSpit', 1)), 'relic': 'AbsorbEndCombat'},
    {'color': 'guardian', 'hex': '#e0a15a', 'res': 'guardianResources', 'pkg': 'guardian', 'key': 'Guardian', 'hp': 80,
     'deck': deck(('Strike_Guardian', 4), ('Defend_Guardian', 4), ('CurlUp', 1), ('TwinSlam', 1)), 'relic': 'ModeShifter'},
    {'color': 'hexaghost', 'hex': '#7be0c3', 'res': 'hexamodResources', 'pkg': 'theHexaghost', 'key': 'hexamod:theHexaghost', 'hp': 66,
     'deck': deck(('Strike', 4), ('Defend', 4), ('Sear', 1), ('Float', 1), ('SkipABeat', 1)), 'relic': 'SpiritBrand'},
    {'color': 'champ', 'hex': '#c9ccd6', 'res': 'champResources', 'pkg': 'champ', 'key': 'champ:theChamp', 'hp': 80,
     'deck': deck(('Strike', 4), ('Defend', 3), ('BerserkersShout', 1), ('DefensiveShout', 1), ('Execute', 1)), 'relic': 'ChampionCrown'},
    {'color': 'automaton', 'hex': '#d9a441', 'res': 'bronzeResources', 'pkg': 'automaton', 'key': 'bronze:theAutomaton', 'hp': 70,
     'deck': deck(('Strike', 4), ('Defend', 4), ('Replicate', 1), ('Goto', 1)), 'relic': 'BronzeCore'},
    {'color': 'awakened', 'hex': '#7fa6f0', 'res': 'awakenedResources', 'pkg': 'awakenedOne', 'key': 'awakened:awakenedOne', 'hp': 70,
     'deck': deck(('Strike', 4), ('Defend', 4), ('TalonRake', 1), ('Hymn', 1)), 'relic': 'RippedDoll'},
    {'color': 'collector', 'hex': '#6fd17a', 'res': 'collectorResources', 'pkg': 'collector', 'key': 'collector:theCollector', 'hp': 65,
     'deck': deck(('Strike', 4), ('Defend', 4), ('YouAreMine', 1), ('FuelTheFire', 1)), 'relic': 'EmeraldTorch'},
    {'color': 'gremlins', 'hex': '#f07a6b', 'res': 'gremlinResources', 'pkg': 'gremlin', 'key': 'Gremlin', 'hp': 16,
     'deck': deck(('Strike', 4), ('Defend', 4), ('TagTeam', 1), ('GremlinDance', 1)), 'relic': 'GremlinKnob'},
    {'color': 'snecko', 'hex': '#5fd0e0', 'res': 'sneckomodResources', 'pkg': 'sneckomod', 'key': 'sneckomod:theSnecko', 'hp': 85,
     'deck': deck(('Strike', 4), ('Defend', 4), ('TailWhip', 1), ('SnekBite', 1)), 'relic': 'SneckoSoul'},
    {'color': 'hermit', 'hex': '#e6d36a', 'res': 'hermitResources', 'pkg': 'hermit', 'key': 'hermit:hermit', 'hp': 75,
     'deck': deck(('Strike_Hermit', 4), ('Defend_Hermit', 4), ('Snapshot', 1), ('Covet', 1)), 'relic': 'Momento', 'relic_art': 'memento'},
]

problems = []


def site_id(raw):
    return 'DOWNFALL_' + re.sub(r'[^A-Z0-9]+', '_', raw.upper()).strip('_')


def load_strings(jar, res, name):
    path = f'{res}/localization/eng/{name}.json'
    return json.loads(jar.read(path).decode('utf-8-sig', 'replace'), strict=False)


def clean_text(text):
    """Game markup to plain text, in the style of the site's base-game descriptions."""
    text = re.sub(r'\s*\bNL\b\s*', '\n', str(text))
    text = re.sub(r'\[#[0-9a-fA-F]+\]|\[\]', '', text)
    text = re.sub(r'(?<![\w])#[a-z]', '', text)
    text = re.sub(r'\[[RGBWE]\]|\[[a-zA-Z]*:?[a-zA-Z]*[Ee]nergy[a-zA-Z]*\]', '[E]', text)
    text = re.sub(r'\b[A-Za-z]+:(?=[A-Z])', '', text)
    text = re.sub(r'(?<!\w)\*(?=\w)', '', text)
    text = re.sub(r'\s*\[REMOVE_SPACE\]', '', text)
    text = re.sub(r'(?<=[A-Za-z])_(?=[A-Z])', ' ', text)
    text = re.sub(r'\[E\] +(?=[.,])', '[E]', text)
    return re.sub(r'[ \t]+', ' ', text).strip()


def relic_description(parts, values):
    return ''.join(part + (str(values[i]) if i < len(values) else '') for i, part in enumerate(parts))


def find_entry(names, pattern):
    return next((n for n in names if re.search(pattern, n)), None)


def strings_key(strings, simple):
    wanted = simple.lower()
    return next((k for k in strings if k.split(':')[-1].lower() == wanted), None)


def javap(jar, names, workdir, pkg, simple, folder):
    entry = find_entry(names, rf'^{pkg}/{folder}/(.*/)?{re.escape(simple)}\.class$')
    if not entry:
        problems.append(f'{pkg}: no class for {simple}')
        return ''
    jar.extract(entry, workdir)
    return subprocess.run(['javap', '-p', '-c', '-constants', str(Path(workdir) / entry)], capture_output=True, text=True, errors='replace').stdout


def int_before(lines, index):
    """Integer constant pushed on the instruction before lines[index]."""
    for line in reversed(lines[max(0, index - 3):index]):
        match = re.search(r'\b(?:iconst_(m1|\d)|[bs]ipush\s+(-?\d+))\b', line)
        if match:
            return -1 if match[1] == 'm1' else int(match[1] or match[2])
    return None


def assigned(lines, field):
    for index, line in enumerate(lines):
        if re.search(rf'putfield.*\b{field}:I', line):
            return int_before(lines, index)
    return None


def card_stats(text):
    constructor = re.search(r'\n  public [\w.$]+\(\);.*?\n\n', text, re.S)
    lines = (constructor[0] if constructor else '').splitlines()
    enum = lambda kind: (re.findall(rf'{kind}\.([A-Z_]+):', text) or [None])[0]
    type_line = next((i for i, line in enumerate(lines) if 'CardType.' in line), None)
    declared_cost = re.search(r'static final int COST = (-?\d+)', text)
    return {
        'custom': {token: assigned(lines, field) for token, field in CUSTOM_PLACEHOLDERS.items()},
        'art_names': [Path(stem).name for stem in re.findall(r'([\w/]+)\.png', text)],
        'type': enum('CardType'), 'rarity': enum('CardRarity'), 'target': enum('CardTarget'),
        'cost': int(declared_cost[1]) if declared_cost else int_before(lines, type_line) if type_line is not None else None,
        'damage': assigned(lines, 'baseDamage'), 'block': assigned(lines, 'baseBlock'), 'magic': assigned(lines, 'baseMagicNumber'),
    }


def title(value):
    return value.replace('_', ' ').title() if value else None


def find_image(names, res, folder, simple, strings_name='', art_names=()):
    wanted = {simple.lower(), re.sub(r'[^a-z0-9]', '', strings_name.lower()), *(name.lower() for name in art_names)}
    skip = re.compile(r'betacards|/joke|programmerart|placeholder|templates|unused|_p\.png|outline', re.I)
    for name in names:
        if name.startswith(res + '/') and f'/{folder}/' in name and name.lower().endswith('.png') and not skip.search(name):
            if Path(name).stem.lower() in wanted:
                return name
    return None


def copy(jar, entry, target):
    data = jar.read(entry)
    Image.open(io.BytesIO(data)).verify()  # Mod jars are third-party; only real images reach public/.
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)


def extract_portrait(jar, names, char, target):
    folder = [n for n in names if n.startswith(char['res'] + '/') and '/charSelect/' in n and n.lower().endswith(('.png', '.jpg'))]
    art = [n for n in folder if not re.search(r'button|leaderboard|smoke|ending', n, re.I)]
    if not art:
        problems.append(f'{char["color"]}: no portrait')
        return
    entry = max(art, key=lambda n: jar.getinfo(n).file_size)
    save_portrait(jar, entry, target)
    print(f'  portrait {char["color"]}: {entry}')


def save_portrait(jar, entry, target):
    image = Image.open(io.BytesIO(jar.read(entry))).convert('RGBA')
    backdrop = Image.new('RGBA', image.size, (20, 22, 24, 255))
    image = Image.alpha_composite(backdrop, image).convert('RGB')
    image = image.resize((PORTRAIT_WIDTH, round(image.height * PORTRAIT_WIDTH / image.width)), Image.LANCZOS)
    target.parent.mkdir(parents=True, exist_ok=True)
    image.save(target, quality=82, optimize=True)


def extract_frames(jar, names, char, cardui):
    """Returns the asset colour for this character, or None if its frames can't be found."""
    res = [n for n in names if n.startswith(char['res'] + '/') and '/1024' in n and n.lower().endswith('.png') and 'dimension' not in n and not re.search(r'/(betacards|joke)/', n)]
    found = {}
    for kind in ('attack', 'skill', 'power'):
        found[kind] = next((n for n in res if re.search(rf'(bg_)?{kind}[^/]*\.png$', Path(n).name, re.I)), None)
    orb = next((n for n in res if re.search(r'orb', Path(n).name, re.I)), None)
    if not all(found.values()) or not orb:
        problems.append(f'{char["color"]}: frames missing {found} orb={orb}; using colorless')
        return None
    for kind, entry in found.items():
        copy(jar, entry, cardui / f'bg_{kind}_{char["color"]}.png')
    copy(jar, orb, cardui / f'card_{char["color"]}_orb.png')
    return char['color']


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--jar', default=DEFAULT_JAR)
    args = parser.parse_args()

    jar = zipfile.ZipFile(args.jar)
    names = jar.namelist()
    images = ROOT / 'public' / 'images' / 'sts1'
    data_dir = ROOT / 'data' / 'mods' / 'downfall'
    data_dir.mkdir(parents=True, exist_ok=True)

    characters, cards, relics, colors = [], {}, [], []
    with tempfile.TemporaryDirectory() as workdir:
        for char in CHARACTERS:
            color = char['color']
            info = load_strings(jar, char['res'], 'CharacterStrings')[char['key']]
            card_strings = load_strings(jar, char['res'], 'CardStrings')
            relic_strings = load_strings(jar, char['res'], 'RelicStrings')
            label = re.sub(r'^The ', '', info['NAMES'][0])
            colors.append({'id': color, 'label': label, 'hex': char['hex'], 'asset_color': extract_frames(jar, names, char, images / 'cardui') or 'colorless'})
            extract_portrait(jar, names, char, images / 'characters' / f'{color}.jpg')

            starting_deck = []
            for simple, count in char['deck']:
                key = strings_key(card_strings, simple)
                if not key:
                    problems.append(f'{color}: no card text for {simple}')
                    continue
                card_id = site_id(key if ':' in key else f'{char["pkg"]}_{key}')
                starting_deck += [card_id] * count
                entry = card_strings[key]
                stats = card_stats(javap(jar, names, workdir, char['pkg'], simple, 'cards'))
                if None in (stats['type'], stats['rarity'], stats['cost']):
                    problems.append(f'{color}/{simple}: incomplete stats {stats}')
                description = clean_text(entry.get('DESCRIPTION', ''))
                for token, value in (('!D!', stats['damage']), ('!B!', stats['block']), ('!M!', stats['magic'])):
                    if token in description:
                        if value is None:
                            problems.append(f'{color}/{simple}: no value for {token}')
                        else:
                            description = description.replace(token, str(value))
                for token, value in stats['custom'].items():
                    if f'!{token}!' in description and value is not None:
                        description = description.replace(f'!{token}!', str(value))
                if re.search(r'![A-Za-z]+!', description):
                    problems.append(f'{color}/{simple}: leftover placeholder in "{description}"')
                cards[card_id] = {
                    'id': card_id, 'name': entry['NAME'], 'description': description, 'cost': stats['cost'],
                    'type': title(stats['type']), 'rarity': title(stats['rarity']), 'target': title(stats['target']), 'color': color,
                    'damage': stats['damage'], 'block': stats['block'], 'magic_number': stats['magic'], 'hit_count': None,
                    'exhaust': False, 'ethereal': False, 'innate': False, 'retain': False, 'self_retain': False, 'purge_on_use': False,
                    'tags': [], 'keywords': [],
                    'upgrade': {'cost': None, 'damage': None, 'block': None, 'magic_number': None, 'description': None},
                }
                image = find_image(names, char['res'], 'cards', simple, entry['NAME'], stats['art_names'])
                if image:
                    copy(jar, image, images / 'cards' / f'{card_id.lower()}.png')
                else:
                    problems.append(f'{color}/{simple}: no card art')

            relic_key = strings_key(relic_strings, char['relic'])
            relic_id = None
            if not relic_key:
                problems.append(f'{color}: no relic text for {char["relic"]}')
            else:
                relic_id = site_id(relic_key if ':' in relic_key else f'{char["pkg"]}_{relic_key}')
                entry = relic_strings[relic_key]
                icon = f'{relic_id.lower()}.png'
                relics.append({
                    'id': relic_id, 'name': entry['NAME'], 'description': clean_text(relic_description(entry.get('DESCRIPTIONS', []), RELIC_VALUES.get(char['relic'], []))),
                    'flavor': clean_text(entry.get('FLAVOR', '')) or None, 'tier': 'Starter', 'color': color, 'icon': icon,
                })
                image = find_image(names, char['res'], 'relics', char['relic'], entry['NAME'], [char.get('relic_art', char['relic'])])
                if image:
                    copy(jar, image, images / 'relics' / icon)
                    copy(jar, image, images / 'relics-list' / icon)
                else:
                    problems.append(f'{color}: no relic art for {char["relic"]}')

            characters.append({
                'id': site_id(color), 'name': info['NAMES'][0], 'color': color, 'hp': char['hp'], 'energy_per_turn': 3,
                'starting_gold': 99, 'starting_deck': starting_deck, 'starting_relic': relic_id, 'description': clean_text(info['TEXT'][0]).replace('\n', ' '),
            })

    write = lambda name, value: (data_dir / name).write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    write('mod.json', {'id': 'downfall', 'name': 'Downfall', 'author': AUTHOR, 'url': URL, 'colors': colors})
    write('characters.json', characters)
    write('cards.json', sorted(cards.values(), key=lambda c: c['id']))
    write('relics.json', sorted(relics, key=lambda r: r['id']))

    print(f'\n{len(characters)} characters, {len(cards)} cards, {len(relics)} relics')
    print(f'{len(problems)} problems')
    for problem in problems:
        print(' -', problem)


if __name__ == '__main__':
    sys.exit(main())
