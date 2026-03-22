#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { DECOMPILED_DIR, PCK_DIR, OUTPUT_DIR } from './config.mjs';

const MONSTERS_DIR = path.join(DECOMPILED_DIR, 'MegaCrit.Sts2.Core.Models.Monsters');
const ENCOUNTERS_DIR = path.join(DECOMPILED_DIR, 'MegaCrit.Sts2.Core.Models.Encounters');
const LOCALIZATION_FILE = path.join(PCK_DIR, 'localization', 'eng', 'monsters.json');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'monsters.json');

// Load existing monsters.json
const existingMonsters = JSON.parse(
  fs.readFileSync(OUTPUT_FILE, "utf-8")
);
const monsterMap = new Map(existingMonsters.map((m) => [m.id, m]));

// Load localization
const localization = JSON.parse(
  fs.readFileSync(LOCALIZATION_FILE, "utf-8")
);

// Parse encounters to get tier info
const tierMap = new Map(); // monsterId -> tier (Elite > Boss > Normal > Weak)
const encounterFiles = fs.readdirSync(ENCOUNTERS_DIR);

for (const file of encounterFiles) {
  const content = fs.readFileSync(path.join(ENCOUNTERS_DIR, file), "utf-8");
  
  // Extract class name and type suffix
  const classMatch = content.match(
    /public sealed class (\w+) : EncounterModel/
  );
  if (!classMatch) continue;
  
  const className = classMatch[1];
  
  // Determine type from filename: Normal, Weak, Elite, Boss, Event
  let type = "Normal";
  if (className.endsWith("Elite")) type = "Elite";
  else if (className.endsWith("Boss")) type = "Boss";
  else if (className.endsWith("Weak")) type = "Weak";
  else if (className.endsWith("Event")) type = "Event";
  
  // Extract monster types from AllPossibleMonsters
  // Example: ModelDb.Monster<Chomper>()
  const monsterMatches = content.matchAll(
    /ModelDb\.Monster<(\w+)>\(\)/g
  );
  
  for (const match of monsterMatches) {
    const monsterName = match[1];
    const monsterId = camelCaseToSnakeCase(monsterName).toUpperCase();
    
    // Update tier if this is higher priority
    const tierPriority = { Elite: 3, Boss: 2, Normal: 1, Weak: 0 };
    const current = tierMap.get(monsterId);
    if (!current || tierPriority[type] > tierPriority[current]) {
      tierMap.set(monsterId, type);
    }
  }
}

// Parse monster files
const monsterFiles = fs.readdirSync(MONSTERS_DIR);
const stats = { parsed: 0, updated: 0, errors: 0 };

for (const file of monsterFiles) {
  if (!file.endsWith(".cs")) continue;
  
  const content = fs.readFileSync(path.join(MONSTERS_DIR, file), "utf-8");
  
  // Extract class name
  const classMatch = content.match(
    /public sealed class (\w+) : MonsterModel/
  );
  if (!classMatch) continue;
  
  const className = classMatch[1];
  const monsterId = camelCaseToSnakeCase(className).toUpperCase();
  
  // Get or create monster entry
  if (!monsterMap.has(monsterId)) {
    monsterMap.set(monsterId, {
      id: monsterId,
      name: className,
      min_hp: null,
      max_hp: null,
      type: "Normal",
      act: "unknown",
      moves: [],
      powers: [],
      description: null,
    });
  }
  
  const monster = monsterMap.get(monsterId);
  
  try {
    // Parse HP
    const minHpMatch = content.match(
      /public override int MinInitialHp\s*=>\s*(.+?);/s
    );
    if (minHpMatch) {
      monster.min_hp = parseHpValue(minHpMatch[1]);
    }
    
    const maxHpMatch = content.match(
      /public override int MaxInitialHp\s*=>\s*(.+?);/s
    );
    if (maxHpMatch) {
      monster.max_hp = parseHpValue(maxHpMatch[1]);
    }
    
    // Parse moves from move methods
    const movesData = parseMovesFromMethods(content, monsterId);
    if (movesData.length > 0) {
      monster.moves = movesData;
    }
    
    // Parse powers from AfterAddedToRoom
    const powers = parsePowersFromAfterAddedToRoom(content);
    if (powers.length > 0) {
      monster.powers = powers;
    }
    
    // Set tier from encounters
    if (tierMap.has(monsterId)) {
      monster.type = tierMap.get(monsterId);
    }
    
    stats.parsed++;
    stats.updated++;
  } catch (e) {
    console.error(`Error parsing ${file}:`, e.message);
    stats.errors++;
  }
}

// Sort by ID and write output
const sortedMonsters = Array.from(monsterMap.values()).sort((a, b) =>
  a.id.localeCompare(b.id)
);

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(sortedMonsters, null, 2));

// Print summary
console.log(`\n=== STS2 Monster Parser Summary ===`);
console.log(`Parsed: ${stats.parsed} monster files`);
console.log(`Updated: ${stats.updated} monsters`);
console.log(`Errors: ${stats.errors}`);
console.log(`Total monsters in output: ${sortedMonsters.length}`);
console.log(`Output: ${OUTPUT_FILE}\n`);

// Example entries
const exampleIds = ["CHOMPER", "AXEBOT", "BIG_DUMMY"];
console.log(`=== Example Entries ===\n`);
for (const id of exampleIds) {
  const monster = sortedMonsters.find((m) => m.id === id);
  if (monster) {
    console.log(`${id}:`);
    console.log(JSON.stringify(monster, null, 2));
    console.log();
  }
}

// ============= Parsing Helpers =============

function camelCaseToSnakeCase(str) {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "");
}

function parseHpValue(expr) {
  // Direct value: "9999"
  const directMatch = expr.match(/^(\d+)$/);
  if (directMatch) {
    return parseInt(directMatch[1]);
  }
  
  // AscensionHelper.GetValueIfAscension(...) - use the NON-ascension value (second/last param)
  // e.g., AscensionHelper.GetValueIfAscension(AscensionLevel.ToughEnemies, 63, 60) -> 60
  const ascensionMatch = expr.match(
    /AscensionHelper\.GetValueIfAscension\([^,]+,\s*\d+,\s*(\d+)\)/
  );
  if (ascensionMatch) {
    return parseInt(ascensionMatch[1]);
  }
  
  // Fallback: try to extract any number
  const numMatch = expr.match(/(\d+)/);
  if (numMatch) {
    return parseInt(numMatch[1]);
  }
  
  return null;
}

function parseMovesFromMethods(content, monsterId) {
  const moves = [];
  
  // First, extract move IDs and their associated methods from MoveState definitions
  // Example: new MoveState("CLAMP_MOVE", ClampMove, ...)
  const moveStateMatches = content.matchAll(
    /new MoveState\("([^"]+)",\s*(\w+),/g
  );
  
  const moveIdToMethod = new Map();
  for (const match of moveStateMatches) {
    const moveId = match[1];
    const methodName = match[2];
    moveIdToMethod.set(methodName, moveId);
  }
  
  // Now parse each move method
  const moveMethods = content.matchAll(
    /private async Task (\w+)\(IReadOnlyList<Creature>/g
  );
  
  for (const match of moveMethods) {
    const methodName = match[1];
    const moveId = moveIdToMethod.get(methodName);
    if (!moveId) continue; // Skip methods not used as moves
    
    // Look for the method body
    const methodBodyRegex = new RegExp(
      `private async Task ${methodName}\\([^)]+\\)\\s*{([^}]+(?:{[^}]*}[^}]*)*)}`,
      "s"
    );
    const methodMatch = content.match(methodBodyRegex);
    if (!methodMatch) continue;
    
    const methodBody = methodMatch[1];
    
    // Extract damage from DamageCmd.Attack(N)
    let damage = null;
    const damageMatch = methodBody.match(
      /DamageCmd\.Attack\((\w+)\)/
    );
    if (damageMatch) {
      const damageRef = damageMatch[1];
      // Try to resolve the variable/property
      damage = resolveDamageValue(content, damageRef);
    }
    
    // Extract hit count from .WithHitCount(N)
    let hitCount = null;
    const hitMatch = methodBody.match(/\.WithHitCount\((\d+)\)/);
    if (hitMatch) {
      hitCount = parseInt(hitMatch[1]);
    }
    
    // Get move name from localization
    // Key format: MONSTER_ID.moves.MOVE_ID.title (MOVE_ID from MoveState)
    const moveIdSnake = moveId
      .replace(/_MOVE$/, "")
      .replace(/_/g, "_");
    const locKey = `${monsterId}.moves.${moveIdSnake}.title`;
    const moveName = localization[locKey] || methodName;
    
    // Only add if we found meaningful data
    if (damage !== null || hitCount !== null) {
      moves.push({
        name: moveName,
        damage: damage,
        hits: hitCount,
      });
    }
  }
  
  return moves;
}

function resolveDamageValue(content, ref) {
  // If it's a direct number
  const num = parseInt(ref);
  if (!isNaN(num)) return num;
  
  // Look for property definition: private [static] int PropertyName => ...
  const propRegex = new RegExp(
    `private\\s+(?:static\\s+)?int ${ref}\\s*=>\\s*(.+?);`,
    "s"
  );
  const propMatch = content.match(propRegex);
  if (propMatch) {
    const propExpr = propMatch[1].trim();
    // Handle AscensionHelper.GetValueIfAscension(...) - use the last value (non-ascension)
    const ascensionMatch = propExpr.match(
      /AscensionHelper\.GetValueIfAscension\([^,]+,\s*\d+,\s*(\d+)\)/
    );
    if (ascensionMatch) {
      return parseInt(ascensionMatch[1]);
    }
    // Try to extract a number from the expression
    const numMatch = propExpr.match(/(\d+)(?:[,\)]|$)/);
    if (numMatch) {
      return parseInt(numMatch[1]);
    }
  }
  
  return null;
}

function parsePowersFromAfterAddedToRoom(content) {
  const powers = [];
  
  // Match AfterAddedToRoom method
  const afterAddedMatch = content.match(
    /public override async Task AfterAddedToRoom\(\)([\s\S]*?)(?=\n\s{2}(?:public|protected|private|}|\Z))/
  );
  if (!afterAddedMatch) return powers;
  
  const methodBody = afterAddedMatch[1];
  
  // Look for PowerCmd.Apply<PowerName>(... Nm)
  // Example: PowerCmd.Apply<ArtifactPower>(base.Creature, 2m, base.Creature, null)
  const powerMatches = methodBody.matchAll(
    /PowerCmd\.Apply<(\w+)>\([^,]*,\s*(\d+)m?/g
  );
  
  for (const match of powerMatches) {
    const powerName = match[1];
    const powerAmount = parseInt(match[2]);
    
    powers.push(`${powerName} ${powerAmount}`);
  }
  
  return powers;
}

function tryParseNumber(str) {
  // If it's a decimal number, parse it
  const num = parseFloat(str);
  if (!isNaN(num)) {
    return Math.round(num);
  }
  
  // Otherwise it's a variable reference, return null
  return null;
}
