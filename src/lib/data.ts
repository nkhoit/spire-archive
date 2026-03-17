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
  min_hp: number | null;
  max_hp: number | null;
  min_hp_ascension?: number | null;
  max_hp_ascension?: number | null;
  moves: MonsterMove[];
  powers?: string[];
  image_url?: string | null;
}

export interface EventChoice {
  name?: string;
  option?: string;
  description: string;
  outcome?: string;
}

export interface Event {
  id: string;
  name: string;
  act: string;
  description: string;
  choices: EventChoice[];
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

export async function getData(game: 'sts1' | 'sts2' = 'sts1'): Promise<Dataset> {
  const cached = cache.get(game);
  if (cached) return cached;

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

  cache.set(game, dataset);
  return dataset;
}
