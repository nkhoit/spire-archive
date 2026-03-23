#!/usr/bin/env python3
import json
import os
import re
import zipfile
from copy import deepcopy
from pathlib import Path

ROOT = Path('/Users/kuro/code/spire-archive')
STS1_JAR = Path.home() / 'Library/Application Support/Steam/steamapps/common/SlayTheSpire/SlayTheSpire.app/Contents/Resources/desktop-1.0.jar'
STS2_LOC_ROOT = Path(os.environ.get('STS2_PCK_DIR', '/tmp/sts2-pck')) / 'localization'

STS1_ISO_TO_GAME = {
    'en': 'eng',
    'de': 'deu',
    'fr': 'fra',
    'it': 'ita',
    'es': 'spa',
    'pt': 'ptb',
    'pl': 'pol',
    'ru': 'rus',
    'tr': 'tur',
    'th': 'tha',
    'ja': 'jpn',
    'ko': 'kor',
    'zh': 'zhs',
}

STS2_ISO_TO_GAME = {
    'en': 'eng',
    'de': 'deu',
    'fr': 'fra',
    'it': 'ita',
    'es': 'spa',
    'pt': 'ptb',
    'pl': 'pol',
    'ru': 'rus',
    'tr': 'tur',
    'th': 'tha',
    'ja': 'jpn',
    'ko': 'kor',
    'zh': 'zhs',
}

STS1_CORE_KEYWORDS = ['BLOCK', 'EXHAUST', 'ETHEREAL', 'RETAIN', 'STATUS', 'CURSE']
STS2_CORE_TIP_KEYS = ['ENERGY', 'BLOCK', 'HIT_POINTS', 'MONEY_POUCH', 'DRAW_PILE', 'DISCARD_PILE', 'EXHAUST_PILE']
STS2_MAP_ROOM_KEYS = ['ROOM_ENEMY', 'ROOM_ELITE', 'ROOM_BOSS', 'ROOM_EVENT', 'ROOM_MERCHANT', 'ROOM_REST', 'ROOM_TREASURE', 'ROOM_ANCIENT']
STS2_CHARACTER_MECHANIC_KEYS = ['STAR_COUNT', 'SUMMON_STATIC', 'FORGE', 'REPLAY_STATIC', 'FATAL']


def read_json(path: Path):
    return json.loads(path.read_text())


def write_json(path: Path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def clean_whitespace(text: str) -> str:
    text = text.replace('\r\n', '\n').replace('\r', '\n')
    text = re.sub(r'[ \t]+\n', '\n', text)
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()


def clean_sts1(text: str) -> str:
    if not text:
        return ''
    text = text.replace(' NL ', '\n').replace(' NL', '\n').replace('NL ', '\n').replace('NL', '\n')
    text = re.sub(r'#[byrgpw]', '', text)
    text = text.replace('~', '').replace('@', '').replace('*', '')
    text = re.sub(r'\[(?:W|B|R|G|P)\]', 'Energy', text)
    text = re.sub(r'\s+([.,!?;:])', r'\1', text)
    text = re.sub(r' {2,}', ' ', text)
    return clean_whitespace(text)


def clean_sts2(text: str) -> str:
    if not text:
        return ''
    text = re.sub(r'\[(?:/?)(?:gold|blue|green|red|white|gray|grey)\]', '', text, flags=re.I)
    text = text.replace('{singleStarIcon}', '★')
    text = re.sub(r'\{energyPrefix:energyIcons\((\d+)\)\}', r'\1 Energy', text)
    text = re.sub(r'\{energyIcons\((\d+)\)\}', r'\1 Energy', text)
    text = re.sub(r'\s+([.,!?;:])', r'\1', text)
    text = re.sub(r' {2,}', ' ', text)
    return clean_whitespace(text)


def split_passive_evoke(text: str):
    text = clean_whitespace(text)
    passive = ''
    evoke = ''
    description = text

    passive_match = re.search(r'Passive:\s*(.*?)(?:\n+Evoke:|$)', text, flags=re.S)
    evoke_match = re.search(r'Evoke:\s*(.*?)(?:$)', text, flags=re.S)
    if passive_match:
        passive = clean_whitespace(passive_match.group(1))
    if evoke_match:
        evoke = clean_whitespace(evoke_match.group(1))
    if passive or evoke:
        parts = []
        if passive:
            parts.append(f'Passive: {passive}')
        if evoke:
            parts.append(f'Evoke: {evoke}')
        description = '\n'.join(parts)
    return description, passive, evoke


def read_sts1_lang(zf: zipfile.ZipFile, game_lang: str, filename: str):
    with zf.open(f'localization/{game_lang}/{filename}') as f:
        return json.load(f)


def extract_sts1_room_data(ui):
    legend = ui.get('Legend', {}).get('TEXT', [])
    if len(legend) < 18:
        return []
    return [
        {'id': 'UNKNOWN', 'title': clean_sts1(legend[0]), 'description': clean_sts1(legend[2])},
        {'id': 'SHOP', 'title': clean_sts1(legend[3]), 'description': clean_sts1(legend[5])},
        {'id': 'TREASURE', 'title': clean_sts1(legend[6]), 'description': clean_sts1(legend[8])},
        {'id': 'REST', 'title': clean_sts1(legend[9]), 'description': clean_sts1(legend[11])},
        {'id': 'ENEMY', 'title': clean_sts1(legend[12]), 'description': clean_sts1(legend[14])},
        {'id': 'ELITE', 'title': clean_sts1(legend[15]), 'description': clean_sts1(legend[17])},
    ]


def build_sts1_mechanics_for_lang(zf: zipfile.ZipFile, game_lang: str):
    ui = read_sts1_lang(zf, game_lang, 'ui.json')
    keywords_raw = read_sts1_lang(zf, game_lang, 'keywords.json').get('Game Dictionary', {})
    stances_raw = read_sts1_lang(zf, game_lang, 'stances.json')
    orbs_raw = read_sts1_lang(zf, game_lang, 'orbs.json')

    asc_prefix = ui.get('AscensionTextEffect', {}).get('TEXT', ['Ascension Mode Level '])[0]
    ascension = []
    for index, raw_desc in enumerate(ui.get('AscensionModeDescriptions', {}).get('TEXT', []), start=1):
        desc = clean_sts1(re.sub(r'^\s*\d+\.\s*', '', raw_desc))
        ascension.append({
            'level': index,
            'title': clean_sts1(f'{asc_prefix}{index}'),
            'description': desc,
        })

    keywords = []
    for key, value in keywords_raw.items():
        if not isinstance(value, dict):
            continue
        keywords.append({
            'id': key,
            'names': value.get('NAMES', []),
            'description': clean_sts1(value.get('DESCRIPTION', '')),
        })

    keyword_by_id = {item['id']: item for item in keywords}
    core_concepts = []
    for key in STS1_CORE_KEYWORDS:
        if key in keyword_by_id:
            item = keyword_by_id[key]
            core_concepts.append({
                'id': item['id'],
                'title': item['names'][0] if item['names'] else item['id'].title(),
                'description': item['description'],
            })

    draw_pile = ui.get('DrawPileViewScreen', {}).get('TEXT', [])
    if len(draw_pile) >= 3:
        core_concepts.append({
            'id': 'DRAW_PILE',
            'title': clean_sts1(draw_pile[2]),
            'description': clean_sts1(draw_pile[0]),
        })
    discard_pile = ui.get('DiscardPileViewScreen', {}).get('TEXT', [])
    if len(discard_pile) >= 3:
        core_concepts.append({
            'id': 'DISCARD_PILE',
            'title': clean_sts1(discard_pile[2]),
            'description': clean_sts1(discard_pile[0]),
        })
    tip_helper = ui.get('TipHelper', {}).get('TEXT', [])
    single_card_view = ui.get('SingleCardViewPopup', {}).get('TEXT', [])
    if tip_helper:
        energy_desc = clean_sts1(single_card_view[11]) if len(single_card_view) > 11 else ''
        core_concepts.append({'id': 'ENERGY', 'title': clean_sts1(tip_helper[0]), 'description': energy_desc})

    map_rooms = extract_sts1_room_data(ui)

    stances = []
    for stance_id, value in stances_raw.items():
        name = clean_sts1(value.get('NAME', ''))
        description = clean_sts1(' '.join(value.get('DESCRIPTION', [])))
        if not name or stance_id.lower() == 'neutral':
            continue
        stances.append({'id': stance_id.upper(), 'title': name, 'description': description})

    orbs = []
    for orb_id, value in orbs_raw.items():
        if orb_id.lower() == 'empty':
            continue
        name = clean_sts1(value.get('NAME', ''))
        description_raw = clean_sts1(''.join(value.get('DESCRIPTION', [])))
        description, passive, evoke = split_passive_evoke(description_raw)
        orbs.append({
            'id': orb_id.upper(),
            'title': name,
            'description': description,
            'passive': passive,
            'evoke': evoke,
        })

    return {
        'ascension': ascension,
        'map_rooms': map_rooms,
        'core_concepts': core_concepts,
        'orbs': orbs,
        'stances': stances,
        'character_mechanics': [],
        'keywords': keywords,
    }


def title_key_to_id(key: str) -> str:
    return re.sub(r'(_STATIC|_DYNAMIC)$', '', key)


def build_entries_from_tip_keys(tips, keys):
    entries = []
    for key in keys:
        title = clean_sts2(tips.get(f'{key}.title', ''))
        description = clean_sts2(tips.get(f'{key}.description', ''))
        if title or description:
            entries.append({'id': title_key_to_id(key), 'title': title or key.replace('_', ' ').title(), 'description': description})
    return entries


def build_sts2_orbs(orb_data):
    orb_ids = ['LIGHTNING_ORB', 'FROST_ORB', 'DARK_ORB', 'PLASMA_ORB', 'GLASS_ORB']
    orbs = []
    for orb_id in orb_ids:
        title = clean_sts2(orb_data.get(f'{orb_id}.title', ''))
        smart = clean_sts2(orb_data.get(f'{orb_id}.smartDescription', '') or orb_data.get(f'{orb_id}.description', ''))
        if not title:
            continue
        description, passive, evoke = split_passive_evoke(smart)
        orbs.append({
            'id': orb_id.replace('_ORB', ''),
            'title': title,
            'description': description,
            'passive': passive,
            'evoke': evoke,
        })
    return orbs


def build_sts2_keywords(game_lang: str):
    base_keywords = read_json(ROOT / 'data' / 'sts2' / 'keywords.json')
    card_keywords_path = STS2_LOC_ROOT / game_lang / 'card_keywords.json'
    if not card_keywords_path.exists():
        return deepcopy(base_keywords)
    loc = read_json(card_keywords_path)
    localized = []
    for item in base_keywords:
        loc_name = clean_sts2(loc.get(f"{item['id']}.title", item['names'][0] if item['names'] else item['id']))
        loc_desc = clean_sts2(loc.get(f"{item['id']}.description", item['description']))
        localized.append({**item, 'names': [loc_name], 'description': loc_desc})
    return localized


def build_sts2_mechanics_for_lang(game_lang: str):
    base_dir = STS2_LOC_ROOT / game_lang
    asc_data = read_json(base_dir / 'ascension.json')
    tips = read_json(base_dir / 'static_hover_tips.json')
    orb_data = read_json(base_dir / 'orbs.json')

    ascension = []
    for level in range(0, 11):
        key = f'LEVEL_{level:02d}'
        title = clean_sts2(asc_data.get(f'{key}.title', f'Ascension {level}'))
        desc = clean_sts2(asc_data.get(f'{key}.description', ''))
        ascension.append({'level': level, 'title': title, 'description': desc})

    return {
        'ascension': ascension,
        'map_rooms': build_entries_from_tip_keys(tips, STS2_MAP_ROOM_KEYS),
        'core_concepts': build_entries_from_tip_keys(tips, STS2_CORE_TIP_KEYS),
        'orbs': build_sts2_orbs(orb_data),
        'stances': [],
        'character_mechanics': build_entries_from_tip_keys(tips, STS2_CHARACTER_MECHANIC_KEYS),
        'keywords': build_sts2_keywords(game_lang),
    }


def merge_localization_with_mechanics(loc_path: Path, mechanics):
    data = read_json(loc_path) if loc_path.exists() else {}
    data['mechanics'] = mechanics
    write_json(loc_path, data)


def main():
    sts1_by_iso = {}
    with zipfile.ZipFile(STS1_JAR) as zf:
        for iso, game_lang in STS1_ISO_TO_GAME.items():
            sts1_by_iso[iso] = build_sts1_mechanics_for_lang(zf, game_lang)

    sts2_by_iso = {iso: build_sts2_mechanics_for_lang(game_lang) for iso, game_lang in STS2_ISO_TO_GAME.items()}

    write_json(ROOT / 'data' / 'sts1' / 'mechanics.json', sts1_by_iso['en'])
    write_json(ROOT / 'data' / 'sts2' / 'mechanics.json', sts2_by_iso['en'])

    for iso, mechanics in sts1_by_iso.items():
        merge_localization_with_mechanics(ROOT / 'data' / 'sts1' / 'localization' / f'{iso}.json', mechanics)

    for iso, mechanics in sts2_by_iso.items():
        merge_localization_with_mechanics(ROOT / 'data' / 'sts2' / 'localization' / f'{iso}.json', mechanics)

    print('Built mechanics data for STS1 and STS2.')


if __name__ == '__main__':
    main()
