import './CssCardRenderer.css';

export interface CssCardRendererProps {
  card: any;
  upgraded?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  game?: 'sts1' | 'sts2';
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
}: CssCardRendererProps) {
  if (game === 'sts1') {
    return <Sts1Renderer card={card} upgraded={upgraded} size={size} />;
  }
  return <Sts2Renderer card={card} upgraded={upgraded} size={size} />;
}

// ─── STS1 Renderer ───────────────────────────────────────────────────────────

function Sts1Renderer({ card, upgraded, size }: { card: any; upgraded: boolean; size: string }) {
  const cardType = (card.type ?? 'Skill').toLowerCase();
  const cardColor = (card.color ?? 'colorless').toLowerCase();

  const assetColor = COLOR_MAP[cardColor] ?? 'colorless';
  const frameType = ['curse', 'status'].includes(cardType) ? 'skill' : cardType;
  const rarity = (card.rarity ?? 'Common').toLowerCase();
  const assetRarity = ['common', 'uncommon', 'rare'].includes(rarity) ? rarity : 'common';

  const bgAsset = `/images/cardui/bg_${frameType}_${assetColor}.png`;
  const frameAsset = `/images/cardui/frame_${frameType}_${assetRarity}.png`;
  const bannerAsset = `/images/cardui/banner_${assetRarity}.png`;
  const trimLeft = `/images/cardui/${assetRarity}_left.png`;
  const trimCenter = `/images/cardui/${assetRarity}_center.png`;
  const trimRight = `/images/cardui/${assetRarity}_right.png`;

  const orbColor = ORB_COLOR_MAP[assetColor] ?? 'colorless';
  const orbAsset = `/images/cardui/card_${orbColor}_orb.png`;

  const portrait = `/images/cards/${card.id.toLowerCase()}.png`;

  const isCurseOrStatus = ['curse', 'status'].includes(cardType);
  let displayCost: number | null = card.cost ?? null;
  const upgradedCost = upgraded && card.upgrade?.cost !== undefined ? card.upgrade.cost : undefined;
  const costChanged = upgradedCost !== undefined && upgradedCost !== card.cost;
  if (upgraded && upgradedCost !== undefined) displayCost = upgradedCost;

  const cardName = upgraded ? card.name + '+' : card.name;
  const longName = cardName.length > 14;

  let description: string = card.description ?? '';
  if (upgraded && card.upgrade?.description) description = card.upgrade.description;

  const inlineOrbMap: Record<string, string> = {
    R: `/images/cardui/card_red_orb.png`,
    G: `/images/cardui/card_green_orb.png`,
    B: `/images/cardui/card_blue_orb.png`,
    E: `/images/cardui/card_colorless_orb.png`,
    W: `/images/cardui/card_purple_orb.png`,
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

function Sts2Renderer({ card, upgraded, size }: { card: any; upgraded: boolean; size: string }) {
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

  let displayCost: number | null = card.cost ?? null;
  if (upgraded && card.upgrade?.cost_change) {
    displayCost = Math.max(0, (card.cost ?? 0) + card.upgrade.cost_change);
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
    } else {
      const vars = { ...(card.vars ?? {}) };
      const replacements: [number, number][] = [];
      for (const [uk, delta] of Object.entries(upg)) {
        if (['add_keywords', 'remove_keywords', 'cost_change', 'energy', 'stars', 'description'].includes(uk)) continue;
        const vk = uk in vars ? uk : `power_${uk}` in vars ? `power_${uk}` : null;
        if (vk) {
          const oldVal = Math.floor(vars[vk] as number);
          const newVal = oldVal + (delta as number);
          replacements.push([oldVal, newVal]);
        }
      }
      replacements.sort((a, b) => b[0] - a[0]);
      for (const [oldVal, newVal] of replacements) {
        description = description.replace(new RegExp(`(?<!\\d)${oldVal}(?!\\d)`), String(newVal));
        upgradedNumbers.add(String(newVal));
      }
      if (upg.energy) {
        const added = '[E]'.repeat(upg.energy as number);
        const lastE = description.lastIndexOf('[E]');
        if (lastE >= 0) description = description.slice(0, lastE + 3) + added + description.slice(lastE + 3);
      }
      if (upg.stars) {
        const added = '[S]'.repeat(upg.stars as number);
        const lastS = description.lastIndexOf('[S]');
        if (lastS >= 0) description = description.slice(0, lastS + 3) + added + description.slice(lastS + 3);
      }
    }
  }

  const highlightPattern = new RegExp(`\\b(${STS2_HIGHLIGHT_TERMS.join('|')})\\b`, 'g');

  let descProcessed = description
    .replace(/\[E\]/g, `<img src="${inlineEnergy}" class="cr-icon" alt="Energy" />`)
    .replace(/\[S\]/g, `<img src="${inlineStar}" class="cr-icon" alt="Star" />`)
    .replace(highlightPattern, '<span class="cr-keyword">$1</span>')
    .replace(/\n/g, '<br>');

  if (upgraded && upgradedNumbers.size > 0) {
    for (const num of upgradedNumbers) {
      descProcessed = descProcessed.replace(
        new RegExp(`(?<!\\d)${num}(?!\\d)`, 'g'),
        `<span class="cr-green">${num}</span>`
      );
    }
  }

  const typeLabel = card.type;
  const scales: Record<string, number> = { xs: 0.25, sm: 0.4, md: 0.6, lg: 0.8 };
  const scale = scales[size] ?? 0.6;

  return (
    <div className="cr" style={{ '--s': scale } as React.CSSProperties}>
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
          <span className={`cr-energy-num${upgraded && card.upgrade?.cost_change ? ' cr-green' : ''}`}>{displayCost}</span>
        </div>
      )}
      {starCost !== null && (
        <div className="cr-star">
          <img src={inlineStar} className="cr-star-img" alt="" />
          <span className="cr-star-num">{starCost}</span>
        </div>
      )}
      <div
        className={`cr-title${upgraded ? ' cr-green' : ''}`}
        style={{ WebkitTextStroke: `calc(7px * var(--s)) ${titleOutlineColor}` } as React.CSSProperties}
      >
        {cardName}
      </div>
      <div className="cr-type">{typeLabel}</div>
      <div className="cr-desc">
        <div className="cr-desc-inner" dangerouslySetInnerHTML={{ __html: descProcessed }} />
      </div>
      {keywords.length > 0 && (
        <div className="cr-keywords">
          {keywords.map((kw: string) => (
            <span
              key={kw}
              className={`cr-kw${upgraded && (card.upgrade?.add_keywords ?? []).includes(kw) ? ' cr-kw-new' : ''}`}
            >
              {kw}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
