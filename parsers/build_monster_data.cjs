'use strict';

const fs = require('fs');
const path = require('path');

const MONSTERS_DIR = '/Users/kuro/code/sts2-research/decompiled/MegaCrit.Sts2.Core.Models.Monsters';
const OUTPUT_FILE = path.join(__dirname, '../data/sts2/monsters.json');

// Convert PascalCase class name to SCREAMING_SNAKE_CASE
function toSnakeCase(name) {
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toUpperCase();
}

// Parse intent from a string like "new SingleAttackIntent(DarkStrikeDamage)" or "new BuffIntent()"
function parseIntent(intentStr) {
  intentStr = intentStr.trim();

  const singleAtk = intentStr.match(/new SingleAttackIntent\(([^)]+)\)/);
  if (singleAtk) return { type: 'attack', _damageRef: singleAtk[1].trim() };

  const multiAtk = intentStr.match(/new MultiAttackIntent\(([^,)]+),\s*(\d+)\)/);
  if (multiAtk) return { type: 'multi_attack', _damageRef: multiAtk[1].trim(), hits: parseInt(multiAtk[2]) };

  // MultiAttackIntent with hits as variable
  const multiAtk2 = intentStr.match(/new MultiAttackIntent\(([^,)]+),\s*([^)]+)\)/);
  if (multiAtk2) return { type: 'multi_attack', _damageRef: multiAtk2[1].trim(), _hitsRef: multiAtk2[2].trim() };

  if (intentStr.includes('new BuffIntent')) return { type: 'buff' };
  if (intentStr.includes('new DebuffIntent')) return { type: 'debuff' };
  if (intentStr.includes('new DefendIntent')) return { type: 'defend' };
  if (intentStr.includes('new HiddenIntent')) return { type: 'hidden' };
  if (intentStr.includes('new DeathBlowIntent')) return { type: 'deathblow' };
  if (intentStr.includes('new EscapeIntent')) return { type: 'escape' };
  if (intentStr.includes('new SleepIntent')) return { type: 'sleep' };
  if (intentStr.includes('new StatusIntent')) return { type: 'status' };
  if (intentStr.includes('new StunIntent')) return { type: 'stun' };
  if (intentStr.includes('new SummonIntent')) return { type: 'summon' };
  if (intentStr.includes('new HealIntent')) return { type: 'heal' };
  if (intentStr.includes('new CardDebuffIntent')) return { type: 'debuff' };

  return { type: 'unknown' };
}

// Extract all property definitions that use GetValueIfAscension
// Returns map: varName -> { normal: N, ascension: M, ascLevel: L }
function extractAscensionValues(code) {
  const ASCENSION_LEVELS = {
    'None': 0, 'SwarmingElites': 1, 'WearyTraveler': 2, 'Poverty': 3,
    'TightBelt': 4, 'AscendersBane': 5, 'Gloom': 6, 'Scarcity': 7,
    'ToughEnemies': 8, 'DeadlyEnemies': 9, 'DoubleBoss': 10
  };
  const values = {};
  // Match property like: private int FooDamage => AscensionHelper.GetValueIfAscension(AscensionLevel.X, ascVal, normalVal);
  const propRe = /(?:private|public|protected)\s+\w+\s+(\w+)\s*=>\s*AscensionHelper\.GetValueIfAscension\(AscensionLevel\.(\w+)\s*,\s*(\d+)\s*,\s*(\d+)\)/g;
  let m;
  while ((m = propRe.exec(code)) !== null) {
    values[m[1]] = { ascension: parseInt(m[3]), normal: parseInt(m[4]), ascLevel: ASCENSION_LEVELS[m[2]] ?? null, ascLevelName: m[2] };
  }
  return values;
}

// Extract HP values (min/max)
function extractHp(code, ascValues) {
  const result = {};

  const ASCENSION_LEVELS = {
    'None': 0, 'SwarmingElites': 1, 'WearyTraveler': 2, 'Poverty': 3,
    'TightBelt': 4, 'AscendersBane': 5, 'Gloom': 6, 'Scarcity': 7,
    'ToughEnemies': 8, 'DeadlyEnemies': 9, 'DoubleBoss': 10
  };

  const minMatch = code.match(/override\s+int\s+MinInitialHp\s*=>\s*AscensionHelper\.GetValueIfAscension\(AscensionLevel\.(\w+)\s*,\s*(\d+)\s*,\s*(\d+)\)/);
  if (minMatch) {
    result.min_hp = { ascension: parseInt(minMatch[2]), normal: parseInt(minMatch[3]), ascLevel: ASCENSION_LEVELS[minMatch[1]] ?? null };
  } else {
    const minSimple = code.match(/override\s+int\s+MinInitialHp\s*=>\s*(\d+)/);
    if (minSimple) result.min_hp = parseInt(minSimple[1]);
  }

  const maxMatch = code.match(/override\s+int\s+MaxInitialHp\s*=>\s*AscensionHelper\.GetValueIfAscension\(AscensionLevel\.(\w+)\s*,\s*(\d+)\s*,\s*(\d+)\)/);
  if (maxMatch) {
    result.max_hp = { ascension: parseInt(maxMatch[2]), normal: parseInt(maxMatch[3]), ascLevel: ASCENSION_LEVELS[maxMatch[1]] ?? null };
  } else {
    const maxSimple = code.match(/override\s+int\s+MaxInitialHp\s*=>\s*(\d+)/);
    if (maxSimple) result.max_hp = parseInt(maxSimple[1]);
    // Could reference MinInitialHp
    const maxRef = code.match(/override\s+int\s+MaxInitialHp\s*=>\s*MinInitialHp/);
    if (maxRef && result.min_hp) result.max_hp = result.min_hp;
  }

  return result;
}

// Extract the GenerateMoveStateMachine block
function extractStateMachineBlock(code) {
  const start = code.indexOf('GenerateMoveStateMachine()');
  if (start === -1) return null;
  const braceStart = code.indexOf('{', start);
  if (braceStart === -1) return null;

  let depth = 0;
  let i = braceStart;
  for (; i < code.length; i++) {
    if (code[i] === '{') depth++;
    else if (code[i] === '}') {
      depth--;
      if (depth === 0) break;
    }
  }
  return code.slice(braceStart, i + 1);
}

// Parse MoveState declarations from state machine block
// new MoveState("ID", method, intent1, intent2, ...)
function parseMoveStates(block) {
  const moves = {};
  const seenMoveIds = new Set();

  const lines = block.split('\n');
  for (const line of lines) {
    // Match: [MoveState] varName = new MoveState("ID", method, intents...)
    // Must NOT match property assignments like moveState.FollowUpState = new MoveState(...)
    const m = line.match(/(?:^|\s)(?:MoveState\s+)?(\w+)\s*=\s*(?:\(MoveState\))?new\s+MoveState\s*\(\s*"([^"]+)"\s*,\s*\w+\s*,(.+)/);
    if (m && !line.includes('.FollowUpState')) {
      const varName = m[1];
      const moveId = m[2];
      // Skip if this is a FollowUpState inline assignment duplicate
      // (handled by the second pattern below)
      if (seenMoveIds.has(moveId)) continue;
      seenMoveIds.add(moveId);

      const intentsPart = m[3].trim();
      const intents = parseIntentList(intentsPart);
      moves[varName] = { id: moveId, intents, varName };
    }
    // Also handle inline assignment in FollowUpState chains like:
    // MoveState moveState2 = (MoveState)(moveState.FollowUpState = new MoveState(...))
    const m2 = line.match(/MoveState\s+(\w+)\s*=\s*\(MoveState\)\s*\(\s*\w+\.FollowUpState\s*=\s*new\s+MoveState\s*\(\s*"([^"]+)"\s*,\s*\w+\s*,(.+)/);
    if (m2) {
      const varName = m2[1];
      const moveId = m2[2];
      if (seenMoveIds.has(moveId)) continue;
      seenMoveIds.add(moveId);
      const intentsPart = m2[3].trim();
      const intents = parseIntentList(intentsPart);
      moves[varName] = { id: moveId, intents, varName };
    }
  }
  return moves;
}

// Parse list of intent constructors from a string like "new BuffIntent(), new SingleAttackIntent(X))"
function parseIntentList(str) {
  const intents = [];
  // Remove trailing ) and ; 
  str = str.replace(/[;{]+$/, '').replace(/\)\s*$/, '').trim();
  // if ends with ){ we need to be careful - just strip trailing { and )
  str = str.replace(/\)\s*\{.*$/, '').trim();

  // Split by 'new ' but keep the keyword
  const parts = str.split(/(?=\bnew\s+\w+Intent)/);
  for (const part of parts) {
    const trimmed = part.trim().replace(/,\s*$/, '');
    if (trimmed.includes('Intent')) {
      intents.push(parseIntent(trimmed));
    }
  }
  return intents;
}

// Parse FollowUpState assignments
function parseFollowUps(block, moves) {
  // moveStateVar.FollowUpState = anotherVar  OR  moveStateVar.FollowUpState = moveStateVar (self-loop)
  const followUpRe = /(\w+)\.FollowUpState\s*=\s*(\w+)\s*[;)]/g;
  let m;
  while ((m = followUpRe.exec(block)) !== null) {
    const fromVar = m[1];
    const toVar = m[2];
    if (moves[fromVar] && toVar !== 'new') {
      moves[fromVar].followUpVar = toVar;
    }
  }

  // Handle inline: MoveState moveState2 = (MoveState)(moveState.FollowUpState = new MoveState("ID"...
  // In this case, moveState.FollowUpState points to moveState2
  const inlineRe = /MoveState\s+(\w+)\s*=\s*\(MoveState\)\s*\(\s*(\w+)\.FollowUpState\s*=/g;
  while ((m = inlineRe.exec(block)) !== null) {
    const assignedVar = m[1]; // moveState2
    const fromVar = m[2];     // moveState
    if (moves[fromVar]) {
      moves[fromVar].followUpVar = assignedVar;
    }
  }
}

// Parse RandomBranchState
function parseRandomBranches(block, moves) {
  const randomStates = {};
  // new RandomBranchState("ID")
  const randRe = /RandomBranchState\s+(\w+)\s*=\s*new\s+RandomBranchState\s*\(\s*"([^"]+)"\s*\)/g;
  let m;
  while ((m = randRe.exec(block)) !== null) {
    randomStates[m[1]] = { id: m[2], branches: [], type: 'random' };
  }

  // varName.AddBranch(moveVar, weight)
  const addBranchRe = /(\w+)\.AddBranch\s*\(\s*(\w+)\s*(?:,\s*[^)]+)?\)/g;
  while ((m = addBranchRe.exec(block)) !== null) {
    const randVar = m[1];
    const branchVar = m[2];
    if (randomStates[randVar]) {
      randomStates[randVar].branches.push(branchVar);
    }
  }

  return randomStates;
}

// Find start move from: new MonsterMoveStateMachine(list, startVar)
function findStartMove(block) {
  const m = block.match(/new\s+MonsterMoveStateMachine\s*\(\s*\w+\s*,\s*(\w+)\s*\)/);
  return m ? m[1] : null;
}

// Resolve damage reference to actual number
function resolveDamage(ref, ascValues) {
  if (!ref) return undefined;
  const trimmed = ref.trim();
  // Direct number
  if (/^\d+$/.test(trimmed)) return { normal: parseInt(trimmed) };
  // Property reference
  if (ascValues[trimmed]) return ascValues[trimmed];
  return undefined;
}

// Main parse function for a single CS file
function parseFile(filePath, ascValuesGlobal) {
  const code = fs.readFileSync(filePath, 'utf8');
  const className = path.basename(filePath, '.cs');
  const monsterId = toSnakeCase(className);

  const result = { id: monsterId };

  // Extract ascension values
  const ascValues = extractAscensionValues(code);

  // HP
  const hp = extractHp(code, ascValues);
  if (hp.min_hp !== undefined) result.min_hp = hp.min_hp;
  if (hp.max_hp !== undefined) result.max_hp = hp.max_hp;

  // State machine
  const smBlock = extractStateMachineBlock(code);
  if (!smBlock) return result;

  const moves = parseMoveStates(smBlock);
  const randomStates = parseRandomBranches(smBlock, moves);
  parseFollowUps(smBlock, moves);

  const startVar = findStartMove(smBlock);

  // Build move_pattern array
  const moveList = [];
  const seenIds = new Set();

  for (const [varName, move] of Object.entries(moves)) {
    // Determine primary intent (first one, or the attack one if multiple)
    let primaryIntent = move.intents[0] || { type: 'unknown' };

    // Resolve damage
    let intentOutput = { ...primaryIntent };
    if (intentOutput._damageRef) {
      const dmgVal = resolveDamage(intentOutput._damageRef, ascValues);
      delete intentOutput._damageRef;
      if (dmgVal) {
        if (typeof dmgVal === 'object' && dmgVal.normal !== undefined) {
          intentOutput.damage = dmgVal.normal;
          if (dmgVal.ascension !== undefined) {
            intentOutput.ascension_damage = dmgVal.ascension;
            if (dmgVal.ascLevel != null) intentOutput.ascension_level = dmgVal.ascLevel;
          }
        } else {
          intentOutput.damage = dmgVal;
        }
      }
    }
    if (intentOutput._hitsRef) {
      const hitsVal = resolveDamage(intentOutput._hitsRef, ascValues);
      delete intentOutput._hitsRef;
      if (hitsVal) {
        intentOutput.hits = typeof hitsVal === 'object' ? hitsVal.normal : hitsVal;
      }
    }

    // Ascension damage at top level of move entry (for backward compat)
    const moveEntry = {
      name: move.id.replace(/_MOVE$/, '').replace(/_/g, ' ').split(' ').map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(' '),
      id: move.id,
      intent: intentOutput,
    };

    // Additional intents
    if (move.intents.length > 1) {
      moveEntry.additional_intents = move.intents.slice(1).map(i => {
        const out = { ...i };
        delete out._damageRef;
        delete out._hitsRef;
        return out;
      });
    }

    // FollowUp
    if (move.followUpVar) {
      const followUpMove = moves[move.followUpVar];
      const followUpRandom = randomStates[move.followUpVar];
      if (followUpMove) {
        moveEntry.followUp = followUpMove.id;
        if (move.followUpVar === varName) moveEntry.loops = true;
      } else if (followUpRandom) {
        moveEntry.followUp = followUpRandom.id;
        moveEntry.followUpType = 'random';
      } else if (move.followUpVar === varName) {
        moveEntry.followUp = move.id;
        moveEntry.loops = true;
      }
    }

    moveList.push(moveEntry);
  }

  // Add random branch states to list
  for (const [varName, rs] of Object.entries(randomStates)) {
    const branches = rs.branches.map(bv => {
      const bm = moves[bv];
      return bm ? bm.id : bv;
    });
    moveList.push({
      name: rs.id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      id: rs.id,
      type: 'random',
      branches,
    });
  }

  if (moveList.length > 0) {
    result.move_pattern = moveList;
    if (startVar) {
      const startMove = moves[startVar] || randomStates[startVar];
      if (startMove) result.start_move = startMove.id;
    }
  }

  return result;
}

function main() {
  const csFiles = fs.readdirSync(MONSTERS_DIR)
    .filter(f => f.endsWith('.cs'))
    .map(f => path.join(MONSTERS_DIR, f));

  console.log(`Found ${csFiles.length} C# monster files`);

  // Load existing monsters.json
  let monsters = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    monsters = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
  }

  const monsterMap = new Map(monsters.map(m => [m.id, m]));

  let updated = 0;
  let skipped = 0;
  let warnings = [];

  for (const filePath of csFiles) {
    const className = path.basename(filePath, '.cs');
    try {
      const parsed = parseFile(filePath, {});
      const existing = monsterMap.get(parsed.id);

      if (existing) {
        // Merge: update HP if we got ascension-aware values
        if (parsed.min_hp !== undefined) existing.min_hp = parsed.min_hp;
        if (parsed.max_hp !== undefined) existing.max_hp = parsed.max_hp;
        if (parsed.move_pattern) {
          existing.move_pattern = parsed.move_pattern;
          existing.start_move = parsed.start_move;
        }
        updated++;
      } else {
        // Not in existing data — add if we have useful data
        if (parsed.move_pattern || parsed.min_hp) {
          monsterMap.set(parsed.id, parsed);
          warnings.push(`New monster not in existing data: ${parsed.id} (from ${className}.cs)`);
        } else {
          skipped++;
        }
      }
    } catch (err) {
      warnings.push(`Failed to parse ${className}.cs: ${err.message}`);
      skipped++;
    }
  }

  const output = Array.from(monsterMap.values());
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(output, null, 2));

  console.log(`Updated: ${updated}, Skipped: ${skipped}, Total monsters: ${output.length}`);
  if (warnings.length > 0) {
    console.log('\nWarnings:');
    warnings.forEach(w => console.log('  ⚠', w));
  }
  console.log(`\nOutput written to ${OUTPUT_FILE}`);
}

main();
