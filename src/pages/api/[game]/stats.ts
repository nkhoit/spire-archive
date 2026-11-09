import type { APIRoute } from 'astro';
import { getPeriodSegments } from '../../../lib/stats';
import { getGame, getString, jsonResponse, notFoundResponse } from '../_util';

export const GET: APIRoute = async ({ params, url }) => {
  if (getGame(params) !== 'sts1') return notFoundResponse();
  const segments = await getPeriodSegments(getString(url, 'period') ?? 'all');
  if (!segments) return notFoundResponse();

  const key = `${getString(url, 'character') ?? 'all'}|${getString(url, 'ascension') ?? 'all'}`;
  // Thin combinations (no runs at all) simply have no segment.
  return jsonResponse(segments[key] ?? null);
};
