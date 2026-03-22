export type PageGame = 'sts1' | 'sts2';

export function getPageGame(params: Record<string, string | undefined>): PageGame | null {
  const game = params.game;
  return game === 'sts1' || game === 'sts2' ? game : null;
}
