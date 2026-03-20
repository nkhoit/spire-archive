#!/usr/bin/env node
/**
 * resolve_relic_vars.js
 * 
 * Reads decompiled relic .cs files, extracts CanonicalVars,
 * then resolves {VarName} placeholders in relics.json descriptions.
 */

import fs from 'fs';
import path from 'path';
import { DECOMPILED_DIR, OUTPUT_DIR } from './config.mjs';

const RELICS_DIR = path.join(DECOMPILED_DIR, 'MegaCrit.Sts2.Core.Models.Relics');
const RELICS_JSON = path.join(OUTPUT_DIR, 'relics.json');

// Convert PascalCase class name to SCREAMING_SNAKE_CASE relic ID
function toRelicId(className) {
  return className
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_/, '')
    .toUpperCase();
}

// Map known typed var classes to their var name
const TYPED_VAR_MAP = {
  HealVar: 'Heal',
  EnergyVar: 'Energy',
  BlockVar: 'Block',
  DamageVar: 'Damage',
  CardsVar: 'Cards',
  MaxHpVar: 'MaxHp',
  StarsVar: 'Stars',
  RepeatVar: 'Repeat',
  SummonVar: 'Summon',
  GoldVar: 'Gold',
  IntVar: null,    // name is first arg
  DecimalVar: null, // name is first arg
};

/**
 * Parse a single var expression like:
 *   new PowerVar<VigorPower>(8m)
 *   new HealVar(12m)
 *   new DynamicVar("PotionSlots", 4m)
 *   new IntVar("Relics", 2m)
 *   new EnergyVar(1)
 *   new CardsVar(3)
 *   new StarsVar(10)
 */
function parseVarExpr(expr) {
  expr = expr.trim();

  // PowerVar<TypeName>(value)
  const powerMatch = expr.match(/new PowerVar<(\w+)>\(([^)]+)\)/);
  if (powerMatch) {
    const name = powerMatch[1];
    const val = parseFloat(powerMatch[2].replace('m', ''));
    return { name, value: val };
  }

  // DynamicVar("name", value) or IntVar("name", value) or DecimalVar("name", value)
  const namedMatch = expr.match(/new (?:DynamicVar|IntVar|DecimalVar)\("(\w+)"(?:,\s*([^)]+))?\)/);
  if (namedMatch) {
    const name = namedMatch[1];
    if (namedMatch[2] !== undefined) {
      const val = parseFloat(namedMatch[2].replace('m', ''));
      return { name, value: val };
    }
    return null; // no numeric value
  }

  // StringVar("name") - no numeric value, skip
  if (expr.match(/new StringVar\(/)) return null;

  // Typed vars: HealVar(12m), EnergyVar(1), BlockVar(10m, ...), CardsVar(3), etc.
  const typedMatch = expr.match(/new (\w+Var)\(([^,)]+)/);
  if (typedMatch) {
    const varClass = typedMatch[1];
    const rawVal = typedMatch[2].trim();
    // Skip if value is not numeric (e.g., a variable reference like CombatsLeft)
    if (!/^[\d.]+m?$/.test(rawVal)) return null;
    const val = parseFloat(rawVal.replace('m', ''));
    
    if (varClass === 'IntVar' || varClass === 'DecimalVar' || varClass === 'DynamicVar') {
      return null; // handled above
    }
    if (TYPED_VAR_MAP[varClass] !== undefined) {
      const name = TYPED_VAR_MAP[varClass];
      return { name, value: val };
    }
    // Unknown typed var — use class name minus "Var"
    const name = varClass.replace(/Var$/, '');
    return { name, value: val };
  }

  return null;
}

/**
 * Extract CanonicalVars from a .cs file's content.
 * Returns Map<string, number>
 */
function extractVars(content) {
  const vars = new Map();

  // Find the line(s) containing CanonicalVars
  // Could span multiple lines for arrays
  const idx = content.indexOf('CanonicalVars =>');
  if (idx === -1) return vars;

  // Grab from that position to the next semicolon at the same level
  // Walk forward counting braces/parens to find end
  let i = idx;
  let depth = 0;
  let started = false;
  let end = -1;
  while (i < content.length) {
    const ch = content[i];
    if (ch === '(' || ch === '{') { depth++; started = true; }
    if (ch === ')' || ch === '}') { depth--; }
    if (started && depth === 0 && ch === ';') { end = i; break; }
    i++;
  }

  if (end === -1) return vars;
  const block = content.slice(idx, end + 1);

  // Find all `new XxxVar...` expressions in the block
  const re = /new (\w+(?:<\w+>)?)\(([^)]*)\)/g;
  let m;
  while ((m = re.exec(block)) !== null) {
    const full = m[0];
    // Skip container types
    if (full.includes('ReadOnly') || full.includes('DynamicVar[')) continue;
    const parsed = parseVarExpr(full);
    if (parsed) {
      vars.set(parsed.name, parsed.value);
    }
  }

  return vars;
}

/**
 * Build a map: relicId -> Map<varName, value>
 */
function buildRelicVarsMap() {
  const map = new Map();
  const files = fs.readdirSync(RELICS_DIR).filter(f => f.endsWith('.cs'));

  for (const file of files) {
    const className = path.basename(file, '.cs');
    const relicId = toRelicId(className);
    const content = fs.readFileSync(path.join(RELICS_DIR, file), 'utf8');
    const vars = extractVars(content);
    if (vars.size > 0) {
      map.set(relicId, vars);
    }
  }

  return map;
}

/**
 * Format a value — if it's a whole number, show as integer
 */
function formatValue(val) {
  return Number.isInteger(val) ? String(val) : String(val);
}

/**
 * Replace {VarName} (and {VarName:modifier...}) placeholders in a description.
 * Only replaces when the var name matches a known var.
 */
function resolveDescription(desc, vars) {
  if (!desc || vars.size === 0) return { resolved: desc, changed: false };

  let changed = false;
  // Match {Word} or {Word:...} patterns
  const result = desc.replace(/\{(\w+)([^}]*)?\}/g, (match, name, suffix) => {
    if (vars.has(name)) {
      changed = true;
      return formatValue(vars.get(name));
    }
    return match;
  });

  return { resolved: result, changed };
}

// Main
const relicVarsMap = buildRelicVarsMap();
const relics = JSON.parse(fs.readFileSync(RELICS_JSON, 'utf8'));

let resolvedCount = 0;
const examples = [];

for (const relic of relics) {
  const vars = relicVarsMap.get(relic.id);
  if (!vars) continue;

  let anyChanged = false;

  if (relic.description) {
    const { resolved, changed } = resolveDescription(relic.description, vars);
    if (changed) {
      if (examples.length < 5) {
        examples.push({
          id: relic.id,
          before: relic.description,
          after: resolved,
          vars: Object.fromEntries(vars),
        });
      }
      relic.description = resolved;
      anyChanged = true;
    }
  }

  if (relic.flavor) {
    const { resolved, changed } = resolveDescription(relic.flavor, vars);
    if (changed) {
      relic.flavor = resolved;
      anyChanged = true;
    }
  }

  if (anyChanged) resolvedCount++;
}

fs.writeFileSync(RELICS_JSON, JSON.stringify(relics, null, 2), 'utf8');

console.log(`\n✅ Done! Resolved vars in ${resolvedCount} / ${relics.length} relics.\n`);
console.log('📋 Examples:');
for (const ex of examples) {
  console.log(`\n  [${ex.id}]`);
  console.log(`    vars:   ${JSON.stringify(ex.vars)}`);
  console.log(`    before: ${ex.before}`);
  console.log(`    after:  ${ex.after}`);
}
