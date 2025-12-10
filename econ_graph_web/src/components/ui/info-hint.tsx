'use client';

import { Info } from 'lucide-react';
import * as React from 'react';
import { createPortal } from 'react-dom';

interface InfoHintProps {
  title?: string;
  children: React.ReactNode; // content of the hint
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoHint({ title, children, side = 'right' }: InfoHintProps) {
  const anchorRef = React.useRef<HTMLSpanElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [coords, setCoords] = React.useState<{ top: number; left: number } | null>(null);

  const computePosition = React.useCallback(() => {
    const el = anchorRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    let top = rect.top;
    let left = rect.left;
    const GAP = 8;
    const TOOLTIP_W = 420; // px max width target
    const TOOLTIP_H = 120; // rough estimate
    switch (side) {
      case 'right':
        top = rect.top + rect.height / 2 - TOOLTIP_H / 2;
        left = rect.right + GAP;
        break;
      case 'left':
        top = rect.top + rect.height / 2 - TOOLTIP_H / 2;
        left = rect.left - GAP - TOOLTIP_W;
        break;
      case 'top':
        top = rect.top - GAP - TOOLTIP_H;
        left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
        break;
      case 'bottom':
      default:
        top = rect.bottom + GAP;
        left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
        break;
    }
    // Keep within viewport
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    if (left + TOOLTIP_W > vw - 8) left = vw - TOOLTIP_W - 8;
    if (left < 8) left = 8;
    if (top + TOOLTIP_H > vh - 8) top = vh - TOOLTIP_H - 8;
    if (top < 8) top = 8;
    setCoords({ top, left });
  }, [side]);

  React.useEffect(() => {
    if (!open) return;
    computePosition();
    const onWin = () => computePosition();
    window.addEventListener('scroll', onWin, true);
    window.addEventListener('resize', onWin);
    return () => {
      window.removeEventListener('scroll', onWin, true);
      window.removeEventListener('resize', onWin);
    };
  }, [open, computePosition]);

  return (
    <span
      ref={anchorRef}
      className="relative inline-flex items-center cursor-default align-middle group"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      <Info className="h-4 w-4 text-zinc-400 transition-colors group-hover:text-blue-500" />
      {open && coords && typeof window !== 'undefined' && createPortal(
        <div
          className="fixed z-[9999] pointer-events-none animate-in fade-in zoom-in-95 duration-200"
          style={{ top: coords.top, left: coords.left, width: 320 }}
          role="tooltip"
        >
          <div className="rounded-xl border border-zinc-200/50 bg-white/90 p-4 text-xs text-zinc-600 shadow-xl backdrop-blur-xl dark:border-zinc-800/50 dark:bg-zinc-900/90 dark:text-zinc-300">
            {title && <div className="mb-1.5 font-semibold text-zinc-900 dark:text-zinc-100">{title}</div>}
            <div className="leading-relaxed whitespace-normal break-words">
              {children}
            </div>
          </div>
        </div>, document.body)
      }
    </span>
  );
}
