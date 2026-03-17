import { useState, useEffect } from 'react';
import CssCardRenderer from './CssCardRenderer';

interface Props {
  card: any;
  hasUpgrade: boolean;
  game?: 'sts1' | 'sts2';
}

export default function CardImageToggle({ card, hasUpgrade, game = 'sts2' }: Props) {
  const [showUpgraded, setShowUpgraded] = useState(false);

  // Sync upgrade toggle state with server-rendered description/name elements
  useEffect(() => {
    const descBase = document.getElementById('desc-base');
    const descUpg = document.getElementById('desc-upgraded');
    const cardName = document.getElementById('card-name');
    const costBadge = document.getElementById('cost-badge');

    if (showUpgraded) {
      descBase?.classList.add('hidden');
      descUpg?.classList.remove('hidden');
      if (cardName) { cardName.textContent = card.name + '+'; cardName.classList.add('text-emerald-400'); }
      if (costBadge) {
        const span = costBadge.querySelector('span');
        const upg = card.upgrade;
        if (span && upg?.cost_change != null) {
          const newCost = Math.max(0, (card.cost ?? 0) + upg.cost_change);
          span.textContent = 'Cost ' + newCost;
          span.classList.remove('bg-white/10', 'text-slate-200', 'ring-white/10');
          span.classList.add('bg-emerald-500/15', 'text-emerald-300', 'ring-emerald-500/30');
        }
      }
    } else {
      descBase?.classList.remove('hidden');
      descUpg?.classList.add('hidden');
      if (cardName) { cardName.textContent = card.name; cardName.classList.remove('text-emerald-400'); }
      if (costBadge) {
        const span = costBadge.querySelector('span');
        if (span) {
          span.textContent = 'Cost ' + (card.cost ?? '—');
          span.classList.remove('bg-emerald-500/15', 'text-emerald-300', 'ring-emerald-500/30');
          span.classList.add('bg-white/10', 'text-slate-200', 'ring-white/10');
        }
      }
    }
  }, [showUpgraded, card]);

  return (
    <div className="flex flex-col items-center gap-3 shrink-0 max-w-sm">
      <CssCardRenderer card={card} upgraded={showUpgraded} size="md" game={game} />
      {hasUpgrade && (
        <div className="inline-flex rounded-lg border border-white/10 overflow-hidden text-sm font-medium">
          <button
            onClick={() => setShowUpgraded(false)}
            className={`px-4 py-1.5 transition-colors ${!showUpgraded ? 'bg-white/10 text-white' : 'bg-transparent text-slate-400 hover:text-slate-200'}`}
          >Base</button>
          <button
            onClick={() => setShowUpgraded(true)}
            className={`px-4 py-1.5 transition-colors ${showUpgraded ? 'bg-white/10 text-white' : 'bg-transparent text-slate-400 hover:text-slate-200'}`}
          >Upgraded</button>
        </div>
      )}
    </div>
  );
}
