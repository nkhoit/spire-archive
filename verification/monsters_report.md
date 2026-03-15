# Monsters Verification Report

Checked 68 monsters in JSON against 68 Java source files.

**Note:** HP parsing uses `setHp()` calls or `super(NAME, ID, HP, ...)`. Monsters with randomized HP (ApologySlime, SnakeDagger, HexaghostBody, HexaghostOrb) have `null` HP in JSON — correct.

Move count comparison uses count of `private static final byte` constants vs JSON moves array length.

## Issues Found

### AWAKENEDONE (Awakened One)
  - min_hp_ascension: JSON=`None` vs SRC=`320`
  - max_hp_ascension: JSON=`None` vs SRC=`320`

### BANDITBEAR (Bear)
  - moves: JSON has 1, SRC has 3 byte constants (may be OK if names match)

### BANDITCHILD (Pointy)
  - min_hp_ascension: JSON=`None` vs SRC=`34`
  - max_hp_ascension: JSON=`None` vs SRC=`34`

### BANDITLEADER (Romeo)
  - moves: JSON has 1, SRC has 3 byte constants (may be OK if names match)

### BRONZEAUTOMATON (Bronze Automaton)
  - min_hp_ascension: JSON=`None` vs SRC=`320`
  - max_hp_ascension: JSON=`None` vs SRC=`320`

### CHAMP (The Champ)
  - min_hp_ascension: JSON=`None` vs SRC=`440`
  - max_hp_ascension: JSON=`None` vs SRC=`440`

### CORRUPTHEART (Corrupt Heart)
  - min_hp_ascension: JSON=`None` vs SRC=`800`
  - max_hp_ascension: JSON=`None` vs SRC=`800`

### DECA (Deca)
  - min_hp_ascension: JSON=`None` vs SRC=`265`
  - max_hp_ascension: JSON=`None` vs SRC=`265`

### DONU (Donu)
  - min_hp_ascension: JSON=`None` vs SRC=`265`
  - max_hp_ascension: JSON=`None` vs SRC=`265`

### GREMLINFAT (Fat Gremlin)
  - moves: JSON has 2, SRC has 1 byte constants (may be OK if names match)

### GREMLINTHIEF (Sneaky Gremlin)
  - moves: JSON has 2, SRC has 1 byte constants (may be OK if names match)

### GREMLINTSUNDERE (Shield Gremlin)
  - moves: JSON has 3, SRC has 2 byte constants (may be OK if names match)

### GREMLINWARRIOR (Mad Gremlin)
  - moves: JSON has 2, SRC has 1 byte constants (may be OK if names match)

### GREMLINWIZARD (Gremlin Wizard)
  - moves: JSON has 3, SRC has 2 byte constants (may be OK if names match)

### HEXAGHOST (Hexaghost)
  - min_hp_ascension: JSON=`None` vs SRC=`264`
  - max_hp_ascension: JSON=`None` vs SRC=`264`

### LAGAVULIN (Lagavulin)
  - moves: JSON has 4, SRC has 5 byte constants (may be OK if names match)

### LOOTER (Looter)
  - moves: JSON has 2, SRC has 4 byte constants (may be OK if names match)

### MUGGER (Mugger)
  - moves: JSON has 2, SRC has 4 byte constants (may be OK if names match)

### NEMESIS (Nemesis)
  - min_hp_ascension: JSON=`None` vs SRC=`200`
  - max_hp_ascension: JSON=`None` vs SRC=`200`

### SERPENT (Spire Growth)
  - min_hp_ascension: JSON=`None` vs SRC=`190`
  - max_hp_ascension: JSON=`None` vs SRC=`190`

### SLIMEBOSS (Slime Boss)
  - min_hp_ascension: JSON=`None` vs SRC=`150`
  - max_hp_ascension: JSON=`None` vs SRC=`150`

### SPIRESHIELD (Spire Shield)
  - min_hp_ascension: JSON=`None` vs SRC=`125`
  - max_hp_ascension: JSON=`None` vs SRC=`125`

### SPIRESPEAR (Spire Spear)
  - min_hp_ascension: JSON=`None` vs SRC=`180`
  - max_hp_ascension: JSON=`None` vs SRC=`180`

### THECOLLECTOR (The Collector)
  - min_hp_ascension: JSON=`None` vs SRC=`300`
  - max_hp_ascension: JSON=`None` vs SRC=`300`

### THEGUARDIAN (The Guardian)
  - min_hp_ascension: JSON=`None` vs SRC=`250`
  - max_hp_ascension: JSON=`None` vs SRC=`250`

### TIMEEATER (Time Eater)
  - min_hp_ascension: JSON=`None` vs SRC=`480`
  - max_hp_ascension: JSON=`None` vs SRC=`480`

### WRITHINGMASS (Writhing Mass)
  - min_hp_ascension: JSON=`None` vs SRC=`175`
  - max_hp_ascension: JSON=`None` vs SRC=`175`

## Missing Monsters (Java files not in JSON)
  None.

## Extra Monsters (JSON entries without Java files)
  None.