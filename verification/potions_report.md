# Potions Verification Report

**Date:** 2026-03-14  
**Source:** `/tmp/sts-full/com/megacrit/cardcrawl/potions/`  
**Localization:** `/tmp/sts-data/localization/eng/potions.json`  
**Data file:** `/home/moltbot/clawd/sts1-data/data/potions.json`

---

## Summary

| Check | Count |
|-------|-------|
| Total potions in data | 43 |
| Total Java potion classes (non-Abstract, non-DEPRECATED) | 43 |
| Localization entries | 45 |
| **Rarity mismatches** | **1** (intentional/edge case) |
| **Name mismatches** | **0** |
| **Potions in data but not in source** | **0** |
| **Potions in source but not in data** | **0** |

---

## ✅ Name Verification

All 43 potion names match their localization `NAME` fields exactly.

---

## ⚠️ Rarity Mismatch: Potion Slot

| Potion | Data Rarity | Java `PotionRarity` |
|--------|------------|---------------------|
| **Potion Slot** | `Special` | `PLACEHOLDER` |

`PotionSlot` is not a real potion — it's a UI placeholder representing an empty slot. Its Java rarity enum value is `PLACEHOLDER`, which has no direct equivalent in the data's rarity vocabulary. The data uses `Special` as a reasonable substitute.

**Recommendation:** This is acceptable. `PotionSlot` is not a collectible potion and `PLACEHOLDER` → `Special` is a sensible mapping. Optionally document this mapping decision, or exclude `Potion Slot` from the data entirely since it's not a real potion item.

---

## ✅ No Missing Potions

All 43 Java potion classes are represented in the data file. The 2 extra localization entries (45 vs 43) are for entries that don't have corresponding Java classes in the non-Abstract/non-DEPRECATED set — likely legacy or unused strings.

---

## ✅ Coverage

All 43 potions are fully matched between Java source, localization, and data file with no gaps.
