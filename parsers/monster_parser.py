"""Monster parser for STS1 decompiled Java source."""

import argparse
import json
import os
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))
from utils import (  # noqa: E402
    DEFAULT_LOCALIZATION_DIR,
    DEFAULT_SOURCE_DIR,
    extract_static_id,
    find_java_files,
    load_localization,
    read_java,
    to_upper_snake,
)

MONSTER_ACTS = ["exordium", "city", "beyond", "ending"]
SITE_LANGS = {
    "ja": "jpn",
    "ko": "kor",
    "zh": "zhs",
    "de": "deu",
    "fr": "fra",
    "es": "spa",
    "pt": "ptb",
    "it": "ita",
    "pl": "pol",
    "ru": "rus",
    "tr": "tur",
    "th": "tha",
}

PROJECT_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_OUTPUT = PROJECT_ROOT / "data" / "sts1" / "monsters.json"
DEFAULT_LOC_OUTPUT_DIR = PROJECT_ROOT / "data" / "sts1" / "localization"
DEFAULT_LOC_ROOT = PROJECT_ROOT / "sts-data" / "localization"


def infer_monster_type(class_name: str, source: str, act: str) -> str:
    """Infer Normal/Elite/Boss/Minion from class hints."""
    if re.search(r"extends\s+AbstractBoss|EnemyType\.BOSS", source):
        return "Boss"
    if re.search(r"EnemyType\.ELITE", source):
        return "Elite"
    if re.search(r"EnemyType\.MINION|(?:\b|this\.)isMinion\s*=\s*true\b", source):
        return "Minion"
    boss_names = {
        "SlimeBoss", "Hexaghost", "TheGuardian", "Champ", "Automaton", "Collector",
        "CorruptHeart", "AwakenedOne", "TimeEater", "DonuAndDeca", "GiantHead",
        "BronzeAutomaton", "ShieldAndSpear", "Nemesis", "TheCollector",
    }
    elite_names = {
        "GremlinNob", "Lagavulin", "Sentries", "BookOfStabbing",
        "BronzeOrb", "Spiker", "CenturionAndMystic", "CultistAndChosen", "TwoThieves",
        "BanditLeader", "Transient", "WrithingMass", "TheMaw", "GiantHead",
        "JawWormHorde", "Reptomancer", "Taskmaster",
    }
    if class_name in boss_names or act == "ending" and class_name in {"SpireShield", "SpireSpear", "CorruptHeart"}:
        return "Boss"
    if class_name in elite_names:
        return "Elite"
    return "Normal"


def strip_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.DOTALL)
    text = re.sub(r"//.*", "", text)
    return text


def find_matching(text: str, start: int, open_ch: str, close_ch: str) -> int:
    depth = 0
    i = start
    in_str = False
    esc = False
    while i < len(text):
        ch = text[i]
        if in_str:
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
        else:
            if ch == '"':
                in_str = True
            elif ch == open_ch:
                depth += 1
            elif ch == close_ch:
                depth -= 1
                if depth == 0:
                    return i
        i += 1
    return -1


def split_args(args_raw: str) -> list[str]:
    parts = []
    cur = []
    depth_paren = depth_brack = depth_brace = 0
    in_str = False
    esc = False
    for ch in args_raw:
        if in_str:
            cur.append(ch)
            if esc:
                esc = False
            elif ch == "\\":
                esc = True
            elif ch == '"':
                in_str = False
            continue
        if ch == '"':
            in_str = True
            cur.append(ch)
            continue
        if ch == '(':
            depth_paren += 1
        elif ch == ')':
            depth_paren -= 1
        elif ch == '[':
            depth_brack += 1
        elif ch == ']':
            depth_brack -= 1
        elif ch == '{':
            depth_brace += 1
        elif ch == '}':
            depth_brace -= 1
        elif ch == ',' and depth_paren == 0 and depth_brack == 0 and depth_brace == 0:
            parts.append(''.join(cur).strip())
            cur = []
            continue
        cur.append(ch)
    if cur:
        parts.append(''.join(cur).strip())
    return parts


def iterate_calls(text: str, call_name: str):
    pattern = re.compile(rf"(?<![\w.])(?:this\.)?{re.escape(call_name)}\s*\(")
    for m in pattern.finditer(text):
        open_idx = text.find('(', m.start())
        close_idx = find_matching(text, open_idx, '(', ')')
        if close_idx == -1:
            continue
        yield m.start(), text[open_idx + 1:close_idx]


def extract_method_body(source: str, method_name: str) -> str | None:
    m = re.search(rf"\b{re.escape(method_name)}\s*\([^)]*\)\s*\{{", source)
    if not m:
        return None
    open_idx = source.find('{', m.start())
    close_idx = find_matching(source, open_idx, '{', '}')
    if close_idx == -1:
        return None
    return source[open_idx + 1:close_idx]


def extract_constructors(source: str, class_name: str) -> list[str]:
    bodies = []
    pattern = re.compile(rf"public\s+{re.escape(class_name)}\s*\([^)]*\)\s*\{{")
    for m in pattern.finditer(source):
        open_idx = source.find('{', m.start())
        close_idx = find_matching(source, open_idx, '{', '}')
        if close_idx != -1:
            bodies.append(source[open_idx + 1:close_idx])
    return bodies


def extract_ascension_intervals(text: str):
    intervals = []
    pattern = re.compile(r"if\s*\(\s*AbstractDungeon\.ascensionLevel\s*>=\s*\d+\s*\)\s*\{")
    pos = 0
    while True:
        m = pattern.search(text, pos)
        if not m:
            break
        then_open = text.find('{', m.start())
        then_close = find_matching(text, then_open, '{', '}')
        if then_close == -1:
            break
        intervals.append((then_open + 1, then_close, "asc"))
        else_match = re.match(r"\s*else\s*\{", text[then_close + 1:])
        if else_match:
            else_open = then_close + 1 + else_match.group(0).rfind('{')
            else_close = find_matching(text, else_open, '{', '}')
            if else_close != -1:
                intervals.append((else_open + 1, else_close, "normal"))
                pos = else_close + 1
                continue
        pos = then_close + 1
    return intervals


def mode_for_pos(pos: int, intervals) -> str:
    chosen = None
    chosen_len = None
    for start, end, mode in intervals:
        if start <= pos <= end:
            length = end - start
            if chosen is None or length < chosen_len:
                chosen = mode
                chosen_len = length
    return chosen or "both"


TOKEN_RE = re.compile(r"\b[A-Za-z_][A-Za-z0-9_]*\b")


def _clean_expr(expr: str) -> str:
    expr = expr.strip()
    expr = re.sub(r"\(\s*(?:int|float|double|long|short|byte)\s*\)", "", expr)
    expr = expr.replace("MathUtils.randomBoolean()", "0")
    expr = expr.replace("true", "1").replace("false", "0")
    expr = re.sub(r"(\d+)\.0f\b", r"\1", expr)
    expr = re.sub(r"(\d+)f\b", r"\1", expr)
    expr = re.sub(r"(\d+)L\b", r"\1", expr)
    return expr.strip()


def evaluate_int(expr: str, env: dict[str, int], consts: dict[str, int], asc_mode: bool | None = None) -> int | None:
    expr = _clean_expr(expr)
    if not expr:
        return None
    ternary = re.match(r"AbstractDungeon\.ascensionLevel\s*>=\s*\d+\s*\?\s*(.+)\s*:\s*(.+)", expr)
    if ternary and asc_mode is not None:
        branch = ternary.group(1 if asc_mode else 2)
        return evaluate_int(branch, env, consts, asc_mode)
    m = re.fullmatch(r"-?\d+", expr)
    if m:
        return int(expr)
    expr = re.sub(r"\bthis\.(\w+)\b", r"\1", expr)

    def repl(match):
        token = match.group(0)
        if token in {"if", "else", "new"}:
            return token
        if token in env:
            return str(env[token])
        if token in consts:
            return str(consts[token])
        return token

    expr_eval = TOKEN_RE.sub(repl, expr)
    if re.search(r"[A-Za-z_]", expr_eval):
        return None
    if not re.fullmatch(r"[0-9\s+\-*/%().]+", expr_eval):
        return None
    try:
        return int(eval(expr_eval, {"__builtins__": {}}, {}))
    except Exception:
        return None


DAMAGE_LOOKUP_RE = re.compile(r"this\.damage\.get\s*\(\s*(?:\(int\)\s*)?(\d+)\s*\)\)\.base|this\.damage\.get\s*\(\s*(?:\(int\)\s*)?(\d+)\s*\)\.base")


def resolve_move_value(expr: str, env: dict[str, int], consts: dict[str, int], damage_list: list[int], asc_mode: bool | None) -> int | None:
    expr = _clean_expr(expr)
    m = re.search(r"this\.damage\.get\s*\(\s*(?:\(int\)\s*)?(\d+)\s*\)", expr)
    if m:
        idx = int(m.group(1))
        if 0 <= idx < len(damage_list):
            return damage_list[idx]
        return None
    return evaluate_int(expr, env, consts, asc_mode)


def parse_state(source: str, class_name: str, int_consts: dict[str, int]):
    intervals = extract_ascension_intervals(source)
    normal_env: dict[str, int] = {}
    asc_env: dict[str, int] = {}
    normal_damage: list[int] = []
    asc_damage: list[int] = []

    events = []
    for m in re.finditer(r"(?:private|protected|public)\s+(?!static)(?:final\s+)?int\s+(\w+)\s*=\s*([^;]+);", source):
        events.append((m.start(), "assign", m.group(1), m.group(2).strip()))
    for m in re.finditer(r"this\.(\w+)\s*=\s*([^;]+);", source):
        events.append((m.start(), "assign", m.group(1), m.group(2).strip()))
    for m in re.finditer(r"this\.damage\.add\s*\(\s*new\s+DamageInfo\s*\(\s*this\s*,\s*(.+?)\)\s*\)\s*;", source, re.DOTALL):
        events.append((m.start(), "damage_add", None, m.group(1).strip()))
    for m in re.finditer(r"this\.setHp\s*\(([^)]*)\)", source):
        events.append((m.start(), "set_hp", None, m.group(1).strip()))
    events.sort(key=lambda x: x[0])

    hp = {
        "min_hp": None,
        "max_hp": None,
        "min_hp_ascension": None,
        "max_hp_ascension": None,
    }

    for pos, kind, key, expr in events:
        mode = mode_for_pos(pos, intervals)
        if kind == "assign":
            if mode in {"normal", "both"}:
                val = evaluate_int(expr, normal_env, int_consts, False)
                if val is not None:
                    normal_env[key] = val
            if mode in {"asc", "both"}:
                val = evaluate_int(expr, asc_env, int_consts, True)
                if val is not None:
                    asc_env[key] = val
        elif kind == "damage_add":
            if mode in {"normal", "both"}:
                val = resolve_move_value(expr, normal_env, int_consts, normal_damage, False)
                if val is not None:
                    normal_damage.append(val)
            if mode in {"asc", "both"}:
                val = resolve_move_value(expr, asc_env, int_consts, asc_damage, True)
                if val is not None:
                    asc_damage.append(val)
        elif kind == "set_hp":
            parts = split_args(expr)
            vals_normal = [evaluate_int(p, normal_env, int_consts, False) for p in parts]
            vals_asc = [evaluate_int(p, asc_env, int_consts, True) for p in parts]
            if mode in {"normal", "both"} and all(v is not None for v in vals_normal):
                if len(vals_normal) == 1:
                    hp["min_hp"] = hp["max_hp"] = vals_normal[0]
                elif len(vals_normal) >= 2:
                    hp["min_hp"], hp["max_hp"] = vals_normal[0], vals_normal[1]
            if mode in {"asc", "both"} and all(v is not None for v in vals_asc):
                if len(vals_asc) == 1:
                    hp["min_hp_ascension"] = hp["max_hp_ascension"] = vals_asc[0]
                elif len(vals_asc) >= 2:
                    hp["min_hp_ascension"], hp["max_hp_ascension"] = vals_asc[0], vals_asc[1]

    if not normal_damage and asc_damage:
        normal_damage = asc_damage[:]
    if not asc_damage and normal_damage:
        asc_damage = normal_damage[:]

    if hp["min_hp"] is None:
        if "HP_MIN" in int_consts and "HP_MAX" in int_consts:
            hp["min_hp"] = int_consts["HP_MIN"]
            hp["max_hp"] = int_consts["HP_MAX"]
        else:
            super_m = re.search(r"super\s*\((.+?)\)\s*;", source, re.DOTALL)
            if super_m:
                parts = split_args(re.sub(r"\s+", " ", super_m.group(1)))
                if len(parts) >= 3:
                    hpv = evaluate_int(parts[2], normal_env, int_consts, False)
                    if hpv is not None:
                        hp["min_hp"] = hp["max_hp"] = hpv
    if hp["min_hp_ascension"] is None:
        if "A_2_HP_MIN" in int_consts and "A_2_HP_MAX" in int_consts:
            hp["min_hp_ascension"] = int_consts["A_2_HP_MIN"]
            hp["max_hp_ascension"] = int_consts["A_2_HP_MAX"]
        elif "A_7_HP_MIN" in int_consts and "A_7_HP_MAX" in int_consts:
            hp["min_hp_ascension"] = int_consts["A_7_HP_MIN"]
            hp["max_hp_ascension"] = int_consts["A_7_HP_MAX"]

    return normal_env, asc_env, normal_damage, asc_damage, hp


def parse_string_move_aliases(source: str) -> dict[str, int]:
    aliases = {}
    for m in re.finditer(r"(?:private|public)\s+static\s+final\s+String\s+(\w+)\s*=\s*MOVES\[(\d+)\]\s*;", source):
        aliases[m.group(1)] = int(m.group(2))
    return aliases


def prettify_move_id(move_id: str) -> str:
    return move_id.replace("_", " ").title()


def resolve_byte(expr: str, byte_consts: dict[str, int]) -> int | None:
    expr = _clean_expr(expr)
    m = re.fullmatch(r"\(byte\)\s*(-?\d+)", expr)
    if m:
        return int(m.group(1))
    m = re.fullmatch(r"-?\d+", expr)
    if m:
        return int(expr)
    if expr in byte_consts:
        return byte_consts[expr]
    return None


def resolve_loc_index(name_expr: str, move_aliases: dict[str, int]) -> int | None:
    name_expr = name_expr.strip()
    m = re.fullmatch(r"MOVES\[(\d+)\]", name_expr)
    if m:
        return int(m.group(1))
    if name_expr in move_aliases:
        return move_aliases[name_expr]
    return None


def _sum_gain_block(case_body: str, source: str, normal_env: dict[str, int], asc_env: dict[str, int], int_consts: dict[str, int], seen: set[str] | None = None):
    seen = seen or set()
    normal_block = 0
    asc_block = 0
    found = False
    for _, gain_args in iterate_calls(case_body, "GainBlockAction"):
        args = split_args(gain_args)
        if len(args) >= 3:
            nv = evaluate_int(args[2], normal_env, int_consts, False)
            av = evaluate_int(args[2], asc_env, int_consts, True)
            if nv is not None:
                normal_block += nv
                found = True
            if av is not None:
                asc_block += av
    helper_calls = re.findall(r"(?:this\.)?(\w+)\s*\(", case_body)
    for helper in helper_calls:
        if helper in seen or helper in {"GainBlockAction", "DamageAction", "ApplyPowerAction", "RollMoveAction", "setMove", "createIntent"}:
            continue
        helper_body = extract_method_body(source, helper)
        if helper_body:
            seen.add(helper)
            sub_found, sub_n, sub_a = _sum_gain_block(helper_body, source, normal_env, asc_env, int_consts, seen)
            if sub_found:
                found = True
                normal_block += sub_n
                asc_block += sub_a
    return found, normal_block, asc_block


def parse_block_map(source: str, normal_env: dict[str, int], asc_env: dict[str, int], int_consts: dict[str, int]):
    body = extract_method_body(source, "takeTurn")
    if not body:
        return {}
    block_map = {}
    case_matches = list(re.finditer(r"case\s+(-?\d+)\s*:", body))
    for i, m in enumerate(case_matches):
        move_byte = int(m.group(1))
        start = m.end()
        end = case_matches[i + 1].start() if i + 1 < len(case_matches) else len(body)
        case_body = body[start:end]
        found, normal_block, asc_block = _sum_gain_block(case_body, source, normal_env, asc_env, int_consts)
        if found:
            block_map[move_byte] = {
                "block": normal_block or None,
                "block_asc": asc_block or None,
            }
    return block_map


def parse_moves(source: str, loc_moves: list[str], normal_env: dict[str, int], asc_env: dict[str, int], normal_damage: list[int], asc_damage: list[int]) -> list[dict]:
    byte_consts = {}
    for m in re.finditer(r"(?:private|public)\s+static\s+final\s+byte\s+(\w+)\s*=\s*(-?\d+)\s*;", source):
        byte_consts[m.group(1)] = int(m.group(2))

    int_consts = {}
    for m in re.finditer(r"(?:private|public)\s+static\s+final\s+int\s+(\w+)\s*=\s*(-?\d+)\s*;", source):
        int_consts[m.group(1)] = int(m.group(2))

    move_aliases = parse_string_move_aliases(source)
    block_map = parse_block_map(source, normal_env, asc_env, int_consts)
    move_data: dict[int, dict] = {}

    for _, args_raw in iterate_calls(source, "setMove"):
        parts = split_args(args_raw)
        if len(parts) < 2:
            continue
        if resolve_byte(parts[0], byte_consts) is not None:
            byte_val = resolve_byte(parts[0], byte_consts)
            name_expr = None
            intent_idx = 1
        else:
            name_expr = parts[0]
            byte_val = resolve_byte(parts[1], byte_consts) if len(parts) > 1 else None
            intent_idx = 2
        if byte_val is None or len(parts) <= intent_idx:
            continue

        intent_m = re.search(r"Intent\.(\w+)", parts[intent_idx])
        intent = intent_m.group(1) if intent_m else None
        damage = None
        damage_asc = None
        hits = 1
        loc_index = resolve_loc_index(name_expr, move_aliases) if name_expr else None

        if len(parts) > intent_idx + 1:
            damage_expr = parts[intent_idx + 1]
            damage = resolve_move_value(damage_expr, normal_env, int_consts, normal_damage, False)
            damage_asc = resolve_move_value(damage_expr, asc_env, int_consts, asc_damage, True)
            if len(parts) > intent_idx + 2:
                maybe_hits = evaluate_int(parts[intent_idx + 2], normal_env, int_consts, False)
                if maybe_hits is not None:
                    hits = maybe_hits

        rec = move_data.setdefault(byte_val, {
            "loc_index": None,
            "intent": None,
            "damage": None,
            "damage_asc": None,
            "hits": 1,
            "block": None,
            "block_asc": None,
        })
        if loc_index is not None:
            rec["loc_index"] = loc_index
        if intent:
            rec["intent"] = intent
        if damage is not None:
            rec["damage"] = damage
        if damage_asc is not None:
            rec["damage_asc"] = damage_asc
        if hits and hits > 1:
            rec["hits"] = hits
        if byte_val in block_map:
            rec["block"] = block_map[byte_val]["block"]
            rec["block_asc"] = block_map[byte_val]["block_asc"]

    moves = []
    rev_byte_consts = {v: k for k, v in byte_consts.items()}
    for byte_val, data in sorted(move_data.items()):
        move_id = rev_byte_consts.get(byte_val, f"MOVE_{byte_val}")
        move_name = None
        if data["loc_index"] is not None and 0 <= data["loc_index"] < len(loc_moves):
            candidate = loc_moves[data["loc_index"]]
            if candidate:
                move_name = candidate
        if not move_name:
            move_name = prettify_move_id(move_id)
        damage_asc = data["damage_asc"]
        if damage_asc == data["damage"]:
            damage_asc = None
        moves.append({
            "id": move_id,
            "name": move_name,
            "damage": data["damage"],
            "damage_ascension": damage_asc,
            "intent": data["intent"] or "UNKNOWN",
            "hits": data["hits"] or 1,
            "block": data["block"],
            "_loc_index": data["loc_index"],
        })
    return moves


def parse_monster_file(path: str, act: str, eng_loc: dict) -> dict | None:
    class_name = os.path.basename(path).replace(".java", "")
    if class_name.startswith("Abstract"):
        return None

    source = strip_comments(read_java(path))
    monster_id_raw = extract_static_id(source) or class_name
    monster_id = to_upper_snake(monster_id_raw)
    if "DEPRECATED" in monster_id:
        return None

    loc_entry = eng_loc.get(monster_id_raw) or eng_loc.get(class_name) or {}
    name = loc_entry.get("NAME", monster_id_raw)
    loc_moves = loc_entry.get("MOVES", [])

    int_consts = {}
    for m in re.finditer(r"(?:private|public)\s+static\s+final\s+int\s+(\w+)\s*=\s*(-?\d+)\s*;", source):
        int_consts[m.group(1)] = int(m.group(2))

    normal_env, asc_env, normal_damage, asc_damage, hp = parse_state(source, class_name, int_consts)
    moves = parse_moves(source, loc_moves, normal_env, asc_env, normal_damage, asc_damage)

    return {
        "id": monster_id,
        "name": name,
        "type": infer_monster_type(class_name, source, act),
        "act": act,
        "min_hp": hp["min_hp"],
        "max_hp": hp["max_hp"],
        "min_hp_ascension": hp["min_hp_ascension"],
        "max_hp_ascension": hp["max_hp_ascension"],
        "moves": moves,
        "image_url": None,
        "_loc_key": monster_id_raw if monster_id_raw in eng_loc else class_name,
        "_class_name": class_name,
    }


def parse_monsters(source_dir: str, localization_dir: str) -> list[dict]:
    eng_loc = load_localization(localization_dir, "monsters.json")
    monsters = []
    seen_ids = set()

    for act in MONSTER_ACTS:
        act_dir = os.path.join(source_dir, "monsters", act)
        for jf in sorted(find_java_files(act_dir, recursive=False)):
            parsed = parse_monster_file(jf, act, eng_loc)
            if not parsed:
                continue
            if parsed["id"] in seen_ids:
                continue
            seen_ids.add(parsed["id"])
            monsters.append(parsed)

    monsters.sort(key=lambda m: m["id"])
    return monsters


def write_monsters_json(monsters: list[dict], output_path: str | Path) -> None:
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    clean = []
    for monster in monsters:
        m = {k: v for k, v in monster.items() if not k.startswith("_")}
        moves = []
        for move in m["moves"]:
            moves.append({k: v for k, v in move.items() if not k.startswith("_")})
        m["moves"] = moves
        clean.append(m)
    output_path.write_text(json.dumps(clean, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def build_localization_overlay(monsters: list[dict], lang_code: str, src_lang_dir: str) -> dict:
    loc = load_localization(src_lang_dir, "monsters.json")
    overlay = {"monsters": {}}
    for monster in monsters:
        loc_key = monster.get("_loc_key")
        loc_entry = loc.get(loc_key) or loc.get(monster.get("_class_name", "")) or {}
        moves_arr = loc_entry.get("MOVES", [])
        monster_overlay = {}
        name = loc_entry.get("NAME")
        if name:
            monster_overlay["name"] = name
        move_map = {}
        for move in monster["moves"]:
            idx = move.get("_loc_index")
            if idx is None:
                continue
            if 0 <= idx < len(moves_arr) and moves_arr[idx]:
                move_map[move["id"]] = moves_arr[idx]
        if move_map:
            monster_overlay["moves"] = move_map
        if monster_overlay:
            overlay["monsters"][monster["id"]] = monster_overlay
    return overlay


def merge_dict(dst: dict, src: dict) -> dict:
    for key, value in src.items():
        if isinstance(value, dict) and isinstance(dst.get(key), dict):
            merge_dict(dst[key], value)
        else:
            dst[key] = value
    return dst


def write_localization_overlays(monsters: list[dict], output_dir: str | Path, localization_root: str | Path) -> None:
    output_dir = Path(output_dir)
    localization_root = Path(localization_root)
    output_dir.mkdir(parents=True, exist_ok=True)

    for site_lang, src_lang in SITE_LANGS.items():
        src_dir = localization_root / src_lang
        if not src_dir.exists():
            continue
        overlay = build_localization_overlay(monsters, site_lang, str(src_dir))
        out_path = output_dir / f"{site_lang}.json"
        if out_path.exists():
            existing = json.loads(out_path.read_text(encoding="utf-8"))
        else:
            existing = {}
        merged = merge_dict(existing, overlay)
        out_path.write_text(json.dumps(merged, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Parse STS1 monsters")
    parser.add_argument("--source-dir", default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--localization-dir", default=DEFAULT_LOCALIZATION_DIR)
    parser.add_argument("--output", default=str(DEFAULT_OUTPUT))
    parser.add_argument("--loc-output-dir", default=str(DEFAULT_LOC_OUTPUT_DIR))
    args = parser.parse_args()

    monsters = parse_monsters(args.source_dir, args.localization_dir)
    write_monsters_json(monsters, args.output)
    write_localization_overlays(monsters, args.loc_output_dir, DEFAULT_LOC_ROOT)
    print(f"Wrote {len(monsters)} monsters to {args.output}")
