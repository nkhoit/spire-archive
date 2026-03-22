#!/usr/bin/env python3
"""Resolve upgrade descriptions for all cards by applying deltas to base descriptions."""
import json
import re
import sys


def apply_delta(base_val, delta_str):
    """Apply a delta like '+4' or '-1' to a base value."""
    if delta_str is None or base_val is None:
        return base_val
    delta_str = str(delta_str)
    if delta_str.startswith('+'):
        return base_val + int(delta_str[1:])
    elif delta_str.startswith('-'):
        return base_val - int(delta_str[1:])
    else:
        return int(delta_str)


def resolve_upgrade_description(card):
    """Generate the upgraded description by substituting upgraded values into base description."""
    upgrade = card.get('upgrade', {})
    if not upgrade:
        return None
    
    # If there's already an explicit upgrade description, use it
    if upgrade.get('description'):
        return upgrade['description']
    
    desc = card['description']
    
    # Calculate upgraded values
    base_dmg = card.get('damage')
    base_blk = card.get('block')
    base_mag = card.get('magic_number')
    
    upg_dmg = apply_delta(base_dmg, upgrade.get('damage'))
    upg_blk = apply_delta(base_blk, upgrade.get('block'))
    upg_mag = apply_delta(base_mag, upgrade.get('magic_number'))
    
    # Replace numbers in description
    # We need to be careful to replace the right numbers
    new_desc = desc
    
    if base_dmg is not None and upg_dmg != base_dmg:
        # Replace damage value - first occurrence of the number that matches base damage
        new_desc = _replace_stat(new_desc, base_dmg, upg_dmg)
    
    if base_blk is not None and upg_blk != base_blk:
        new_desc = _replace_stat(new_desc, base_blk, upg_blk)
    
    if base_mag is not None and upg_mag != base_mag:
        new_desc = _replace_stat(new_desc, base_mag, upg_mag)
    
    # Handle cost changes
    upg_cost = upgrade.get('cost')
    if upg_cost is not None:
        # Cost change doesn't affect description text, it's shown separately
        pass
    
    # If nothing changed in the text but there are stat changes, still return
    # (the stat changes are shown via the upgrade object)
    if new_desc == desc and not any([
        upgrade.get('damage'), upgrade.get('block'), upgrade.get('magic_number'),
        upgrade.get('cost'), upgrade.get('description')
    ]):
        # No changes at all - card just gets a name upgrade (e.g. Strike+)
        return desc
    
    return new_desc


def _replace_stat(desc, old_val, new_val):
    """Replace the first occurrence of old_val with new_val in description, matching word boundaries."""
    pattern = r'\b' + str(old_val) + r'\b'
    return re.sub(pattern, str(new_val), desc, count=1)


def main():
    with open('data/cards.json') as f:
        cards = json.load(f)
    
    for card in cards:
        upgrade = card.get('upgrade', {})
        if not upgrade:
            continue
        
        resolved = resolve_upgrade_description(card)
        if resolved:
            upgrade['description'] = resolved
    
    with open('data/cards.json', 'w') as f:
        json.dump(cards, f, indent=2)
    
    # Print summary
    total = len(cards)
    with_desc = sum(1 for c in cards if c.get('upgrade', {}).get('description'))
    print(f"Resolved {with_desc}/{total} upgrade descriptions")
    
    # Print some examples
    for card in cards[:10]:
        u = card.get('upgrade', {})
        if u.get('description') and u['description'] != card['description']:
            print(f"\n{card['name']}:")
            print(f"  Base: {card['description']}")
            print(f"  Upgd: {u['description']}")


if __name__ == '__main__':
    main()
