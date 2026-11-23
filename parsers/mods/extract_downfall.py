#!/usr/bin/env python3
"""Extract Downfall character cards and relics from its Java source and resources.

Usage: python3 parsers/mods/extract_downfall.py --source /path/to/DownfallSTS
Only the selected character packages are read; shared and expansion content is out of scope.
"""
import argparse
import ast
import json
import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
AUTHOR = 'The Downfall Collab Team'
URL = 'https://steamcommunity.com/sharedfiles/filedetails/?id=1610056683'


def deck(*cards):
    return [(name, count) for name, count in cards]


# Source package, localization resource and mod color mappings are shared with the
# original starter-only parser so character IDs, colors and starting deck IDs remain stable.
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


def clean_text(text):
    """Game markup to safe, plain text; preserve the site's [E] energy marker."""
    text = re.sub(r'\s*\bNL\b\s*', '\n', str(text or ''))
    text = re.sub(r'<[^>]*>', '', text)
    text = re.sub(r'&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]+);', ' ', text, flags=re.I)
    text = re.sub(r'\[#[0-9a-fA-F]+\]|\[\]', '', text)
    text = re.sub(r'(?<![\w])#[a-z]', '', text, flags=re.I)
    text = re.sub(r'\[[RGBWE]\]|\[[a-zA-Z]*:?[a-zA-Z]*[Ee]nergy[a-zA-Z]*\]', '[E]', text)
    text = re.sub(r'\b[A-Za-z]+:(?=[A-Z])', '', text)
    text = re.sub(r'(?<!\w)\*(?=\w)', '', text)
    text = re.sub(r'\s*\[REMOVE_SPACE\]', '', text)
    text = re.sub(r'(?<=[A-Za-z])_(?=[A-Z])', ' ', text)
    text = re.sub(r'\[E\] +(?=[.,])', '[E]', text)
    text = re.sub(r'[ \t]+', ' ', text).strip()
    return text.replace('<', '').replace('>', '')


def _strip_comments(source):
    source = re.sub(r'/\*.*?\*/', '', source, flags=re.S)
    return re.sub(r'(?m)//.*$', '', source)


def _number(expression, constants):
    """Evaluate only integer literals and simple arithmetic from Java constant expressions."""
    expression = re.sub(r'\b(?:this\.)', '', expression.strip())
    expression = re.sub(r'\b([0-9]+)[lLfFdD]\b', r'\1', expression)
    expression = expression.strip('() ')
    if re.fullmatch(r'[A-Za-z_$][\w$]*', expression):
        return constants.get(expression)
    try:
        tree = ast.parse(expression, mode='eval')
    except (SyntaxError, ValueError):
        return None

    def ev(node):
        if isinstance(node, ast.Expression):
            return ev(node.body)
        if isinstance(node, ast.Constant) and isinstance(node.value, int):
            return node.value
        if isinstance(node, ast.Name):
            return constants.get(node.id)
        if isinstance(node, ast.UnaryOp) and isinstance(node.op, (ast.UAdd, ast.USub)):
            value = ev(node.operand)
            return value if isinstance(node.op, ast.UAdd) else -value if value is not None else None
        if isinstance(node, ast.BinOp) and isinstance(node.op, (ast.Add, ast.Sub, ast.Mult, ast.FloorDiv, ast.Div)):
            left, right = ev(node.left), ev(node.right)
            if left is None or right is None or (isinstance(node.op, (ast.Div, ast.FloorDiv)) and not right):
                return None
            if isinstance(node.op, ast.Add): return left + right
            if isinstance(node.op, ast.Sub): return left - right
            if isinstance(node.op, ast.Mult): return left * right
            return int(left / right)
        return None
    return ev(tree)


def _constants(source):
    declarations = re.findall(r'\b(?:static\s+)?(?:final\s+)?int\s+(\w+)\s*=\s*([^;]+);', source)
    values = {}
    for _ in range(4):
        changed = False
        for name, expr in declarations:
            value = _number(expr, values)
            if value is not None and values.get(name) != value:
                values[name] = value
                changed = True
        if not changed:
            break
    return values


def _balanced_body(source, pattern):
    match = re.search(pattern, source)
    if not match:
        return ''
    opening = source.find('{', match.start())
    depth = 0
    for index in range(opening, len(source)):
        if source[index] == '{': depth += 1
        elif source[index] == '}':
            depth -= 1
            if depth == 0:
                return source[opening + 1:index]
    return ''


def _constructor(source, class_name):
    return _balanced_body(source, rf'\b{re.escape(class_name)}\s*\([^;{{}}]*\)\s*\{{')


def _arg_list(text, start):
    opening = text.find('(', start)
    if opening < 0: return []
    depth, args, mark = 0, [], opening + 1
    for i in range(opening + 1, len(text)):
        if text[i] == '(':
            depth += 1
        elif text[i] == ')':
            if depth == 0:
                args.append(text[mark:i].strip())
                return args
            depth -= 1
        elif text[i] == ',' and depth == 0:
            args.append(text[mark:i].strip())
            mark = i + 1
    return []


def _super_card_values(constructor, constants):
    match = re.search(r'\bsuper\s*\(', constructor)
    if not match: return None, None, None, None
    args = _arg_list(constructor, match.start())
    joined = ','.join(args)
    type_match = re.search(r'CardType\.([A-Z_]+)', joined)
    rarity_match = re.search(r'CardRarity\.([A-Z_]+)', joined)
    target_match = re.search(r'CardTarget\.([A-Z_]+)', joined)
    type_index = next((i for i, a in enumerate(args) if 'CardType.' in a or a.strip() == 'TYPE'), -1)
    cost = constants.get('COST')
    if cost is None and type_index > 0:
        for arg in reversed(args[:type_index]):
            val = _number(arg, constants)
            if val is not None:
                cost = val
                break
    return cost, type_match[1] if type_match else None, rarity_match[1] if rarity_match else None, target_match[1] if target_match else None


def _assignments(body, constants):
    values = {}
    fields = r'(?:base\w+|defaultBase\w+|defaultSecondMagicNumber|secondaryM)'
    for field, expr in re.findall(rf'\b(?:this\.)?({fields})\s*=\s*([^;]+);', body):
        expression = expr.rsplit('=', 1)[-1]
        expression = re.sub(r'\bmisc\b', '0', expression)
        value = _number(expression, constants)
        if value is not None:
            values[field] = value
    return values


def _upgrade_info(source, constants):
    methods = []
    for method in ('upgrade', 'upp'):
        body = _balanced_body(source, rf'\b(?:(?:public|protected|private)\s+)?(?:void|boolean)\s+{method}\s*\([^)]*\)\s*\{{')
        if body: methods.append(body)
    body = '\n'.join(methods)
    changes = {'cost': None, 'damage': None, 'block': None, 'magic_number': None}
    custom = {}
    mapping = {'upgradeBaseCost': 'cost', 'upgradeDamage': 'damage', 'upgradeBlock': 'block', 'upgradeMagicNumber': 'magic_number'}
    for call, args in re.findall(r'\b(upgrade\w+)\s*\(([^()]*)\)', body):
        if call not in mapping and not call.startswith('upgrade'):
            continue
        value = _number(args, constants)
        if value is None: continue
        field = mapping.get(call)
        if field:
            changes[field] = value
        else:
            suffix = call[len('upgrade'):]
            custom_name = suffix[0].lower() + suffix[1:]
            custom_name = {'downfall': 'downfallMagic', 'defaultSecondMagicNumber': 'secondMagicNumber', 'slime': 'slimed'}.get(custom_name, custom_name)
            custom[custom_name] = value
    return changes, custom


def parse_card_source(source):
    """Return source-derived card statistics, constructor flags and upgrade deltas."""
    source = _strip_comments(source)
    constants = _constants(source)
    class_match = re.search(r'\bclass\s+(\w+)', source)
    class_name = class_match[1] if class_match else ''
    constructor = _constructor(source, class_name) if class_name else ''
    for field, expression in re.findall(r'\b(?:this\.)?(\w+)\s*=\s*([^;]+);', constructor):
        value = _number(expression.rsplit('=', 1)[-1], constants)
        if value is not None:
            constants.setdefault(field, value)
    cost, card_type, rarity, target = _super_card_values(constructor, constants)
    if cost is None: cost = constants.get('COST')
    if card_type is None:
        match = re.search(r'CardType\.([A-Z_]+)', source)
        card_type = match[1] if match else None
    if rarity is None:
        match = re.search(r'CardRarity\.([A-Z_]+)', source)
        rarity = match[1] if match else None
    if target is None:
        match = re.search(r'CardTarget\.([A-Z_]+)', source)
        target = match[1] if match else None
    fields = _assignments(constructor, constants)
    damage = fields.get('baseDamage')
    block = fields.get('baseBlock')
    magic = fields.get('baseMagicNumber')
    if magic is None:
        magic = constants.get('MAGIC')
    if magic is None and 'loadGemMisc' in constructor:
        magic = 0  # Source initializes this dynamic display counter from the current gem count.
    custom = {}
    for field, value in fields.items():
        if field in ('baseDamage', 'baseBlock', 'baseMagicNumber'):
            continue
        prefix = 'defaultBase' if field.startswith('defaultBase') else 'base' if field.startswith('base') else ''
        name = field[len(prefix):] if prefix else field
        custom[name[0].lower() + name[1:]] = value
    upgrades, custom_upgrade = _upgrade_info(source, constants)
    for field in custom_upgrade:
        custom.setdefault(field, 0)
    booleans = {}
    for source_name, output_name in (('exhaust', 'exhaust'), ('isEthereal', 'ethereal'), ('ethereal', 'ethereal'), ('isInnate', 'innate'), ('innate', 'innate'), ('retain', 'retain'), ('selfRetain', 'self_retain'), ('purgeOnUse', 'purge_on_use')):
        match = re.search(rf'\b(?:this\.)?{source_name}\s*=\s*(true|false)\s*;', constructor)
        if match: booleans[output_name] = match[1] == 'true'
    hit_count = next((fields[k] for k in ('baseHitCount', 'baseHits', 'baseMulti', 'baseCool', 'baseAuto') if k in fields), None)
    if hit_count is None:
        hit_count = custom.get('cool', custom.get('auto'))
    return {'cost': cost, 'type': card_type, 'rarity': rarity, 'target': target,
            'damage': damage, 'block': block, 'magic': magic, 'custom': custom,
            'upgrade': upgrades, 'custom_upgrade': custom_upgrade,
            'booleans': booleans, 'hit_count': hit_count}


def _id_suffix(source, class_name):
    match = re.search(r'\bID\s*=\s*(?:[\w.]+\s*\(\s*(?:"([^"]+)"|[\w.]+\.class\.getSimpleName\(\))\s*\)|"([^"]+)")', source)
    raw = ((match[1] or match[2]) if match else None) or class_name
    return raw.rsplit(':', 1)[-1]


def _localized_key(strings, id_suffix, class_name):
    for target in (id_suffix, class_name):
        key = next((k for k in strings if k.rsplit(':', 1)[-1].lower() == target.lower()), None)
        if key: return key
    return None


def _simple_title(value):
    return value.replace('_', ' ').title() if value else None


def _substitute(text, values, custom_values, color, label):
    text = clean_text(text)
    numeric = {'!D!': values.get('damage'), '!B!': values.get('block'), '!M!': values.get('magic')}
    for token, value in numeric.items():
        if token in text:
            if value is None:
                problems.append(f'{color}/{label}: no source value for {token}')
                text = text.replace(token, '')
            else:
                text = text.replace(token, str(value))
    remaining = set(re.findall(r'!([A-Za-z0-9_:]+)!', text))
    for token in sorted(remaining):
        normalized = re.sub(r'[^a-z0-9]', '', token.lower())
        aliases = {'awakenedm2': 'secondmagic', 'slime': 'slimed', 'burny': 'burn', 'clm2': 'secondmagic', 'bauto': 'auto', 'dm': 'downfallmagic', 'qqq': 'silly', 'guardiansecondm': 'secondarym', 'secondmagic': 'secondmagicnumber'}
        wanted = aliases.get(normalized, normalized)
        match_key = next((k for k in custom_values
                          if re.sub(r'[^a-z0-9]', '', k.lower()) == wanted
                          or wanted in re.sub(r'[^a-z0-9]', '', k.lower())
                          or re.sub(r'[^a-z0-9]', '', k.lower()) in wanted), None)
        if match_key is None and normalized == 'slimeboundselfharm':
            match_key = next((k for k in custom_values if 'selfdamage' in k.lower()), None)
        value = custom_values.get(match_key) if match_key else None
        if value is None:
            problems.append(f'{color}/{label}: unresolved placeholder !{token}!')
            text = text.replace(f'!{token}!', '')
        else:
            text = text.replace(f'!{token}!', str(value))
    return text


def _custom_upgrade_value(custom, custom_delta, key):
    value = custom.get(key)
    delta = custom_delta.get(key, 0)
    return value + delta if value is not None and delta is not None else value


def _path_variants(path_value):
    if not path_value: return []
    clean = path_value.replace('\\', '/').rsplit('/', 1)[-1]
    if not clean.lower().endswith('.png'): return []
    return [clean]


def _find_asset(resource_dir, folder, stems, explicit=()):
    names = {re.sub(r'[^a-z0-9]', '', x.lower()) for x in stems if x}
    explicit = {Path(x).name.lower() for x in explicit}
    pool = []
    for path in resource_dir.rglob('*.png'):
        rel = path.relative_to(resource_dir).as_posix().lower()
        if f'/{folder}/' not in f'/{rel}/': continue
        stem = path.stem
        if re.search(r'(_p|_b|_large|outline|used|beta)$', stem, re.I): continue
        if '/betacards/' in f'/{rel}/' or '/joke/' in f'/{rel}/': continue
        normalized = re.sub(r'[^a-z0-9]', '', stem.lower())
        rank = 0 if path.name.lower() in explicit else 1 if normalized in names else 99
        if rank < 99: pool.append((rank, path.as_posix().lower(), path))
    return min(pool)[2] if pool else None


def _save_card_image(source, target):
    image = Image.open(source).convert('RGBA')
    image.thumbnail((360, 500), Image.Resampling.LANCZOS)
    # Palette PNG is much smaller than the full-resolution source while retaining
    # enough color for card artwork.
    rgb = image.convert('RGB')
    result = rgb.quantize(colors=128, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
    target.parent.mkdir(parents=True, exist_ok=True)
    result.save(target, format='PNG', optimize=True)
    with Image.open(target) as check:
        check.verify()


def _save_relic_image(source, target):
    image = Image.open(source).convert('RGBA')
    image.thumbnail((128, 128), Image.Resampling.LANCZOS)
    image.save(target, format='PNG', optimize=True)
    with Image.open(target) as check:
        check.verify()


def _clean_json_text(value):
    return clean_text(value).replace('&', ' and ')


def _read_json(path):
    return json.loads(path.read_text(encoding='utf-8-sig'), strict=False)


def _source_for(pkg_dir, folder):
    return sorted((p for p in (pkg_dir / folder).rglob('*.java') if p.is_file()), key=lambda p: p.as_posix().lower()) if (pkg_dir / folder).exists() else []


def _card_is_in_scope(source, stats, path):
    if re.search(r'@Deprecated|\babstract\s+class\b|\binterface\s+', source): return False, 'deprecated or non-instantiable'
    if '@CardIgnore' in source and stats['type'] not in {'STATUS', 'CURSE'}: return False, 'ignored card'
    if re.search(r'(^|[/\\])(test|tests|joke|deprecated|unused|beta)([/\\]|$)', path.as_posix(), re.I): return False, 'test/joke/deprecated path'
    if re.match(r'^(?:Abstract|Base)', path.stem) or path.stem.lower().startswith(('zzz', 'test')): return False, 'abstract/test card'
    # @NoPools cards never appear in a run; meme/altDimension hold joke and event-only cards; DefaultCollectibleCard is a fallback stub.
    if '@NoPools' in source or re.search(r'[/\\](meme|altDimension)[/\\]', path.as_posix()) or path.stem == 'DefaultCollectibleCard': return False, 'not obtainable in a run'
    rarity = stats['rarity']
    if rarity not in {'BASIC', 'COMMON', 'UNCOMMON', 'RARE', 'SPECIAL', 'CURSE'}: return False, f'out-of-pool rarity {rarity}'
    if not stats['type'] or stats['cost'] is None: return False, 'missing type or cost'
    return True, ''


def _extract_card(path, strings, res_dir, color, pkg, source_resources):
    source = _strip_comments(path.read_text(encoding='utf-8', errors='replace'))
    class_match = re.search(r'\bclass\s+(\w+)', source)
    if not class_match: return None, 'not a card class'
    class_name = class_match[1]
    id_suffix = _id_suffix(source, class_name)
    key = _localized_key(strings, id_suffix, class_name)
    if not key: return None, 'no localization'
    entry = strings[key]
    stats = parse_card_source(source)
    include, why = _card_is_in_scope(source, stats, path)
    if not include: return None, why
    raw_id = key if ':' in key else f'{pkg}_{key}'
    card_id = site_id(raw_id)
    custom = stats['custom']
    base_values = {'damage': stats['damage'], 'block': stats['block'], 'magic': stats['magic']}
    description = _substitute(entry.get('DESCRIPTION', ''), base_values, custom, color, class_name)
    upgrade_entry = entry.get('UPGRADE_DESCRIPTION') or ''
    upgrade_values = dict(base_values)
    for source_name, out_name in (('damage', 'damage'), ('block', 'block'), ('magic_number', 'magic')):
        delta = stats['upgrade'].get(source_name)
        if upgrade_values[out_name] is not None and delta is not None:
            upgrade_values[out_name] += delta
    custom_upgraded = {name: _custom_upgrade_value(custom, stats['custom_upgrade'], name) for name in custom}
    upgraded_text = _substitute(upgrade_entry or entry.get('DESCRIPTION', ''), upgrade_values, custom_upgraded, color, class_name)
    # Some classes use a shorter, separately localized upgraded description. Retain the
    # source's complete localization string and only omit it when text is unchanged.
    upgrade_description = upgraded_text if upgraded_text and upgraded_text != description else None
    if re.search(r'![A-Za-z0-9_:]+!|&#?\w+;|[<>]', description + (upgrade_description or '')):
        problems.append(f'{color}/{class_name}: invalid placeholder or markup in rendered text')
        return None, 'unresolved placeholder or markup'
    target = _simple_title(stats['target'])
    type_name = _simple_title(stats['type'])
    rarity_name = _simple_title(stats['rarity'])
    card = {
        'id': card_id, 'name': _clean_json_text(entry.get('NAME', '')), 'description': _clean_json_text(description),
        'cost': stats['cost'], 'type': type_name, 'rarity': rarity_name, 'target': target, 'color': color,
        'damage': stats['damage'], 'block': stats['block'], 'magic_number': stats['magic'],
        'hit_count': stats['hit_count'], 'exhaust': stats['booleans'].get('exhaust', False),
        'ethereal': stats['booleans'].get('ethereal', False), 'innate': stats['booleans'].get('innate', False),
        'retain': stats['booleans'].get('retain', False), 'self_retain': stats['booleans'].get('self_retain', False),
        'purge_on_use': stats['booleans'].get('purge_on_use', False), 'tags': [], 'keywords': [],
        'upgrade': {'cost': stats['upgrade']['cost'], 'damage': stats['upgrade']['damage'],
                    'block': stats['upgrade']['block'], 'magic_number': stats['upgrade']['magic_number'],
                    'description': _clean_json_text(upgrade_description) if upgrade_description else None},
    }
    art_stems = [class_name, id_suffix, key.rsplit(':', 1)[-1]]
    for suffix in ('_slimebound', '_guardian', '_hermit'):
        art_stems.extend(value[:-len(suffix)] for value in (class_name, id_suffix) if value.lower().endswith(suffix))
    literals = re.findall(r'"([^"\n]+)"', source)
    explicit = [_path_variants(value)[0] for value in literals if _path_variants(value)]
    for value in literals:
        if value.startswith('status/') or 'Resources/images/cards/' in value:
            explicit.append(Path(value).name + '.png')
    art = _find_asset(res_dir, 'cards', art_stems, explicit)
    if not art:
        art = _find_asset(res_dir, 'betacards', art_stems, explicit)
    if not art and explicit:
        art = _find_asset(source_resources, 'cards', [], explicit)
    if not art:
        for value in literals:
            if value.startswith('status/'):
                base_art = ROOT / 'public/images/sts1/cards' / (Path(value).name.lower() + '.png')
                if base_art.is_file():
                    art = base_art
                    break
    if not art:
        return None, 'no card art'
    return (card, art), ''


def _relic_tier(source):
    match = re.search(r'RelicTier\.([A-Z_]+)', source)
    if not match: return None
    return {'STARTER': 'Starter', 'COMMON': 'Common', 'UNCOMMON': 'Uncommon', 'RARE': 'Rare',
            'BOSS': 'Boss', 'SHOP': 'Shop', 'SPECIAL': 'Special'}.get(match[1])


def _relic_description(source, entry, all_strings):
    constants = _constants(source)
    method = _balanced_body(source, r'\bgetUpdatedDescription\s*\([^)]*\)\s*\{')
    returns = re.findall(r'\breturn\s+([^;]+);', method)
    descriptions = entry.get('DESCRIPTIONS', [])
    output = []
    if returns:
        pieces = re.split(r'\s+\+\s+', returns[0])
        for piece in pieces:
            index = re.search(r'(?:\w+\.)?DESCRIPTIONS\[(\d+)\]', piece)
            if index:
                position = int(index[1])
                if position < len(descriptions):
                    output.append(str(descriptions[position]))
                continue
            stripped = piece.strip()
            if stripped.startswith(chr(34)) and stripped.endswith(chr(34)):
                output.append(stripped[1:-1])
                continue
            number = _number(piece, constants)
            if number is not None:
                output.append(str(number))
    description = ''.join(output) if returns and output else ''.join(str(part) for part in descriptions)
    replaced = re.search(r'new\s+(\w+)\s*\(\s*\)\.name', source)
    if 'Replaces' in description and replaced:
        name_key = _localized_key(all_strings, replaced[1], replaced[1])
        if name_key:
            replaced_name = all_strings[name_key].get('NAME', replaced[1])
            description = re.sub(r'Replaces\s*', f'Replaces {replaced_name}', description, count=1)
    return description


def _extract_relic(path, strings, res_dir, color, pkg, starter_id):
    source = _strip_comments(path.read_text(encoding='utf-8', errors='replace'))
    if not re.search(r'\bclass\s+\w+\s+extends\s+\w+', source) or re.search(r'\babstract\s+class\b|\binterface\b', source):
        return None, 'not an instantiable relic class'
    class_match = re.search(r'\bclass\s+(\w+)', source)
    name = class_match[1] if class_match else path.stem
    suffix = _id_suffix(source, name)
    key = _localized_key(strings, suffix, name)
    if not key: return None, 'no localization'
    tier = _relic_tier(source)
    if not tier: return None, 'missing or deprecated relic tier'
    raw_id = key if ':' in key else f'{pkg}_{key}'
    relic_id = site_id(raw_id)
    entry = strings[key]
    description = _clean_json_text(_relic_description(source, entry, strings))
    if not description:
        description = _clean_json_text(' '.join(entry.get('DESCRIPTIONS', [])))
    if re.search(r'![A-Za-z0-9_]+!|&#?\w+;|[<>]', description):
        problems.append(f'{color}/{name}: unresolved relic text markup')
        return None, 'invalid relic text'
    explicit = []
    for found in re.findall(r'"([^"\n]+\.png)"', source):
        explicit.extend(_path_variants(found))
    art = _find_asset(res_dir, 'relics', [name, suffix, key.rsplit(':', 1)[-1]], explicit)
    if not art:
        return None, 'no relic art'
    icon = f'{relic_id.lower()}.png'
    # The character's existing starting relic remains categorized as Starter.
    if relic_id == starter_id:
        tier = 'Starter'
    relic = {'id': relic_id, 'name': _clean_json_text(entry.get('NAME', '')), 'description': description,
             'flavor': _clean_json_text(entry.get('FLAVOR', '')) or None, 'tier': tier, 'color': color, 'icon': icon}
    return (relic, art), ''


def _write_json(path, value):
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')


def main(argv=None):
    global problems
    problems = []
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', required=True, help='DownfallSTS source repository root')
    args = parser.parse_args(argv)
    source_root = Path(args.source).resolve()
    java_root = source_root / 'src/main/java'
    resources_root = source_root / 'src/main/resources'
    if not java_root.is_dir() or not resources_root.is_dir():
        parser.error('--source must be a Downfall repository with src/main/java and src/main/resources')
    data_dir = ROOT / 'data/mods/downfall'
    image_root = ROOT / 'public/images/sts1'
    cards, relics = {}, {}
    generated_images = {}
    skipped = []

    for char in CHARACTERS:
        pkg, color, res = char['pkg'], char['color'], char['res']
        pkg_dir = java_root / pkg
        res_dir = resources_root / res
        if not pkg_dir.is_dir() or not res_dir.is_dir():
            problems.append(f'{color}: source package/resources missing')
            continue
        card_strings = _read_json(res_dir / 'localization/eng/CardStrings.json')
        relic_strings = _read_json(res_dir / 'localization/eng/RelicStrings.json')
        starter_relic_key = next((k for k in relic_strings if k.rsplit(':', 1)[-1].lower() == char['relic'].lower()), None)
        starter_relic_id = site_id(starter_relic_key if starter_relic_key and ':' in starter_relic_key else f'{pkg}_{starter_relic_key}') if starter_relic_key else ''

        for path in _source_for(pkg_dir, 'cards'):
            result, reason = _extract_card(path, card_strings, res_dir, color, pkg, resources_root)
            if not result:
                if reason not in ('no localization', 'not a card class'):
                    skipped.append(f'{color}/{path.stem}: {reason}')
                continue
            card, art = result
            starter_names = {name.lower() for name, _ in char['deck']}
            if path.stem.lower() in starter_names:
                starter_key = _localized_key(card_strings, path.stem, path.stem)
                if starter_key:
                    card['id'] = site_id(starter_key if ':' in starter_key else f'{pkg}_{starter_key}')
            if card['id'] in cards:
                problems.append(f'{color}/{path.stem}: duplicate card id {card["id"]}')
                continue
            target = image_root / 'cards' / f'{card["id"].lower()}.png'
            _save_card_image(art, target)
            cards[card['id']] = card
            generated_images[target] = target.stat().st_size

        for path in _source_for(pkg_dir, 'relics'):
            result, reason = _extract_relic(path, relic_strings, res_dir, color, pkg, starter_relic_id)
            if not result:
                if reason not in ('no localization', 'not an instantiable relic class'):
                    skipped.append(f'{color}/{path.stem}: {reason}')
                continue
            relic, art = result
            if relic['id'] in relics:
                problems.append(f'{color}/{path.stem}: duplicate relic id {relic["id"]}')
                continue
            for folder in ('relics', 'relics-list'):
                target = image_root / folder / relic['icon']
                target.parent.mkdir(parents=True, exist_ok=True)
                _save_relic_image(art, target)
                generated_images[target] = target.stat().st_size
            relics[relic['id']] = relic

    for folder, expected in (
        ('cards', {f'{card_id.lower()}.png' for card_id in cards}),
        ('relics', {item['icon'] for item in relics.values()}),
        ('relics-list', {item['icon'] for item in relics.values()}),
    ):
        image_dir = image_root / folder
        for stale in image_dir.glob('downfall_*.png'):
            if stale.name not in expected:
                stale.unlink()
    _write_json(data_dir / 'cards.json', sorted(cards.values(), key=lambda item: item['id']))
    _write_json(data_dir / 'relics.json', sorted(relics.values(), key=lambda item: item['id']))
    total_bytes = sum(generated_images.values())
    print(f'{len(cards)} cards, {len(relics)} relics; {len(generated_images)} images, {total_bytes} bytes')
    print(f'{len(skipped)} skipped source entries; {len(problems)} extraction problems')
    for item in skipped:
        print('SKIPPED:', item)
    for item in problems:
        print('PROBLEM:', item)
    if total_bytes > 40 * 1024 * 1024:
        print(f'PROBLEM: image budget exceeded ({total_bytes} bytes > 41943040)', file=sys.stderr)
        return 2
    return 0


if __name__ == '__main__':
    sys.exit(main())
