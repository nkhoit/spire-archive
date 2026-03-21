import { useState, useEffect, useCallback, useRef } from 'react';
import CssCardRenderer from './CssCardRenderer';
import './CardTuning.css';

const LOCALES = ['en', 'ja', 'ko', 'zh', 'de', 'fr', 'es', 'pt', 'it', 'pl', 'ru', 'tr', 'th'];
const CARD_TYPES = ['All', 'Attack', 'Skill', 'Power', 'Regent (★)'] as const;
const SIZES = ['xs', 'sm', 'md', 'lg'] as const;

interface TuningOverrides {
  // Title
  titleFontSize: number;
  titleTop: number;
  titleFontFamily: string;
  // Description
  descFontSize: number;
  descTop: number;
  descHeight: number;
  descLeft: number;
  descWidth: number;
  descLineHeight: number;
  descFontFamily: string;
  // Type label
  typeFontSize: number;
  typeTop: number;
  // Energy
  energyFontSize: number;
  // Star
  starTop: number;
  starLeft: number;
  starWidth: number;
  starHeight: number;
  starFontSize: number;
  starStrokeWidth: number;
  starStrokeColor: string;
}

const DEFAULTS: TuningOverrides = {
  titleFontSize: 60,
  titleTop: 6.5,
  titleFontFamily: "'KreonGame', 'Kreon', serif",
  descFontSize: 43,
  descTop: 59.6,
  descHeight: 30.8,
  descLeft: 14.1,
  descWidth: 71.5,
  descLineHeight: 1.0,
  descFontFamily: "'KreonGame', 'Kreon', serif",
  typeFontSize: 30,
  typeTop: 52.5,
  energyFontSize: 78,
  starTop: 11,
  starLeft: -1,
  starWidth: 21,
  starHeight: 17,
  starFontSize: 52,
  starStrokeWidth: 10,
  starStrokeColor: 'rgba(77, 74, 67, 0.86)',
};

const FONT_OPTIONS = [
  "'KreonGame', 'Kreon', serif",
  "'Noto Sans JP', sans-serif",
  "'Noto Sans KR', sans-serif",
  "'Noto Sans SC', sans-serif",
  "system-ui, sans-serif",
  "serif",
  "monospace",
];

function Slider({ label, value, onChange, min, max, step = 1, unit = '' }: {
  label: string; value: number; onChange: (v: number) => void;
  min: number; max: number; step?: number; unit?: string;
}) {
  return (
    <div className="tune-row">
      <label>{label}</label>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(parseFloat(e.target.value))} />
      <span className="tune-val">{value}{unit}</span>
    </div>
  );
}

function FontSelect({ label, value, onChange }: {
  label: string; value: string; onChange: (v: string) => void;
}) {
  return (
    <div className="tune-row">
      <label>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)}>
        {FONT_OPTIONS.map(f => <option key={f} value={f}>{f.split(',')[0].replace(/'/g, '')}</option>)}
      </select>
    </div>
  );
}

export default function CardTuning() {
  const [cards, setCards] = useState<any[]>([]);
  const [locale, setLocale] = useState('en');
  const [typeFilter, setTypeFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [upgraded, setUpgraded] = useState(false);
  const [size, setSize] = useState<typeof SIZES[number]>('md');
  const [overrides, setOverrides] = useState<TuningOverrides>({ ...DEFAULTS });
  const [perLocale, setPerLocale] = useState<Record<string, Partial<TuningOverrides>>>({});
  const styleRef = useRef<HTMLStyleElement | null>(null);

  // Load cards for selected locale
  useEffect(() => {
    fetch(`/api/sts2/cards?lang=${locale}&limit=600`)
      .then(r => r.json())
      .then(d => { setCards(d.items ?? []); setSelectedIdx(0); });
  }, [locale]);

  // Apply CSS overrides via dynamic style tag
  useEffect(() => {
    if (!styleRef.current) {
      styleRef.current = document.createElement('style');
      styleRef.current.id = 'tuning-overrides';
      document.head.appendChild(styleRef.current);
    }
    const o = overrides;
    styleRef.current.textContent = `
      .tune-preview .cr-title {
        font-size: calc(${o.titleFontSize}px * var(--s)) !important;
        top: ${o.titleTop}% !important;
        font-family: ${o.titleFontFamily} !important;
      }
      .tune-preview .cr-desc {
        font-size: calc(${o.descFontSize}px * var(--s)) !important;
        top: ${o.descTop}% !important;
        height: ${o.descHeight}% !important;
        left: ${o.descLeft}% !important;
        width: ${o.descWidth}% !important;
        line-height: ${o.descLineHeight} !important;
        font-family: ${o.descFontFamily} !important;
      }
      .tune-preview .cr-type {
        font-size: calc(${o.typeFontSize}px * var(--s)) !important;
        top: ${o.typeTop}% !important;
      }
      .tune-preview .cr-energy-num {
        font-size: calc(${o.energyFontSize}px * var(--s)) !important;
      }
      .tune-preview .cr-star {
        top: ${o.starTop}% !important;
        left: ${o.starLeft}% !important;
        width: ${o.starWidth}% !important;
        height: ${o.starHeight}% !important;
      }
      .tune-preview .cr-star-num {
        font-size: calc(${o.starFontSize}px * var(--s)) !important;
        -webkit-text-stroke: calc(${o.starStrokeWidth}px * var(--s)) ${o.starStrokeColor} !important;
      }
    `;
    return () => {
      if (styleRef.current) {
        styleRef.current.textContent = '';
      }
    };
  }, [overrides]);

  const filtered = cards.filter(c => {
    if (typeFilter === 'Regent (★)') {
      if (!c.star_cost) return false;
    } else if (typeFilter !== 'All' && c.type !== typeFilter) return false;
    if (search && !c.name.toLowerCase().includes(search.toLowerCase()) && !c.id.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const card = filtered[selectedIdx] ?? filtered[0];

  const updateOverride = useCallback(<K extends keyof TuningOverrides>(key: K, val: TuningOverrides[K]) => {
    setOverrides(prev => ({ ...prev, [key]: val }));
  }, []);

  const resetAll = () => setOverrides({ ...DEFAULTS });

  const saveForLocale = () => {
    setPerLocale(prev => ({ ...prev, [locale]: { ...overrides } }));
  };

  const loadForLocale = (loc: string) => {
    if (perLocale[loc]) {
      setOverrides({ ...DEFAULTS, ...perLocale[loc] });
    }
  };

  const exportConfig = () => {
    const config = { defaults: DEFAULTS, perLocale, current: overrides };
    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'card-tuning.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const importConfig = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;
      const text = await file.text();
      try {
        const config = JSON.parse(text);
        if (config.current) setOverrides({ ...DEFAULTS, ...config.current });
        if (config.perLocale) setPerLocale(config.perLocale);
      } catch (e) {
        alert('Invalid config file');
      }
    };
    input.click();
  };

  return (
    <div className="tuning-page">
      <div className="tune-sidebar">
        <h2>Card Tuning</h2>

        {/* Card Selection */}
        <fieldset>
          <legend>Card Selection</legend>
          <div className="tune-row">
            <label>Locale</label>
            <select value={locale} onChange={e => { setLocale(e.target.value); loadForLocale(e.target.value); }}>
              {LOCALES.map(l => <option key={l} value={l}>{l.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="tune-row">
            <label>Type</label>
            <select value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setSelectedIdx(0); }}>
              {CARD_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="tune-row">
            <label>Search</label>
            <input type="text" value={search} placeholder="Name or ID..."
              onChange={e => { setSearch(e.target.value); setSelectedIdx(0); }} />
          </div>
          <div className="tune-row">
            <label>Card</label>
            <select value={selectedIdx} onChange={e => setSelectedIdx(parseInt(e.target.value))}
              style={{ maxWidth: 200 }}>
              {filtered.map((c, i) => (
                <option key={c.id} value={i}>{c.name} ({c.id})</option>
              ))}
            </select>
          </div>
          <div className="tune-row">
            <label>
              <input type="checkbox" checked={upgraded} onChange={e => setUpgraded(e.target.checked)} />
              {' '}Upgraded
            </label>
          </div>
          <div className="tune-row">
            <label>Size</label>
            <select value={size} onChange={e => setSize(e.target.value as any)}>
              {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
        </fieldset>

        {/* Title Tuning */}
        <fieldset>
          <legend>Title</legend>
          <Slider label="Font Size" value={overrides.titleFontSize} onChange={v => updateOverride('titleFontSize', v)} min={20} max={100} unit="px" />
          <Slider label="Top %" value={overrides.titleTop} onChange={v => updateOverride('titleTop', v)} min={0} max={20} step={0.1} unit="%" />
          <FontSelect label="Font" value={overrides.titleFontFamily} onChange={v => updateOverride('titleFontFamily', v)} />
        </fieldset>

        {/* Description Tuning */}
        <fieldset>
          <legend>Description</legend>
          <Slider label="Font Size" value={overrides.descFontSize} onChange={v => updateOverride('descFontSize', v)} min={20} max={80} unit="px" />
          <Slider label="Line Height" value={overrides.descLineHeight} onChange={v => updateOverride('descLineHeight', v)} min={0.6} max={2.0} step={0.05} />
          <Slider label="Top %" value={overrides.descTop} onChange={v => updateOverride('descTop', v)} min={50} max={75} step={0.1} unit="%" />
          <Slider label="Height %" value={overrides.descHeight} onChange={v => updateOverride('descHeight', v)} min={15} max={45} step={0.1} unit="%" />
          <Slider label="Left %" value={overrides.descLeft} onChange={v => updateOverride('descLeft', v)} min={5} max={25} step={0.1} unit="%" />
          <Slider label="Width %" value={overrides.descWidth} onChange={v => updateOverride('descWidth', v)} min={50} max={90} step={0.1} unit="%" />
          <FontSelect label="Font" value={overrides.descFontFamily} onChange={v => updateOverride('descFontFamily', v)} />
        </fieldset>

        {/* Type Label Tuning */}
        <fieldset>
          <legend>Type Label</legend>
          <Slider label="Font Size" value={overrides.typeFontSize} onChange={v => updateOverride('typeFontSize', v)} min={15} max={50} unit="px" />
          <Slider label="Top %" value={overrides.typeTop} onChange={v => updateOverride('typeTop', v)} min={45} max={60} step={0.1} unit="%" />
        </fieldset>

        {/* Energy */}
        <fieldset>
          <legend>Energy</legend>
          <Slider label="Font Size" value={overrides.energyFontSize} onChange={v => updateOverride('energyFontSize', v)} min={40} max={120} unit="px" />
        </fieldset>

        {/* Star */}
        <fieldset>
          <legend>Star Icon</legend>
          <Slider label="Top %" value={overrides.starTop} onChange={v => updateOverride('starTop', v)} min={-5} max={25} step={0.1} unit="%" />
          <Slider label="Left %" value={overrides.starLeft} onChange={v => updateOverride('starLeft', v)} min={-10} max={20} step={0.1} unit="%" />
          <Slider label="Width %" value={overrides.starWidth} onChange={v => updateOverride('starWidth', v)} min={10} max={35} step={0.1} unit="%" />
          <Slider label="Height %" value={overrides.starHeight} onChange={v => updateOverride('starHeight', v)} min={5} max={30} step={0.1} unit="%" />
          <Slider label="Font Size" value={overrides.starFontSize} onChange={v => updateOverride('starFontSize', v)} min={20} max={80} unit="px" />
          <Slider label="Stroke Width" value={overrides.starStrokeWidth} onChange={v => updateOverride('starStrokeWidth', v)} min={0} max={20} step={0.5} unit="px" />
        </fieldset>

        {/* Actions */}
        <fieldset>
          <legend>Actions</legend>
          <div className="tune-actions">
            <button onClick={resetAll}>Reset to Defaults</button>
            <button onClick={saveForLocale}>Save for {locale.toUpperCase()}</button>
            <button onClick={exportConfig}>Export JSON</button>
            <button onClick={importConfig}>Import JSON</button>
          </div>
          {Object.keys(perLocale).length > 0 && (
            <div className="tune-saved">
              Saved: {Object.keys(perLocale).map(l => l.toUpperCase()).join(', ')}
            </div>
          )}
        </fieldset>

        {/* Live CSS output */}
        <fieldset>
          <legend>CSS Output</legend>
          <pre className="tune-css">{`.cr-title { font-size: calc(${overrides.titleFontSize}px * var(--s)); top: ${overrides.titleTop}%; font-family: ${overrides.titleFontFamily}; }
.cr-desc { font-size: calc(${overrides.descFontSize}px * var(--s)); line-height: ${overrides.descLineHeight}; top: ${overrides.descTop}%; height: ${overrides.descHeight}%; left: ${overrides.descLeft}%; width: ${overrides.descWidth}%; font-family: ${overrides.descFontFamily}; }
.cr-type { font-size: calc(${overrides.typeFontSize}px * var(--s)); top: ${overrides.typeTop}%; }
.cr-energy-num { font-size: calc(${overrides.energyFontSize}px * var(--s)); }
.cr-star { top: ${overrides.starTop}%; left: ${overrides.starLeft}%; width: ${overrides.starWidth}%; height: ${overrides.starHeight}%; }
.cr-star-num { font-size: calc(${overrides.starFontSize}px * var(--s)); -webkit-text-stroke: calc(${overrides.starStrokeWidth}px * var(--s)) ${overrides.starStrokeColor}; }`}</pre>
        </fieldset>
      </div>

      <div className="tune-main">
        {/* Card navigation */}
        <div className="tune-nav">
          <button disabled={selectedIdx <= 0} onClick={() => setSelectedIdx(i => i - 1)}>← Prev</button>
          <span>{card ? `${card.name} (${card.id})` : 'No card'} — {selectedIdx + 1}/{filtered.length}</span>
          <button disabled={selectedIdx >= filtered.length - 1} onClick={() => setSelectedIdx(i => i + 1)}>Next →</button>
        </div>

        {/* Card preview */}
        <div className="tune-preview">
          {card && <CssCardRenderer card={card} upgraded={upgraded} size={size} game="sts2" locale={locale} />}
        </div>

        {/* Multi-card grid for comparison */}
        <div className="tune-grid">
          {filtered.slice(Math.max(0, selectedIdx - 2), selectedIdx + 6).map((c, i) => (
            <div key={c.id} className={`tune-grid-item ${c.id === card?.id ? 'active' : ''}`}
              onClick={() => setSelectedIdx(filtered.indexOf(c))}>
              <CssCardRenderer card={c} upgraded={upgraded} size="xs" game="sts2" locale={locale} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
