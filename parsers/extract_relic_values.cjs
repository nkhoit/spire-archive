#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

/**
 * Recursively find all .java files in a directory
 */
function findJavaFiles(dir) {
  const results = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isFile() && file.endsWith('.java')) {
      results.push(fullPath);
    }
  }
  return results;
}

// Constants that we should resolve
const KNOWN_CONSTANTS = {
  'AbstractPlayer.MAX_HAND_SIZE': 10,
};

/**
 * Convert ID to UPPER_SNAKE_CASE
 */
function toUpperSnakeCase(id) {
  return id
    .toUpperCase()
    .replace(/[^A-Z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

/**
 * Extract private static final int constants from Java file
 */
function extractConstants(content) {
  const constants = {};
  const pattern = /private\s+static\s+final\s+int\s+(\w+)\s*=\s*(\d+)\s*;/g;
  let match;
  while ((match = pattern.exec(content)) !== null) {
    constants[match[1]] = parseInt(match[2], 10);
  }
  return constants;
}

/**
 * Extract public static final String ID
 */
function extractId(content) {
  // Try "ID" first (relics)
  let match = /public\s+static\s+final\s+String\s+ID\s*=\s*"([^"]*)"\s*;/.exec(content);
  if (match) return match[1];
  
  // Try "POTION_ID" (potions)
  match = /public\s+static\s+final\s+String\s+POTION_ID\s*=\s*"([^"]*)"\s*;/.exec(content);
  if (match) return match[1];
  
  return null;
}

/**
 * Extract getUpdatedDescription() method body (for relics)
 */
function extractMethodBody(content) {
  // Match getUpdatedDescription() method
  const pattern = /public\s+String\s+getUpdatedDescription\s*\(\s*\)\s*\{([^}]*)\}/s;
  const match = pattern.exec(content);
  if (!match) return null;
  return match[1];
}

/**
 * Extract getPotency() method body (for potions)
 */
function extractPotencyMethod(content) {
  const pattern = /public\s+int\s+getPotency\s*\(\s*(?:int\s+\w+)?\s*\)\s*\{([^}]*)\}/s;
  const match = pattern.exec(content);
  if (!match) return null;
  return match[1];
}

/**
 * Parse a return statement from method body
 * For relics: return this.DESCRIPTIONS[0] + VALUE + this.DESCRIPTIONS[1] + VALUE2 + ...;
 * For potions (getPotency): return VALUE;
 */
function parseReturnStatement(methodBody, constants, isPotency = false) {
  const returnMatch = /return\s+(.+?);/s.exec(methodBody);
  if (!returnMatch) return [];

  const returnExpr = returnMatch[1];
  
  if (isPotency) {
    // For potions, just parse the return value directly
    const resolved = resolveValue(returnExpr.trim(), constants);
    return resolved !== null ? [resolved] : [];
  }
  
  // For relics: split by DESCRIPTIONS[N] to find values between them
  const parts = returnExpr.split(/this\.DESCRIPTIONS\[\d+\]\s*\+\s*/);
  
  // Filter out empty parts and the initial empty part before first DESCRIPTIONS
  const values = [];
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i].trim();
    
    // Remove trailing "+ this.DESCRIPTIONS[N]" if present
    const cleanPart = part.replace(/\s*\+\s*this\.DESCRIPTIONS\[\d+\]\s*.*$/, '').trim();
    
    if (!cleanPart) continue;
    
    // Try to resolve the value
    const resolvedValue = resolveValue(cleanPart, constants);
    if (resolvedValue !== null) {
      values.push(resolvedValue);
    } else {
      // If we can't resolve it, push null (runtime value)
      values.push(null);
    }
  }
  
  return values;
}

/**
 * Resolve a value expression to a number
 */
function resolveValue(expr, constants) {
  expr = expr.trim();
  
  // Check if it's a direct number
  const numMatch = /^(\d+)$/.exec(expr);
  if (numMatch) return parseInt(numMatch[1], 10);
  
  // Check if it's a constant reference
  if (constants[expr]) return constants[expr];
  
  // Check for known constants
  if (KNOWN_CONSTANTS[expr]) return KNOWN_CONSTANTS[expr];
  
  // Check for runtime values (this.counter, this.amount, etc.)
  if (/^this\.(counter|amount)/.test(expr)) return null;
  
  // If we can't resolve it, return null
  return null;
}

/**
 * Process a single Java file
 */
function processJavaFile(filePath, isPotion = false) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    const id = extractId(content);
    if (!id) return null;
    
    let values = [];
    
    if (isPotion) {
      // For potions, extract getPotency()
      const methodBody = extractPotencyMethod(content);
      if (!methodBody) return null;
      const constants = extractConstants(content);
      values = parseReturnStatement(methodBody, constants, true);
    } else {
      // For relics, extract getUpdatedDescription()
      const methodBody = extractMethodBody(content);
      if (!methodBody) return null;
      const constants = extractConstants(content);
      values = parseReturnStatement(methodBody, constants, false);
    }
    
    if (values.length === 0) return null;
    
    return {
      id: toUpperSnakeCase(id),
      values: values,
    };
  } catch (err) {
    console.error(`Error processing ${filePath}:`, err.message);
    return null;
  }
}

/**
 * Main script
 */
async function main() {
  const relicDir = '/Users/kuro/code/sts1-data/sts-full/com/megacrit/cardcrawl/relics';
  const potionDir = '/Users/kuro/code/sts1-data/sts-full/com/megacrit/cardcrawl/potions';
  const outputDir = '/Users/kuro/code/sts1-data/data/sts1';
  
  // Create output directory if needed
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  const result = {
    relics: {},
    potions: {},
  };
  
  // Process relics
  console.log('Processing relics...');
  const relicFiles = findJavaFiles(relicDir);
  for (const file of relicFiles) {
    const processed = processJavaFile(file, false);
    if (processed) {
      result.relics[processed.id] = processed.values;
    }
  }
  
  // Process potions
  console.log('Processing potions...');
  const potionFiles = findJavaFiles(potionDir);
  for (const file of potionFiles) {
    const processed = processJavaFile(file, true);
    if (processed) {
      result.potions[processed.id] = processed.values;
    }
  }
  
  // Write output
  const outputPath = path.join(outputDir, 'relic_values.json');
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
  
  console.log('\n✓ Output written to:', outputPath);
  console.log(`\n📊 Summary:`);
  console.log(`  Relics: ${Object.keys(result.relics).length}`);
  console.log(`  Potions: ${Object.keys(result.potions).length}`);
  
  // Print sample entries
  console.log('\n📋 Sample relics:');
  const relicKeys = Object.keys(result.relics).slice(0, 5);
  for (const key of relicKeys) {
    console.log(`  ${key}: ${JSON.stringify(result.relics[key])}`);
  }
  
  console.log('\n📋 Sample potions:');
  const potionKeys = Object.keys(result.potions).slice(0, 5);
  for (const key of potionKeys) {
    console.log(`  ${key}: ${JSON.stringify(result.potions[key])}`);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
