# Powers Verification Report

Checked 122 powers in JSON against 148 Java files (26 Watcher-specific).

**Note:** Powers default to `Buff` in `AbstractPower` unless explicitly set to `DEBUFF`. Only explicit `this.type = DEBUFF` overrides are checked.

## Issues Found

### ARTIFACT (Artifact)
  - type: JSON=`Debuff` vs SRC=`Buff`

### ATTACK_BURN (Attack Burn)
  - type: JSON=`Buff` vs SRC=`Debuff`

### BIAS (Bias)
  - type: JSON=`Buff` vs SRC=`Debuff`

### CORPSEEXPLOSIONPOWER (Corpse Explosion)
  - type: JSON=`Buff` vs SRC=`Debuff`

### CORRUPTION (Corruption)
  - type: JSON=`Debuff` vs SRC=`Buff`

### DEXLOSS (Dexterity Down)
  - type: JSON=`Buff` vs SRC=`Debuff`

### DRAW (Draw)
  - type: JSON=`Buff` vs SRC=`Debuff`

### DRAW_REDUCTION (Draw Reduction)
  - type: JSON=`Buff` vs SRC=`Debuff`

### ELECTRO (Electro)
  - type: JSON=`Debuff` vs SRC=`Buff`

### FLEX (Strength Down)
  - type: JSON=`Buff` vs SRC=`Debuff`

### INVINCIBLE (Invincible)
  - type: JSON=`Debuff` vs SRC=`Buff`

### LIGHTNING_MASTERY (Lightning Mastery)
  - name: No localization found (LOC key missing)

### LOCKON (Lock-On)
  - type: JSON=`Buff` vs SRC=`Debuff`

### MALLEABLE (Malleable)
  - type: JSON=`Debuff` vs SRC=`Buff`

### MINION (Minion)
  - type: JSON=`Debuff` vs SRC=`Buff`

### NOBLOCKPOWER (No Block)
  - type: JSON=`Buff` vs SRC=`Debuff`

### NO_DRAW (No Draw)
  - type: JSON=`Buff` vs SRC=`Debuff`

### RECHARGINGCORE (RechargingCore)
  - name: No localization found (LOC key missing)

### RUPTURE (Rupture)
  - type: JSON=`Debuff` vs SRC=`Buff`

### SHACKLED (Shackled)
  - type: JSON=`Buff` vs SRC=`Debuff`

### SKILL_BURN (Skill Burn)
  - type: JSON=`Buff` vs SRC=`Debuff`

### STORM (Storm)
  - type: JSON=`Debuff` vs SRC=`Buff`

### WEAKENED (Weakened)
  - type: JSON=`Buff` vs SRC=`Debuff`

### WINTER (Winter)
  - name: No localization found (LOC key missing)

### WRAITH_FORM_V2 (Wraith Form)
  - type: JSON=`Buff` vs SRC=`Debuff`

## Missing Powers — Non-Watcher (in Java but not in JSON)
  None.

## Missing Powers — Watcher Character (in Java watcher/ but not in JSON)
  These are Watcher character-specific powers. If the dataset is STS1-only and does not include Watcher, these are expected to be absent.
  - `WrathNextTurnPower` (POWER_ID: `WrathNextTurnPower`)
  - `ForesightPower` (POWER_ID: `WireheadingPower`)
  - `MarkPower` (POWER_ID: `PathToVictoryPower`)
  - `WaveOfTheHandPower` (POWER_ID: `WaveOfTheHandPower`)
  - `LikeWaterPower` (POWER_ID: `LikeWaterPower`)
  - `MantraPower` (POWER_ID: `Mantra`)
  - `NoSkillsPower` (POWER_ID: `NoSkills`)
  - `BlockReturnPower` (POWER_ID: `BlockReturnPower`)
  - `EstablishmentPower` (POWER_ID: `EstablishmentPower`)
  - `StudyPower` (POWER_ID: `Study`)
  - `FreeAttackPower` (POWER_ID: `FreeAttackPower`)
  - `RushdownPower` (POWER_ID: `Adaptation`)
  - `EndTurnDeathPower` (POWER_ID: `EndTurnDeath`)
  - `NirvanaPower` (POWER_ID: `Nirvana`)
  - `CannotChangeStancePower` (POWER_ID: `CannotChangeStancePower`)
  - `MentalFortressPower` (POWER_ID: `Controlled`)
  - `MasterRealityPower` (POWER_ID: `MasterRealityPower`)
  - `OmnisciencePower` (POWER_ID: `OmnisciencePower`)
  - `BattleHymnPower` (POWER_ID: `BattleHymn`)
  - `DevaPower` (POWER_ID: `DevaForm`)
  - `OmegaPower` (POWER_ID: `OmegaPower`)
  - `LiveForeverPower` (POWER_ID: `AngelForm`)
  - `VaultPower` (POWER_ID: `Vault`)
  - `DevotionPower` (POWER_ID: `DevotionPower`)
  - `EnergyDownPower` (POWER_ID: `EnergyDownPower`)
  - `VigorPower` (POWER_ID: `Vigor`)

## Extra Powers (JSON entries without Java POWER_ID match)
  None.