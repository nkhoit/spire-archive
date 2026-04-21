'use strict';

const fs = require('fs');
const path = require('path');
const { OUTPUT_DIR } = require('./config.cjs');

const HISTORY_DIR = path.join(OUTPUT_DIR, 'history');
const VERSIONS_FILE = path.join(HISTORY_DIR, 'versions.json');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'changelog.json');

const ENTITY_CONFIG = {
  cards: { file: 'cards.json', diff: diffCard },
  relics: { file: 'relics.json', diff: diffRelic },
  potions: { file: 'potions.json', diff: diffPotion },
  enchantments: { file: 'enchantments.json', diff: diffEnchantment },
};

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeOutput(data) {
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2) + '\n');
}

function normalizePrimitive(value) {
  return value === undefined ? null : value;
}

function stableArray(value) {
  if (!Array.isArray(value)) return null;
  return [...value].map((item) => normalizePrimitive(item));
}

function addChange(changes, field, oldValue, newValue) {
  if (JSON.stringify(oldValue) === JSON.stringify(newValue)) return;
  changes[field] = { old: oldValue, new: newValue };
}

function diffNumericObject(oldObj, newObj, prefix, changes, { numericOnly = false } = {}) {
  const oldValue = oldObj && typeof oldObj === 'object' ? oldObj : {};
  const newValue = newObj && typeof newObj === 'object' ? newObj : {};
  const keys = new Set([...Object.keys(oldValue), ...Object.keys(newValue)]);
  for (const key of [...keys].sort()) {
    const oldRaw = normalizePrimitive(oldValue[key]);
    const newRaw = normalizePrimitive(newValue[key]);
    if (numericOnly) {
      const oldComparable = oldRaw == null ? null : (typeof oldRaw === 'number' ? oldRaw : Number(oldRaw));
      const newComparable = newRaw == null ? null : (typeof newRaw === 'number' ? newRaw : Number(newRaw));
      const oldFinal = Number.isNaN(oldComparable) ? oldRaw : oldComparable;
      const newFinal = Number.isNaN(newComparable) ? newRaw : newComparable;
      addChange(changes, `${prefix}.${key}`, oldFinal, newFinal);
    } else {
      addChange(changes, `${prefix}.${key}`, oldRaw, newRaw);
    }
  }
}

// ---------------------------------------------------------------------------
// Field-classifier model for player-facing patch history.
//
// The raw diff between two data snapshots includes lots of fields that are
// either pure implementation detail (vars.calculation_*) or 1:1 redundant
// with a description change (vars.damage / vars.power_dexterity etc.). Show
// every one of them and patch history reads like a JSON dump. We classify
// fields into three buckets:
//
//   - HIDDEN_FIELDS: never surface (internal-only).
//   - SUPPRESS_WHEN_DESCRIPTION_CHANGED: numeric stat fields that are
//     already encoded in the description text. Hide them when the
//     description (base or upgrade) also changed in the same patch; show
//     them as a fallback when description is unchanged so SHIV-style
//     internal tweaks still leave a paper trail.
//   - everything else: surface as-is.
//
// Adding a new game stat means adding one entry here, not refactoring the
// component.
const HIDDEN_FIELDS = new Set([
  'vars.calculation_base',
  'vars.calculation_extra',
]);

function isSuppressibleVar(field) {
  return field.startsWith('vars.') && !HIDDEN_FIELDS.has(field);
}

function filterNoiseFields(rawChanges) {
  const filtered = {};
  const descriptionChanged = 'description' in rawChanges || 'upgrade.description' in rawChanges;
  for (const [field, value] of Object.entries(rawChanges)) {
    if (HIDDEN_FIELDS.has(field)) continue;
    if (descriptionChanged && isSuppressibleVar(field)) continue;
    filtered[field] = value;
  }
  return filtered;
}

function diffCard(oldEntity, newEntity) {
  const changes = {};
  addChange(changes, 'cost', normalizePrimitive(oldEntity.cost), normalizePrimitive(newEntity.cost));
  addChange(changes, 'type', normalizePrimitive(oldEntity.type), normalizePrimitive(newEntity.type));
  addChange(changes, 'rarity', normalizePrimitive(oldEntity.rarity), normalizePrimitive(newEntity.rarity));
  addChange(changes, 'color', normalizePrimitive(oldEntity.color), normalizePrimitive(newEntity.color));
  addChange(changes, 'keywords', stableArray(oldEntity.keywords), stableArray(newEntity.keywords));
  addChange(changes, 'tags', stableArray(oldEntity.tags), stableArray(newEntity.tags));
  addChange(changes, 'description', normalizePrimitive(oldEntity.description), normalizePrimitive(newEntity.description));
  addChange(changes, 'star_cost', normalizePrimitive(oldEntity.star_cost), normalizePrimitive(newEntity.star_cost));
  diffNumericObject(oldEntity.vars, newEntity.vars, 'vars', changes, { numericOnly: true });
  diffNumericObject(oldEntity.upgrade, newEntity.upgrade, 'upgrade', changes);
  return filterNoiseFields(changes);
}

function diffRelic(oldEntity, newEntity) {
  const changes = {};
  addChange(changes, 'description', normalizePrimitive(oldEntity.description), normalizePrimitive(newEntity.description));
  addChange(changes, 'tier', normalizePrimitive(oldEntity.tier), normalizePrimitive(newEntity.tier));
  addChange(changes, 'color', normalizePrimitive(oldEntity.color), normalizePrimitive(newEntity.color));
  return changes;
}

function diffPotion(oldEntity, newEntity) {
  const changes = {};
  addChange(changes, 'description', normalizePrimitive(oldEntity.description), normalizePrimitive(newEntity.description));
  addChange(changes, 'rarity', normalizePrimitive(oldEntity.rarity), normalizePrimitive(newEntity.rarity));
  addChange(changes, 'color', normalizePrimitive(oldEntity.color), normalizePrimitive(newEntity.color));
  return changes;
}

function diffEnchantment(oldEntity, newEntity) {
  const changes = {};
  addChange(changes, 'description', normalizePrimitive(oldEntity.description), normalizePrimitive(newEntity.description));
  addChange(changes, 'rarity', normalizePrimitive(oldEntity.rarity), normalizePrimitive(newEntity.rarity));
  return changes;
}

function toMap(items) {
  const map = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    if (item && item.id != null) map.set(String(item.id), item);
  }
  return map;
}

function buildEntityChangeSet(oldItems, newItems, diffFn) {
  const oldMap = toMap(oldItems);
  const newMap = toMap(newItems);
  const ids = new Set([...oldMap.keys(), ...newMap.keys()]);
  const modified = {};
  const added = [];
  const removed = [];

  for (const id of [...ids].sort()) {
    const oldEntity = oldMap.get(id);
    const newEntity = newMap.get(id);
    if (!oldEntity && newEntity) {
      added.push(id);
      continue;
    }
    if (oldEntity && !newEntity) {
      removed.push(id);
      continue;
    }
    const changes = diffFn(oldEntity, newEntity);
    if (Object.keys(changes).length > 0) {
      modified[id] = changes;
    }
  }

  return { modified, added, removed };
}

function loadSnapshot(version) {
  const snapshotDir = path.join(HISTORY_DIR, version);
  const snapshot = {};
  for (const [entityType, config] of Object.entries(ENTITY_CONFIG)) {
    const filePath = path.join(snapshotDir, config.file);
    snapshot[entityType] = fs.existsSync(filePath) ? readJson(filePath) : [];
  }
  return snapshot;
}

function loadLiveData() {
  const live = {};
  for (const [entityType, config] of Object.entries(ENTITY_CONFIG)) {
    const filePath = path.join(OUTPUT_DIR, config.file);
    live[entityType] = fs.existsSync(filePath) ? readJson(filePath) : [];
  }
  return live;
}

function buildChanges(oldSnapshot, newSnapshot) {
  const changes = {};
  for (const [entityType, config] of Object.entries(ENTITY_CONFIG)) {
    changes[entityType] = buildEntityChangeSet(oldSnapshot[entityType], newSnapshot[entityType], config.diff);
  }
  return changes;
}

function hasAnyChanges(changes) {
  return Object.values(changes).some((section) => (
    Object.keys(section.modified).length > 0 || section.added.length > 0 || section.removed.length > 0
  ));
}

function main() {
  if (!fs.existsSync(VERSIONS_FILE)) {
    console.warn('No STS2 history versions.json found; writing empty changelog.');
    writeOutput([]);
    return;
  }

  const versions = readJson(VERSIONS_FILE);
  if (!Array.isArray(versions) || versions.length === 0) {
    console.warn('No STS2 history snapshots found; writing empty changelog.');
    writeOutput([]);
    return;
  }

  const chronological = [...versions].reverse();
  const changelog = [];

  for (let i = 1; i < chronological.length; i += 1) {
    const previousVersion = chronological[i - 1];
    const currentVersion = chronological[i];
    const changes = buildChanges(loadSnapshot(previousVersion.version), loadSnapshot(currentVersion.version));

    changelog.push({
      version: currentVersion.version,
      previousVersion: previousVersion.version,
      date: currentVersion.date,
      ...(currentVersion.label ? { label: currentVersion.label } : {}),
      changes,
    });
  }

  const latestSnapshotMeta = chronological[chronological.length - 1];
  const liveChanges = buildChanges(loadSnapshot(latestSnapshotMeta.version), loadLiveData());
  if (hasAnyChanges(liveChanges)) {
    changelog.push({
      version: 'current',
      previousVersion: latestSnapshotMeta.version,
      date: new Date().toISOString().slice(0, 10),
      label: 'Current Data',
      changes: liveChanges,
    });
  }

  changelog.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.version).localeCompare(String(a.version)));
  writeOutput(changelog);
  console.log(`Wrote ${changelog.length} changelog entries to ${OUTPUT_FILE}`);
}

main();
