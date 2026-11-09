#!/usr/bin/env python3
"""Aggregate Mega Crit's public STS1 run dump into data/sts1/stats.json.

Standard library only. See docs/stats-plan.md.
"""
import argparse
import gzip
import hashlib
import json
import os
import pickle
import re
import sys
from collections import Counter
from datetime import datetime, timezone
from multiprocessing import Pool
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
SCRIPT_HASH = hashlib.sha1(Path(__file__).read_bytes()).hexdigest()[:10]
CHARACTERS = {'IRONCLAD': 'ironclad', 'THE_SILENT': 'silent', 'DEFECT': 'defect', 'WATCHER': 'watcher'}
BOSS_FLOORS = {16: 'hp_pct_act1', 33: 'hp_pct_act2', 50: 'hp_pct_act3'}
FIGHT_TYPES = {'M': 'normal', 'E': 'elite', 'B': 'boss', 'BOSS': 'boss'}
FLAG_REJECTIONS = ['is_daily', 'is_endless', 'chose_seed', 'is_trial', 'is_beta']
DAMAGE_SENTINEL = 9999  # Real dumps contain fights recording ~100000 damage.
MAX_DECK = 100

# Encounters whose name differs from the monster, or that always have the same members.
# Groups with random members (Small Slimes, Gremlin Gang, Shapes) are left out on purpose.
ENCOUNTER_MEMBERS = {
    'Champ': ['The Champ'], 'Collector': ['The Collector'], 'Automaton': ['Bronze Automaton'], 'Maw': ['The Maw'],
    'The Heart': ['Corrupt Heart'], 'Shell Parasite': ['Shelled Parasite'], 'Lagavulin Event': ['Lagavulin'],
    'Blue Slaver': ['Slaver'], 'Red Slaver': ['Slaver'],
    'Donu and Deca': ['Donu', 'Deca'], 'Shield and Spear': ['Spire Shield', 'Spire Spear'],
    '3 Sentries': ['Sentry'] * 3, '2 Louse': ['Louse'] * 2, '3 Louse': ['Louse'] * 3,
    '2 Fungi Beasts': ['Fungi Beast'] * 2, 'The Mushroom Lair': ['Fungi Beast'] * 3,
    '3 Byrds': ['Byrd'] * 3, '3 Darklings': ['Darkling'] * 3, '3 Cultists': ['Cultist'] * 3,
    '2 Orb Walkers': ['Orb Walker'] * 2, 'Jaw Worm Horde': ['Jaw Worm'] * 3,
    '2 Thieves': ['Looter', 'Mugger'], 'Masked Bandits': ['Pointy', 'Romeo', 'Bear'],
    'Centurion and Healer': ['Centurion', 'Mystic'], 'Cultist and Chosen': ['Cultist', 'Chosen'],
    'Chosen and Byrds': ['Chosen', 'Byrd'], 'Shelled Parasite and Fungi': ['Shelled Parasite', 'Fungi Beast'],
    'Slavers': ['Slaver', 'Taskmaster', 'Slaver'], 'Colosseum Slavers': ['Slaver', 'Slaver'], 'Colosseum Nobs': ['Taskmaster', 'Gremlin Nob'],
}

_site = None


def norm(raw):
    """Run IDs ('Wild Strike', 'Bash+1') to the site's ID style ('WILD_STRIKE', 'BASH')."""
    return re.sub(r'[^A-Z0-9]+', '_', re.sub(r'\+\d*$', '', str(raw)).upper()).strip('_')


def site():
    """Lookups from the site's own data, loaded once per process."""
    global _site
    if _site is None:
        def load(name):
            return json.loads((ROOT / 'data' / 'sts1' / name).read_text(encoding='utf-8'))
        cards = load('cards.json')
        _site = {
            'card_info': {c['id']: (c['type'], c['cost']) for c in cards},
            'cards': {c['id']: c['name'] for c in cards},
            'relics': {r['id']: r['name'] for r in load('relics.json')},
            'potions': {p['id']: p['name'] for p in load('potions.json')},
            'monster_hp': {},
        }
        for m in load('monsters.json'):
            low, high = hp_value(m.get('min_hp')), hp_value(m.get('max_hp'))
            if low and low != 9999 and high:
                _site['monster_hp'][m['name'].lower()] = (low + high) / 2
    return _site


def hp_value(value):
    return value.get('normal') if isinstance(value, dict) else value


def ascension(run):
    return int(run.get('ascension_level') or 0) if run.get('is_ascension_mode') else 0


def band(level):
    if level == 0:
        return 'a0'
    if level <= 10:
        return 'a1_10'
    return 'a11_19' if level <= 19 else 'a20'


def reject_reason(run, min_floor, min_build=None):
    if run.get('character_chosen') not in CHARACTERS:
        return 'other_character'
    for flag in FLAG_REJECTIONS:
        if run.get(flag):
            return flag
    if not 0 <= ascension(run) <= 20:
        return 'bad_ascension'
    floor = run.get('floor_reached')
    if not isinstance(floor, (int, float)) or not 1 <= floor <= 60:
        return 'bad_floor'
    if not run.get('master_deck') or not isinstance(run.get('damage_taken'), list):
        return 'missing_fields'
    if floor < min_floor:
        return 'abandoned_early'
    if run.get('victory') and floor < 50:
        return 'impossible_victory'
    if min_build and str(run.get('build_version') or '') < min_build:
        return 'old_build'
    if not run.get('victory') and not run.get('killed_by'):
        return 'quit_run'
    if abs(len(run.get('path_per_floor') or []) - floor) > 1:
        return 'path_mismatch'  # second loops through the Spire, not flagged is_endless
    if len(run['master_deck']) > MAX_DECK:
        return 'implausible_deck'
    fights = [f for f in run['damage_taken'] if isinstance(f, dict)]
    if any((f.get('damage') or 0) >= DAMAGE_SENTINEL for f in fights):
        return 'damage_sentinel'
    named = [*run['master_deck'], *(run.get('relics') or []), *(f.get('enemies') for f in fights)]
    if any(':' in str(name) for name in named):
        return 'modded_content'
    return None


def build_period(run):
    """Quarter of the game build the run was played on, e.g. '2020-Q3'."""
    match = re.match(r'(\d{4})-(\d{2})', str(run.get('build_version') or ''))
    if not match or not 1 <= int(match[2]) <= 12:
        return 'unknown'
    return f'{match[1]}-Q{(int(match[2]) + 2) // 3}'


def bump(table, key, field, amount=1):
    row = table.setdefault(key, {})
    row[field] = row.get(field, 0) + amount


def act_of(floor):
    return 1 if floor <= 17 else 2 if floor <= 34 else 3 if floor <= 51 else 4


def run_delta(run):
    """One run as nested counts, so runs combine by simple addition."""
    info = site()['card_info']
    won = 1 if run.get('victory') else 0
    outcome = 'win' if won else 'loss'
    deck = run['master_deck']
    counts = Counter(norm(card) for card in deck)
    upgrades = Counter(norm(card) for card in deck if '+' in str(card))
    known = [info[norm(card)] for card in deck if norm(card) in info]
    costs = [cost for _, cost in known if isinstance(cost, (int, float)) and cost >= 0]
    campfires = Counter(c.get('key') for c in run.get('campfire_choices') or [])
    choices = run.get('card_choices') or []

    metrics = {
        'deck_size': len(deck),
        'upgraded_cards': sum(upgrades.values()),
        'relics': len(run.get('relics') or []),
        'potions_used': len(run.get('potions_floor_usage') or []),
        'purges': len(run.get('items_purged') or []),
        'rests': campfires['REST'],
        'smiths': campfires['SMITH'],
        'cards_picked': sum(1 for c in choices if c.get('picked') not in (None, 'SKIP', 'Singing Bowl')),
    }
    if known:
        for kind in ('Attack', 'Skill', 'Power'):
            metrics[f'{kind.lower()}_pct'] = round(100 * sum(1 for t, _ in known if t == kind) / len(known))
    if costs:
        metrics['avg_cost_x10'] = round(10 * sum(costs) / len(costs))

    hp, max_hp = run.get('current_hp_per_floor') or [], run.get('max_hp_per_floor') or []
    for floor, name in BOSS_FLOORS.items():
        if len(hp) >= floor and len(max_hp) >= floor and max_hp[floor - 1]:
            metrics[name] = round(100 * hp[floor - 1] / max_hp[floor - 1])

    delta = {
        'runs': 1,
        'wins': won,
        'floors': {int(run['floor_reached']): 1},
        'hist': {outcome: {name: {value: 1} for name, value in metrics.items()}},
        'acts': {}, 'encounters': {}, 'cards': {}, 'relics': {}, 'potions': {}, 'neow': {}, 'killed_by': {},
    }

    path = run.get('path_per_floor') or []
    for fight in run['damage_taken']:
        if not isinstance(fight, dict) or not fight.get('turns') or not fight.get('enemies'):
            continue
        floor, turns, damage = int(fight.get('floor') or 0), fight['turns'], fight.get('damage') or 0
        step = path[floor - 1] if 0 < floor <= len(path) else None
        kind = 'boss' if floor in BOSS_FLOORS else FIGHT_TYPES.get(step, 'normal')
        for table, key in ((delta['acts'], f'{act_of(floor)}|{kind}'), (delta['encounters'], str(fight.get('enemies')))):
            bump(table, key, 'fights')
            bump(table, key, 'turns', turns)
            bump(table, key, 'damage', damage)

    cards = delta['cards']
    for card_id, copies in counts.items():
        bump(cards, card_id, 'decks')
        bump(cards, card_id, 'wins', won)
        bump(cards, card_id, 'copies', copies)
        bump(cards, card_id, 'upgraded', upgrades[card_id])
    for choice in choices:
        picked = choice.get('picked')
        if picked not in (None, 'SKIP', 'Singing Bowl'):
            bump(cards, norm(picked), 'offered')
            bump(cards, norm(picked), 'picked')
        for card in choice.get('not_picked') or []:
            bump(cards, norm(card), 'offered')

    for relic in set(run.get('relics') or []):
        bump(delta['relics'], norm(relic), 'runs')
        bump(delta['relics'], norm(relic), 'wins', won)
    for potion in {p.get('key') for p in run.get('potions_obtained') or [] if isinstance(p, dict)}:
        bump(delta['potions'], norm(potion), 'runs')
        bump(delta['potions'], norm(potion), 'wins', won)
    if run.get('neow_bonus'):
        bump(delta['neow'], str(run['neow_bonus']), 'runs')
        bump(delta['neow'], str(run['neow_bonus']), 'wins', won)
    if not won and run.get('killed_by'):
        bump(delta['killed_by'], str(run['killed_by']), 'runs')
    return delta


def merge(into, other):
    for key, value in other.items():
        if isinstance(value, dict):
            merge(into.setdefault(key, {}), value)
        else:
            into[key] = into.get(key, 0) + value


def read_records(path):
    opener = gzip.open if path.suffix == '.gz' else open
    with opener(path, 'rt', encoding='utf-8') as handle:
        text = handle.read()
    try:
        data = json.loads(text)
    except json.JSONDecodeError:
        data = [json.loads(line) for line in text.splitlines() if line.strip()]
    for item in [data] if isinstance(data, dict) else data:
        if isinstance(item, dict):
            yield item.get('event', item)


def process_file(job):
    path, min_floor, min_build, cache_dir = job
    stat = path.stat()
    key = hashlib.sha1(f'{SCRIPT_HASH}|{min_floor}|{min_build}|{path.resolve()}|{stat.st_size}|{stat.st_mtime_ns}'.encode()).hexdigest()
    cached = Path(cache_dir) / f'{key}.pickle'
    if cached.exists():
        with cached.open('rb') as handle:
            return pickle.load(handle)

    result = {'read': 0, 'used': 0, 'rejected': {}, 'bad_files': 0, 'segments': {}}
    try:
        for run in read_records(path):
            result['read'] += 1
            try:
                reason = reject_reason(run, min_floor, min_build)
                delta = None if reason else run_delta(run)
            except (TypeError, ValueError, AttributeError, KeyError):
                reason, delta = 'malformed', None
            if reason:
                result['rejected'][reason] = result['rejected'].get(reason, 0) + 1
                continue
            result['used'] += 1
            character, level, period = CHARACTERS[run['character_chosen']], band(ascension(run)), build_period(run)
            for segment in (f'{period}|{c}|{a}' for c in ('all', character) for a in ('all', level)):
                merge(result['segments'].setdefault(segment, {}), delta)
    except (OSError, EOFError, ValueError) as error:
        print(f'skipping unreadable file {path}: {error}', file=sys.stderr)
        return {'read': 0, 'used': 0, 'rejected': {}, 'bad_files': 1, 'segments': {}}

    temp = cached.with_suffix('.tmp')
    with temp.open('wb') as handle:
        pickle.dump(result, handle)
    temp.replace(cached)
    return result


def summarize(hist):
    total = sum(hist.values())
    if not total:
        return None
    ordered = sorted(hist.items())
    def percentile(fraction):
        seen = 0
        for value, count in ordered:
            seen += count
            if seen >= fraction * total:
                return value
    return {
        'n': total,
        'mean': round(sum(v * c for v, c in ordered) / total, 2),
        'median': percentile(0.5),
        'p10': percentile(0.1),
        'p90': percentile(0.9),
    }


def rate(part, whole):
    return round(part / whole, 4) if whole else None


def fight_row(row):
    return {
        'fights': row['fights'],
        'avg_turns': round(row['turns'] / row['fights'], 2),
        'avg_damage': round(row['damage'] / row['fights'], 2),
        'damage_per_turn': round(row['damage'] / row['turns'], 2),
    }


def finalize_segment(raw, min_sample, unmatched):
    data = site()
    runs, wins = raw['runs'], raw['wins']
    base_rate = wins / runs

    def lookup(kind, key):
        if key in data[kind]:
            return {'id': key, 'name': data[kind][key]}
        return None

    def named(kind, key, row, count):
        match = lookup(kind, key)
        if not match:
            unmatched.setdefault(kind, Counter())[key] += count
        return match or {'id': None, 'name': key.replace('_', ' ').title()}

    cards = []
    for key, row in raw['cards'].items():
        decks, offered = row.get('decks', 0), row.get('offered', 0)
        if max(decks, offered) < min_sample:
            continue
        with_rate = rate(row.get('wins', 0), decks)
        cards.append({
            **named('cards', key, row, max(decks, offered)),
            'offered': offered,
            'pick_rate': rate(row.get('picked', 0), offered),
            'decks': decks,
            'deck_rate': rate(decks, runs),
            'win_rate': with_rate,
            'win_delta': None if with_rate is None else round(with_rate - base_rate, 4),
            'avg_copies': round(row.get('copies', 0) / decks, 2) if decks else None,
            'upgrade_rate': rate(row.get('upgraded', 0), row.get('copies', 0)),
        })

    def presence(kind):
        rows = []
        for key, row in raw[kind].items():
            if row['runs'] < min_sample:
                continue
            with_rate = rate(row.get('wins', 0), row['runs'])
            rows.append({
                **named(kind, key, row, row['runs']),
                'runs': row['runs'],
                'run_rate': rate(row['runs'], runs),
                'win_rate': with_rate,
                'win_delta': round(with_rate - base_rate, 4),
            })
        return sorted(rows, key=lambda r: (-r['runs'], r['name']))

    encounters = []
    for name, row in raw['encounters'].items():
        if row['fights'] < min_sample:
            continue
        stats = fight_row(row)
        members = [data['monster_hp'].get(m.lower()) for m in ENCOUNTER_MEMBERS.get(name, [name])]
        hp = sum(members) if all(members) else None
        encounters.append({
            'name': name,
            **stats,
            'est_enemy_hp': hp,
            'est_damage_needed_per_turn': round(hp / stats['avg_turns'], 2) if hp else None,
        })

    acts = []
    for key, row in sorted(raw['acts'].items()):
        act, kind = key.split('|')
        acts.append({'act': int(act), 'type': kind, **fight_row(row)})

    reached, floors = runs, []
    for floor in range(1, max(raw['floors']) + 1):
        floors.append([floor, rate(reached, runs)])
        reached -= raw['floors'].get(floor, 0)

    metric_names = sorted({name for side in raw['hist'].values() for name in side})
    metrics = {}
    for name in metric_names:
        metrics[name] = {
            side: summarize(raw['hist'].get(side, {}).get(name, {}))
            for side in ('win', 'loss')
        }

    killed = sorted(
        ({'name': name, 'runs': row['runs'], 'death_rate': rate(row['runs'], runs - wins)} for name, row in raw['killed_by'].items() if row['runs'] >= min_sample),
        key=lambda r: (-r['runs'], r['name']),
    )

    neow = []
    for key, row in raw['neow'].items():
        if row['runs'] >= min_sample:
            with_rate = rate(row.get('wins', 0), row['runs'])
            neow.append({'name': key.replace('_', ' ').title(), 'runs': row['runs'], 'run_rate': rate(row['runs'], runs), 'win_rate': with_rate, 'win_delta': round(with_rate - base_rate, 4)})

    return {
        'runs': runs,
        'wins': wins,
        'win_rate': round(base_rate, 4),
        'metrics': metrics,
        'deck_size_wins': sorted(raw['hist'].get('win', {}).get('deck_size', {}).items()),
        'survival': floors,
        'acts': acts,
        'encounters': sorted(encounters, key=lambda r: (-r['fights'], r['name'])),
        'cards': sorted(cards, key=lambda r: (-r['decks'], r['name'])),
        'relics': presence('relics'),
        'potions': presence('potions'),
        'neow': sorted(neow, key=lambda r: (-r['runs'], r['name'])),
        'killed_by': killed,
    }


def rollup(raw_segments):
    """Quarterly counts into {'all': ..., '2020': ..., '2020-Q3': ...}. Unknown builds only count toward 'all'."""
    periods = {}
    for key, raw in raw_segments.items():
        period, segment = key.split('|', 1)
        for target in ['all'] + ([] if period == 'unknown' else [period, period[:4]]):
            merge(periods.setdefault(target, {}).setdefault(segment, {}), raw)
    return periods


def period_order(period):
    return (-int(period[:4]), 0 if len(period) == 4 else 1, -int(period[-1]))


def find_files(input_dir):
    root = Path(input_dir)
    return sorted(p for pattern in ('*.json', '*.json.gz') for p in root.rglob(pattern) if p.is_file())


def inspect(files):
    if not files:
        return
    records = []
    for run in read_records(files[0]):
        records.append(run)
        if len(records) == 1000:
            break
    fields = Counter(key for run in records for key in run)
    print(f'{len(files)} files. Sampled {len(records)} runs from {files[0]}.\n')
    for key, count in sorted(fields.items()):
        print(f'{key:32} {100 * count / len(records):5.1f}%')
    print('\nFirst run:\n' + json.dumps(records[0], indent=1)[:4000])
    print('\nRejections in this sample:', Counter(reject_reason(r, 4) for r in records))


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('input', help='folder containing the extracted .json or .json.gz files')
    parser.add_argument('--out', default=str(ROOT / 'data' / 'sts1' / 'stats.json'))
    parser.add_argument('--workers', type=int, default=max(1, (os.cpu_count() or 2) - 1))
    parser.add_argument('--min-sample', type=int, default=100)
    parser.add_argument('--min-floor', type=int, default=4)
    parser.add_argument('--min-build', help='drop runs from builds older than this, e.g. 2020-01-27')
    parser.add_argument('--limit-files', type=int)
    parser.add_argument('--cache-dir', default=str(Path.home() / '.cache' / 'spire-stats'))
    parser.add_argument('--inspect', action='store_true', help='print the fields of the first file and exit')
    args = parser.parse_args(argv)

    files = find_files(args.input)
    if args.limit_files:
        files = files[:args.limit_files]
    if not files:
        sys.exit(f'No .json or .json.gz files under {args.input}')
    if args.inspect:
        inspect(files)
        return None

    Path(args.cache_dir).mkdir(mode=0o700, parents=True, exist_ok=True)  # Cache files are pickles, so keep them private.
    jobs = [(path, args.min_floor, args.min_build, args.cache_dir) for path in files]
    total = {'read': 0, 'used': 0, 'rejected': {}, 'bad_files': 0, 'segments': {}}
    with Pool(args.workers) as pool:
        for done, result in enumerate(pool.imap_unordered(process_file, jobs), 1):
            merge(total, result)
            if done % 10 == 0 or done == len(jobs):
                print(f'{done}/{len(jobs)} files, {total["used"]:,} runs kept of {total["read"]:,}', flush=True)

    if not total['segments']:
        sys.exit('No usable runs. Check the output of --inspect.')

    unmatched = {}
    raw_periods = rollup(total['segments'])
    segments = {key: finalize_segment(raw, args.min_sample, unmatched) for key, raw in raw_periods.pop('all').items() if raw['runs'] >= args.min_sample}
    # Below min_sample a segment's tiles and charts would describe individual runs.
    periods = {
        period: {key: finalize_segment(raw, args.min_sample, {}) for key, raw in raw_periods[period].items() if raw['runs'] >= args.min_sample}
        for period in sorted(raw_periods, key=period_order)
        if raw_periods[period]['all|all']['runs'] >= args.min_sample
    }
    output = {
        'meta': {
            'generated_at': datetime.now(timezone.utc).isoformat(timespec='seconds'),
            'files': len(files),
            'bad_files': total['bad_files'],
            'runs_read': total['read'],
            'runs_used': total['used'],
            'rejected': total['rejected'],
            'min_sample': args.min_sample,
            'periods': [{'id': 'all', 'runs': total['used']}, *({'id': p, 'runs': s['all|all']['runs']} for p, s in periods.items())],
            'unmatched': {kind: dict(counter.most_common(100)) for kind, counter in unmatched.items()},
        },
        'segments': segments,
    }
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    period_dir = out.with_name(f'{out.stem}-periods')
    period_dir.mkdir(exist_ok=True)
    for stale in period_dir.glob('*.json'):
        stale.unlink()
    for period, data in periods.items():
        (period_dir / f'{period}.json').write_text(json.dumps(data, separators=(',', ':')), encoding='utf-8')
    temp = out.with_suffix('.tmp')
    temp.write_text(json.dumps(output, separators=(',', ':')), encoding='utf-8')
    temp.replace(out)
    print(f'Wrote {out} ({out.stat().st_size / 1e6:.1f} MB). Rejected: {total["rejected"]}. Unmatched: { {k: len(v) for k, v in unmatched.items()} }')
    return {**output, 'periods': periods}


if __name__ == '__main__':
    main()
