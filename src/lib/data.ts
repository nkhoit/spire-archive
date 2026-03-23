import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

export type CardColor = 'ironclad' | 'silent' | 'defect' | 'watcher' | 'colorless' | 'curse' | string;

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

export interface Card {
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

export interface Relic {
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

export interface Potion {
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

export interface Monster {
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

export interface Event {
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

export interface Power {
  id: string;
  name: string;
  description: string;
  type: string;
  stackable?: boolean;
  triggers?: string[];
  icon?: string;
}

export interface Keyword {
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

export interface Character {
  id: string;
  name: string;
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

interface LocData {
  cards?: Record<string, { name?: string; description?: string; upgrade_description?: string; upgradeDescription?: string }>;
  relics?: Record<string, { name?: string; description?: string; flavor?: string }>;
  powers?: Record<string, { name?: string; description?: string }>;
  potions?: Record<string, { name?: string; description?: string }>;
  events?: Record<string, { name?: string; [key: string]: any }>;
  keywords?: Record<string, { name?: string; names?: string[]; description?: string }>;
  enchantments?: Record<string, { name?: string; description?: string }>;
  monsters?: Record<string, { name?: string; moves?: Record<string, string>; move_names?: Record<string, string>; move_titles?: string[] }>;
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
          };
        })
      : e.choices;

    const pages = l.pages
      ? (e.pages ?? []).map((page: EventPage, pageIndex: number) => ({
          ...page,
          ...(l.pages?.[pageIndex]?.label && { label: l.pages[pageIndex].label }),
          ...(l.pages?.[pageIndex]?.description && { description: l.pages[pageIndex].description }),
          choices: l.pages?.[pageIndex]?.choices
            ? page.choices.map((choice: EventChoice, choiceIndex: number) => ({
                ...choice,
                ...(l.pages?.[pageIndex]?.choices?.[choiceIndex]?.name && { name: l.pages[pageIndex].choices![choiceIndex].name }),
                ...(l.pages?.[pageIndex]?.choices?.[choiceIndex]?.description && { description: l.pages[pageIndex].choices![choiceIndex].description }),
              }))
            : page.choices,
        }))
      : e.pages;

    return {
      ...e,
      ...(l.name && { name: l.name }),
      ...(l.description && { description: l.description }),
      choices,
      ...(pages && { pages }),
    };
  });

  const keywords = base.keywords.map(k => {
    const l = loc.keywords?.[k.id];
    if (!l) return k;
    return { ...k, ...(l.names && { names: l.names }), ...(l.name && { names: [l.name] }), ...(l.description && { description: l.description }) };
  });

  const enchantments = base.enchantments.map(e => {
    const l = loc.enchantments?.[e.id];
    if (!l) return e;
    return { ...e, ...(l.name && { name: l.name }), ...(l.description && { description: l.description }) };
  });

  const monsters = base.monsters.map(m => {
    const l = loc.monsters?.[m.id];
    if (!l) return m;
    const nameMap = l.move_names ?? {};
    const localizeMoveByKey = (mv: any) => {
      // Try move_names (English display name → localized name)
      if (mv.name && nameMap[mv.name]) return { ...mv, name: nameMap[mv.name] };
      // Try localization key match (strip _MOVE suffix from ID)
      const moveKey = mv.id?.replace(/_MOVE$/, '') ?? '';
      const locName = l.moves?.[mv.id ?? ''] ?? l.moves?.[moveKey] ?? null;
      return locName ? { ...mv, name: locName } : mv;
    };
    const moves = m.moves.map((mv: MonsterMove) => localizeMoveByKey(mv));
    const movePattern = (m as any).move_pattern ? (m as any).move_pattern.map((mp: any) => {
      if (mp.type === 'random') return mp;
      return localizeMoveByKey(mp);
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
    mechanics: loc.mechanics ?? base.mechanics,

    cardById: toMap(cards),
    relicById: toMap(relics),
    potionById: toMap(potions),
    monsterById: toMap(monsters),
    eventById: toMap(events),
    powerById: toMap(powers),
    keywordById: toMap(keywords),
    enchantmentById: toMap(enchantments),
  };

  return dataset;
}
