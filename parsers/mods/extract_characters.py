#!/usr/bin/env python3
"""Extract single-character mods (character, starter cards, starter relics) from workshop jars.

Needs Pillow and a JDK (javap). javap only reads the class files, so no mod code is run.
Stats and decks below are transcribed from each character class; re-check them with javap if a mod updates.

    py -3 parsers/mods/extract_characters.py [mod id ...]
"""
import json
import re
import sys
import tempfile
import zipfile
from pathlib import Path

from extract_downfall import ROOT, card_stats, clean_text, copy, find_image, javap, problems, relic_description, save_portrait, strings_key, title

WORKSHOP = 'C:/Program Files (x86)/Steam/steamapps/workshop/content/646570'
SUITS = {'Heart': 0, 'Spade': 1, 'Club': 2, 'Diamond': 3}
# Text tokens a mod fills in itself, with the value from each card class.
TEXT_VALUES = {'Cutlass': {'{A}': 4, '{D}': 2}, 'skillFocusHeal_s': {'!HollowMod:focusCost!': 3}, 'Punish': {'!P!': 8}, 'CraftFirestone': {'!Pot!': 4}}
# Numbers the game splices between a relic's description parts, from each relic class.
RELIC_VALUES = {'DeckCase': [6]}

MODS = [
    {'id': 'blackbeard', 'label': 'Blackbeard', 'hex': '#6b6f7a', 'workshop': '1612105245', 'jar': 'TheBlackbeardMod.jar', 'author': 'The Blackbeard team',
     'pkg': 'blackbeard', 'res': 'blackbeard', 'cards': 'blackbeard/localization/eng/CardStrings.json', 'relics': 'blackbeard/localization/eng/RelicStrings.json',
     'char': ('blackbeard/localization/eng/CharacterStrings.json', 'blackbeard:BlackbeardCharacter'),
     'portrait': 'blackbeard/img/charSelect/blackbeardPortrait.jpg', 'frames': 'blackbeard/img/1024/bg_{}_black.png', 'orb': 'blackbeard/img/1024/card_black_orb.png',
     'hp': 75, 'deck': [('BlackbeardStrike', 4), ('IntimidatingStrike', 1), ('BlackbeardDefend', 4), ('Cutlass', 1)], 'relic': ['LoadTheCannons']},
    {'id': 'bladedancer', 'label': 'Bladedancer', 'hex': '#7f8fa8', 'workshop': '1731281703', 'jar': 'Blademaster.jar', 'author': 'The Bladedancer team',
     'pkg': 'blademaster', 'res': 'blademasterResources', 'cards': 'blademasterResources/localization/eng/BlademasterCardStrings.json', 'relics': 'blademasterResources/localization/eng/BlademasterRelicStrings.json',
     'char': ('blademasterResources/localization/eng/BlademasterBladedancerStrings.json', 'Bladedancer'),
     'portrait': 'blademasterResources/images/characterSelect/BlademasterPortraitBG.png', 'frames': 'blademasterResources/images/1024/bg_{}_default_gray.png', 'orb': 'blademasterResources/images/1024/card_default_gray_orb.png',
     'hp': 75, 'deck': [('Strike', 4), ('Defend', 4), ('RagingBlow', 1), ('HighVoltage', 1)], 'relic': ['DancersAmulet']},
    {'id': 'bugknight', 'label': 'Bug Knight', 'hex': '#b8c2cc', 'workshop': '1750758531', 'jar': 'HollowMod.jar', 'author': 'Venim',
     'pkg': 'HollowMod', 'res': 'HollowModResources', 'cards': 'HollowModResources/localization/eng/HollowMod-Card-Strings.json', 'relics': 'HollowModResources/localization/eng/HollowMod-Relic-Strings.json',
     'char': ('HollowModResources/localization/eng/HollowMod-Character-Strings.json', 'HollowMod:BugKnightCharacter'),
     'portrait': 'HollowModResources/images/charSelect/BugKnightPortrait.png', 'frames': 'HollowModResources/images/1024/bg_{}_BK.png', 'orb': 'HollowModResources/images/1024/card_default_gray_orb.png',
     'hp': 75, 'deck': [('attackNailStrike_s', 4), ('skillQuickDash_s', 4), ('skillFocusHeal_s', 1), ('attackPogoStrike', 1)], 'relic': ['VesselMask']},
    {'id': 'elementalist', 'label': 'Elementalist', 'hex': '#4f7fd1', 'workshop': '1637996817', 'jar': 'ElementalistMod.jar', 'author': 'jakeb89',
     'pkg': 'elementalist_mod', 'res': 'img', 'relics': 'localization/ElementalistMod-RelicStrings.json', 'text_in_class': True,
     'char_class': ('elementalist_mod/characters/TheElementalist', 'The Elementalist', 'A wandering mage'),
     'portrait': 'img/charSelect/PortraitBG.png', 'frames': 'img/1024/bg_{}.png', 'orb': 'img/1024/card_orb.png',
     'hp': 70, 'deck': [('Strike_Elemblue', 1), ('Defend_Elemblue', 5), ('Firestrike', 1), ('Earthstrike', 1), ('Waterstrike', 1), ('Airstrike', 1), ('Crystal_Chalk', 1)], 'relic': ['MagusStaff', 'GraduationLetter']},
    {'id': 'hierophant', 'label': 'Hierophant', 'hex': '#d9b64a', 'workshop': '1897365186', 'jar': 'HierophantMod.jar', 'author': 'Corax',
     'pkg': 'hierophant', 'res': 'hierophantResources', 'cards': 'hierophantResources/localization/eng/HierophantMod-Card-Strings.json', 'relics': 'hierophantResources/localization/eng/HierophantMod-Relic-Strings.json',
     'char': ('hierophantResources/localization/eng/HierophantMod-Character-Strings.json', 'hierophant:HierophantCharacter'),
     'portrait': 'hierophantResources/images/charSelect/hierophantPortrait.png', 'frames': 'hierophantResources/images/1024/bg_{}_hierophant_gold.png', 'orb': 'hierophantResources/images/1024/card_hierophant_gold_orb.png',
     'hp': 75, 'deck': [('Strike_Hierophant', 4), ('Punish', 1), ('Defend_Hierophant', 4), ('ChurchCoffers', 1)], 'relic': ['PropheticMaskRelic']},
    {'id': 'pokerplayer', 'label': 'Poker Player', 'hex': '#c9463d', 'workshop': '1710999325', 'jar': 'PokerPlayerMod.jar', 'author': 'The Poker Player team',
     'pkg': 'ThePokerPlayer', 'res': 'PokerPlayerMod', 'cards': 'PokerPlayerMod/localization/eng/cards.json', 'relics': 'PokerPlayerMod/localization/eng/relics.json',
     'char': ('PokerPlayerMod/localization/eng/characters.json', 'ThePokerPlayer'),
     'portrait': 'PokerPlayerMod/images/charSelect/PokerPlayerPortraitBG.png', 'frames': 'PokerPlayerMod/images/1024/bg_{}_default_gray.png', 'orb': 'PokerPlayerMod/images/1024/card_default_gray_orb.png',
     'hp': 52, 'poker': [('Diamond', r) for r in (1, 2, 3, 4, 5)] + [('Spade', r) for r in (1, 2, 3, 4)] + [('Club', 1), ('Club', 2), ('Heart', 2)],
     'deck': [('TrumpStrike', 1), ('BadJoker', 1), ('Mulligan', 1)], 'relic': ['DeckCase']},
    {'id': 'runesmith', 'label': 'Runesmith', 'hex': '#c98f4a', 'workshop': '1633549612', 'jar': 'TheRunesmith.jar', 'author': 'The Runesmith team',
     'pkg': 'runesmith', 'res': 'runesmith', 'cards': 'runesmith/localization/eng/RuneSMod_Cards.json', 'relics': 'runesmith/localization/eng/RuneSMod_Relics.json',
     'char': ('runesmith/localization/eng/RuneSMod_Character.json', 'The Runesmith'),
     'portrait': 'runesmith/images/character/runesmithPortrait.png', 'frames': 'runesmith/images/cardui/1024/bg_{}_beige.png', 'orb': 'runesmith/images/cardui/1024/card_beige_orb.png',
     'hp': 70, 'deck': [('Strike_RS', 4), ('Defend_RS', 4), ('CraftFirestone', 1), ('Fortify', 1)], 'relic': ['BrokenRuby']},
    {'id': 'servant', 'label': 'Servant', 'hex': '#b3bcc9', 'workshop': '1615745539', 'jar': 'BlackRuseMod.jar', 'author': 'BlackRuse, Kuzomari, Dimlight',
     'pkg': 'blackrusemod', 'res': 'img', 'cards': 'localization/BlackruseMod-CardStrings-eng.json', 'relics': 'localization/BlackruseMod-RelicStrings-eng.json',
     'char_class': ('blackrusemod/characters/TheServant', 'The Servant', 'A servant of demons'),
     'portrait': 'img/charSelect/ServantPortraitBG.jpg', 'frames': 'img/1024/bg_{}_silver.png', 'orb': 'img/1024/card_silver_orb.png',
     'hp': 65, 'deck': [('Strike_Silver', 4), ('Defend_Silver', 4), ('KidneyShot', 1), ('Exchange', 1)], 'relic': ['Uniform']},
    {'id': 'templar', 'label': 'Templar', 'hex': '#e3c878', 'workshop': '2437283392', 'jar': 'TemplarMod.jar', 'author': 'ResponsibleAlex',
     'pkg': 'TheTemplar', 'res': 'TheTemplarResources', 'cards': 'TheTemplarResources/localization/eng/TemplarMod-Card-Strings.json', 'relics': 'TheTemplarResources/localization/eng/TemplarMod-Relic-Strings.json',
     'char': ('TheTemplarResources/localization/eng/TemplarMod-Character-Strings.json', 'TheTemplar:DefaultCharacter'),
     'portrait': 'TheTemplarResources/images/charSelect/DefaultCharacterPortraitBG.png', 'frames': 'TheTemplarResources/images/1024/bg_{}_default_gray.png', 'orb': 'TheTemplarResources/images/1024/card_default_gray_orb.png',
     'hp': 75, 'deck': [('Strike', 4), ('Defend', 4), ('RighteousBlow', 1), ('BlessedCloak', 1)], 'relic': ['CodeOfChivalry']},
]


def read_json(jar, path):
    return json.loads(jar.read(path).decode('utf-8-sig', 'replace'), strict=False)


def class_id(text):
    """The game ID a card or relic class declares, inline or assigned in its static block."""
    declared = re.search(r'\bID = "([^"]+)"', text)
    if declared:
        return declared[1]
    lines = text.splitlines()
    for index, line in enumerate(lines):
        if re.search(r'putstatic.*\bID:Ljava/lang/String', line):
            for prior in reversed(lines[max(0, index - 5):index]):
                literal = re.search(r'// String (.+)$', prior)
                if literal:
                    return literal[1].strip()
    return None


def class_text(text, field):
    """String constant assigned to a static field, for mods that hardcode card text."""
    declared = re.search(rf'\b{field} = "(.*)";', text)
    if declared:
        return declared[1]
    lines = text.splitlines()
    for index, line in enumerate(lines):
        if re.search(rf'putstatic.*\b{field}:Ljava/lang/String', line):
            for prior in reversed(lines[max(0, index - 5):index]):
                literal = re.search(r'// String (.+)$', prior)
                if literal:
                    return literal[1]
    return None


def fill(description, stats, where, simple):
    description = re.sub(r'(?<![\w!])[a-z]+:(?=[A-Za-z])', '', description)
    for token, value in TEXT_VALUES.get(simple, {}).items():
        description = description.replace(token, str(value))
    for token, value in (('!D!', stats['damage']), ('!B!', stats['block']), ('!M!', stats['magic'])):
        if token in description:
            if value is None:
                problems.append(f'{where}: no value for {token}')
            else:
                description = description.replace(token, str(value))
    if re.search(r'![A-Za-z:]+!|\{[A-Z]\}', description):
        problems.append(f'{where}: leftover placeholder in "{description}"')
    return description


def blank_card(card_id, name, description, color):
    return {'id': card_id, 'name': name, 'description': description, 'cost': 1, 'type': 'Skill', 'rarity': 'Special', 'target': 'None', 'color': color,
            'damage': None, 'block': None, 'magic_number': None, 'hit_count': None,
            'exhaust': False, 'ethereal': False, 'innate': False, 'retain': False, 'self_retain': False, 'purge_on_use': False,
            'tags': [], 'keywords': [], 'upgrade': {'cost': None, 'damage': None, 'block': None, 'magic_number': None, 'description': None}}


def extract(mod, images):
    prefix = mod['id'].upper() + '_'
    site_id = lambda raw: prefix + re.sub(r'[^A-Z0-9]+', '_', raw.split(':')[-1].upper()).strip('_')
    color = mod['id']
    jar = zipfile.ZipFile(f'{WORKSHOP}/{mod["workshop"]}/{mod["jar"]}')
    names = jar.namelist()
    data_dir = ROOT / 'data' / 'mods' / mod['id']
    data_dir.mkdir(parents=True, exist_ok=True)
    card_strings = read_json(jar, mod['cards']) if 'cards' in mod else {}
    relic_strings = read_json(jar, mod['relics'])

    for kind in ('attack', 'skill', 'power'):
        copy(jar, mod['frames'].format(kind), images / 'cardui' / f'bg_{kind}_{color}.png')
    copy(jar, mod['orb'], images / 'cardui' / f'card_{color}_orb.png')
    save_portrait(jar, mod['portrait'], images / 'characters' / f'{color}.jpg')

    deck, cards, relics = [], {}, []
    with tempfile.TemporaryDirectory() as workdir:
        for suit, rank in mod.get('poker', []):
            extended = card_strings['PokerPlayerMod:PokerCard']['EXTENDED_DESCRIPTION']
            value = SUITS[suit]
            card_id = f'{prefix}{suit.upper()}_{rank}'
            name = f'{extended[value * 2]}{rank}{extended[value * 2 + 1]}'
            cards[card_id] = blank_card(card_id, name, clean_text(f'{extended[value * 2 + 8]}{rank}{extended[value * 2 + 9]}').replace('pokerplayer:', ''), color)
            copy(jar, 'PokerPlayerMod/images/cards/PokerCard.png', images / 'cards' / f'{card_id.lower()}.png')
            deck.append(card_id)

        for simple, count in mod['deck']:
            where = f'{color}/{simple}'
            text = javap(jar, names, workdir, mod['pkg'], simple, 'cards')
            raw_id = class_id(text)
            stats = card_stats(text)
            if None in (stats['type'], stats['rarity'], stats['cost']):
                problems.append(f'{where}: incomplete stats {stats}')
            if mod.get('text_in_class'):
                name, raw_description = class_text(text, 'NAME'), class_text(text, 'DESCRIPTION')
            else:
                key = strings_key(card_strings, (raw_id or simple).split(':')[-1]) or strings_key(card_strings, simple)
                if not key:
                    problems.append(f'{where}: no card text for id {raw_id}')
                    continue
                name, raw_description = card_strings[key]['NAME'], card_strings[key].get('DESCRIPTION', '')
            card_id = site_id(raw_id or simple)
            deck += [card_id] * count
            cards[card_id] = {**blank_card(card_id, name, fill(clean_text(raw_description or ''), stats, where, simple), color),
                              'cost': stats['cost'], 'type': title(stats['type']), 'rarity': title(stats['rarity']), 'target': title(stats['target']),
                              'damage': stats['damage'], 'block': stats['block'], 'magic_number': stats['magic']}
            image = find_image(names, mod['res'], 'cards', simple, name, stats['art_names'])
            if image:
                copy(jar, image, images / 'cards' / f'{card_id.lower()}.png')
            else:
                problems.append(f'{where}: no card art (tried {stats["art_names"]})')

        for simple in mod['relic']:
            text = javap(jar, names, workdir, mod['pkg'], simple, 'relics')
            raw_id = class_id(text)
            key = strings_key(relic_strings, (raw_id or simple).split(':')[-1]) or strings_key(relic_strings, simple)
            if not key:
                problems.append(f'{color}/{simple}: no relic text for id {raw_id}')
                continue
            entry = relic_strings[key]
            relic_id = site_id(raw_id or simple)
            icon = f'{relic_id.lower()}.png'
            relics.append({'id': relic_id, 'name': entry['NAME'], 'description': clean_text(relic_description(entry.get('DESCRIPTIONS', []), RELIC_VALUES.get(simple, []))),
                           'flavor': clean_text(entry.get('FLAVOR', '')) or None, 'tier': 'Starter', 'color': color, 'icon': icon})
            art = [Path(stem).name for stem in re.findall(r'([\w/]+)\.png', text)]
            image = find_image(names, mod['res'], 'relics', simple, entry['NAME'], art)
            if image:
                copy(jar, image, images / 'relics' / icon)
                copy(jar, image, images / 'relics-list' / icon)
            else:
                problems.append(f'{color}/{simple}: no relic art (tried {art})')

        if 'char' in mod:
            info = read_json(jar, mod['char'][0])[mod['char'][1]]
            name = next((n for n in info['NAMES'] if n.startswith('The ')), info['NAMES'][0][:1].upper() + info['NAMES'][0][1:])
            flavor = info['TEXT'][0]
        else:
            path, name, opening = mod['char_class']
            jar.extract(path + '.class', workdir)
            text = javap(jar, [path + '.class'], workdir, *path.rsplit('/', 2)[:1], path.rsplit('/', 1)[1], path.rsplit('/', 2)[1])
            flavor = re.search(rf'// String ({re.escape(opening)}.*)$', text, re.M)[1].replace("\\'", "'")

    character = {'id': site_id(color), 'name': name, 'color': color, 'hp': mod['hp'], 'energy_per_turn': 3, 'starting_gold': 99,
                 'starting_deck': deck, 'starting_relic': relics[0]['id'] if relics else None, 'description': clean_text(flavor).replace('\n', ' ')}

    write = lambda filename, value: (data_dir / filename).write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
    write('mod.json', {'id': mod['id'], 'name': name, 'author': mod['author'], 'url': f'https://steamcommunity.com/sharedfiles/filedetails/?id={mod["workshop"]}',
                       'colors': [{'id': color, 'label': mod['label'], 'hex': mod['hex'], 'asset_color': color}]})
    write('characters.json', [character])
    write('cards.json', sorted(cards.values(), key=lambda c: c['id']))
    write('relics.json', sorted(relics, key=lambda r: r['id']))
    print(f'{mod["id"]}: {name}, hp {mod["hp"]}, deck {len(deck)}, cards {len(cards)}, relics {len(relics)}')
    for card in cards.values():
        print(f'   {card["id"]} [{card["cost"]} {card["type"]} {card["rarity"]}] {card["name"]}: {card["description"]!r}')
    for relic in relics:
        print(f'   {relic["id"]} {relic["name"]}: {relic["description"]!r}')


def main():
    wanted = set(sys.argv[1:])
    images = ROOT / 'public' / 'images' / 'sts1'
    for mod in MODS:
        if not wanted or mod['id'] in wanted:
            extract(mod, images)
    print(f'\n{len(problems)} problems')
    for problem in problems:
        print(' -', problem)


if __name__ == '__main__':
    sys.exit(main())
