"""Build STS1 event data from game localization + Java source.

Strategy: 
- Parse OPTIONS from localization, merge split entries using Java source analysis
- Manual overrides for events with runtime-computed choice text
- Generate clean English events.json + localized overlays

Outputs: data/sts1/events.json + updates data/sts1/localization/*.json
"""

import json
import os
import re
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).parent.parent
EVENTS_DIR = PROJECT_ROOT / "sts-full" / "com" / "megacrit" / "cardcrawl" / "events"
LOC_DIR = PROJECT_ROOT / "sts-data" / "localization"

LANG_MAP = {
    'en': 'eng', 'ja': 'jpn', 'ko': 'kor', 'zh': 'zhs',
    'de': 'deu', 'fr': 'fra', 'es': 'spa', 'pt': 'ptb',
    'it': 'ita', 'pl': 'pol', 'ru': 'rus', 'tr': 'tur', 'th': 'tha',
}

ACT_DIRS = ['exordium', 'city', 'beyond', 'shrines']

# Manual choice definitions for events with runtime-concatenated OPTIONS.
# Format: event_loc_id -> list of (indices_list, fill_values) tuples
# indices_list = which OPTIONS[i] to join, fill_values = values between them
# None = skip this option
OPTION_MERGES = {
    'Big Fish': [
        ([0, 1], ['⅓ Max ']),       # [Banana] Heal ⅓ Max HP.
        ([2, 3], ['5']),              # [Donut] Max HP +5.
        ([4], []),                    # [Box] Obtain a Relic. Become Cursed - Regret.
        ([5], []),                    # [Leave]
    ],
    'The Cleric': [
        ([0, 8], ['⅓ Max ']),        # [Heal] 35 Gold: Heal ⅓ Max HP.
        ([3, 4], ['50']),             # [Purify] 50 Gold: Remove a card from your deck.
        ([6], []),                    # [Leave]
    ],
    'Golden Idol': [
        None,                         # [Take] has no concat
        None,                         # others...
        # Handled by fallback with override below
    ],
    'Golden Wing': [
        ([0, 1], ['25%']),            # [Pray] Remove a card. Lose 25% HP.
        ([2, 3, 4], ['50', '80']),    # [Destroy] Gain 50-80 Gold.
        ([7], []),                     # [Leave]
    ],
    'World of Goop': [
        ([0, 1, 2], ['75', '11']),    # [Gather Gold] Gain 75 Gold. Take 11 damage.
        ([3, 4], ['?']),              # [Leave It] Lose ? Gold.
    ],
    'Scrap Ooze': [
        ([0, 1, 2], ['?', '?%']),     # [Dig Through] Take ? damage. ?% to get Relic.
        ([3], []),                     # [Leave]
    ],
    'Shining Light': [
        ([0, 1], ['20%']),            # [Enter] Upgrade 2 random cards. Take 20% damage.
        ([2], []),                     # [Leave]
    ],
    'Liars Game': [
        ([0, 1], ['150']),            # [Agree] Gain 150 Gold. Become Cursed.
        ([2], []),                     # [Disagree]
    ],
    'Addict': [
        ([0, 1], ['85']),             # [Offer Gold] 85 Gold: Obtain a Relic.
        ([4], []),                     # [Rob]
        ([5], []),                     # [Leave]
    ],
    'Beggar': [
        ([0, 1], ['75']),             # [Offer Gold] 75 Gold: Remove a card.
        ([4], []),                     # [Continue]
        ([5], []),                     # [Leave]
    ],
    'Cursed Tome': [
        ([0], []),                     # [Read]
        ([1], []),                     # [Continue] Lose 1 HP.
        ([2], []),                     # [Continue] Lose 2 HP.
        ([3], []),                     # [Continue] Lose 3 HP.
        ([4], []),                     # [Stop] Lose 3 HP.
        ([5, 6], ['?']),              # [Take] Obtain the Book. Lose ? HP.
        ([7], []),                     # [Leave]
    ],
    'Forgotten Altar': [
        None,                          # handled below
        None,
    ],
    'Ghosts': [
        ([0, 1], ['?']),              # [Accept] Lose ? HP. Obtain 5 Apparitions.
        ([2], []),                     # [Refuse]
    ],
    'Knowing Skull': [
        ([0], []),                     # [Continue]
        ([2], []),                     # [Information?] Reveal the Boss.
        ([3, 1], ['?']),              # [Success?] Get a Colorless Card. Lose ? HP.
        ([4, 1], ['?']),              # [A Pick Me Up?] Get a Potion. Lose ? HP.
        ([5, 6, 1], ['90', '?']),     # [Riches?] Gain 90 Gold. Lose ? HP.
        ([7, 1], ['6']),              # [How do I leave?] Lose 6 HP.
        ([8], []),                     # [Leave]
    ],
    'Nest': [
        ([0, 1], ['99']),             # [Smash] Gain 99 Gold. Obtain Ritual Dagger.
        ([2], []),                     # [Leave]
    ],
    'The Joust': [
        ([0], []),                     # [Bet on the Owner]
        ([4, 5, 3], ['50', '250']),   # [Bet on Murderer] 50 Gold: Win 250 Gold.
        ([6], []),                     # [Leave]
    ],
    'The Library': [
        ([0], []),                     # [Read]
        ([1, 2], ['?']),              # [Sleep] Heal ? HP.
    ],
    'The Mausoleum': [
        ([0, 1], ['50%']),            # [Open Coffin] Obtain a Relic. 50%: Become Cursed.
        ([2], []),                     # [Leave]
    ],
    'Vampires': [
        ([0, 1], ['30%']),            # [Accept] Remove Strikes. Get Bites. Lose 30% Max HP.
        ([2], []),                     # [Refuse]
        ([5], []),                     # [Leave]
    ],
    'Falling': [
        ([0, 1], ['a Skill']),        # [Land] Lose a Skill.
        ([2, 3], ['a Power']),        # [Channel] Lose a Power.
        ([4, 5], ['an Attack']),      # [Strike] Lose an Attack.
    ],
    'The Moai Head': [
        ([0, 1], ['?']),              # [Enter] Lose ? Max HP.
        ([2], []),                     # [Leave]
    ],
}

# Events where choice text needs complete override (localization merging doesn't work well)
CHOICE_OVERRIDES = {
    'Big Fish': [
        '[Banana] Heal ⅓ Max HP.',
        '[Donut] Max HP +5.',
        '[Box] Obtain a Relic. Become Cursed - Regret.',
        '[Leave]',
    ],
    'The Cleric': [
        '[Heal] 35 Gold: Heal ⅓ Max HP.',
        '[Purify] 50 Gold: Remove a card from your deck.',
        '[Leave]',
    ],
    'Golden Idol': [
        '[Take] Gain the Golden Idol (Relic).',
        '[Run] Gain the Golden Idol. Take 25% Max HP damage.',
        '[Leave]',
    ],
    'Golden Wing': [
        '[Pray] Remove a card from your deck. Lose 25% HP.',
        '[Destroy] Gain 50-80 Gold.',
        '[Leave]',
    ],
    'World of Goop': [
        '[Gather Gold] Gain 75 Gold. Take 11 damage.',
        '[Leave It] Lose some Gold.',
    ],
    'Scrap Ooze': [
        '[Reach Inside] Take damage. Chance to find a Relic.',
        '[Leave]',
    ],
    'Shining Light': [
        '[Enter] Upgrade 2 random cards. Take 20% Max HP damage.',
        '[Leave]',
    ],
    'Liars Game': [
        '[Agree] Gain 150 Gold. Become Cursed - Doubt.',
        '[Disagree]',
    ],
    'Addict': [
        '[Offer Gold] 85 Gold: Obtain a Relic.',
        '[Rob] Obtain a Relic. Become Cursed - Shame.',
        '[Leave]',
    ],
    'Beggar': [
        '[Offer Gold] 75 Gold: Remove a card from your deck.',
        '[Continue]',
        '[Leave]',
    ],
    'Cursed Tome': [
        '[Read]',
        '[Continue] Lose 1 HP.',
        '[Continue] Lose 2 HP.',
        '[Continue] Lose 3 HP.',
        '[Stop] Lose 3 HP.',
        '[Take] Obtain the Book. Lose HP.',
        '[Leave]',
    ],
    'Forgotten Altar': [
        '[Offer] Gain Darkstone Periapt (Relic).',
        '[Sacrifice] Gain 5 Max HP. Lose HP.',
        '[Desecrate] Become Cursed - Decay.',
    ],
    'Ghosts': [
        '[Accept] Receive 5 Apparition. Lose Max HP.',
        '[Refuse]',
    ],
    'Knowing Skull': [
        '[Continue]',
        '[Information?] Reveal the Boss. Lose HP.',
        '[Success?] Get a Colorless Card. Lose HP.',
        '[A Pick Me Up?] Get a Potion. Lose HP.',
        '[Riches?] Gain 90 Gold. Lose HP.',
        '[How do I leave?] Lose 6 HP.',
        '[Leave]',
    ],
    'Nest': [
        '[Smash and Grab] Gain 99 Gold. Obtain Ritual Dagger. Fight Nests.',
        '[Leave]',
    ],
    'The Joust': [
        '[Bet on Owner] 50 Gold: Win 100 Gold.',
        '[Bet on Murderer] 50 Gold: Win 250 Gold (risky).',
        '[Leave]',
    ],
    'The Library': [
        '[Read] Choose 1 of 20 cards to add to your deck.',
        '[Sleep] Heal ⅓ Max HP.',
    ],
    'The Mausoleum': [
        '[Open Coffin] Obtain a Relic. 50%: Become Cursed - Writhe.',
        '[Leave]',
    ],
    'Vampires': [
        '[Accept] Remove all Strikes. Receive 5 Bites. Lose 30% Max HP.',
        '[Refuse]',
    ],
    'Falling': [
        '[Land] Lose a Skill card.',
        '[Channel] Lose a Power card.',
        '[Strike] Lose an Attack card.',
    ],
    'The Moai Head': [
        '[Jump Inside] Heal to full HP. Lose Max HP.',
        '[Offer: Golden Idol] Gain 333 Gold. Lose Golden Idol.',
        '[Leave]',
    ],
    'Designer': [
        '[Adjustments] Lose 40 Gold. Upgrade a card.',
        '[Clean Up] Lose 60 Gold. Remove a card.',
        '[Full Service] Lose 90 Gold. Remove a card and upgrade a card.',
        '[Punch] Lose 5 HP.',
    ],
    'The Woman in Blue': [
        '[Buy 1 Potion] Lose 20 Gold. Obtain a Potion.',
        '[Buy 2 Potions] Lose 30 Gold. Obtain 2 Potions.',
        '[Buy 3 Potions] Lose 40 Gold. Obtain 3 Potions.',
        '[Leave]',
    ],
    "N'loth": [
        'Exchange a Relic for a special reward.',
        '[Leave]',
    ],
    'Dead Adventurer': [
        '[Search] Find Loot. Chance of combat.',
        '[Leave]',
    ],
    'Drug Dealer': [
        '[Test J.A.X.] Get JAXXED.',
        '[Become Test Subject] Transform 2 cards.',
        '[Ingest Mutagens] Obtain a special relic.',
        '[Leave]',
    ],
    'Winding Halls': [
        '[Retrace Your Steps] Lose Max HP.',
        '[Push Forward] Heal HP.',
        '[Focus] Become Cursed - Writhe. Heal HP.',
    ],
    'WeMeetAgain': [
        '[Give Potion] Lose a Potion. Obtain a Relic.',
        '[Give Gold] Lose Gold. Obtain a Relic.',
        '[Give Card] Lose a Card. Obtain a Relic.',
        '[Attack] Fight the thief.',
    ],
    'Wheel of Change': [
        'Spin the wheel! Random result.',
    ],
    'Golden Shrine': [
        '[Pray] Gain Gold.',
        '[Desecrate] Gain 275 Gold. Become Cursed - Regret.',
        '[Leave]',
    ],
    'SensoryStone': [
        '[Recall (1)] Add 1 Colorless card to your deck.',
        '[Recall (2)] Add 2 Colorless cards to your deck. Lose HP.',
        '[Recall (3)] Add 3 Colorless cards to your deck. Lose HP.',
    ],
    'Spire Heart': [
        '[Continue]',
    ],
    'Ghosts': [
        '[Accept] Receive Apparitions. Lose Max HP.',
        '[Refuse]',
    ],
}


def clean_text(s: str) -> str:
    """Remove STS1 formatting codes."""
    s = re.sub(r'#[grybp] ?', '', s)
    s = s.replace('~', '').replace('@', '')
    s = re.sub(r'\bNL\b', '\n', s)
    s = re.sub(r' +', ' ', s)
    return s.strip()


def load_loc(lang_code: str) -> dict:
    path = LOC_DIR / lang_code / 'events.json'
    if not path.exists():
        return {}
    with open(path) as f:
        return json.load(f)


def extract_event_id_from_java(java_path: str) -> str | None:
    with open(java_path) as f:
        source = f.read()
    m = re.search(r'public static final String ID\s*=\s*"([^"]+)"', source)
    return m.group(1) if m else None


def to_upper_snake(s: str) -> str:
    s = re.sub(r'[^A-Za-z0-9]', '_', s).upper()
    s = re.sub(r'_+', '_', s).strip('_')
    return s


def build_event_map() -> dict[str, str]:
    """Map event string ID -> act from Java source."""
    event_acts = {}
    for act in ACT_DIRS:
        act_dir = EVENTS_DIR / act
        if not act_dir.is_dir():
            continue
        for java_file in sorted(act_dir.glob('*.java')):
            if java_file.name.startswith('Abstract'):
                continue
            event_id = extract_event_id_from_java(str(java_file))
            if event_id:
                event_acts[event_id] = act
    return event_acts


def build_choices_from_merges(merges: list, options_arr: list[str]) -> list[str]:
    """Build choice strings using merge definitions."""
    choices = []
    for entry in merges:
        if entry is None:
            continue
        indices, fills = entry
        parts = []
        for i, idx in enumerate(indices):
            if idx < len(options_arr):
                parts.append(clean_text(options_arr[idx]))
            if i < len(fills):
                parts.append(fills[i])
        text = ''.join(parts)
        if text:
            choices.append(text)
    return choices


def build_choices_fallback(options_arr: list[str]) -> list[str]:
    """Fallback: merge OPTIONS by bracket-start heuristic."""
    merged = []
    current = None
    for opt in options_arr:
        cleaned = clean_text(opt)
        if not cleaned or cleaned.startswith('Select a Card') or cleaned.startswith('Choose a Card'):
            continue
        if opt.strip().startswith('['):
            if current is not None:
                merged.append(current)
            if cleaned.startswith('[Locked]'):
                current = None
                continue
            current = cleaned
        else:
            if current is not None:
                current += ' ' + cleaned
            # else: orphaned continuation, skip
    if current is not None:
        merged.append(current)
    return merged


def build_events_for_locale(event_acts: dict, lang: str) -> list[dict]:
    loc_code = LANG_MAP.get(lang, 'eng')
    loc = load_loc(loc_code)
    is_english = lang == 'en'

    events = []
    for event_id, act in event_acts.items():
        loc_entry = loc.get(event_id, {})
        if not loc_entry:
            continue

        name = loc_entry.get('NAME', event_id)
        descriptions = loc_entry.get('DESCRIPTIONS', [])
        options_arr = loc_entry.get('OPTIONS', [])

        intro = clean_text(descriptions[0]) if descriptions else ''

        # Build choices
        if is_english and event_id in CHOICE_OVERRIDES:
            choices = CHOICE_OVERRIDES[event_id]
        elif event_id in OPTION_MERGES:
            choices = build_choices_from_merges(OPTION_MERGES[event_id], options_arr)
        else:
            choices = build_choices_fallback(options_arr)

        snake_id = to_upper_snake(event_id)

        events.append({
            'id': snake_id,
            'name': name,
            'act': act,
            'description': intro,
            'choices': [{'option': c, 'description': '', 'outcome': ''} for c in choices],
            'image_url': None,
        })

    events.sort(key=lambda e: e['name'])
    return events


def main():
    event_acts = build_event_map()
    print(f'Found {len(event_acts)} events from Java source', file=sys.stderr)

    events = build_events_for_locale(event_acts, 'en')
    print(f'Built {len(events)} events for English', file=sys.stderr)

    total_choices = sum(len(e['choices']) for e in events)
    print(f'Total choices: {total_choices}', file=sys.stderr)

    # Write English events
    output_path = PROJECT_ROOT / 'data' / 'sts1' / 'events.json'
    with open(output_path, 'w') as f:
        json.dump(events, f, indent=2, ensure_ascii=False)
    print(f'Wrote {output_path}', file=sys.stderr)

    # Build localized overlays
    for lang in LANG_MAP:
        if lang == 'en':
            continue
        loc_events = build_events_for_locale(event_acts, lang)
        overlay = {}
        for ev in loc_events:
            overlay[ev['id']] = {
                'name': ev['name'],
                'description': ev['description'],
                'choices': [c['option'] for c in ev['choices']],
            }
        loc_path = PROJECT_ROOT / 'data' / 'sts1' / 'localization' / f'{lang}.json'
        if loc_path.exists():
            with open(loc_path) as f:
                existing = json.load(f)
        else:
            existing = {}
        existing['events'] = overlay
        with open(loc_path, 'w') as f:
            json.dump(existing, f, indent=2, ensure_ascii=False)
        print(f'Updated {lang}: {len(overlay)} events', file=sys.stderr)


if __name__ == '__main__':
    main()
