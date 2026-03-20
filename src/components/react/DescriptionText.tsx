import React from 'react';

const ENERGY_ICON_MAP: Record<string, string> = {
  ironclad: '/images/sts2/cardui/ironclad_energy_icon.png',
  silent: '/images/sts2/cardui/silent_energy_icon.png',
  defect: '/images/sts2/cardui/defect_energy_icon.png',
  necrobinder: '/images/sts2/cardui/necrobinder_energy_icon.png',
  regent: '/images/sts2/cardui/regent_energy_icon.png',
  colorless: '/images/sts2/cardui/colorless_energy_icon.png',
};

const DEFAULT_ICON = '/images/sts2/cardui/colorless_energy_icon.png';

function getIconSrc(color?: string): string {
  return ENERGY_ICON_MAP[color?.toLowerCase() ?? 'colorless'] ?? DEFAULT_ICON;
}

interface Props {
  text: string;
  color?: string;
  className?: string;
}

/**
 * Renders text with [E] replaced by inline energy icons and [S] replaced by ⭐.
 * Also handles [N Energy] patterns.
 */
export default function DescriptionText({ text, color, className }: Props) {
  if (!text) return null;
  
  // Split on [E], [N Energy], [S] tokens
  const parts: (string | React.ReactNode)[] = [];
  const regex = /\[E\]|\[\d+\s+Energy\]|\[S\]/g;
  let lastIndex = 0;
  let match;
  let key = 0;
  
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token === '[E]') {
      parts.push(
        <img key={key++} src={getIconSrc(color)} alt="Energy" className="inline-block h-5 w-5 align-text-bottom" />
      );
    } else if (token === '[S]') {
      parts.push(
        <img key={key++} src="/images/sts2/cardui/star_icon.png" alt="Star" className="inline-block h-5 w-5 align-text-bottom" />
      );
    } else {
      // [N Energy]
      const n = token.match(/\[(\d+)\s+Energy\]/)?.[1];
      parts.push(n);
      parts.push(
        <img key={key++} src={getIconSrc(color)} alt="Energy" className="inline-block h-5 w-5 align-text-bottom" />
      );
    }
    lastIndex = match.index + token.length;
  }
  
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  
  return <span className={className}>{parts}</span>;
}
