#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { PCK_DIR, DECOMPILED_DIR, OUTPUT_DIR } from './config.mjs';

const ANCIENT_EVENT_DATA = {
  NEOW: {
    type: 'ancient',
  },
  PAEL: {
    type: 'ancient',
    description:
      "Pael, the Melting Dragon, offers three relic choices drawn from twisting pools of flesh, wing, and eye. Each visit presents one relic from Pool 1, one from Pool 2, and one from Pool 3, with extra options appearing when your deck or companions meet Pael's peculiar conditions.",
    relic_pools: [
      { name: 'Pool 1', relics: ['PAELS_FLESH', 'PAELS_HORN', 'PAELS_TEARS'] },
      { name: 'Pool 2', relics: ['PAELS_WING', 'PAELS_GROWTH', 'PAELS_CLAW', 'PAELS_TOOTH'] },
      { name: 'Pool 3', relics: ['PAELS_EYE', 'PAELS_BLOOD', 'PAELS_LEGION'] },
    ],
  },
  DARV: {
    type: 'ancient',
    description:
      'Darv, the Hoarder, digs through a heap of powerful relics and presents a rotating stash. You are shown Dusty Tome plus three random relics drawn from the main pool and act-specific sets, with some options only appearing when their conditions are met.',
    references: [
      { type: 'relic', id: 'DUSTY_TOME', name: 'Dusty Tome' },
      { type: 'relic', id: 'ASTROLABE', name: 'Astrolabe' },
      { type: 'relic', id: 'BLACK_STAR', name: 'Black Star' },
      { type: 'relic', id: 'CALLING_BELL', name: 'Calling Bell' },
      { type: 'relic', id: 'EMPTY_CAGE', name: 'Empty Cage' },
      { type: 'relic', id: 'PANDORAS_BOX', name: 'Pandoras Box' },
      { type: 'relic', id: 'RUNIC_PYRAMID', name: 'Runic Pyramid' },
      { type: 'relic', id: 'SNECKO_EYE', name: 'Snecko Eye' },
      { type: 'relic', id: 'ECTOPLASM', name: 'Ectoplasm' },
      { type: 'relic', id: 'SOZU', name: 'Sozu' },
      { type: 'relic', id: 'PHILOSOPHERS_STONE', name: 'Philosophers Stone' },
      { type: 'relic', id: 'VELVET_CHOKER', name: 'Velvet Choker' },
    ],
    relic_pools: [
      {
        name: 'Main Pool',
        relics: ['ASTROLABE', 'BLACK_STAR', 'CALLING_BELL', 'EMPTY_CAGE', 'PANDORAS_BOX', 'RUNIC_PYRAMID', 'SNECKO_EYE'],
      },
      { name: 'Act 1 Set', relics: ['ECTOPLASM', 'SOZU'] },
      { name: 'Act 2 Set', relics: ['PHILOSOPHERS_STONE', 'VELVET_CHOKER'] },
      { name: 'Always Offered', relics: ['DUSTY_TOME'] },
    ],
  },
  OROBAS: {
    type: 'ancient',
    description:
      'Orobas, the Living Rainbow, spreads a spectrum of relics across three distinct pools. Each encounter offers one relic from each pool, with Prismatic Gem joining the selection for characters who can channel Orbs.',
    references: [
      { type: 'relic', id: 'SEA_GLASS', name: 'Sea Glass' },
      { type: 'relic', id: 'TOUCH_OF_OROBAS', name: 'Touch Of Orobas' },
      { type: 'relic', id: 'ARCHAIC_TOOTH', name: 'Archaic Tooth' },
    ],
    relic_pools: [
      { name: 'Pool 1', relics: ['ELECTRIC_SHRYMP', 'GLASS_EYE', 'SAND_CASTLE'] },
      { name: 'Pool 2', relics: ['ALCHEMICAL_COFFER', 'DRIFTWOOD', 'RADIANT_PEARL'] },
      { name: 'Pool 3', relics: ['SEA_GLASS', 'TOUCH_OF_OROBAS', 'ARCHAIC_TOOTH', 'PRISMATIC_GEM'] },
    ],
  },
  TANX: {
    type: 'ancient',
    description:
      "Tanx, the Khimera King, arms you from a brutal cache of weapons. Each meeting offers three random relics from Tanx's arsenal, with Tri-Boomerang added when you already carry enough weapons to impress the king.",
    relic_pools: [
      {
        name: 'Base Pool',
        relics: ['CLAWS', 'CROSSBOW', 'IRON_CLUB', 'MEAT_CLEAVER', 'SAI', 'SPIKED_GAUNTLETS', 'TANXS_WHISTLE', 'THROWING_AXE', 'WAR_HAMMER', 'TRI_BOOMERANG'],
      },
    ],
  },
  TEZCATARA: {
    type: 'ancient',
    description:
      'Tezcatara, It Which Feeds the Fire, sets out gifts in three carefully prepared pools. Each encounter offers one relic from each pool, ranging from comforting treats to strange keepsakes and treasured curios.',
    relic_pools: [
      { name: 'Pool 1', relics: ['NUTRITIOUS_SOUP', 'VERY_HOT_COCOA', 'YUMMY_COOKIE'] },
      { name: 'Pool 2', relics: ['BIIIG_HUG', 'STORYBOOK', 'SEAL_OF_GOLD', 'TOASTY_MITTENS'] },
      { name: 'Pool 3', relics: ['GOLDEN_COMPASS', 'PUMPKIN_CANDLE', 'TOY_BOX'] },
    ],
  },
  NONUPEIPE: {
    type: 'ancient',
    description:
      'Nonupeipe, Serendipity Incarnate, surrounds you with a glittering collection of lucky treasures. Each visit offers three random relics from the main pool, with Beautiful Bracelet appearing only when its special condition is met.',
    relic_pools: [
      {
        name: 'Main Pool',
        relics: ['BLESSED_ANTLER', 'BRILLIANT_SCARF', 'DELICATE_FROND', 'DIAMOND_DIADEM', 'FUR_COAT', 'GLITTER', 'JEWELRY_BOX', 'LOOMING_FRUIT', 'SIGNET_RING', 'BEAUTIFUL_BRACELET'],
      },
    ],
  },
  VAKUU: {
    type: 'ancient',
    description:
      'Vakuu, the First Demon, tempts you with relics sorted into three ominous pools. Each encounter offers one relic from each pool, mixing bloody bargains, preserved trophies, and elegant demonic finery.',
    relic_pools: [
      { name: 'Pool 1', relics: ['BLOOD_SOAKED_ROSE', 'WHISPERING_EARRING', 'FIDDLE'] },
      { name: 'Pool 2', relics: ['PRESERVED_FOG', 'SERE_TALON', 'DISTINGUISHED_CAPE'] },
      { name: 'Pool 3', relics: ['CHOICES_PARADOX', 'MUSIC_BOX', 'LORDS_PARASOL', 'JEWELED_MASK'] },
    ],
  },
  THE_ARCHITECT: {
    type: 'ancient',
    description:
      'The Architect awaits at the end of each successful run. The encounter plays out as a dialogue with character-specific lines, culminating in a final confrontation.',
  },
};

const COLORFUL_CHARACTER_LINKS = {
  Blue: { id: 'DEFECT', name: 'Defect' },
  Red: { id: 'IRONCLAD', name: 'Ironclad' },
  Pink: { id: 'NECROBINDER', name: 'Necrobinder' },
  Orange: { id: 'REGENT', name: 'Regent' },
  Green: { id: 'SILENT', name: 'Silent' },
  Equality: { type: 'relic', id: 'PRISMATIC_SHARD', name: 'Prismatic Shard' },
};

function parseCanonicalVars(csDir) {
  const varMap = {};

  // Load entity data for StringVar name resolution
  let cardNames = {}, relicNames = {}, enchantmentNames = {}, potionNames = {};
  try {
    for (const c of JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'cards.json'), 'utf-8')))
      cardNames[c.id] = c.name;
    for (const r of JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'relics.json'), 'utf-8')))
      relicNames[r.id] = r.name;
    for (const e of JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'enchantments.json'), 'utf-8')))
      enchantmentNames[e.id] = e.name;
    for (const p of JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'potions.json'), 'utf-8')))
      potionNames[p.id] = p.name;
  } catch {}

  try {
    const files = fs.readdirSync(csDir).filter(f => f.endsWith('.cs'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(csDir, file), 'utf-8');
      const eventNameMatch = file.replace('.cs', '');
      const vars = {};

      // Numeric vars — multiple patterns
      let match;

      // Pattern 1: new TypeVar(numberM) or new TypeVar(number) — unnamed, type implies name
      const typedVarPattern = /new\s+(\w+Var)\(([0-9.]+)m?[,)]/g;
      while ((match = typedVarPattern.exec(content)) !== null) {
        const varType = match[1];
        // Skip if it looks like named var (handled below)
        if (/^(DynamicVar|IntVar|DecimalVar|StringVar)$/.test(varType)) continue;
        const value = parseFloat(match[2]);
        let varName;
        if (varType === 'MaxHpVar') varName = 'MaxHp';
        else if (varType === 'DamageVar') varName = 'Damage';
        else if (varType === 'HealVar') varName = 'Heal';
        else if (varType === 'GoldVar') varName = 'Gold';
        else if (varType === 'BlockVar') varName = 'Block';
        else if (varType === 'StrengthVar') varName = 'Strength';
        else varName = varType.replace('Var', '');
        vars[varName] = value;
      }

      // Pattern 2: new TypeVar("name", numberM, ...) — named typed vars
      const namedTypedVarPattern = /new\s+(?:DamageVar|HealVar|HpLossVar|GoldVar|BlockVar|IntVar|CardsVar|MaxHpVar|StrengthVar|DecimalVar|RepeatVar|SummonVar|StarsVar|EnergyVar|DynamicVar)\("(\w+)",\s*([0-9.]+)m?/g;
      while ((match = namedTypedVarPattern.exec(content)) !== null) {
        vars[match[1]] = parseFloat(match[2]);
      }

      // Pattern 3: new DynamicVar("name", number) — without m suffix
      const dynamicVarPattern = /new\s+DynamicVar\("([^"]+)",\s*([0-9.]+)\b/g;
      while ((match = dynamicVarPattern.exec(content)) !== null) {
        if (!vars[match[1]]) vars[match[1]] = parseFloat(match[2]);
      }

      // Pattern 4: new PowerVar<TypeName>(value)
      const powerVarPattern = /new\s+PowerVar<(\w+)>\(([0-9.]+)m?\)/g;
      while ((match = powerVarPattern.exec(content)) !== null) {
        vars[match[1]] = parseFloat(match[2]);
      }

      // StringVars with static entity references
      const stringVarPattern = /new\s+StringVar\("(\w+)",\s*ModelDb\.(?:Card|Relic|Enchantment|Potion)<(\w+)>\(\)\.(?:Title|DynamicDescription)/g;
      while ((match = stringVarPattern.exec(content)) !== null) {
        const varName = match[1];
        const className = match[2];
        const entityId = classToId(className);
        const name = cardNames[entityId] || relicNames[entityId] || enchantmentNames[entityId] || potionNames[entityId];
        if (name) vars[varName] = name;
      }

      // StringVars with ModelDb.Enchantment<X>().Title.GetFormattedText()
      const stringVarFmtPattern = /new\s+StringVar\("(\w+)",\s*ModelDb\.(?:Card|Relic|Enchantment|Potion)<(\w+)>\(\)\.Title\.GetFormattedText\(\)/g;
      while ((match = stringVarFmtPattern.exec(content)) !== null) {
        const varName = match[1];
        const className = match[2];
        const entityId = classToId(className);
        const name = cardNames[entityId] || relicNames[entityId] || enchantmentNames[entityId] || potionNames[entityId];
        if (name) vars[varName] = name;
      }

      if (Object.keys(vars).length > 0) {
        varMap[eventNameMatch] = vars;
        // Also index by event ID (SCREAMING_SNAKE) for reliable lookup
        varMap[classToId(eventNameMatch)] = vars;
      }
    }
  } catch (err) {
    console.warn(`Warning: Could not read C# files from ${csDir}:`, err.message);
  }

  return varMap;
}

function stripBBCode(text) {
  if (!text) return text;
  return text.replace(/\[(?:gold|\/gold|green|\/green|red|\/red|blue|\/blue|sine|\/sine|jitter|\/jitter|b|\/b|orange|\/orange|purple|\/purple|aqua|\/aqua|rainbow[^\]]*)\]/g, '');
}

function substituteVars(text, vars) {
  if (!text || !vars) return text;
  return text.replace(/\{([^}]+)\}/g, (match, expr) => {
    // Handle {VarName:plural:singular|plural} syntax
    const pluralMatch = expr.match(/^(\w+):plural:([^|]+)\|(.+)$/);
    if (pluralMatch) {
      const [, varName, singular, plural] = pluralMatch;
      if (Object.prototype.hasOwnProperty.call(vars, varName)) {
        const val = vars[varName];
        return val === 1 ? singular : plural;
      }
      return match;
    }
    // Handle {VarName:diff()} — just use the value
    const diffMatch = expr.match(/^(\w+):diff\(\)$/);
    if (diffMatch) {
      const varName = diffMatch[1];
      if (Object.prototype.hasOwnProperty.call(vars, varName)) return String(vars[varName]);
      return match;
    }
    // Simple {VarName}
    if (Object.prototype.hasOwnProperty.call(vars, expr)) {
      return String(vars[expr]);
    }
    return match;
  });
}

function eventNameToCsFileName(eventName) {
  return eventName
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function classToId(name) {
  return name
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    .toUpperCase();
}

/**
 * Extract card/relic/enchantment/potion references from event C# files.
 * Returns a map: eventId → { optionRefs: { optionKey → references[] }, eventRefs: references[] }
 */
function extractReferences(csDir, cardsData, relicsData, potionsData, enchantmentsData) {
  const cardNames = new Map(); // ID → name
  const relicNames = new Map();
  const potionNames = new Map();
  const enchantmentNames = new Map();
  for (const c of cardsData) cardNames.set(c.id, c.name);
  for (const r of relicsData) relicNames.set(r.id, r.name);
  for (const p of potionsData) potionNames.set(p.id, p.name);
  if (enchantmentsData) for (const e of enchantmentsData) enchantmentNames.set(e.id, e.name);

  function makeRef(className) {
    const refId = classToId(className);
    if (cardNames.has(refId)) return { type: 'card', id: refId, name: cardNames.get(refId) };
    if (relicNames.has(refId)) return { type: 'relic', id: refId, name: relicNames.get(refId) };
    if (potionNames.has(refId)) return { type: 'potion', id: refId, name: potionNames.get(refId) };
    if (enchantmentNames.has(refId)) return { type: 'enchantment', id: refId, name: enchantmentNames.get(refId) };
    return { type: 'card', id: refId, name: className.replace(/([a-z])([A-Z])/g, '$1 $2') };
  }

  const refMap = {};
  let files;
  try {
    files = fs.readdirSync(csDir).filter(f => f.endsWith('.cs'));
  } catch { return refMap; }

  for (const file of files) {
    const content = fs.readFileSync(path.join(csDir, file), 'utf-8');
    const eventClassName = file.replace('.cs', '');
    const eventId = classToId(eventClassName);

    const optionRefs = {}; // optionKey → references[]
    const eventRefs = []; // event-level references

    // Strategy 1: Inline EventOption with HoverTipFactory
    const inlinePattern = /new\s+EventOption\([^,]+,\s*\w+,\s*(?:InitialOptionKey\("([^"]+)"\)|"[^"]*\.options\.([^"]+)")[^)]*HoverTipFactory\.(?:FromCardWithCardHoverTips|FromCard|FromRelic|FromRelicExcludingItself|FromEnchantment|FromPotion|FromPower)\s*(?:<(\w+)>(?:\(\))?|\(ModelDb\.(?:Card|Relic|Potion|Enchantment)<(\w+)>\(\)\))/g;
    let m;
    while ((m = inlinePattern.exec(content)) !== null) {
      const optKey = m[1] || m[2];
      const className = m[3] || m[4];
      if (!className) continue;
      const ref = makeRef(className);
      if (optKey) {
        if (!optionRefs[optKey]) optionRefs[optKey] = [];
        optionRefs[optKey].push(ref);
      }
    }

    // Strategy 2: List-based pattern — HoverTipFactory calls before array[N] = new EventOption
    // Parse the entire method to associate refs with options
    const generateMatch = content.match(/GenerateInitialOptions\(\)\s*\{([\s\S]*?)\n\t\}/);
    if (generateMatch) {
      const body = generateMatch[1];
      const lines = body.split('\n');

      let pendingRefs = [];
      for (const line of lines) {
        // Collect HoverTipFactory refs
        const hoverMatches = [...line.matchAll(/HoverTipFactory\.(?:FromCardWithCardHoverTips|FromCard|FromRelic|FromRelicExcludingItself|FromEnchantment|FromPotion|FromPower)\s*(?:<(\w+)>(?:\(\))?|\(ModelDb\.(?:Card|Relic|Potion|Enchantment)<(\w+)>\(\)\))/g)];
        for (const hm of hoverMatches) {
          const cn = hm[1] || hm[2];
          if (cn) pendingRefs.push(makeRef(cn));
        }

        // Check for EventOption assignment that consumes pending refs
        const optAssign = line.match(/new\s+EventOption\([^,]+,\s*\w+,\s*(?:InitialOptionKey\("([^"]+)"\)|"[^"]*\.options\.([^"]+)")/);
        if (optAssign && pendingRefs.length > 0) {
          const optKey = optAssign[1] || optAssign[2];
          if (optKey) {
            if (!optionRefs[optKey]) optionRefs[optKey] = [];
            // Merge, avoiding duplicates
            for (const r of pendingRefs) {
              if (!optionRefs[optKey].some(er => er.id === r.id)) optionRefs[optKey].push(r);
            }
          }
          pendingRefs = [];
        }
      }
    }

    if (Object.keys(optionRefs).length > 0 || eventRefs.length > 0) {
      refMap[eventId] = { optionRefs, eventRefs };
    }
  }

  return refMap;
}

function dedupeReferences(refs = []) {
  const seen = new Set();
  return refs.filter(ref => {
    const key = `${ref.type}:${ref.id}:${ref.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeLockedChoices(choices = []) {
  const merged = [];
  for (const choice of choices) {
    if (choice.name === 'Locked' && merged.length > 0) {
      merged[merged.length - 1].locked = choice.description || choice.locked || '';
      continue;
    }
    merged.push(choice);
  }
  return merged;
}

function collectFlavorOnlyPages(localization, eventId, vars) {
  const pagePattern = new RegExp(`^${eventId}\\.pages\\.([^.]+)\\.description$`);
  const pages = [];

  for (const key in localization) {
    const match = key.match(pagePattern);
    if (!match) continue;

    const pageName = match[1];
    if (pageName === 'INITIAL' || pageName === 'DONE') continue;

    const rawDescription = localization[key];
    if (!rawDescription) continue;

    const hasOwnOptions = Object.keys(localization).some(locKey => locKey.startsWith(`${eventId}.pages.${pageName}.options.`));
    if (hasOwnOptions) continue;

    pages.push({
      pageName,
      description: substituteVars(stripBBCode(rawDescription), vars),
    });
  }

  return pages;
}

function attachChoiceOutcomes(choices, flavorPages) {
  const matchedPages = new Set();

  for (const choice of choices) {
    if (!choice._optionKey) continue;
    const page = flavorPages.find(p => p.pageName === choice._optionKey);
    if (!page?.description) continue;
    choice.outcome = page.description;
    matchedPages.add(page.pageName);
  }

  for (const choice of choices) {
    delete choice._optionKey;
  }

  return matchedPages;
}

function collectFlavorSequences(flavorPages, matchedPages) {
  const groups = new Map();

  for (const page of flavorPages) {
    if (matchedPages.has(page.pageName)) continue;
    const match = page.pageName.match(/^([A-Z_]+?)(\d+)$/);
    if (!match || !page.description) continue;

    const [, prefix, num] = match;
    if (!groups.has(prefix)) groups.set(prefix, []);
    groups.get(prefix).push({ index: Number(num), text: page.description });
  }

  const sequences = {};
  for (const [prefix, entries] of groups) {
    if (entries.length < 2) continue;
    entries.sort((a, b) => a.index - b.index);
    sequences[prefix] = entries.map(entry => entry.text);
  }

  return sequences;
}

function buildNeowChoices(relicsData) {
  // Parse Neow.cs to extract blessing relic pools automatically
  const neowPath = path.join(DECOMPILED_DIR, 'MegaCrit.Sts2.Core.Models.Events', 'Neow.cs');
  if (!fs.existsSync(neowPath)) {
    console.warn('  Neow.cs not found, skipping Neow choices');
    return null;
  }
  const cs = fs.readFileSync(neowPath, 'utf-8');

  const relicMap = {};
  for (const r of relicsData) relicMap[r.id] = r;

  // Extract relic class names from RelicOption<ClassName> calls
  function extractRelicClasses(blockLabel) {
    // Find the property block
    const patterns = {
      positive: /private IEnumerable<EventOption> PositiveOptions\s*=>\s*new[^{]*\{([\s\S]*?)\}\);/,
      cursed: /private IEnumerable<EventOption> CurseOptions\s*=>\s*new[^{]*\{([\s\S]*?)\}\);/,
    };
    if (patterns[blockLabel]) {
      const m = cs.match(patterns[blockLabel]);
      if (m) return [...m[1].matchAll(/RelicOption<(\w+)>/g)].map(x => x[1]);
    }
    return [];
  }

  // Extract individual conditional options: private EventOption XxxOption => RelicOption<ClassName>(...)
  function extractConditionalOptions() {
    const opts = [];
    for (const [, optName, className] of cs.matchAll(/private EventOption (\w+)Option\s*=>\s*RelicOption<(\w+)>/g)) {
      // Determine pool from the done description override
      const line = cs.match(new RegExp(`private EventOption ${optName}Option[^;]+;`));
      const isCursed = line && line[0].includes('CURSED');
      opts.push({ className, pool: isCursed ? 'cursed' : 'positive', conditional: true });
    }
    return opts;
  }

  const positiveClasses = extractRelicClasses('positive');
  const cursedClasses = extractRelicClasses('cursed');
  const conditionals = extractConditionalOptions();

  function classToRelicId(className) {
    return className.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2').toUpperCase();
  }

  function makeChoice(className, pool) {
    const relicId = classToRelicId(className);
    const relic = relicMap[relicId];
    return {
      name: relic ? relic.name : className,
      description: relic ? relic.description : '',
      relic_id: relicId,
      pool,
    };
  }

  const choices = [];
  for (const cls of positiveClasses) choices.push(makeChoice(cls, 'positive'));
  for (const cls of cursedClasses) choices.push(makeChoice(cls, 'cursed'));
  for (const opt of conditionals) {
    // Skip if already in positive/cursed arrays
    const rid = classToRelicId(opt.className);
    if (!choices.find(c => c.relic_id === rid)) {
      choices.push(makeChoice(opt.className, opt.pool));
    }
  }

  return choices;
}

function applyManualFixes(events, relicsData = []) {
  const filtered = events.filter(event => !new Set(['DEPRECATED_EVENT', 'DEPRECATED_ANCIENT_EVENT']).has(event.id));

  for (const event of filtered) {
    event.choices = mergeLockedChoices(event.choices || []);
    if (Array.isArray(event.pages)) {
      event.pages = event.pages.map(page => ({
        ...page,
        choices: mergeLockedChoices(page.choices || []),
      }));
    }

    if (event.id === 'DENSE_VEGETATION' && event.choices?.[0]) {
      event.choices[0].description = 'Heal like resting at a Rest Site. Fight some enemies.';
    }

    // SPIRALING_WHIRLPOOL: Drink heals 33% of Max HP (CalculateVars overrides the 0 canonical var)
    if (event.id === 'SPIRALING_WHIRLPOOL') {
      const drink = event.choices?.find(c => c.name === 'Drink');
      if (drink) drink.description = 'Heal 33% of Max HP.';
    }

    // LOST_WISP: The CLAIM_LOCKED localization key is dead code — not referenced
    // in the event's GenerateInitialOptions(). Confirmed via fresh decompile.
    // Remove the phantom lock so it doesn't confuse readers.
    if (event.id === 'LOST_WISP') {
      const claim = event.choices?.find(c => c.name === 'Capture the Wisp');
      if (claim) delete claim.locked;
    }

    // THE_FUTURE_OF_POTIONS: dynamic choices based on held potions (up to 3).
    // The game uses a single localization template instantiated per potion at runtime.
    // Requires ≥2 potions to appear.
    if (event.id === 'THE_FUTURE_OF_POTIONS') {
      event.description = "You feel a faint rumbling as you round the corner to discover a gigantic spinning apparatus! It has several slots which appear to convert liquids into a highly compressed digestible tablet.\n\nThe idea of turning these health tonics into a tiny morsel is uncomfortable but perhaps it's good to try new things?\n\nUp to 3 choices are offered — one for each potion you're carrying. This event only appears if you have at least 2 potions.";
      event.choices = [
        {
          name: 'Insert Common Potion',
          description: 'Lose the potion. Choose 1 of 3 Upgraded Common cards (Attack or Skill).',
        },
        {
          name: 'Insert Uncommon Potion',
          description: 'Lose the potion. Choose 1 of 3 Upgraded Uncommon cards (Attack, Skill, or Power).',
        },
        {
          name: 'Insert Rare Potion',
          description: 'Lose the potion. Choose 1 of 3 Upgraded Rare cards (Attack, Skill, or Power).',
        },
      ];
    }

    // ABYSSAL_BATHS: repeating immerse/linger loop with escalating damage.
    // Base: +2 Max HP, 3 damage. Each Linger: +2 Max HP, damage increases by 1.
    // Up to 10 lingers (damage capped at iteration 10). Warns before lethal.
    if (event.id === 'ABYSSAL_BATHS') {
      event.choices = [];
      event.pages = [
        {
          label: 'Initial',
          choices: [
            { name: 'Abstain', description: 'Heal 10 HP.' },
            { name: 'Immerse', description: 'Gain 2 Max HP. Take 3 damage. Enter the baths.' },
          ],
        },
        {
          label: 'In the Baths',
          description: 'You can keep lingering — each time you gain 2 Max HP but the damage increases by 1. If the next linger would kill you, the game warns you. Up to 10 times.',
          choices: [
            { name: 'Linger', description: 'Gain 2 Max HP. Take damage (starts at 4, increases by 1 each time).' },
            { name: 'Exit Baths', description: 'Leave the baths.' },
          ],
        },
      ];
    }

    // Multi-page event: COLOSSAL_FLOWER has 3 dig depths
    if (event.id === 'COLOSSAL_FLOWER') {
      event.pages = [
        { label: 'Initial', choices: [
          { name: 'Extract Nectar', description: 'Gain 35 Gold.' },
          { name: 'Reach Deeper', description: 'Take 5 damage. Go deeper.' },
        ]},
        { label: 'Deeper', choices: [
          { name: 'Extract Nectar', description: 'Gain 75 Gold.' },
          { name: 'Reach Deeper', description: 'Take 6 damage. Go even deeper.' },
        ]},
        { label: 'Deepest', choices: [
          { name: 'Extract Instead', description: 'Gain 135 Gold.' },
          { name: 'Obtain Pollinous Core', description: 'Take 7 damage. Obtain the Pollinous Core relic.',
            references: [{ type: 'relic', id: 'POLLINOUS_CORE', name: 'Pollinous Core' }] },
        ]},
      ];
    }

    if (event.id === 'COLORFUL_PHILOSOPHERS') {
      event.choices = (event.choices || [])
        .map(choice => {
          const link = COLORFUL_CHARACTER_LINKS[choice.name];
          if (link) {
            const references = dedupeReferences([
              ...(choice.references || []),
              { type: link.type || 'character', id: link.id, name: link.name },
            ]);
            return { ...choice, references };
          }
          return choice;
        });
    }

    // Event-level references for events with runtime-determined rewards
    const MANUAL_EVENT_REFS = {
      DOLL_ROOM: [
        { type: 'relic', id: 'DAUGHTER_OF_THE_WIND', name: 'Daughter Of The Wind' },
        { type: 'relic', id: 'MR_STRUGGLES', name: 'Mr Struggles' },
        { type: 'relic', id: 'BING_BONG', name: 'Bing Bong' },
      ],
      ENDLESS_CONVEYOR: [{ type: 'card', id: 'FEEDING_FRENZY', name: 'Feeding Frenzy' }],
      FAKE_MERCHANT: [
        { type: 'relic', id: 'FAKE_ANCHOR', name: 'Fake Anchor' },
        { type: 'relic', id: 'FAKE_BLOOD_VIAL', name: 'Fake Blood Vial' },
        { type: 'relic', id: 'FAKE_HAPPY_FLOWER', name: 'Fake Happy Flower' },
        { type: 'relic', id: 'FAKE_LEES_WAFFLE', name: "Fake Lee's Waffle" },
        { type: 'relic', id: 'FAKE_MANGO', name: 'Fake Mango' },
        { type: 'relic', id: 'FAKE_ORICHALCUM', name: 'Fake Orichalcum' },
        { type: 'relic', id: 'FAKE_SNECKO_EYE', name: 'Fake Snecko Eye' },
        { type: 'relic', id: 'FAKE_STRIKE_DUMMY', name: 'Fake Strike Dummy' },
        { type: 'relic', id: 'FAKE_VENERABLE_TEA_SET', name: 'Fake Venerable Tea Set' },
        { type: 'relic', id: 'FAKE_MERCHANTS_RUG', name: "Fake Merchant's Rug" },
      ],
      THE_LANTERN_KEY: [{ type: 'card', id: 'LANTERN_KEY', name: 'Lantern Key' }],
      TINKER_TIME: [{ type: 'card', id: 'MAD_SCIENCE', name: 'Mad Science' }],
      TRASH_HEAP: [
        { type: 'card', id: 'CALTROPS', name: 'Caltrops' },
        { type: 'card', id: 'CLASH', name: 'Clash' },
        { type: 'card', id: 'DISTRACTION', name: 'Distraction' },
        { type: 'card', id: 'DUAL_WIELD', name: 'Dual Wield' },
        { type: 'card', id: 'ENTRENCH', name: 'Entrench' },
        { type: 'card', id: 'HELLO_WORLD', name: 'Hello World' },
        { type: 'card', id: 'OUTMANEUVER', name: 'Outmaneuver' },
        { type: 'card', id: 'REBOUND', name: 'Rebound' },
        { type: 'card', id: 'RIP_AND_TEAR', name: 'Rip And Tear' },
        { type: 'card', id: 'STACK', name: 'Stack' },
        { type: 'relic', id: 'DARKSTONE_PERIAPT', name: 'Darkstone Periapt' },
        { type: 'relic', id: 'DREAM_CATCHER', name: 'Dream Catcher' },
        { type: 'relic', id: 'HAND_DRILL', name: 'Hand Drill' },
        { type: 'relic', id: 'MAW_BANK', name: 'Maw Bank' },
        { type: 'relic', id: 'THE_BOOT', name: 'The Boot' },
      ],
      HUNGRY_FOR_MUSHROOMS: [
        { type: 'relic', id: 'BIG_MUSHROOM', name: 'Big Mushroom' },
        { type: 'relic', id: 'FRAGRANT_MUSHROOM', name: 'Fragrant Mushroom' },
      ],
      TRIAL: [
        { type: 'card', id: 'REGRET', name: 'Regret' },
        { type: 'card', id: 'SHAME', name: 'Shame' },
        { type: 'card', id: 'DOUBT', name: 'Doubt' },
      ],
    };

    if (MANUAL_EVENT_REFS[event.id]) {
      event.references = dedupeReferences([...(event.references || []), ...MANUAL_EVENT_REFS[event.id]]);
    }

    // Manual choice description overrides (from C# RelicOption/CardOption patterns)
    const CHOICE_DESC_OVERRIDES = {
      HUNGRY_FOR_MUSHROOMS: {
        'Big Mushroom': 'Obtain Big Mushroom.',
        'Fragrant Mushroom': 'Obtain Fragrant Mushroom. Lose 15 HP.',
      },
    };
    if (CHOICE_DESC_OVERRIDES[event.id]) {
      for (const c of (event.choices || [])) {
        if (CHOICE_DESC_OVERRIDES[event.id][c.name] && !c.description) {
          c.description = CHOICE_DESC_OVERRIDES[event.id][c.name];
        }
      }
    }

    // Resolve static event DynamicVars (values from C# source)
    const STATIC_EVENT_VARS = {
      '{Setting1Hp}': '75',   // BattleFriendV1.MinInitialHp
      '{Setting2Hp}': '150',  // BattleFriendV2.MinInitialHp
      '{Setting3Hp}': '300',  // BattleFriendV3.MinInitialHp
    };
    const resolveStaticVars = (text) => {
      if (!text) return text;
      for (const [key, val] of Object.entries(STATIC_EVENT_VARS)) {
        text = text.replaceAll(key, val);
      }
      return text;
    };
    if (event.description) event.description = resolveStaticVars(event.description);
    if (event.choices) {
      for (const c of event.choices) {
        if (c.description) c.description = resolveStaticVars(c.description);
      }
    }
    if (event.pages) {
      for (const p of event.pages) {
        if (p.description) p.description = resolveStaticVars(p.description);
        if (p.choices) {
          for (const c of p.choices) {
            if (c.description) c.description = resolveStaticVars(c.description);
          }
        }
      }
    }

    // Replace runtime-only vars with descriptive text
    const RUNTIME_REPLACEMENTS = {
      '{Prize1}': 'X', '{Prize2}': 'X', '{Prize3}': 'X',
      '{Heal}': 'X', '{Gold}': 'X', '{HpLoss}': 'X',
      '{Potion}': 'Potion', '{Relic}': 'Relic',
      '{RandomRelic}': 'a random Relic', '{RandomCard}': 'A random card',
      '{DrinkRandomPotion}': 'a random Potion',
      '{Rarity}': '?', '{Type}': '?', '{EntrantNumber}': '?',
      '{BottomRelicOwned}': 'your Relic', '{BottomRelicNew}': 'a new Relic',
      '{MiddleRelicOwned}': 'your Relic', '{MiddleRelicNew}': 'a new Relic',
      '{TopRelicOwned}': 'your Relic', '{TopRelicNew}': 'a new Relic',
      '{pronounObject}': 'them', '{pronounSubject}': 'they',
      '{pronounPossessive}': 'theirs', '{character}': 'the character',
    };
    const resolveRuntime = (text) => {
      if (!text) return text;
      for (const [k, v] of Object.entries(RUNTIME_REPLACEMENTS)) {
        if (text.includes(k)) text = text.replaceAll(k, v);
      }
      // Fix "they" + third-person singular verb agreement from pronoun substitution
      text = text.replace(/\bthey (becomes|goes|has|does|is|was|gets|feels|seems)\b/gi,
        (_, verb) => {
          const fixes = { becomes: 'become', goes: 'go', has: 'have', does: 'do', is: 'are', was: 'were', gets: 'get', feels: 'feel', seems: 'seem' };
          return `they ${fixes[verb.toLowerCase()] || verb}`;
        });
      return text;
    };
    if (event.description) event.description = resolveRuntime(event.description);
    if (event.choices) {
      for (const c of event.choices) {
        if (c.name) c.name = resolveRuntime(c.name);
        if (c.description) c.description = resolveRuntime(c.description);
        if (c.outcome) c.outcome = resolveRuntime(c.outcome);
      }
    }
    if (event.pages) {
      for (const p of event.pages) {
        if (p.description) p.description = resolveRuntime(p.description);
        if (p.choices) {
          for (const c of p.choices) {
            if (c.name) c.name = resolveRuntime(c.name);
            if (c.description) c.description = resolveRuntime(c.description);
            if (c.outcome) c.outcome = resolveRuntime(c.outcome);
          }
        }
      }
    }
    if (event.flavor_sequences) {
      for (const [key, texts] of Object.entries(event.flavor_sequences)) {
        event.flavor_sequences[key] = texts.map(t => resolveRuntime(t));
      }
    }

    // TINKER_TIME: multi-step card builder event
    if (event.id === 'TINKER_TIME') {
      event.choices = [];
      event.pages = [
        {
          label: 'Choose Card Type',
          description: '2 of 3 types are offered randomly.',
          choices: [
            { name: 'Weapon', description: 'Create an Attack. (Deal 12 damage.)' },
            { name: 'Protector', description: 'Create a Skill. (Gain 8 Block.)' },
            { name: 'Gadget', description: 'Create a Power.' },
          ],
        },
        {
          label: 'Choose Rider Effect',
          description: '2 of 3 effects are offered randomly, based on the card type chosen.',
          choices: [
            { name: 'Sapping', description: 'Apply 2 Weak. Apply 2 Vulnerable.', pool: 'Attack' },
            { name: 'Violence', description: 'Hits 2 additional times.', pool: 'Attack' },
            { name: 'Choking', description: 'Whenever you play a card this turn, the enemy loses 6 HP.', pool: 'Attack' },
            { name: 'Energized', description: 'Gain [E][E].', pool: 'Skill' },
            { name: 'Wisdom', description: 'Draw 3 cards.', pool: 'Skill' },
            { name: 'Chaos', description: 'Add a random card into your Hand. It costs 0 [E] this turn.', pool: 'Skill' },
            { name: 'Expertise', description: 'Gain 2 Strength. Gain 2 Dexterity.', pool: 'Power' },
            { name: 'Curious', description: 'Powers cost 1 [E] less.', pool: 'Power' },
            { name: 'Improvement', description: 'At the end of combat, Upgrade a random card.', pool: 'Power' },
          ],
        },
      ];
      event.references = [{ type: 'card', id: 'MAD_SCIENCE', name: 'Mad Science' }];
    }

    const ancient = ANCIENT_EVENT_DATA[event.id];
    if (ancient) {
      event.type = ancient.type;
      if (ancient.description) event.description = ancient.description;
      if (ancient.relic_pools) event.relic_pools = ancient.relic_pools;

      // Auto-generate Neow choices from C# source
      if (event.id === 'NEOW') {
        const neowChoices = buildNeowChoices(relicsData);
        if (neowChoices && neowChoices.length > 0) {
          event.choices = neowChoices;
          event.description = "Neow, the Mother of Resurrection, awaits at the start of each run. She offers three blessings \u2014 two positive and one cursed. The options are drawn randomly from the pools below.";
        }
      }
      if (ancient.references) event.references = dedupeReferences([...(event.references || []), ...ancient.references]);
    }
  }

  return filtered;
}

async function parseEvents() {
  const eventsPath = path.join(OUTPUT_DIR, 'events.json');
  const localizationPath = path.join(PCK_DIR, 'localization', 'eng', 'events.json');
  const csDir = path.join(DECOMPILED_DIR, 'MegaCrit.Sts2.Core.Models.Events');

  let events = [];
  try {
    events = JSON.parse(fs.readFileSync(eventsPath, 'utf-8'));
  } catch (err) {
    console.error(`Failed to read events.json: ${err.message}`);
    process.exit(1);
  }

  let localization = {};
  try {
    localization = JSON.parse(fs.readFileSync(localizationPath, 'utf-8'));
  } catch (err) {
    console.warn(`Warning: Could not read localization: ${err.message}`);
  }

  const canonicalVars = parseCanonicalVars(csDir);

  // Load cards + relics for reference resolution
  let cardsData = [], relicsData = [], potionsData = [], enchantmentsData = [];
  try { cardsData = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'cards.json'), 'utf-8')); } catch {}
  try { relicsData = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'relics.json'), 'utf-8')); } catch {}
  try { potionsData = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'potions.json'), 'utf-8')); } catch {}
  try { enchantmentsData = JSON.parse(fs.readFileSync(path.join(OUTPUT_DIR, 'enchantments.json'), 'utf-8')); } catch {}
  const refMap = extractReferences(csDir, cardsData, relicsData, potionsData, enchantmentsData);

  let enrichedCount = 0;
  let updatedCount = 0;

  for (const event of events) {
    const initialDescKey = `${event.id}.pages.INITIAL.description`;
    const initialDesc = localization[initialDescKey];

    if (!initialDesc && !canonicalVars[event.id] && !canonicalVars[event.name]) {
      continue;
    }

    if (initialDesc) {
      event.description = stripBBCode(initialDesc);
      updatedCount++;
    }

    const choices = [];
    const optionsPattern = /^(.+)\.pages\.INITIAL\.options\.([^.]+)\.(title|description)$/;
    const optionNames = new Set();

    for (const key in localization) {
      const match = key.match(optionsPattern);
      if (match && match[1] === event.id) {
        optionNames.add(match[2]);
      }
    }

    const csFileName = eventNameToCsFileName(event.name);
    const vars = canonicalVars[event.id] || canonicalVars[csFileName] || {};

    for (const optionName of Array.from(optionNames).sort()) {
      const title = localization[`${event.id}.pages.INITIAL.options.${optionName}.title`];
      let description = localization[`${event.id}.pages.INITIAL.options.${optionName}.description`];

      if (title) {
        let cleanDesc = description ? stripBBCode(description) : '';
        cleanDesc = substituteVars(cleanDesc, vars);
        const choice = {
          name: stripBBCode(title),
          description: cleanDesc,
          _optionKey: optionName,
        };
        // Attach references from C# HoverTipFactory
        const eventRefs = refMap[event.id];
        if (eventRefs?.optionRefs?.[optionName]) {
          choice.references = dedupeReferences(eventRefs.optionRefs[optionName]);
        }
        choices.push(choice);
      }
    }

    const flavorPages = collectFlavorOnlyPages(localization, event.id, vars);
    const matchedFlavorPages = attachChoiceOutcomes(choices, flavorPages);
    const flavorSequences = collectFlavorSequences(flavorPages, matchedFlavorPages);

    if (choices.length > 0) {
      event.choices = choices;
      enrichedCount++;
    }

    if (Object.keys(flavorSequences).length > 0) {
      event.flavor_sequences = flavorSequences;
    }
  }

  events = applyManualFixes(events, relicsData);

  fs.writeFileSync(eventsPath, JSON.stringify(events, null, 2) + '\n', 'utf-8');

  console.log('✓ Parser complete');
  console.log(`  Enriched: ${enrichedCount} events with choices`);
  console.log(`  Updated descriptions: ${updatedCount} events`);
  console.log(`  Total events: ${events.length}`);
  console.log(`  Output: ${eventsPath}`);
}

parseEvents().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
