import './CssCardRenderer.css';

export interface CssCardRendererProps {
  card: any;
  upgraded?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function CssCardRenderer({ card, upgraded = false, size = 'md' }: CssCardRendererProps) {
  const cardType = (card.type ?? 'Skill').toLowerCase();
  const cardColor = card.color ?? 'colorless';

  const frameType = (['curse', 'status'].includes(cardType)) ? 'skill' : cardType;
  const borderType = (['curse', 'status', 'quest'].includes(cardType)) ? 'skill' : (['attack', 'power'].includes(cardType) ? cardType : 'skill');

  const frameAsset = `/images/sts2/cardui/frames/${cardColor}_${frameType}.png`;
  const rarity = (card.rarity ?? 'Common').toLowerCase();
  const borderAsset = `/images/sts2/cardui/frames/border_${rarity}_${borderType}.png`;
  const bannerAsset = `/images/sts2/cardui/frames/banner_${rarity}.png`;
  const plaqueAsset = `/images/sts2/cardui/frames/plaque_${rarity}.png`;

  const titleOutlineColors: Record<string, string> = {
    common: '#4D4B40',
    basic: '#4D4B40',
    uncommon: '#005C75',
    rare: '#6B4B00',
    curse: '#550B9E',
    quest: '#7E3E15',
    status: '#4F522F',
    special: '#1B6131',
  };
  const titleOutlineColor = titleOutlineColors[rarity] ?? '#4D4B40';

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

  const highlightTerms = [
    'Vulnerable', 'Weak', 'Strength', 'Dexterity', 'Block', 'Thorns',
    'Innate', 'Ethereal', 'Exhaust', 'Retain', 'Sly', 'Eternal',
    'Wound', 'Burn', 'Daze', 'Slimed', 'Void',
    'Poison', 'Focus', 'Frost', 'Lightning', 'Dark', 'Plasma',
    'Scry', 'Mantra', 'Stance', 'Wrath', 'Calm', 'Divinity',
    'Fragile', 'Summon', 'Forge', 'Hex', 'Ritual', 'Vigor',
    'Intangible', 'Artifact', 'Plated Armor', 'Metallicize',
    'Shiv', 'Shivs',
  ];
  const highlightPattern = new RegExp(`\\b(${highlightTerms.join('|')})\\b`, 'g');

  let descProcessed = description
    .replace(/\[E\]/g, `<img src="${inlineEnergy}" class="cr-icon" alt="Energy" />`)
    .replace(/\[S\]/g, `<img src="${inlineStar}" class="cr-icon" alt="Star" />`)
    .replace(highlightPattern, '<span class="cr-keyword">$1</span>')
    .replace(/\n/g, '<br>');

  // Highlight upgraded numbers in green
  if (upgraded && upgradedNumbers.size > 0) {
    for (const num of upgradedNumbers) {
      descProcessed = descProcessed.replace(
        new RegExp(`(?<!\\d)${num}(?!\\d)`, 'g'),
        `<span class="cr-green">${num}</span>`
      );
    }
  }

  const descHtml = descProcessed;

  const typeLabel = card.type;

  const scales: Record<string, number> = { sm: 0.4, md: 0.6, lg: 0.8 };
  const scale = scales[size] ?? 0.6;

  return (
    <div className="cr" style={{ '--s': scale } as React.CSSProperties}>
      {/* Layer 1: Portrait art (bottom) */}
      <div className="cr-portrait-area">
        <img src={portrait} className="cr-portrait" alt="" loading="lazy" />
      </div>

      {/* Layer 2: Frame (on top of portrait) */}
      <img src={frameAsset} className="cr-frame" alt="" />

      {/* Layer 3: Portrait border (on top of frame) */}
      <img src={borderAsset} className="cr-border" alt="" />

      {/* Layer 3b: Type plaque (centered below portrait) */}
      <img src={plaqueAsset} className="cr-plaque" alt="" />

      {/* Layer 4: Banner */}
      <img src={bannerAsset} className="cr-banner" alt="" />

      {/* Energy orb: top-left, overlapping frame edge */}
      {displayCost !== null && (
        <div className="cr-energy">
          <img src={energyOrb} className="cr-energy-orb" alt="" />
          <span className={`cr-energy-num${upgraded && card.upgrade?.cost_change ? ' cr-green' : ''}`}>{displayCost}</span>
        </div>
      )}

      {/* Star cost (Regent): below energy orb */}
      {starCost !== null && (
        <div className="cr-star">
          <img src={inlineStar} className="cr-star-img" alt="" />
          <span className="cr-star-num">{starCost}</span>
        </div>
      )}

      {/* Title text: on the banner */}
      <div
        className={`cr-title${upgraded ? ' cr-green' : ''}`}
        style={{ WebkitTextStroke: `calc(7px * var(--s)) ${titleOutlineColor}` } as React.CSSProperties}
      >
        {cardName}
      </div>

      {/* Type/rarity plaque: small centered area below portrait */}
      <div className="cr-type">{typeLabel}</div>

      {/* Description */}
      <div className="cr-desc">
        <div className="cr-desc-inner" dangerouslySetInnerHTML={{ __html: descHtml }} />
      </div>

      {/* Keywords at bottom */}
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
