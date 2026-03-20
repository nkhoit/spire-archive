/**
 * Maps card color / character to energy icon path.
 * Uses 24x24 icons for inline display.
 */
const ENERGY_ICON_MAP: Record<string, string> = {
  ironclad: '/images/sts2/cardui/ironclad_energy_icon.png',
  silent: '/images/sts2/cardui/silent_energy_icon.png',
  defect: '/images/sts2/cardui/defect_energy_icon.png',
  necrobinder: '/images/sts2/cardui/necrobinder_energy_icon.png',
  regent: '/images/sts2/cardui/regent_energy_icon.png',
  colorless: '/images/sts2/cardui/colorless_energy_icon.png',
};

const DEFAULT_ICON = '/images/sts2/cardui/colorless_energy_icon.png';

const ICON_HTML_CACHE: Record<string, string> = {};

/** Returns an inline <img> tag for the energy icon matching the given color */
export function energyIconHtml(color?: string): string {
  const key = color?.toLowerCase() ?? 'colorless';
  if (ICON_HTML_CACHE[key]) return ICON_HTML_CACHE[key];
  const src = ENERGY_ICON_MAP[key] ?? DEFAULT_ICON;
  const html = `<img src="${src}" alt="Energy" class="inline-block h-5 w-5 align-text-bottom" />`;
  ICON_HTML_CACHE[key] = html;
  return html;
}

/** Returns the icon path for a given color */
export function energyIconPath(color?: string): string {
  const key = color?.toLowerCase() ?? 'colorless';
  return ENERGY_ICON_MAP[key] ?? DEFAULT_ICON;
}

/** Replaces [E] tokens in text with energy icon HTML. Also handles [N Energy] patterns. */
export function replaceEnergyTokens(html: string, color?: string): string {
  const icon = energyIconHtml(color);
  // [E] → single icon
  html = html.replace(/\[E\]/g, icon);
  // [N Energy] → N + icon (e.g., "[2 Energy]" → "2 ⚡")
  html = html.replace(/\[(\d+)\s+Energy\]/g, (_, n) => `${n}${icon}`);
  return html;
}

/** Replaces both [E]/[N Energy] and [S] tokens with inline icons */
export function replaceGameTokens(html: string, color?: string): string {
  return replaceStarTokens(replaceEnergyTokens(html, color));
}
export function replaceStarTokens(html: string): string {
  return html.replace(/\[S\]/g, '<img src="/images/sts2/cardui/star_icon.png" alt="Star" class="inline-block h-5 w-5 align-text-bottom" />');
}
