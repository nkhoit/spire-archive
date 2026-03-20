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
};

function parseCanonicalVars(csDir) {
  const varMap = {};

  try {
    const files = fs.readdirSync(csDir).filter(f => f.endsWith('.cs'));

    for (const file of files) {
      const content = fs.readFileSync(path.join(csDir, file), 'utf-8');
      const eventNameMatch = file.replace('.cs', '');
      const vars = {};
      const typedVarPattern = /new\s+(\w+Var)\(([0-9.]+)m[,)]/g;
      let match;

      while ((match = typedVarPattern.exec(content)) !== null) {
        const varType = match[1];
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

      const dynamicVarPattern = /new\s+DynamicVar\("([^"]+)",\s*([0-9.]+)/g;
      while ((match = dynamicVarPattern.exec(content)) !== null) {
        vars[match[1]] = parseFloat(match[2]);
      }

      if (Object.keys(vars).length > 0) {
        varMap[eventNameMatch] = vars;
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
  return text.replace(/\{([^}]+)\}/g, (match, varName) => {
    if (Object.prototype.hasOwnProperty.call(vars, varName)) {
      return String(vars[varName]);
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

function applyManualFixes(events) {
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

    if (event.id === 'COLORFUL_PHILOSOPHERS') {
      event.choices = (event.choices || [])
        .filter(choice => !/prismatic shard/i.test(choice.name) && !/prismatic shard/i.test(choice.description || ''))
        .map(choice => {
          const link = COLORFUL_CHARACTER_LINKS[choice.name];
          if (!link) return choice;
          const references = dedupeReferences([
            ...(choice.references || []),
            { type: 'character', id: link.id, name: link.name },
          ]);
          return { ...choice, references };
        });
    }

    const ancient = ANCIENT_EVENT_DATA[event.id];
    if (ancient) {
      event.type = ancient.type;
      if (ancient.description) event.description = ancient.description;
      if (ancient.relic_pools) event.relic_pools = ancient.relic_pools;
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

  let enrichedCount = 0;
  let updatedCount = 0;

  for (const event of events) {
    const initialDescKey = `${event.id}.pages.INITIAL.description`;
    const initialDesc = localization[initialDescKey];

    if (!initialDesc && !canonicalVars[event.name]) {
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
    const vars = canonicalVars[csFileName] || {};

    for (const optionName of Array.from(optionNames).sort()) {
      const title = localization[`${event.id}.pages.INITIAL.options.${optionName}.title`];
      let description = localization[`${event.id}.pages.INITIAL.options.${optionName}.description`];

      if (title) {
        let cleanDesc = description ? stripBBCode(description) : '';
        cleanDesc = substituteVars(cleanDesc, vars);
        choices.push({
          name: stripBBCode(title),
          description: cleanDesc,
        });
      }
    }

    if (choices.length > 0) {
      event.choices = choices;
      enrichedCount++;
    }
  }

  events = applyManualFixes(events);

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
