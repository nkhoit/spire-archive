#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

/**
 * Parse STS2 event C# files to extract CanonicalVars
 * Returns a map of { EventName: { varName: value } }
 */
function parseCanonicalVars(csDir) {
  const varMap = {};

  try {
    const files = fs.readdirSync(csDir).filter(f => f.endsWith('.cs'));
    
    for (const file of files) {
      const content = fs.readFileSync(path.join(csDir, file), 'utf-8');
      
      // Look for CanonicalVars pattern
      const eventNameMatch = file.replace('.cs', '');
      const vars = {};

      // Match various DynamicVar patterns:
      // 1. new MaxHpVar(2m) -> MaxHp: 2
      // 2. new DamageVar(3m) -> Damage: 3
      // 3. new HealVar(10m) -> Heal: 10
      // 4. new GoldVar(50m) -> Gold: 50
      // 5. new DynamicVar("CustomName", value) -> CustomName: value

      // Typed vars like MaxHpVar(Xm), DamageVar(Xm, ...), etc.
      // Match the first numeric param (may have additional params after comma)
      const typedVarPattern = /new\s+(\w+Var)\(([0-9.]+)m[,)]/g;
      let match;
      
      while ((match = typedVarPattern.exec(content)) !== null) {
        const varType = match[1];
        const value = parseFloat(match[2]);
        
        // Map var type to canonical name
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

      // Generic DynamicVar with string name: new DynamicVar("CustomName", value)
      const dynamicVarPattern = /new\s+DynamicVar\("([^"]+)",\s*([0-9.]+)/g;
      while ((match = dynamicVarPattern.exec(content)) !== null) {
        const varName = match[1];
        const value = parseFloat(match[2]);
        vars[varName] = value;
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

/**
 * Strip BBCode-like tags from text
 * Removes tags like [gold], [/gold], [green], [/green], [red], [/red], etc.
 */
function stripBBCode(text) {
  if (!text) return text;
  
  // Remove all [tag] and [/tag] patterns
  return text
    .replace(/\[(?:gold|\/gold|green|\/green|red|\/red|blue|\/blue|sine|\/sine|jitter|\/jitter|b|\/b|orange|\/orange|purple|\/purple|aqua|\/aqua|rainbow[^\]]*)\]/g, '');
}

/**
 * Substitute {VarName} placeholders with values from CanonicalVars
 */
function substituteVars(text, vars) {
  if (!text || !vars) return text;
  
  // Replace {VarName} with the value if found
  return text.replace(/\{([^}]+)\}/g, (match, varName) => {
    if (vars.hasOwnProperty(varName)) {
      return String(vars[varName]);
    }
    return match; // Keep as-is if not found
  });
}

/**
 * Convert event name (e.g. "Abyssal Baths") to C# filename (e.g. "AbyssalBaths")
 */
function eventNameToCsFileName(eventName) {
  return eventName
    .split(/\s+/) // Split on whitespace
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

/**
 * Main parser function
 */
async function parseEvents() {
  const eventsPath = '/Users/kuro/code/sts1-data/data/sts2/events.json';
  const localizationPath = '/tmp/sts2-pck/localization/eng/events.json';
  const csDir = '/Users/kuro/code/sts2-research/decompiled/MegaCrit.Sts2.Core.Models.Events';

  // Load events data
  let events = [];
  try {
    const data = fs.readFileSync(eventsPath, 'utf-8');
    events = JSON.parse(data);
  } catch (err) {
    console.error(`Failed to read events.json: ${err.message}`);
    process.exit(1);
  }

  // Load localization data
  let localization = {};
  try {
    const data = fs.readFileSync(localizationPath, 'utf-8');
    localization = JSON.parse(data);
  } catch (err) {
    console.warn(`Warning: Could not read localization: ${err.message}`);
  }

  // Parse C# files for CanonicalVars
  const canonicalVars = parseCanonicalVars(csDir);

  // Enrich events
  let enrichedCount = 0;
  let updatedCount = 0;

  for (const event of events) {
    const eventId = event.id;
    
    // Get localization for this event
    const initialDescKey = `${eventId}.pages.INITIAL.description`;
    const initialDesc = localization[initialDescKey];

    if (!initialDesc && !canonicalVars[event.name]) {
      // No data available
      continue;
    }

    // Extract description from localization
    if (initialDesc) {
      event.description = stripBBCode(initialDesc);
      updatedCount++;
    }

    // Extract choices from INITIAL options (always regenerate to substitute vars)
    const choices = [];
    const optionsPattern = /^(.+)\.pages\.INITIAL\.options\.([^.]+)\.(title|description)$/;
    const optionNames = new Set();

    // Find all options for this event's INITIAL page
    for (const key in localization) {
      const match = key.match(optionsPattern);
      if (match && match[1] === eventId) {
        optionNames.add(match[2]);
      }
    }

    // Get variables for this event - convert name to C# filename format
    const csFileName = eventNameToCsFileName(event.name);
    const vars = canonicalVars[csFileName] || {};

    // Build choices
    for (const optionName of Array.from(optionNames).sort()) {
      const titleKey = `${eventId}.pages.INITIAL.options.${optionName}.title`;
      const descKey = `${eventId}.pages.INITIAL.options.${optionName}.description`;

      const title = localization[titleKey];
      let description = localization[descKey];

      if (title) {
        let cleanDesc = description ? stripBBCode(description) : '';
        cleanDesc = substituteVars(cleanDesc, vars);

        choices.push({
          name: stripBBCode(title),
          description: cleanDesc
        });
      }
    }

    if (choices.length > 0) {
      event.choices = choices;
      enrichedCount++;
    }
  }

  // Write enriched events
  const output = JSON.stringify(events, null, 2);
  fs.writeFileSync(eventsPath, output, 'utf-8');

  // Print summary
  console.log(`✓ Parser complete`);
  console.log(`  Enriched: ${enrichedCount} events with choices`);
  console.log(`  Updated descriptions: ${updatedCount} events`);
  console.log(`  Total events: ${events.length}`);
  console.log(`  Output: ${eventsPath}`);
}

parseEvents().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
