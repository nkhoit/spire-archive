import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export type CardColor = 'ironclad' | 'silent' | 'defect' | 'watcher' | 'colorless' | 'curse' | string;

/** Stamped onto every entry that comes from a mod (see getModdedData). */
export interface ModFields {
  mod?: { id: string; name: string };
  color_label?: string;
  color_hex?: string;
  asset_color?: string;
}

export interface ModColor {
  id: string;
  label: string;
  hex: string;
  asset_color?: string;
}

export interface ModManifest {
  id: string;
  name: string;
  author?: string;
  url?: string;
  colors: ModColor[];
}

export interface Sts2Card {
  id: string;
  name: string;
  cost: number | null;
  type: string;
  rarity: string;
  target: string;
  color: string;
  keywords: string[];
  tags: string[];
  vars: Record<string, number>;
  upgrade: Record<string, any>;
  description: string;
  image_url: string | null;
}

export interface Enchantment {
  id: string;
  name: string;
  description: string;
  rarity: string;
}

export interface CardUpgrade {
  cost: number | null;
  damage: string | null;
  block: string | null;
  magic_number: string | null;
  description: string | null;
}

export interface Card extends ModFields {
  id: string;
  name: string;
  description: string;
  cost: number | null;
  type: string;
  rarity: string;
  target: string;
  color: CardColor;
  damage: number | null;
  block: number | null;
  magic_number: number | null;
  hit_count: number | null;
  exhaust: boolean;
  ethereal: boolean;
  innate: boolean;
  retain: boolean;
  self_retain: boolean;
  purge_on_use: boolean;
  tags: string[];
  keywords: string[];
  upgrade: CardUpgrade;
}

export interface Relic extends ModFields {
  id: string;
  name: string;
  description: string;
  flavor?: string | null;
  tier: string;
  color: CardColor | null;
  counter?: number | null;
  icon?: string;
  image_url?: string | null;
}

export interface Potion extends ModFields {
  id: string;
  name: string;
  description: string;
  rarity: string;
  color: CardColor | null;
  is_thrown?: boolean;
  target?: string | null;
  icon?: string;
  image_url?: string | null;
}

export interface MonsterMove {
  id?: string;
  name: string;
  damage: number | null;
  hits?: number | null;
  damage_ascension?: number | null;
  intent: string;
}

export interface Monster extends ModFields {
  id: string;
  name: string;
  type: string;
  act: string;
  min_hp: number | { ascension: number; normal: number } | null;
  max_hp: number | { ascension: number; normal: number } | null;
  min_hp_ascension?: number | null;
  max_hp_ascension?: number | null;
  moves: MonsterMove[];
  powers?: string[];
  move_pattern?: any[];
  start_move?: string;
  acts?: string[];
  move_titles?: string[];
  image_url?: string | null;
}

export interface EventReference {
  type: string;
  id: string;
  name: string;
}

export interface EventChoice {
  name?: string;
  option?: string;
  description: string;
  outcome?: string;
  references?: EventReference[];
}

export interface EventPage {
  label: string;
  description?: string;
  choices: EventChoice[];
}

export interface EventRelicPool {
  name: string;
  relics: string[];
}

export interface Event extends ModFields {
  id: string;
  name: string;
  act: string;
  type?: string;
  description: string;
  choices: EventChoice[];
  pages?: EventPage[];
  relic_pools?: EventRelicPool[];
  references?: EventReference[];
  image_url?: string | null;
}

export interface Power extends ModFields {
  id: string;
  name: string;
  description: string;
  type: string;
  stackable?: boolean;
  triggers?: string[];
  icon?: string;
}

export interface Keyword extends ModFields {
  id: string;
  names: string[];
  description: string;
  effect_id?: string;
}

export interface Orb {
  id: string;
  name: string;
  description: string;
}

export interface Stance {
  id: string;
  name: string;
  description: string;
}

export interface Blight {
  id: string;
  name: string;
  description: string;
}

export interface Character extends ModFields {
  id: string;
  name: string;
  color?: string;
  description?: string | null;
  hp?: number;
  energy_per_turn?: number;
  starting_deck?: string[];
  starting_relic?: string | null;
}

export interface Achievement {
  id: string;
  name: string;
  description?: string | null;
}

export interface MechanicsEntry {
  id: string;
  title: string;
  description: string;
  passive?: string;
  evoke?: string;
}

export interface AscensionLevel {
  level: number;
  title: string;
  description: string;
}

export interface MechanicsData {
  ascension: AscensionLevel[];
  map_rooms: MechanicsEntry[];
  core_concepts: MechanicsEntry[];
  orbs: MechanicsEntry[];
  stances: MechanicsEntry[];
  character_mechanics: MechanicsEntry[];
  keywords: Keyword[];
}

export interface Dataset {
  cards: Card[];
  relics: Relic[];
  potions: Potion[];
  monsters: Monster[];
  events: Event[];
  powers: Power[];
  keywords: Keyword[];
  orbs: Orb[];
  stances: Stance[];
  blights: Blight[];
  characters: Character[];
  achievements: Achievement[];
  cardPowers: Record<string, Array<{name: string; description: string}>>;
  enchantments: Enchantment[];
  mechanics: MechanicsData;

  cardById: Map<string, Card>;
  relicById: Map<string, Relic>;
  potionById: Map<string, Potion>;
  monsterById: Map<string, Monster>;
  eventById: Map<string, Event>;
  powerById: Map<string, Power>;

  keywordById: Map<string, Keyword>;
  orbById: Map<string, Orb>;
  stanceById: Map<string, Stance>;
  blightById: Map<string, Blight>;
  characterById: Map<string, Character>;
  achievementById: Map<string, Achievement>;
  enchantmentById: Map<string, Enchantment>;
}

export const SUPPORTED_LOCALES = ['en', 'de', 'fr', 'it', 'es', 'pt', 'pl', 'ru', 'tr', 'th', 'ja', 'ko', 'zh'] as const;
export type Locale = typeof SUPPORTED_LOCALES[number];

export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
  es: 'Español',
  pt: 'Português',
  pl: 'Polski',
  ru: 'Русский',
  tr: 'Türkçe',
  th: 'ไทย',
  ja: '日本語',
  ko: '한국어',
  zh: '中文',
};

const cache = new Map<string, Dataset>();

function rootDir() {
  // In production (built), data lives at /app/data; in dev, relative to source
  const dir = path.dirname(new URL(import.meta.url).pathname);
  // Walk up until we find a 'data' directory
  let candidate = path.resolve(dir, '../..');
  if (!existsSync(path.join(candidate, 'data'))) {
    // Production: chunks are deeper, try process.cwd()
    candidate = process.cwd();
  }
  return candidate;
}

async function readJson<T>(game: string, file: string): Promise<T> {
  const p = path.join(rootDir(), 'data', game, file);
  const raw = await fs.readFile(p, 'utf-8');
  return JSON.parse(raw) as T;
}

function toMap<T extends { id: string }>(items: T[]): Map<string, T> {
  const m = new Map<string, T>();
  for (const it of items) m.set(it.id, it);
  return m;
}

export async function getData(game: 'sts1' | 'sts2' = 'sts1', locale: Locale = 'en'): Promise<Dataset> {
  const cacheKey = `${game}:${locale}`;
  const cached = cache.get(cacheKey);
  if (cached) return cached;

  // Always load English base data first
  const baseKey = `${game}:en`;
  let base = cache.get(baseKey);
  if (!base) {
    base = await loadBaseData(game);
    // Apply English monster move_titles from localization
    const enLocPath = path.join(rootDir(), 'data', game, 'localization', 'en.json');
    if (existsSync(enLocPath)) {
      const enLoc = JSON.parse(await fs.readFile(enLocPath, 'utf-8'));
      if (enLoc.monsters) {
        const monsters = base.monsters.map(m => {
          const l = enLoc.monsters[m.id];
          if (!l?.move_titles) return m;
          return { ...m, move_titles: l.move_titles };
        });
        base = { ...base, monsters, monsterById: toMap(monsters) };
      }
    }
    cache.set(baseKey, base);
  }

  // If English, just return base
  if (locale === 'en') return base;

  // Load localization overlay and apply
  const localized = await applyLocalization(game, locale, base);
  cache.set(cacheKey, localized);
  return localized;
}

async function loadBaseData(game: string): Promise<Dataset> {

  const [
    cards,
    relics,
    potions,
    monsters,
    events,
    powers,
    keywords,
    orbs,
    stances,
    blights,
    characters,
    achievements,
    cardPowers,
    enchantments,
    mechanics,
  ] = await Promise.all([
    readJson<Card[]>(game, 'cards.json'),
    readJson<Relic[]>(game, 'relics.json'),
    readJson<Potion[]>(game, 'potions.json'),
    readJson<Monster[]>(game, 'monsters.json'),
    readJson<Event[]>(game, 'events.json'),
    readJson<Power[]>(game, 'powers.json'),
    readJson<Keyword[]>(game, 'keywords.json'),
    readJson<Orb[]>(game, 'orbs.json'),
    readJson<Stance[]>(game, 'stances.json'),
    readJson<Blight[]>(game, 'blights.json'),
    readJson<Character[]>(game, 'characters.json'),
    readJson<Achievement[]>(game, 'achievements.json'),
    readJson<Record<string, Array<{name: string; description: string}>>>(game, 'card_powers.json'),
    existsSync(path.join(rootDir(), 'data', game, 'enchantments.json'))
      ? readJson<Enchantment[]>(game, 'enchantments.json')
      : Promise.resolve([] as Enchantment[]),
    existsSync(path.join(rootDir(), 'data', game, 'mechanics.json'))
      ? readJson<MechanicsData>(game, 'mechanics.json')
      : Promise.resolve({ ascension: [], map_rooms: [], core_concepts: [], orbs: [], stances: [], character_mechanics: [], keywords: [] } as MechanicsData),
  ]);

  const dataset: Dataset = {
    cards,
    relics,
    potions,
    monsters,
    events,
    powers,
    keywords,
    orbs,
    stances,
    blights,
    characters,
    achievements,
    cardPowers,
    enchantments,
    mechanics,

    cardById: toMap(cards),
    relicById: toMap(relics),
    potionById: toMap(potions),
    monsterById: toMap(monsters),
    eventById: toMap(events),
    powerById: toMap(powers),

    keywordById: toMap(keywords),
    orbById: toMap(orbs),
    stanceById: toMap(stances),
    blightById: toMap(blights),
    characterById: toMap(characters),
    achievementById: toMap(achievements),
    enchantmentById: toMap(enchantments),
  };

  return dataset;
}

// Mods load once per process and are English-only.
const MOD_ENTITIES = ['cards', 'relics', 'potions', 'monsters', 'events', 'powers', 'keywords', 'characters'] as const;

interface LoadedMod {
  manifest: ModManifest;
  files: Partial<Record<(typeof MOD_ENTITIES)[number], any[]>>;
  cardPowers: Dataset['cardPowers'];
}

let modsCache: Promise<LoadedMod[]> | null = null;
const moddedCache = new Map<string, Dataset>();

function modsDir() {
  return process.env.MODS_DIR ? path.resolve(process.env.MODS_DIR) : path.join(rootDir(), 'data', 'mods');
}

const MOD_ID = /^[a-z0-9]+$/; // No underscores, so one mod's ID prefix can't overlap another's.
const MOD_ASSET = /^[a-z0-9_]+$/;
const MOD_HEX = /^#[0-9a-f]{6}$/i;
const MOD_ATTR = /^[\w .-]*$/;

/**
 * Mod text is third-party and reaches the same raw-HTML sinks as game text, so markup is refused here,
 * the one point every page and API response passes through. Returns why a mod is unsafe, or null.
 */
export function modProblem(folder: string, manifest: ModManifest, files: Record<string, any[]>, cardPowers: unknown = {}): string | null {
  if (manifest.id !== folder || !MOD_ID.test(manifest.id)) return `bad mod id "${manifest.id}"`;
  const color = manifest.colors.find((c) => !MOD_HEX.test(c.hex) || !MOD_ASSET.test(c.asset_color ?? 'colorless'));
  if (color) return `bad color "${color.id}"`;
  // The event page splices reference ids and types into attributes, and its hover preview decodes entities.
  const unsafe: string[] = [];
  const text = JSON.stringify([manifest, files, cardPowers], (key, value) => {
    if ((key === 'id' || key === 'type') && typeof value === 'string' && !MOD_ATTR.test(value)) unsafe.push(value);
    return value;
  });
  if (/[<>]|&#?\w+;/.test(text)) return 'markup in text';
  if (unsafe.length > 0) return `unsafe id or type "${unsafe[0]}"`;
  const prefix = `${manifest.id.toUpperCase()}_`;
  const entity = Object.values(files).flat().find((item) => typeof item?.id !== 'string' || !item.id.startsWith(prefix));
  return entity ? `id "${entity?.id}" lacks prefix ${prefix}` : null;
}

async function readOptional<T>(file: string, fallback: T): Promise<T> {
  return existsSync(file) ? JSON.parse(await fs.readFile(file, 'utf-8')) as T : fallback;
}

function loadMods(): Promise<LoadedMod[]> {
  modsCache ??= (async () => {
    const dir = modsDir();
    if (!existsSync(dir)) return [];
    const entries = (await fs.readdir(dir, { withFileTypes: true })).filter((e) => e.isDirectory());
    const mods = await Promise.all(entries.map(async (entry) => {
      const modDir = path.join(dir, entry.name);
      try {
        const manifest = JSON.parse(await fs.readFile(path.join(modDir, 'mod.json'), 'utf-8')) as ModManifest;
        const loaded = await Promise.all(MOD_ENTITIES.map(async (k) => [k, await readOptional<any[]>(path.join(modDir, `${k}.json`), [])] as const));
        const files = Object.fromEntries(loaded);
        const cardPowers = await readOptional<Dataset['cardPowers']>(path.join(modDir, 'card_powers.json'), {});
        const problem = modProblem(entry.name, manifest, files, cardPowers);
        if (problem) throw new Error(problem);
        return [{ manifest, files, cardPowers }];
      } catch (error) {
        // Mods are optional: a bad one must never take base-game pages down with it.
        console.error(`Skipping mod ${entry.name}: ${error}`);
        return [];
      }
    }));
    return mods.flat().sort((a, b) => a.manifest.name.localeCompare(b.manifest.name));
  })();
  return modsCache;
}

/** Installed mods. Only STS1 supports mods. */
export async function getMods(game: 'sts1' | 'sts2'): Promise<ModManifest[]> {
  return game === 'sts1' ? (await loadMods()).map((m) => m.manifest) : [];
}

function stampMod(item: any, manifest: ModManifest) {
  const color = manifest.colors.find((c) => c.id === item.color);
  return {
    ...item,
    mod: { id: manifest.id, name: manifest.name },
    ...(color && { color_label: color.label, color_hex: color.hex, asset_color: color.asset_color ?? 'colorless' }),
  };
}

/** Base data plus every installed mod. Use getData() for anything that must stay base-game only. */
export async function getModdedData(game: 'sts1' | 'sts2' = 'sts1', locale: Locale = 'en'): Promise<Dataset> {
  const base = await getData(game, locale);
  if (game !== 'sts1') return base;
  const cached = moddedCache.get(locale);
  if (cached) return cached;

  const mods = await loadMods();
  const fromMods = <T extends { id: string }>(key: (typeof MOD_ENTITIES)[number], baseItems: T[]): T[] => {
    const baseIds = new Set(baseItems.map((item) => item.id));
    return mods.flatMap((m) => (m.files[key] ?? []).filter((item) => !baseIds.has(item.id)).map((item) => stampMod(item, m.manifest)));
  };
  // Sorted so modded entries interleave instead of all landing on the last page.
  const merge = <T extends { name?: string; id: string }>(key: (typeof MOD_ENTITIES)[number], items: T[]): T[] =>
    [...items, ...fromMods<T>(key, items)].sort((a, b) => (a.name ?? a.id).localeCompare(b.name ?? b.id));

  const cards = merge('cards', base.cards);
  const relics = merge('relics', base.relics);
  const potions = merge('potions', base.potions);
  const monsters = merge('monsters', base.monsters);
  const events = merge('events', base.events);
  const powers = merge('powers', base.powers);
  const keywords = [...base.keywords, ...fromMods<Keyword>('keywords', base.keywords)];
  const characters = [...base.characters, ...fromMods<Character>('characters', base.characters)];

  const dataset: Dataset = {
    ...base,
    cards, relics, potions, monsters, events, powers, keywords, characters,
    cardPowers: Object.assign({}, ...mods.map((m) => m.cardPowers), base.cardPowers),
    cardById: toMap(cards),
    relicById: toMap(relics),
    potionById: toMap(potions),
    monsterById: toMap(monsters),
    eventById: toMap(events),
    powerById: toMap(powers),
    keywordById: toMap(keywords),
    characterById: toMap(characters),
  };
  moddedCache.set(locale, dataset);
  return dataset;
}

interface LocData {
  cards?: Record<string, { name?: string; description?: string; upgrade_description?: string; upgradeDescription?: string }>;
  relics?: Record<string, { name?: string; description?: string; flavor?: string }>;
  powers?: Record<string, { name?: string; description?: string }>;
  potions?: Record<string, { name?: string; description?: string }>;
  events?: Record<string, { name?: string; [key: string]: any }>;
  keywords?: Record<string, { name?: string; names?: string[]; description?: string }>;
  enchantments?: Record<string, { name?: string; description?: string }>;
  characters?: Record<string, { name?: string; description?: string }>;
  monsters?: Record<string, { name?: string; moves?: Record<string, string>; move_names?: Record<string, string> | string[]; move_titles?: string[] }>;
  mechanics?: MechanicsData;
}

async function applyLocalization(game: string, locale: Locale, base: Dataset): Promise<Dataset> {
  const locPath = path.join(rootDir(), 'data', game, 'localization', `${locale}.json`);
  if (!existsSync(locPath)) return base;

  const loc: LocData = JSON.parse(await fs.readFile(locPath, 'utf-8'));

  // Deep clone arrays to avoid mutating base cache
  const cards = base.cards.map(c => {
    const l = loc.cards?.[c.id];
    if (!l) return c;
    const result = { ...c, ...(l.name && { name: l.name }), ...(l.description && { description: l.description }) };
    const upgDesc = l.upgrade_description ?? l.upgradeDescription;
    if (upgDesc && result.upgrade) {
      result.upgrade = { ...result.upgrade, description: upgDesc };
    }
    return result;
  });

  const relics = base.relics.map(r => {
    const l = loc.relics?.[r.id];
    if (!l) return r;
        return { ...r, ...(l.name && { name: l.name }), ...(l.description && { description: l.description }), ...(l.flavor && { flavor: l.flavor }) };
  });

  const powers = base.powers.map(p => {
    const l = loc.powers?.[p.id] ?? (game === 'sts1' ? loc.powers?.[p.name] : undefined);
    if (!l) return p;
    return { ...p, ...(l.name && { name: l.name }), ...(l.description && { description: l.description }) };
  });

  const potions = base.potions.map(p => {
    const l = loc.potions?.[p.id];
    if (!l) return p;
    return { ...p, ...(l.name && { name: l.name }), ...(l.description && { description: l.description }) };
  });

  const enchantments = base.enchantments.map(e => {
    const l = loc.enchantments?.[e.id];
    if (!l) return e;
    return { ...e, ...(l.name && { name: l.name }), ...(l.description && { description: l.description }) };
  });

  // Build entity name lookup maps for localizing event references
  const cardById = toMap(cards);
  const relicById = toMap(relics);
  const potionById = toMap(potions);
  const enchantmentById = toMap(enchantments);

  const events = base.events.map(e => {
    const l = loc.events?.[e.id];
    if (!l) return e;

    const choices = (l.choices || l.options)
      ? e.choices.map((choice: EventChoice, index: number) => {
          const lc = (l.choices || l.options)?.[index];
          if (!lc) return choice;
          // STS1: choices are strings; STS2: choices are objects with name/description
          if (typeof lc === 'string') {
            return { ...choice, option: lc };
          }
          return {
            ...choice,
            ...(lc.name && { name: lc.name }),
            ...(lc.description && { description: lc.description }),
            ...(lc.locked && { locked: lc.locked }),
            ...(lc.outcome && { outcome: lc.outcome }),
          };
        })
      : e.choices;

    const pages = l.pages
      ? (e.pages ?? []).map((page: EventPage, pageIndex: number) => ({
          ...page,
          // When localized page data exists, suppress untranslated editorial label/description
          // (these are English-only manual overrides, not from the game's loc files)
          label: l.pages?.[pageIndex]?.label ?? page.label,
          description: l.pages?.[pageIndex]?.description ?? undefined,
          choices: l.pages?.[pageIndex]?.choices
            ? page.choices.map((choice: EventChoice, choiceIndex: number) => ({
                ...choice,
                ...(l.pages?.[pageIndex]?.choices?.[choiceIndex]?.name && { name: l.pages[pageIndex].choices![choiceIndex].name }),
                ...(l.pages?.[pageIndex]?.choices?.[choiceIndex]?.description && { description: l.pages[pageIndex].choices![choiceIndex].description }),
                ...(l.pages?.[pageIndex]?.choices?.[choiceIndex]?.locked && { locked: l.pages[pageIndex].choices![choiceIndex].locked }),
                ...(l.pages?.[pageIndex]?.choices?.[choiceIndex]?.outcome && { outcome: l.pages[pageIndex].choices![choiceIndex].outcome }),
              }))
            : page.choices,
        }))
      : e.pages;

    // Localize references using already-translated entity names
    const localizeRefs = (refs?: EventReference[]): EventReference[] | undefined => {
      if (!refs?.length || locale === 'en') return refs;
      return refs.map(ref => {
        const entityMap = ref.type === 'card' ? cardById :
                         ref.type === 'relic' ? relicById :
                         ref.type === 'potion' ? potionById :
                         ref.type === 'enchantment' ? enchantmentById : null;
        const locName = entityMap?.get(ref.id)?.name;
        return locName ? { ...ref, name: locName } : ref;
      });
    };

    // Suppress untranslated editorial descriptions for ancient events
    // (these have English-only descriptions not from game loc files)
    const description = l.description ?? (e.type === 'ancient' ? undefined : e.description);

    return {
      ...e,
      ...(l.name && { name: l.name }),
      description,
      ...(l.epithet && { epithet: l.epithet }),
      ...(l.dialogue && { dialogue: l.dialogue }),
      choices: choices.map((c: any) => ({
        ...c,
        ...(c.references && { references: localizeRefs(c.references) }),
      })),
      ...(e.references && { references: localizeRefs(e.references) }),
      ...(pages && { pages }),
    };
  });

  const keywords = base.keywords.map(k => {
    const l = loc.keywords?.[k.id];
    if (!l) return k;
    return { ...k, ...(l.names && { names: l.names }), ...(l.name && { names: [l.name] }), ...(l.description && { description: l.description }) };
  });

  const characters = base.characters.map(c => {
    const l = loc.characters?.[c.id];
    if (!l) return c;
    return { ...c, ...(l.name && { name: l.name }), ...(l.description && { description: l.description }) };
  });

  const monsters = base.monsters.map(m => {
    const l = loc.monsters?.[m.id];
    if (!l) return m;
    const nameMap = l.move_names ?? {};
    const localizeMoveByKey = (mv: any, index: number) => {
      // STS1: move_names is an array — map by index
      if (Array.isArray(nameMap) && nameMap[index]) return { ...mv, name: nameMap[index] };
      // STS2: move_names is a map (English display name → localized name)
      if (!Array.isArray(nameMap) && mv.name && nameMap[mv.name]) return { ...mv, name: nameMap[mv.name] };
      // Try localization key match (strip _MOVE suffix from ID)
      const moveKey = mv.id?.replace(/_MOVE$/, '') ?? '';
      const locName = l.moves?.[mv.id ?? ''] ?? l.moves?.[moveKey] ?? null;
      return locName ? { ...mv, name: locName } : mv;
    };
    const moves = m.moves.map((mv: MonsterMove, i: number) => localizeMoveByKey(mv, i));
    const movePattern = (m as any).move_pattern ? (m as any).move_pattern.map((mp: any, i: number) => {
      if (mp.type === 'random') return mp;
      return localizeMoveByKey(mp, i);
    }) : (m as any).move_pattern;
    return {
      ...m,
      ...(l.name && { name: l.name }),
      moves,
      ...(movePattern && { move_pattern: movePattern }),
      ...(l.move_titles && { move_titles: l.move_titles }),
    };
  });

  const dataset: Dataset = {
    ...base,
    cards,
    relics,
    powers,
    potions,
    monsters,
    events,
    keywords,
    enchantments,
    characters,
    mechanics: loc.mechanics ?? base.mechanics,

    cardById: toMap(cards),
    relicById: toMap(relics),
    potionById: toMap(potions),
    monsterById: toMap(monsters),
    eventById: toMap(events),
    powerById: toMap(powers),
    keywordById: toMap(keywords),
    characterById: toMap(characters),
    enchantmentById: toMap(enchantments),
  };

  return dataset;
}
