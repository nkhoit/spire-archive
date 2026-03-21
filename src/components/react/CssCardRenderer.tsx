import { useRef, useLayoutEffect, useCallback } from 'react';
import './CssCardRenderer.css';
import { t } from '../../lib/ui-strings';

export interface CssCardRendererProps {
  card: any;
  upgraded?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  game?: 'sts1' | 'sts2';
  locale?: string;
}

// ─── STS1 constants ──────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, string> = {
  ironclad: 'red', silent: 'green', defect: 'blue', watcher: 'purple',
  colorless: 'colorless', curse: 'black', status: 'black',
};

const ORB_COLOR_MAP: Record<string, string> = {
  red: 'red', green: 'green', blue: 'blue', purple: 'purple',
  colorless: 'colorless', black: 'colorless',
};

const TYPE_COLOR_MAP: Record<string, string> = {
  red: 'rgb(120,98,83)', green: 'rgb(83,113,90)', blue: 'rgb(83,105,128)',
  purple: 'rgb(105,90,120)', colorless: 'rgb(105,105,105)', black: 'rgb(90,90,90)',
};

const STS1_KEYWORDS = [
  'Plated Armor',
  'Strength', 'Dexterity', 'Block', 'Vulnerable', 'Weak', 'Frail',
  'Poison', 'Exhaust', 'Ethereal', 'Innate', 'Retain', 'Scry',
  'Channel', 'Evoke', 'Focus', 'Orb', 'Lightning', 'Frost', 'Dark',
  'Plasma', 'Mantra', 'Wrath', 'Calm', 'Divinity', 'Vigor',
  'Intangible', 'Artifact', 'Metallicize', 'Thorns',
  'Shiv', 'Shivs', 'Burn', 'Wound', 'Dazed', 'Slimed', 'Void',
  'Strikes', 'Power', 'Powers', 'Attack', 'Attacks', 'Skill', 'Skills',
  'Unplayable', 'Energy',
];

// ─── STS2 constants ──────────────────────────────────────────────────────────

const STS2_HIGHLIGHT_TERMS = [
  'Vulnerable', 'Weak', 'Strength', 'Dexterity', 'Block', 'Thorns',
  'Innate', 'Ethereal', 'Exhaust', 'Retain', 'Sly', 'Eternal',
  'Wound', 'Burn', 'Daze', 'Slimed', 'Void',
  'Poison', 'Focus', 'Frost', 'Lightning', 'Dark', 'Plasma',
  'Scry', 'Mantra', 'Stance', 'Wrath', 'Calm', 'Divinity',
  'Fragile', 'Summon', 'Forge', 'Hex', 'Ritual', 'Vigor',
  'Intangible', 'Artifact', 'Plated Armor', 'Metallicize',
  'Shiv', 'Shivs',
];

const TITLE_OUTLINE_COLORS: Record<string, string> = {
  common: '#4D4B40', basic: '#4D4B40', uncommon: '#005C75',
  rare: '#6B4B00', curse: '#550B9E', quest: '#7E3E15',
  status: '#4F522F', special: '#1B6131',
};

export default function CssCardRenderer({
  card,
  upgraded = false,
  size = 'md',
  game = 'sts2',
  locale = 'en',
}: CssCardRendererProps) {
  if (game === 'sts1') {
    return <Sts1Renderer card={card} upgraded={upgraded} size={size} />;
  }
  return <Sts2Renderer card={card} upgraded={upgraded} size={size} locale={locale} />;
}

// ─── STS1 Renderer ───────────────────────────────────────────────────────────

function Sts1Renderer({ card, upgraded, size }: { card: any; upgraded: boolean; size: string }) {
  const cardType = (card.type ?? 'Skill').toLowerCase();
  const cardColor = (card.color ?? 'colorless').toLowerCase();

  const assetColor = COLOR_MAP[cardColor] ?? 'colorless';
  const frameType = ['curse', 'status'].includes(cardType) ? 'skill' : cardType;
  const rarity = (card.rarity ?? 'Common').toLowerCase();
  const assetRarity = ['common', 'uncommon', 'rare'].includes(rarity) ? rarity : 'common';

  const bgAsset = `/images/sts1/cardui/bg_${frameType}_${assetColor}.png`;
  const frameAsset = `/images/sts1/cardui/frame_${frameType}_${assetRarity}.png`;
  const bannerAsset = `/images/sts1/cardui/banner_${assetRarity}.png`;
  const trimLeft = `/images/sts1/cardui/${assetRarity}_left.png`;
  const trimCenter = `/images/sts1/cardui/${assetRarity}_center.png`;
  const trimRight = `/images/sts1/cardui/${assetRarity}_right.png`;

  const orbColor = ORB_COLOR_MAP[assetColor] ?? 'colorless';
  const orbAsset = `/images/sts1/cardui/card_${orbColor}_orb.png`;

  const portrait = `/images/sts1/cards/${card.id.toLowerCase()}.png`;

  const isCurseOrStatus = ['curse', 'status'].includes(cardType);
  let displayCost: number | null = card.cost ?? null;
  const upgradedCost = upgraded && card.upgrade?.cost != null ? card.upgrade.cost : undefined;
  const costChanged = upgradedCost !== undefined && upgradedCost !== card.cost;
  if (upgraded && upgradedCost !== undefined) displayCost = upgradedCost;

  const cardName = upgraded ? card.name + '+' : card.name;
  const longName = cardName.length > 14;

  let description: string = card.description ?? '';
  if (upgraded && card.upgrade?.description) description = card.upgrade.description;

  const inlineOrbMap: Record<string, string> = {
    R: `/images/sts1/cardui/card_red_orb.png`,
    G: `/images/sts1/cardui/card_green_orb.png`,
    B: `/images/sts1/cardui/card_blue_orb.png`,
    E: `/images/sts1/cardui/card_colorless_orb.png`,
    W: `/images/sts1/cardui/card_purple_orb.png`,
  };

  const highlightPattern = new RegExp(
    `\\b(${STS1_KEYWORDS.map(k => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`,
    'g'
  );

  let descProcessed = description
    .replace(/\[([RGBEW])\]/g, (_, token: string) => {
      const src = inlineOrbMap[token] ?? inlineOrbMap['E'];
      return `<img src="${src}" class="cr1-icon" alt="${token}" />`;
    })
    .replace(highlightPattern, '<span class="cr1-keyword">$1</span>')
    .replace(/\n/g, '<br>');

  if (upgraded && card.upgrade?.description) {
    const baseDesc = card.description ?? '';
    const upgradeDesc = card.upgrade.description;
    const baseNums = new Set((baseDesc.match(/\d+/g) ?? []).map(Number));
    const upgradeNums = (upgradeDesc.match(/\d+/g) ?? []).map(Number);
    const changedNums = new Set(upgradeNums.filter((n: number) => !baseNums.has(n)));
    for (const num of changedNums) {
      descProcessed = descProcessed.replace(
        new RegExp(`(?<!\\d)${num}(?!\\d)`, 'g'),
        `<span class="cr1-green">${num}</span>`
      );
    }
  }

  const typeColor = TYPE_COLOR_MAP[assetColor] ?? TYPE_COLOR_MAP['colorless'];
  const scales: Record<string, number> = { xs: 0.22, sm: 0.35, md: 0.5, lg: 0.7 };
  const scale = scales[size] ?? 0.5;

  return (
    <div className="cr1" style={{ '--s': scale } as React.CSSProperties}>
      <img src={bgAsset} className="cr1-bg" alt="" />
      <div className="cr1-portrait-area">
        <img src={portrait} className="cr1-portrait" alt="" loading="lazy" />
      </div>
      <img src={frameAsset} className="cr1-frame" alt="" />
      <img src={bannerAsset} className="cr1-banner" alt="" />
      <img src={trimLeft} className="cr1-trim" alt="" />
      <img src={trimCenter} className="cr1-trim" alt="" />
      <img src={trimRight} className="cr1-trim" alt="" />
      {!isCurseOrStatus && displayCost !== null && (
        <div className="cr1-energy">
          <img src={orbAsset} className="cr1-energy-orb" alt="" />
          <span className={`cr1-energy-num${costChanged ? ' cr1-green' : ''}`}>{displayCost}</span>
        </div>
      )}
      <div className={`cr1-title${upgraded ? ' cr1-title-upgraded' : ''}${longName ? ' cr1-title-long' : ''}`}>
        {cardName}
      </div>
      <div className="cr1-type" style={{ color: typeColor }}>
        {card.type}
      </div>
      <div className="cr1-desc">
        <div className="cr1-desc-inner" dangerouslySetInnerHTML={{ __html: descProcessed }} />
      </div>
    </div>
  );
}

// ─── STS2 Renderer ───────────────────────────────────────────────────────────

// ─── Locale font config (matches game's font + scale transforms) ─────────────

interface LocaleFontConfig {
  family: string;
  scale: number;         // from game's variation_transform
  baselineOffset?: number;
}

const LOCALE_FONTS: Record<string, LocaleFontConfig> = {
  en: { family: "'KreonGame', serif", scale: 1.0 },
  de: { family: "'KreonGame', serif", scale: 1.0 },
  fr: { family: "'KreonGame', serif", scale: 1.0 },
  es: { family: "'KreonGame', serif", scale: 1.0 },
  pt: { family: "'KreonGame', serif", scale: 1.0 },
  it: { family: "'KreonGame', serif", scale: 1.0 },
  pl: { family: "'KreonGame', serif", scale: 1.0 },
  tr: { family: "'KreonGame', serif", scale: 1.0 },
  ja: { family: "'NotoSansCJKjp', 'KreonGame', serif", scale: 0.95 },
  zh: { family: "'SourceHanSerifSC', 'KreonGame', serif", scale: 0.95 },
  ko: { family: "'GyeonggiCheonnyeon', 'KreonGame', serif", scale: 0.90 },
  ru: { family: "'FiraSansCondensed', 'KreonGame', serif", scale: 0.95 },
  th: { family: "'CSChatThai', 'KreonGame', serif", scale: 0.95 },
};

// Base font sizes (px at scale=1, matches game's MaxFontSize)
const BASE_TITLE_SIZE = 60;  // visual size in our 680×884 canvas
const BASE_DESC_SIZE = 43;
const MIN_DESC_SIZE = 24;    // proportional to game's 12/21 ratio ≈ 0.57

/**
 * Auto-fit hook: shrinks font until text fits container (like game's MegaLabel).
 * Binary searches between minSize and maxSize.
 */
function useAutoFit(
  maxSize: number,
  minSize: number,
  deps: any[],
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  const fit = useCallback(() => {
    const container = containerRef.current;
    const inner = innerRef.current;
    if (!container || !inner) return;

    const containerH = container.clientHeight;
    const containerW = container.clientWidth;
    if (containerH === 0 || containerW === 0) return;

    // Binary search for largest fitting size
    let lo = minSize;
    let hi = maxSize;
    let best = minSize;

    while (lo <= hi) {
      const mid = Math.floor((lo + hi) / 2);
      inner.style.fontSize = `${mid}px`;
      if (inner.scrollHeight <= containerH + 1 && inner.scrollWidth <= containerW + 1) {
        best = mid;
        lo = mid + 1;
      } else {
        hi = mid - 1;
      }
    }
    inner.style.fontSize = `${best}px`;
  }, [maxSize, minSize]);

  useLayoutEffect(() => {
    fit();
  }, [...deps, fit]);

  return { containerRef, innerRef };
}

function Sts2Renderer({ card, upgraded, size, locale = 'en' }: { card: any; upgraded: boolean; size: string; locale?: string }) {
  const cardType = (card.type ?? 'Skill').toLowerCase();
  const cardColor = card.color ?? 'colorless';

  const frameType = (['curse', 'status'].includes(cardType)) ? 'skill' : cardType;
  const borderType = (['curse', 'status', 'quest'].includes(cardType)) ? 'skill' : (['attack', 'power'].includes(cardType) ? cardType : 'skill');

  const frameAsset = `/images/sts2/cardui/frames/${cardColor}_${frameType}.png`;
  const rarity = (card.rarity ?? 'Common').toLowerCase();
  const borderAsset = `/images/sts2/cardui/frames/border_${rarity}_${borderType}.png`;
  const bannerAsset = `/images/sts2/cardui/frames/banner_${rarity}.png`;
  const plaqueAsset = `/images/sts2/cardui/frames/plaque_${rarity}.png`;

  const titleOutlineColor = TITLE_OUTLINE_COLORS[rarity] ?? '#4D4B40';

  const energyMap: Record<string, string> = {
    ironclad: 'energy_ironclad.png', silent: 'energy_silent.png',
    defect: 'energy_defect.png', necrobinder: 'energy_necrobinder.png',
    regent: 'energy_regent.png', colorless: 'energy_colorless.png',
    curse: 'energy_colorless.png', status: 'energy_colorless.png',
    quest: 'energy_quest.png', event: 'energy_colorless.png',
    token: 'energy_colorless.png',
  };
  const energyOrb = `/images/sts2/cardui/${energyMap[cardColor] ?? energyMap['colorless']}`;

  const inlineEnergyMap: Record<string, string> = {
    ironclad: 'ironclad_energy_icon.png', silent: 'silent_energy_icon.png',
    defect: 'defect_energy_icon.png', necrobinder: 'necrobinder_energy_icon.png',
    regent: 'regent_energy_icon.png',
  };
  const inlineEnergy = `/images/sts2/cardui/${inlineEnergyMap[cardColor] ?? 'energy_icon.png'}`;
  const inlineStar = `/images/sts2/cardui/star_icon.png`;
  const portrait = `/images/sts2/cards/${card.id.toLowerCase()}.png`;

  const cardName = upgraded ? card.name + '+' : card.name;

  let displayCost: number | string | null = card.cost ?? null;
  const isXCost = card.cost === -1;
  if (isXCost) displayCost = 'X';
  if (upgraded && card.upgrade?.cost != null) {
    displayCost = card.upgrade.cost;
  }

  const starCost: number | null = card.star_cost ?? null;

  let keywords: string[] = [...(card.keywords ?? [])];
  if (upgraded) {
    for (const kw of (card.upgrade?.add_keywords ?? [])) {
      if (!keywords.includes(kw)) keywords.push(kw);
    }
    for (const kw of (card.upgrade?.remove_keywords ?? [])) {
      keywords = keywords.filter((k: string) => k !== kw);
    }
  }

  let description: string = card.description ?? '';
  const upgradedNumbers = new Set<string>();
  if (upgraded) {
    const upg = card.upgrade ?? {};
    if (upg.description) {
      description = upg.description;
      // Find numbers that changed value between base and upgraded descriptions
      // Only highlight numbers that are NEW values (not present anywhere in base)
      const baseNumSet = new Set((card.description ?? '').match(/\d+/g) ?? []);
      const upgNums = upg.description.match(/\d+/g) ?? [];
      for (const n of upgNums) {
        if (!baseNumSet.has(n)) {
          upgradedNumbers.add(n);
        }
      }
    } else {
      const vars = { ...(card.vars ?? {}) };
      const template = (card as any).description_template as string | undefined;
      // Check if upgrade has any numeric deltas (not just keyword changes)
      const hasNumericUpgrade = Object.entries(upg).some(([k]) =>
        !['add_keywords', 'remove_keywords', 'description'].includes(k)
      );

      if (template && hasNumericUpgrade) {
        // Use template for precise var replacement
        description = template;
        const UPG_MARK = '\x01';
        const UPG_END = '\x02';
        for (const [uk, delta] of Object.entries(upg)) {
          if (['add_keywords', 'remove_keywords', 'description'].includes(uk)) continue;
          const vk = uk in vars ? uk : `power_${uk}` in vars ? `power_${uk}` : null;
          if (vk) {
            const oldVal = Math.floor(vars[vk] as number);
            const newVal = oldVal + (delta as number);
            // Replace {var_key} placeholder with marked upgraded value
            description = description.replace(`{${vk}}`, `${UPG_MARK}${newVal}${UPG_END}`);
          }
        }
        // Resolve {VarName:energyIcons()} → [E] repeated
        description = description.replace(/\{(\w+):energyIcons\(\)\}/g, (_, varName) => {
          // Look up upgraded value: check if energy var was upgraded
          const key = varName.toLowerCase();
          const base = vars[key] as number ?? 1;
          const delta = (upg[key] as number) ?? 0;
          const n = Math.floor(base + delta);
          return '[E]'.repeat(Math.max(1, n));
        });
        // Resolve {energyPrefix:energyIcons(N)} → [E] or [N Energy]
        description = description.replace(/\{energyPrefix:energyIcons\((\d+)\)\}/g, (_, n) => {
          const num = parseInt(n);
          return num === 1 ? '[E]' : `[${num} Energy]`;
        });
        // Resolve {singleStarIcon} → [S]
        description = description.replace(/\{singleStarIcon\}/g, '[S]');
        // Resolve {VarName:diff()} → upgraded value (lookup var, apply delta)
        description = description.replace(/\{(\w+):diff\(\)\}/g, (full, varName) => {
          const snakeKey = varName.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
          const vk = snakeKey in vars ? snakeKey : `power_${snakeKey}` in vars ? `power_${snakeKey}` : null;
          if (vk) {
            const base = Math.floor(vars[vk] as number);
            const delta = (upg[vk] as number) ?? (upg[snakeKey] as number) ?? 0;
            const val = base + delta;
            return delta !== 0 ? `${UPG_MARK}${val}${UPG_END}` : String(val);
          }
          return full;
        });
        // Replace remaining {var_key} placeholders with base values
        description = description.replace(/\{([a-z_]+)\}/g, (_, key) => {
          return key in vars ? String(Math.floor(vars[key] as number)) : _;
        });
      } else {
        // Fallback: positional replacement for cards without template
        const numberPositions: { pos: number; len: number; val: number }[] = [];
        for (const m of description.matchAll(/(?<!\d)\d+(?!\d)/g)) {
          numberPositions.push({ pos: m.index!, len: m[0].length, val: parseInt(m[0]) });
        }
        const varOrder = Object.keys(vars);
        const usedPositions = new Set<number>();
        const varToPosition: Record<string, number> = {};
        for (const vk of varOrder) {
          const val = Math.floor(vars[vk] as number);
          for (const np of numberPositions) {
            if (np.val === val && !usedPositions.has(np.pos)) {
              varToPosition[vk] = np.pos;
              usedPositions.add(np.pos);
              break;
            }
          }
        }
        const positionReplacements: { pos: number; len: number; newVal: string }[] = [];
        for (const [uk, delta] of Object.entries(upg)) {
          if (['add_keywords', 'remove_keywords', 'energy', 'stars', 'description'].includes(uk)) continue;
          const vk = uk in vars ? uk : `power_${uk}` in vars ? `power_${uk}` : null;
          if (vk && vk in varToPosition) {
            const oldVal = Math.floor(vars[vk] as number);
            const newVal = oldVal + (delta as number);
            positionReplacements.push({ pos: varToPosition[vk], len: String(oldVal).length, newVal: String(newVal) });
            upgradedNumbers.add(String(newVal));
          }
        }
        positionReplacements.sort((a, b) => b.pos - a.pos);
        for (const r of positionReplacements) {
          description = description.slice(0, r.pos) + r.newVal + description.slice(r.pos + r.len);
        }
      }
      if (upg.energy && !template) {
        const added = '[E]'.repeat(upg.energy as number);
        const lastE = description.lastIndexOf('[E]');
        if (lastE >= 0) description = description.slice(0, lastE + 3) + added + description.slice(lastE + 3);
      }
      if (upg.stars && !template) {
        const added = '[S]'.repeat(upg.stars as number);
        const lastS = description.lastIndexOf('[S]');
        if (lastS >= 0) description = description.slice(0, lastS + 3) + added + description.slice(lastS + 3);
      }
    }
  }

  const highlightPattern = new RegExp(`\\b(${STS2_HIGHLIGHT_TERMS.join('|')})\\b`, 'g');

  let descProcessed = description
    .replace(/\x01(\d+)\x02/g, '<span class="cr-green">$1</span>')
    .replace(/\[E\]/g, `<img src="${inlineEnergy}" class="cr-icon" alt="Energy" />`)
    .replace(/\[S\]/g, `<img src="${inlineStar}" class="cr-icon" alt="Star" />`)
    .replace(highlightPattern, '<span class="cr-keyword">$1</span>')
    .replace(/\n/g, '<br>');

  // Template path uses marker-based highlighting; skip regex highlighting if markers were used
  const usedMarkers = descProcessed.includes('cr-green');
  if (upgraded && upgradedNumbers.size > 0 && !usedMarkers) {
    for (const num of upgradedNumbers) {
      // Only highlight numbers in text content, not inside HTML tags
      descProcessed = descProcessed.replace(
        new RegExp(`(^|>)([^<]*?)(?<!\\d)(${num})(?!\\d)`, 'g'),
        (_, prefix, before, n) => `${prefix}${before}<span class="cr-green">${n}</span>`
      );
    }
  }

  const typeLabel = t(card.type, locale);
  const scales: Record<string, number> = { xs: 0.25, sm: 0.4, md: 0.6, lg: 0.8 };
  const scale = scales[size] ?? 0.6;

  // Locale-aware font config
  const fontConfig = LOCALE_FONTS[locale] ?? LOCALE_FONTS['en'];
  const descMaxPx = Math.round(BASE_DESC_SIZE * fontConfig.scale * scale);
  const descMinPx = Math.round(MIN_DESC_SIZE * fontConfig.scale * scale);
  const titleMaxPx = Math.round(BASE_TITLE_SIZE * fontConfig.scale * scale);
  const titleMinPx = Math.round(BASE_TITLE_SIZE * 0.55 * fontConfig.scale * scale);

  // Auto-fit description and title
  const descHtml = (keywords.length > 0
    ? keywords.map((kw: string) => {
        const localizedKw = t(kw, locale);
        const isNew = upgraded && (card.upgrade?.add_keywords ?? []).includes(kw);
        return isNew ? `<span class="cr-green">${localizedKw}.</span>` : `<span class="cr-keyword">${localizedKw}.</span>`;
      }).join('<br/>') + '<br/>'
    : '') + descProcessed;

  const descFit = useAutoFit(descMaxPx, descMinPx, [descHtml, scale, locale]);
  const titleFit = useAutoFit(titleMaxPx, titleMinPx, [cardName, scale, locale]);

  return (
    <div className="cr" style={{ '--s': scale, '--locale-font': fontConfig.family } as React.CSSProperties}>
      <div className="cr-portrait-area">
        <img src={portrait} className="cr-portrait" alt="" loading="lazy" />
      </div>
      <img src={frameAsset} className="cr-frame" alt="" />
      <img src={borderAsset} className="cr-border" alt="" />
      <img src={plaqueAsset} className="cr-plaque" alt="" />
      <img src={bannerAsset} className="cr-banner" alt="" />
      {displayCost !== null && (
        <div className="cr-energy">
          <img src={energyOrb} className="cr-energy-orb" alt="" />
          <span className={`cr-energy-num${upgraded && card.upgrade?.cost != null && card.upgrade.cost !== card.cost ? ' cr-green' : ''}`}>{displayCost}</span>
        </div>
      )}
      {starCost !== null && (
        <div className="cr-star">
          <img src={inlineStar} className="cr-star-img" alt="" />
          <span className="cr-star-num">{starCost}</span>
        </div>
      )}
      <div
        ref={titleFit.containerRef}
        className={`cr-title${upgraded ? ' cr-green' : ''}`}
        style={{ WebkitTextStroke: `calc(7px * var(--s)) ${titleOutlineColor}` } as React.CSSProperties}
      >
        <span ref={titleFit.innerRef}>{cardName}</span>
      </div>
      <div className="cr-type">{typeLabel}</div>
      <div className="cr-desc" ref={descFit.containerRef}>
        <div ref={descFit.innerRef} className="cr-desc-inner" dangerouslySetInnerHTML={{ __html: descHtml }} />
      </div>
    </div>
  );
}
