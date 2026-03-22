import { useState, useRef, useCallback } from 'react';
import CssCardRenderer from './CssCardRenderer';

interface Props {
  href: string;
  card: any;
  game: 'sts1' | 'sts2';
  locale?: string;
  children: React.ReactNode;
  className?: string;
}

export default function CardHoverLink({ href, card, game, locale, children, className }: Props) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState<{ x: number; y: number; flipLeft: boolean; flipUp: boolean }>({ x: 0, y: 0, flipLeft: false, flipUp: false });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleEnter = useCallback((e: React.MouseEvent) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const cardW = 200, cardH = 280;
    const flipLeft = rect.right + cardW + 16 > window.innerWidth;
    const flipUp = rect.top + cardH > window.innerHeight;
    setPos({
      x: flipLeft ? rect.left - cardW - 8 : rect.right + 8,
      y: flipUp ? Math.max(8, rect.bottom - cardH) : rect.top,
      flipLeft,
      flipUp,
    });
    setShow(true);
  }, []);

  const handleLeave = useCallback(() => {
    timeoutRef.current = setTimeout(() => setShow(false), 100);
  }, []);

  return (
    <>
      <a
        href={href}
        className={className}
        onMouseEnter={handleEnter}
        onMouseLeave={handleLeave}
      >
        {children}
      </a>
      {show && (
        <div
          className="fixed z-50 pointer-events-none hidden md:block"
          style={{
            left: `${pos.x}px`,
            top: `${pos.y}px`,
          }}
        >
          <CssCardRenderer card={card} game={game} size="sm" locale={locale} />
        </div>
      )}
    </>
  );
}
