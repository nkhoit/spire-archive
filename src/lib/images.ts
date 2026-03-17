/**
 * Resolve image paths for game entities.
 * Builds lookup from actual files in public/images/ at startup.
 */
import fs from 'node:fs';
import path from 'node:path';

// Manual overrides: card ID -> image filename (without .png)
const CARD_IMAGE_OVERRIDES: Record<string, string> = {
  ASCENDERSBANE: 'ascenders_bane',
  DROPKICK: 'drop_kick',
  FORCE_FIELD: 'forcefield',
  HYPERBEAM: 'hyper_beam',
  J_A_X: 'jax',
  LESSONLEARNED: 'lessons_learned',
  MULTI_CAST: 'multicast',
  THUNDERCLAP: 'thunder_clap',
  WREATHOFFLAME: 'wreathe_of_flame',
  LOCKON: 'bullseye',
};

function toSnake(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

let _cardImages: Set<string> | null = null;
let _relicImages: Set<string> | null = null;

function rootDir() {
  return path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
}

function loadImageSet(subdir: string): Set<string> {
  const dir = path.join(rootDir(), 'public', 'images', subdir);
  try {
    return new Set(
      fs.readdirSync(dir)
        .filter(f => f.endsWith('.png'))
        .map(f => f.replace('.png', ''))
    );
  } catch {
    return new Set();
  }
}

function cardImages(): Set<string> {
  if (!_cardImages) _cardImages = loadImageSet('sts1/cards');
  return _cardImages;
}

function relicImages(): Set<string> {
  if (!_relicImages) _relicImages = loadImageSet('sts1/relics');
  return _relicImages;
}

export function cardImagePath(id: string, name: string): string | null {
  const override = CARD_IMAGE_OVERRIDES[id];
  if (override && cardImages().has(override)) return `/images/sts1/cards/${override}.png`;

  const idSlug = id.toLowerCase();
  if (cardImages().has(idSlug)) return `/images/sts1/cards/${idSlug}.png`;

  const nameSlug = toSnake(name);
  if (cardImages().has(nameSlug)) return `/images/sts1/cards/${nameSlug}.png`;

  return null;
}

export function relicImagePath(id: string, name: string): string | null {
  const imgs = relicImages();

  // Try exact ID (relics often use camelCase IDs matching filenames)
  if (imgs.has(id)) return `/images/sts1/relics/${id}.png`;

  // Try snake_case of name
  const nameSlug = toSnake(name);
  if (imgs.has(nameSlug)) return `/images/sts1/relics/${nameSlug}.png`;

  // Try camelCase variations
  const idLower = id.toLowerCase();
  if (imgs.has(idLower)) return `/images/sts1/relics/${idLower}.png`;

  return null;
}
