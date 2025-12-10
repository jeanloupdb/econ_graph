'use client';


interface VariableHoverCardProps {
  id: string;
  label?: string;
  x: number;
  y: number;
}

import { createPortal } from 'react-dom';

export function VariableHoverCard({ id, label, x, y }: VariableHoverCardProps) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="pointer-events-none fixed z-[9999] px-3 py-2 text-xs rounded-md bg-zinc-900 text-zinc-50 shadow-xl border border-zinc-800"
      style={{
        left: x,
        top: y,
        transform: 'translate(-50%, -100%)',
      }}
      role="tooltip"
    >
      <div className="font-semibold leading-tight">{label || id}</div>
      {label && (
        <div className="opacity-70 text-[11px] leading-tight mt-0.5">{id}</div>
      )}
    </div>,
    document.body
  );
}

