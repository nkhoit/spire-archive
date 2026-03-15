# Relics Verification Report

**Date:** 2026-03-14  
**Source:** `/tmp/sts-full/com/megacrit/cardcrawl/relics/`  
**Localization:** `/tmp/sts-data/localization/eng/relics.json`  
**Data file:** `/home/moltbot/clawd/sts1-data/data/relics.json`

---

## Summary

| Check | Count |
|-------|-------|
| Total relics in data | 186 |
| Total Java relic classes (non-Abstract, non-DEPRECATED) | 186 |
| Localization entries | 195 |
| **Tier mismatches** | **0** |
| **Name mismatches** | **0** |
| **Flavor mismatches** | **2** (trailing whitespace only) |
| **Relics in data but not in source** | **5** (TEST_* entries) |
| **Relics in source but not in data** | **0** |

---

## ✅ Tier Verification

All 181 matched relics have correct tiers. No discrepancies found.

---

## ✅ Name Verification

All relic names match their localization `NAME` fields exactly.

---

## ⚠️ Flavor Mismatches (Trailing Whitespace Only)

Both issues are benign — the localization file has a trailing space that the data file trims.

| Relic | Issue |
|-------|-------|
| **Bronze Scales** | Localization flavor ends with a trailing space; data does not |
| **Odd Mushroom** | Localization flavor ends with a trailing space; data does not |

These are cosmetically incorrect but functionally fine. The data is arguably cleaner (trimmed). Low priority fix.

---

## ⚠️ TEST_* Entries in Data (Not in Source)

5 relics in the data file have empty names and `TEST_*` IDs. These do not correspond to any Java class or localization entry — they appear to be leftover test/placeholder entries.

| ID | Tier | Description |
|----|------|-------------|
| TEST_1 | Uncommon | `this.setDescription(AbstractDungeon.player.chosenClass)` (raw code!) |
| TEST_3 | Rare | *(empty)* |
| TEST_4 | Rare | *(empty)* |
| TEST_5 | Common | `2` |
| TEST_6 | Uncommon | `3 100` |

**Recommendation:** Remove these from `relics.json`. They are not real game relics — TEST_1's description is raw Java code that was never resolved.

---

## ✅ No Missing Relics

All 186 Java relic classes (excluding Abstract* and DEPRECATED*) are represented in the data file.

---

## ✅ Description Coverage

All 181 matched relics have non-empty descriptions in the data. Descriptions were not byte-for-byte compared against localization (they're assembled from `DESCRIPTIONS` arrays with formatting codes stripped), but all entries appear reasonable.
