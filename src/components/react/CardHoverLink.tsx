import { useCallback, useEffect, useRef, createContext, useContext, useState } from 'react';
import { createPortal } from 'react-dom';
import CssCardRenderer from './CssCardRenderer';

interface HoverState {
  card: any;
  game: 'sts1' | 'sts2';
  locale?: string;
  x: number;
  y: number;
}

const HoverCtx = createContext<{
  show: (state: HoverState) => void;
  hide: () => void;
} | null>(null);

function HoverPortal() {
  const [state, setState] = useState<HoverState | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) {
      const el = document.createElement('div');
      el.id = 'card-hover-portal';
      document.body.appendChild(el);
      ref.current = el;
    }
    return () => { ref.current?.remove(); };
  }, []);

  const ctx = useContext(HoverCtx);
  // This component is rendered inside the provider, so we wire via ref
  useEffect(() => {
    (window as any).__cardHoverShow = setState;
    (window as any).__cardHoverHide = () => setState(null);
    return () => {
      delete (window as any).__cardHoverShow;
      delete (window as any).__cardHoverHide;
    };
  }, []);

  if (!state || !ref.current) return null;
  return createPortal(
    <div
      className="fixed z-50 pointer-events-none hidden md:block"
      style={{ left: `${state.x}px`, top: `${state.y}px` }}
    >
      <CssCardRenderer card={state.card} game={state.game} size="sm" locale={state.locale} />
    </div>,
    ref.current,
  );
}

// Singleton portal – mounts once
let portalMounted = false;

function ensurePortal() {
  if (portalMounted || typeof document === 'undefined') return;
  portalMounted = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  // Lazy import to avoid SSR issues
  import('react-dom/client').then(({ createRoot }) => {
    createRoot(container).render(<HoverPortal />);
  });
}

interface Props {
  href: string;
  card: any;
  game: 'sts1' | 'sts2';
  locale?: string;
  children: React.ReactNode;
  className?: string;
}

export default function CardHoverLink({ href, card, game, locale, children, className }: Props) {
  useEffect(() => { ensurePortal(); }, []);

  const handleEnter = useCallback((e: React.MouseEvent) => {
    const cardW = 200, cardH = 280;
    const mx = e.clientX, my = e.clientY;
    const flipLeft = mx + cardW + 24 > window.innerWidth;
    const x = flipLeft ? mx - cardW - 16 : mx + 16;
    const y = my + cardH > window.innerHeight ? Math.max(8, window.innerHeight - cardH - 8) : my;
    (window as any).__cardHoverShow?.({ card, game, locale, x, y });
  }, [card, game, locale]);

  const handleLeave = useCallback(() => {
    (window as any).__cardHoverHide?.();
  }, []);

  return (
    <a
      href={href}
      className={className}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {children}
    </a>
  );
}
