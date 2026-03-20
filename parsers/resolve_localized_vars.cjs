#!/usr/bin/env node
/**
 * Resolve template variables in localized STS2 card descriptions.
 * Reads C# source files to extract var values, then replaces {VarName:diff()} etc.
 * in all locale JSON files.
 */

const fs = require('fs');
const path = require('path');
const { PROJECT_ROOT, PCK_DIR, DECOMPILED_DIR, OUTPUT_DIR } = require('./config.cjs');

const CS_DIRS = {
  cards: path.join(DECOMPILED_DIR, 'MegaCrit.Sts2.Core.Models.Cards'),
  relics: path.join(DECOMPILED_DIR, 'MegaCrit.Sts2.Core.Models.Relics'),
  potions: path.join(DECOMPILED_DIR, 'MegaCrit.Sts2.Core.Models.Potions'),
  events: path.join(DECOMPILED_DIR, 'MegaCrit.Sts2.Core.Models.Events'),
  enchantments: path.join(DECOMPILED_DIR, 'MegaCrit.Sts2.Core.Models.Enchantments'),
};
const LOCALE_DIR = path.join(OUTPUT_DIR, 'localization');

function idToFilename(id) {
  return id.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('') + '.cs';
}

function extractVarsFromCs(csContent) {
  const vars = {};

  // Extract CanonicalVars block
  let blockContent = '';
  const blockMatch = csContent.match(/CanonicalVars\s*=>\s*new[^{]*\{([\s\S]*?)(?=\n\s{4}\w|\n\s{2}\})/);
  if (blockMatch) {
    blockContent = blockMatch[0];
  } else {
    const singleMatch = csContent.match(/CanonicalVars\s*=>\s*new[^;]+;/s);
    if (singleMatch) {
      blockContent = singleMatch[0];
    } else {
      // Try just searching the whole file
      blockContent = csContent;
    }
  }

  function setDefault(key, value) {
    if (!(key in vars)) vars[key] = value;
  }

  function fmtVal(v) {
    const f = parseFloat(v);
    if (!isNaN(f) && f === Math.floor(f)) return String(Math.floor(f));
    return v;
  }

  // DamageVar(Xm)
  for (const [, v] of blockContent.matchAll(/new DamageVar\((\d+(?:\.\d+)?)m/g)) setDefault('Damage', fmtVal(v));
  // BlockVar(Xm)
  for (const [, v] of blockContent.matchAll(/new BlockVar\((\d+(?:\.\d+)?)m/g)) setDefault('Block', fmtVal(v));
  // Named BlockVar("Name", Xm)
  for (const [, name, v] of blockContent.matchAll(/new BlockVar\("(\w+)",\s*(\d+(?:\.\d+)?)m/g)) setDefault(name, fmtVal(v));
  // ExtraDamageVar
  for (const [, v] of blockContent.matchAll(/new ExtraDamageVar\((\d+(?:\.\d+)?)m/g)) setDefault('ExtraDamage', fmtVal(v));
  // HpLossVar
  for (const [, v] of blockContent.matchAll(/new HpLossVar\((\d+(?:\.\d+)?)m/g)) setDefault('HpLoss', fmtVal(v));
  // ForgeVar
  for (const [, v] of blockContent.matchAll(/new ForgeVar\((\d+(?:\.\d+)?)\b/g)) setDefault('Forge', fmtVal(v));
  // GoldVar
  for (const [, v] of blockContent.matchAll(/new GoldVar\((\d+(?:\.\d+)?)m?[,)]/g)) setDefault('Gold', fmtVal(v));
  // TurnsVar
  for (const [, v] of blockContent.matchAll(/new TurnsVar\((\d+(?:\.\d+)?)m/g)) setDefault('Turns', fmtVal(v));
  // StarsVar
  for (const [, v] of blockContent.matchAll(/new StarsVar\((\d+(?:\.\d+)?)\b/g)) setDefault('Stars', fmtVal(v));
  // ShivsVar
  for (const [, v] of blockContent.matchAll(/new ShivsVar\((\d+(?:\.\d+)?)m/g)) setDefault('Shivs', fmtVal(v));
  // CalculationBaseVar
  for (const [, v] of blockContent.matchAll(/new CalculationBaseVar\((\d+(?:\.\d+)?)m/g)) {
    const fv = fmtVal(v);
    for (const k of ['CalculationBase','CalculatedDamage','CalculatedBlock','CalculatedHits','CalculatedShivs','CalculatedCards','CalculatedForge','CalculatedChannels','CalculatedFocus','CalculatedEnergy','CalculatedDoom']) {
      setDefault(k, fv);
    }
  }
  // CalculationExtraVar
  for (const [, v] of blockContent.matchAll(/new CalculationExtraVar\((\d+(?:\.\d+)?)m/g)) setDefault('CalculationExtra', fmtVal(v));
  // HitsVar
  for (const [, v] of blockContent.matchAll(/new HitsVar\((\d+(?:\.\d+)?)m/g)) {
    setDefault('Hits', fmtVal(v));
    setDefault('CalculatedHits', fmtVal(v));
  }
  // SummonVar
  for (const [, v] of blockContent.matchAll(/new SummonVar\((\d+(?:\.\d+)?)m?\b/g)) setDefault('Summon', fmtVal(v));
  // OstyDamageVar
  for (const [, v] of blockContent.matchAll(/new OstyDamageVar\((\d+(?:\.\d+)?)m/g)) setDefault('OstyDamage', fmtVal(v));
  // MaxHpVar
  for (const [, v] of blockContent.matchAll(/new MaxHpVar\((\d+(?:\.\d+)?)m/g)) setDefault('MaxHp', fmtVal(v));
  // OrbSlotsVar
  for (const [, v] of blockContent.matchAll(/new OrbSlotsVar\((\d+(?:\.\d+)?)m/g)) setDefault('OrbSlots', fmtVal(v));
  // HealVar
  for (const [, v] of blockContent.matchAll(/new HealVar\((\d+(?:\.\d+)?)m/g)) setDefault('Heal', fmtVal(v));
  // RepeatVar
  for (const [, v] of blockContent.matchAll(/new RepeatVar\((\d+(?:\.\d+)?)\b/g)) setDefault('Repeat', fmtVal(v));

  // PowerVar<TypeName>("CustomName", Xm)
  for (const [, typeName, customName, v] of blockContent.matchAll(/new PowerVar<(\w+)>\("(\w+)",\s*(\d+(?:\.\d+)?)m/g)) {
    setDefault(customName, fmtVal(v));
    const derived = typeName.replace(/Power$/, '');
    setDefault(derived, fmtVal(v));
  }
  // PowerVar<TypeName>(Xm)
  for (const [, typeName, v] of blockContent.matchAll(/new PowerVar<(\w+)>\((\d+(?:\.\d+)?)m/g)) {
    const derived = typeName.replace(/Power$/, '');
    setDefault(derived, fmtVal(v));
    setDefault(typeName, fmtVal(v));
  }

  // EnergyVar("Name", X)
  for (const [, name, v] of blockContent.matchAll(/new EnergyVar\("(\w+)",\s*(\d+(?:\.\d+)?)\b/g)) setDefault(name, fmtVal(v));
  // EnergyVar(X)
  for (const [, v] of blockContent.matchAll(/new EnergyVar\((\d+(?:\.\d+)?)\b/g)) setDefault('Energy', fmtVal(v));

  // CardsVar("Name", X)
  for (const [, name, v] of blockContent.matchAll(/new CardsVar\("(\w+)",\s*(\d+(?:\.\d+)?)\b/g)) setDefault(name, fmtVal(v));
  // CardsVar(X)
  for (const [, v] of blockContent.matchAll(/new CardsVar\((\d+(?:\.\d+)?)\b/g)) setDefault('Cards', fmtVal(v));

  // DynamicVar("Name", Xm)
  for (const [, name, v] of blockContent.matchAll(/new DynamicVar\("(\w+)",\s*(\d+(?:\.\d+)?)m/g)) setDefault(name, fmtVal(v));

  // IntVar("Name", Xm)
  for (const [, name, v] of blockContent.matchAll(/new IntVar\("(\w+)",\s*(\d+(?:\.\d+)?)m/g)) setDefault(name, fmtVal(v));

  // Fallback: private field defaults
  for (const [, v] of csContent.matchAll(/private int _currentDamage\s*=\s*(\d+)/g)) setDefault('Damage', fmtVal(v));
  for (const [, v] of csContent.matchAll(/private int _currentBlock\s*=\s*(\d+)/g)) setDefault('Block', fmtVal(v));

  // StringVar with entity reference: StringVar("VarName", ModelDb.Xyz<ClassName>().Title...)
  // Store as __entity_ref__ClassName for later resolution with localized names
  for (const [, varName, className] of csContent.matchAll(/new StringVar\("(\w+)",\s*ModelDb\.\w+<(\w+)>\(\)\.Title/g)) {
    // Convert PascalCase to SCREAMING_SNAKE_CASE
    const entityId = className.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').toUpperCase();
    vars[varName] = `__entity_ref__${entityId}`;
  }

  // Named SummonVar: SummonVar("Name", Xm)
  for (const [, name, v] of blockContent.matchAll(/new SummonVar\("(\w+)",\s*(\d+(?:\.\d+)?)m/g)) setDefault(name, fmtVal(v));

  return vars;
}

function extractBalanced(s, start) {
  let depth = 0;
  for (let i = start; i < s.length; i++) {
    if (s[i] === '{') depth++;
    else if (s[i] === '}') {
      depth--;
      if (depth === 0) return [s.slice(start + 1, i), i + 1];
    }
  }
  return [s.slice(start + 1), s.length];
}

const KEYWORD_BLOCKS = new Set(['Chaos','Choking','Curious','Energized','Expertise','Violence','Wisdom','Improvement','Sapping']);

function resolveTokens(desc, vars) {
  const result = [];
  let i = 0;
  while (i < desc.length) {
    if (desc[i] !== '{') {
      result.push(desc[i]);
      i++;
      continue;
    }
    const [inner, end] = extractBalanced(desc, i);
    const colon1 = inner.indexOf(':');
    if (colon1 === -1) {
      const varName = inner.trim();
      if (varName === 'singleStarIcon') result.push('⭐');
      else if (varName in vars) result.push(vars[varName]);
      else result.push('{' + inner + '}');
      i = end;
      continue;
    }
    const tag = inner.slice(0, colon1);
    const rest = inner.slice(colon1 + 1);

    if (tag === 'IfUpgraded' && rest.startsWith('show:')) {
      const content = rest.slice(5);
      const idx = content.lastIndexOf('|');
      if (idx !== -1) result.push(resolveTokens(content.slice(idx + 1), vars));
      i = end; continue;
    }
    if (tag === 'InCombat' || tag === 'IsTargeting') {
      result.push(resolveTokens(rest.endsWith('|') ? rest.slice(0,-1) : rest, vars));
      i = end; continue;
    }
    if (tag === 'HasRider') {
      const idx = rest.lastIndexOf('|');
      result.push(resolveTokens(idx !== -1 ? rest.slice(0, idx) : rest, vars));
      i = end; continue;
    }
    if (KEYWORD_BLOCKS.has(tag)) {
      result.push(resolveTokens(rest.endsWith('|') ? rest.slice(0,-1) : rest, vars));
      i = end; continue;
    }
    if (rest === 'diff()' || rest === 'inverseDiff()') {
      if (tag in vars) result.push(vars[tag]);
      else result.push('{' + inner + '}');
      i = end; continue;
    }
    if (rest === 'starIcons()') {
      if (tag in vars) result.push(vars[tag] + ' Stars');
      else result.push('{' + inner + '}');
      i = end; continue;
    }
    if (tag === 'energyPrefix' && rest.startsWith('energyIcons(')) {
      const m = rest.match(/energyIcons\((\d+)\)/);
      result.push(m ? (parseInt(m[1]) === 1 ? '[E]' : `${m[1]}[E]`) : '[E]');
      i = end; continue;
    }
    if (rest === 'energyIcons()') {
      result.push('[E]');
      i = end; continue;
    }
    if (rest.startsWith('plural:')) {
      const content = rest.slice(7);
      const idx = content.indexOf('|');
      if (idx !== -1) result.push(content.slice(0, idx).replace(/\{[^}]*\}/g, ''));
      else result.push(content);
      i = end; continue;
    }
    // plural(lang):option1|option2|option3 — pick based on var value
    if (rest.startsWith('plural(')) {
      const parenEnd = rest.indexOf('):');
      if (parenEnd !== -1) {
        const options = rest.slice(parenEnd + 2).split('|');
        const val = tag in vars ? parseInt(vars[tag]) : NaN;
        let chosen;
        if (options.length === 3) {
          // Russian-style: 1 → [0], 2-4 → [1], 5+ → [2]
          const n = isNaN(val) ? 5 : Math.abs(val);
          const mod10 = n % 10, mod100 = n % 100;
          if (mod10 === 1 && mod100 !== 11) chosen = options[0];
          else if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) chosen = options[1];
          else chosen = options[2];
        } else if (options.length === 2) {
          // EN-style: 1 → singular, else plural
          chosen = (!isNaN(val) && val === 1) ? options[0] : options[1];
        } else {
          chosen = options[0];
        }
        result.push(resolveTokens(chosen, vars));
      } else {
        result.push('{' + inner + '}');
      }
      i = end; continue;
    }
    // choose(1):optA|optB — if val=1 use optA, else optB
    if (rest.startsWith('choose(1):')) {
      const content = rest.slice(10);
      const val = tag in vars ? parseInt(vars[tag]) : NaN;
      const idx = content.indexOf('|');
      if (idx !== -1) {
        const chosen = (!isNaN(val) && val === 1) ? content.slice(0, idx) : content.slice(idx + 1);
        result.push(resolveTokens(chosen, vars));
      } else {
        result.push(resolveTokens(content, vars));
      }
      i = end; continue;
    }
    if (rest.startsWith('cond:')) {
      const content = rest.slice(5);
      const idx = content.lastIndexOf('|');
      if (idx !== -1) result.push(resolveTokens(content.slice(idx + 1), vars));
      i = end; continue;
    }
    if (tag === 'CardType' && rest.startsWith('choose(')) {
      const parenEnd = rest.indexOf(')');
      if (parenEnd !== -1) {
        const afterParen = rest.slice(parenEnd + 2);
        const parts = afterParen.split('|');
        result.push(resolveTokens(parts[0].trim(), vars));
      }
      i = end; continue;
    }
    // Unknown token — keep as-is
    result.push('{' + inner + '}');
    i = end;
  }
  return result.join('');
}

// Cache for C# vars
const csVarsCache = {};

function getVarsForId(id, category) {
  const cacheKey = `${category}:${id}`;
  if (cacheKey in csVarsCache) return csVarsCache[cacheKey];
  const filename = idToFilename(id);
  const csDir = CS_DIRS[category];
  const csPath = csDir ? path.join(csDir, filename) : null;
  let vars = {};
  if (csPath && fs.existsSync(csPath)) {
    const content = fs.readFileSync(csPath, 'utf8');
    vars = extractVarsFromCs(content);
  }
  csVarsCache[cacheKey] = vars;
  return vars;
}

// Process all locale files
const langs = fs.readdirSync(LOCALE_DIR).filter(f => f.endsWith('.json')).map(f => f.replace('.json',''));
console.log(`Processing ${langs.length} languages: ${langs.join(', ')}`);

const results = {};
const CATEGORIES = ['cards', 'relics', 'potions', 'events', 'enchantments'];

// Build entity name maps for resolving StringVar references per locale
function buildEntityNameMap(localeData) {
  const nameMap = {};
  for (const cat of ['cards', 'relics', 'potions', 'enchantments', 'powers']) {
    const items = localeData[cat] || {};
    for (const [id, item] of Object.entries(items)) {
      if (item && item.name) nameMap[id] = item.name;
    }
  }
  return nameMap;
}

function resolveEntityRefs(vars, nameMap) {
  const resolved = { ...vars };
  for (const [k, v] of Object.entries(resolved)) {
    if (typeof v === 'string' && v.startsWith('__entity_ref__')) {
      const entityId = v.slice('__entity_ref__'.length);
      if (nameMap[entityId]) {
        resolved[k] = nameMap[entityId];
      } else {
        delete resolved[k]; // Can't resolve, leave template unresolved
      }
    }
  }
  return resolved;
}

for (const lang of langs) {
  const filePath = path.join(LOCALE_DIR, lang + '.json');
  const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const entityNameMap = buildEntityNameMap(data);
  results[lang] = {};

  for (const category of CATEGORIES) {
    const items = data[category] || {};
    let totalItems = 0;
    let fullyResolved = 0;
    let unresolvedItems = 0;
    const stillUnresolved = [];

    for (const [itemId, itemData] of Object.entries(items)) {
      totalItems++;
      const rawVars = getVarsForId(itemId, category);
      const vars = resolveEntityRefs(rawVars, entityNameMap);
      const unresolved = new Set();
      let touched = false;

      function collectTemplates(text) {
        let match;
        const re = /\{[^}]+\}/g;
        while ((match = re.exec(text)) !== null) unresolved.add(match[0]);
      }

      function resolveField(obj, key) {
        if (!obj || typeof obj[key] !== 'string' || !obj[key].includes('{')) return;
        touched = true;
        obj[key] = resolveTokens(obj[key], vars);
        if (obj[key].includes('{')) collectTemplates(obj[key]);
      }

      if (category === 'events') {
        resolveField(itemData, 'description');
        for (const choice of itemData.choices || []) resolveField(choice, 'description');
        for (const page of itemData.pages || []) {
          resolveField(page, 'description');
          for (const choice of page.choices || []) resolveField(choice, 'description');
        }
      } else {
        resolveField(itemData, 'description');
      }

      if (!touched) continue;
      if (unresolved.size === 0) {
        fullyResolved++;
      } else {
        unresolvedItems++;
        stillUnresolved.push({ itemId, templates: [...unresolved], desc: (itemData.description || '').slice(0, 80) });
      }
    }

    results[lang][category] = { totalItems, fullyResolved, unresolvedItems, stillUnresolved };
    if (fullyResolved > 0 || unresolvedItems > 0) {
      console.log(`[${lang}/${category}] Total: ${totalItems}, Resolved: ${fullyResolved}, Still unresolved: ${unresolvedItems}`);
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

// Summary of unique unresolved templates across all langs
const allUnresolvedTemplates = new Set();
for (const cats of Object.values(results)) {
  for (const r of Object.values(cats)) {
    for (const { templates } of r.stillUnresolved) {
      for (const t of templates) allUnresolvedTemplates.add(t);
    }
  }
}
console.log(`\nUnique unresolved templates (${allUnresolvedTemplates.size}):`);
for (const t of [...allUnresolvedTemplates].sort()) console.log(' ', t);

// Validation
const jaData = JSON.parse(fs.readFileSync(path.join(LOCALE_DIR, 'ja.json'), 'utf8'));
console.log('\nValidation (ja):');
console.log('  BASH card:', jaData.cards?.BASH?.description);
console.log('  AKABEKO relic:', jaData.relics?.AKABEKO?.description);
console.log('  BEETLE_JUICE potion:', jaData.potions?.BEETLE_JUICE?.description);
console.log('  ABYSSAL_BATHS event:', jaData.events?.ABYSSAL_BATHS?.choices?.[0]?.description);
