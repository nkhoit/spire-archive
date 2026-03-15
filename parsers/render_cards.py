#!/usr/bin/env python3
"""Pre-render STS1 card images — v6 after GPT-5.4 QA feedback."""
import json
import os
import re
import textwrap
from PIL import Image, ImageDraw, ImageFont

CARDUI = "/Users/kuro/code/sts1-data/public/images/cardui"
PORTRAITS = "/Users/kuro/code/sts1-data/public/images/cards"
FONT_DIR = "/tmp/sts-fonts/font"
DATA = "/Users/kuro/code/sts1-data/data/cards.json"
OUTPUT = "/Users/kuro/code/sts1-data/public/images/rendered"

CANVAS = 1024
CX = 512
CY = 512

# From game source constants (at 1024 canvas scale, 2x game units):
# NAME_OFFSET_Y = 175 → title at CY - 175*2 = CY - 350 (top-left coords: CY - 350 from center)
# ENERGY_TEXT_OFFSET_X = -132, ENERGY_TEXT_OFFSET_Y = 192
# Orb/cost center: (CX - 132*2, CY - 192*2) = (248, 128) in top-left coords

# Card bounds from bg sprite: left=212, top=94, right=808, bottom=931
# Banner bbox: top=130, bottom=283, center=206

# ADJUSTED from wiki reference:
# Orb is at very top-left corner, ~halfway clipping the frame
ORB_CX = 245
ORB_CY = 140  # intersects banner, barely pokes out top-left

# Description area: raised ~55px per QA feedback
DESC_TOP = 590
DESC_BOTTOM = 848

# Type color per card color (from game source backColor values)
TYPE_COLORS = {
    'red': (160, 130, 110),
    'green': (110, 150, 120),
    'blue': (110, 140, 170),
    'purple': (140, 120, 160),
    'colorless': (140, 140, 140),
    'black': (120, 120, 120),
}

COLOR_MAP = {
    'ironclad': 'red', 'silent': 'green', 'defect': 'blue',
    'watcher': 'purple', 'colorless': 'colorless', 'curse': 'black',
    'status': 'black'
}

ORB_COLOR_MAP = {
    'red': 'red', 'green': 'green', 'blue': 'blue', 'purple': 'purple',
    'colorless': 'colorless', 'black': 'colorless'
}

KEYWORDS = {
    'Strength', 'Dexterity', 'Block', 'Vulnerable', 'Weak', 'Frail',
    'Poison', 'Exhaust', 'Ethereal', 'Innate', 'Retain', 'Scry',
    'Channel', 'Evoke', 'Focus', 'Orb', 'Lightning', 'Frost', 'Dark', 'Plasma',
    'Mantra', 'Wrath', 'Calm', 'Divinity', 'Vigor',
    'Intangible', 'Artifact', 'Plated Armor', 'Metallicize', 'Thorns',
    'Shiv', 'Shivs', 'Burn', 'Wound', 'Dazed', 'Slimed', 'Void',
    'Strikes', 'Power', 'Powers', 'Attack', 'Attacks', 'Skill', 'Skills',
    'Unplayable', 'Energy',
}


def load_fonts():
    title_path = os.path.join(FONT_DIR, "Kreon-Bold.ttf")
    body_path = os.path.join(FONT_DIR, "Kreon-Regular.ttf")
    return {
        'title': ImageFont.truetype(title_path, 44),
        'title_small': ImageFont.truetype(title_path, 37),
        'cost': ImageFont.truetype(title_path, 54),
        'desc': ImageFont.truetype(body_path, 44),
        'desc_bold': ImageFont.truetype(title_path, 44),
        'type': ImageFont.truetype(title_path, 30),
    }


def get_bg_key(card_type, color):
    t = card_type.lower()
    if t in ('curse', 'status'):
        t = 'skill'
    return f"bg_{t}_{color}"


def get_frame_key(card_type, rarity):
    t = card_type.lower()
    if t in ('curse', 'status'):
        t = 'skill'
    r = rarity.lower()
    if r not in ('common', 'uncommon', 'rare'):
        r = 'common'
    return f"frame_{t}_{r}"


def draw_outlined_text(draw, xy, text, font, fill=(255, 255, 255), outline=(0, 0, 0), outline_width=2):
    x, y = xy
    for ox in range(-outline_width, outline_width + 1):
        for oy in range(-outline_width, outline_width + 1):
            if ox == 0 and oy == 0:
                continue
            draw.text((x + ox, y + oy), text, font=font, fill=outline)
    draw.text(xy, text, font=font, fill=fill)


def _replace_energy(m):
    count = m.group().count('[')
    return f'[{count} Energy]' if count > 1 else '[Energy]'


def draw_description(draw, desc, fonts, center_x, start_y):
    desc = re.sub(r'(\[(?:R|G|B|E)\]\s*)+', _replace_energy, desc)
    lines = desc.split('\n')
    wrapped_lines = []
    for line in lines:
        wrapped = textwrap.wrap(line, width=24) or ['']
        wrapped_lines.extend(wrapped)
    
    line_height = 48
    y = start_y
    gold = (232, 193, 112)
    white = (220, 220, 210)
    
    for line in wrapped_lines:
        parts = _split_keywords(line)
        total_w = sum(
            draw.textbbox((0, 0), p[0], font=fonts['desc_bold' if p[1] else 'desc'])[2] -
            draw.textbbox((0, 0), p[0], font=fonts['desc_bold' if p[1] else 'desc'])[0]
            for p in parts
        )
        cur_x = center_x - total_w // 2
        
        for text, is_keyword in parts:
            color = gold if is_keyword else white
            font = fonts['desc_bold'] if is_keyword else fonts['desc']
            draw_outlined_text(draw, (cur_x, y), text, font, fill=color, outline=(20, 20, 30), outline_width=1)
            tw = draw.textbbox((0, 0), text, font=font)[2] - draw.textbbox((0, 0), text, font=font)[0]
            cur_x += tw
        y += line_height
    return y


def _split_keywords(text):
    parts = []
    remaining = text
    while remaining:
        best_pos = len(remaining)
        best_match = None
        for kw in KEYWORDS:
            pattern = r'\b' + re.escape(kw) + r'\b'
            m = re.search(pattern, remaining)
            if m and m.start() < best_pos:
                best_pos = m.start()
                best_match = m
        if best_match:
            if best_match.start() > 0:
                parts.append((remaining[:best_match.start()], False))
            parts.append((remaining[best_match.start():best_match.end()], True))
            remaining = remaining[best_match.end():]
        else:
            parts.append((remaining, False))
            remaining = ''
    return parts


def render_card(card, fonts, upgraded=False):
    color = COLOR_MAP.get(card['color'], 'black')
    rarity = card['rarity']
    card_type = card['type']
    
    # 1. Background
    bg_key = get_bg_key(card_type, color)
    bg_path = f"{CARDUI}/{bg_key}.png"
    if not os.path.exists(bg_path):
        bg_path = f"{CARDUI}/bg_skill_black.png"
    canvas = Image.open(bg_path).convert('RGBA')
    
    # 2. Portrait — fill the frame cutout area
    portrait_file = card.get('_portrait_file')
    if portrait_file:
        portrait_path = f"{PORTRAITS}/{portrait_file}"
        if os.path.exists(portrait_path):
            portrait = Image.open(portrait_path).convert('RGBA')
            # Scale down ~10% for better fit
            new_w = int(portrait.width * 1.05)
            new_h = int(portrait.height * 1.05)
            portrait = portrait.resize((new_w, new_h), Image.LANCZOS)
            px = CX - portrait.width // 2
            # Move up ~40px from previous position
            frame_cutout_cy = 360
            py = frame_cutout_cy - portrait.height // 2
            canvas.paste(portrait, (px, py), portrait)
    
    # 3. Frame
    frame_key = get_frame_key(card_type, rarity)
    frame_path = f"{CARDUI}/{frame_key}.png"
    if os.path.exists(frame_path):
        frame = Image.open(frame_path).convert('RGBA')
        canvas.paste(frame, (0, 0), frame)
    
    # 4. Banner
    r = rarity.lower()
    banner_r = r if r in ('common', 'uncommon', 'rare') else 'common'
    banner = Image.open(f"{CARDUI}/banner_{banner_r}.png").convert('RGBA')
    canvas.paste(banner, (0, 0), banner)
    
    # 5. Energy orb — top-left corner
    orb_c = ORB_COLOR_MAP.get(color, 'colorless')
    orb_path = f"{CARDUI}/card_{orb_c}_orb.png"
    if os.path.exists(orb_path):
        orb = Image.open(orb_path).convert('RGBA')
        orb_size = 120
        orb = orb.resize((orb_size, orb_size), Image.LANCZOS)
        orb_canvas = Image.new('RGBA', (CANVAS, CANVAS), (0, 0, 0, 0))
        orb_canvas.paste(orb, (ORB_CX - orb_size // 2, ORB_CY - orb_size // 2), orb)
        canvas = Image.alpha_composite(canvas, orb_canvas)
    
    # 6. Rarity trim
    trim_r = r if r in ('common', 'uncommon', 'rare') else 'common'
    for piece in ('left', 'center', 'right'):
        trim_path = f"{CARDUI}/{trim_r}_{piece}.png"
        if os.path.exists(trim_path):
            trim = Image.open(trim_path).convert('RGBA')
            canvas = Image.alpha_composite(canvas, trim)
    
    draw = ImageDraw.Draw(canvas)
    
    # Title — on banner, centered at Y=196 (slightly above banner center)
    name = card['name']
    if upgraded:
        name = name + '+'
    title_font = fonts['title'] if len(name) <= 14 else fonts['title_small']
    bbox = draw.textbbox((0, 0), name, font=title_font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    title_y = 164 - th // 2
    title_color = (124, 230, 124) if upgraded else (240, 235, 220)
    draw_outlined_text(draw, (CX - tw // 2, title_y), name, title_font,
                       fill=title_color, outline=(30, 15, 0), outline_width=2)
    
    # Cost — centered on orb
    cost = card['cost']
    if upgraded and card.get('upgrade', {}).get('cost') is not None:
        cost = card['upgrade']['cost']
    show_cost = True
    if cost is not None:
        cost_str = str(cost)
        is_modified = upgraded and card.get('upgrade', {}).get('cost') is not None and card['upgrade']['cost'] != card['cost']
        cost_color = (124, 230, 124) if is_modified else (255, 255, 255)
    elif card_type.lower() in ('curse', 'status'):
        show_cost = False
        cost_str = ''
        cost_color = (255, 255, 255)
    else:
        cost_str = 'X'
        cost_color = (255, 255, 255)
    
    if show_cost:
        bbox = draw.textbbox((0, 0), cost_str, font=fonts['cost'])
        cw = bbox[2] - bbox[0]
        ch = bbox[3] - bbox[1]
        draw_outlined_text(draw, (ORB_CX - cw // 2, ORB_CY - ch // 2 - 10), cost_str,
                           fonts['cost'], fill=cost_color, outline=(0, 0, 0), outline_width=2)
    
    # Type label — colored per card color
    type_str = card_type
    type_color = TYPE_COLORS.get(color, (140, 140, 140))
    bbox = draw.textbbox((0, 0), type_str, font=fonts['type'])
    tw = bbox[2] - bbox[0]
    draw.text((CX - tw // 2, 535), type_str, font=fonts['type'], fill=type_color)
    
    # Description
    desc = card['description']
    if upgraded and card.get('upgrade', {}).get('description'):
        desc = card['upgrade']['description']
    
    # Calculate line count for vertical centering
    desc_for_count = re.sub(r'(\[(?:R|G|B|E)\]\s*)+', _replace_energy, desc)
    lines = desc_for_count.split('\n')
    wrapped = []
    for line in lines:
        wrapped.extend(textwrap.wrap(line, width=24) or [''])
    
    num_lines = len(wrapped)
    line_height = 48
    total_text_h = num_lines * line_height
    desc_start_y = DESC_TOP + (DESC_BOTTOM - DESC_TOP - total_text_h) // 2
    
    draw_description(draw, desc, fonts, CX, desc_start_y)
    
    # Scale to 768
    canvas = canvas.resize((768, 768), Image.LANCZOS)
    return canvas


def find_portrait(card_id, card_name):
    OVERRIDES = {
        'ASCENDERSBANE': 'ascenders_bane', 'DROPKICK': 'drop_kick',
        'FORCE_FIELD': 'forcefield', 'HYPERBEAM': 'hyper_beam',
        'J_A_X': 'jax', 'LESSONLEARNED': 'lessons_learned',
        'MULTI_CAST': 'multicast', 'THUNDERCLAP': 'thunder_clap',
        'WREATHOFFLAME': 'wreathe_of_flame', 'LOCKON': 'bullseye',
    }
    if card_id in OVERRIDES:
        fname = OVERRIDES[card_id] + '.png'
    else:
        fname = re.sub(r'[^a-zA-Z0-9 ]', '', card_name).lower().replace(' ', '_') + '.png'
    if os.path.exists(f"{PORTRAITS}/{fname}"):
        return fname
    return None


def main():
    os.makedirs(OUTPUT, exist_ok=True)
    os.makedirs(f"{OUTPUT}/upgraded", exist_ok=True)
    fonts = load_fonts()
    with open(DATA) as f:
        cards = json.load(f)
    rendered = 0
    for card in cards:
        portrait = find_portrait(card['id'], card['name'])
        card['_portrait_file'] = portrait
        img = render_card(card, fonts, upgraded=False)
        img.save(f"{OUTPUT}/{card['id'].lower()}.png", optimize=True)
        if card.get('upgrade', {}).get('description') or card.get('upgrade', {}).get('cost') is not None:
            img_upg = render_card(card, fonts, upgraded=True)
            img_upg.save(f"{OUTPUT}/upgraded/{card['id'].lower()}.png", optimize=True)
        rendered += 1
    print(f"Rendered {rendered} cards")


if __name__ == '__main__':
    main()
