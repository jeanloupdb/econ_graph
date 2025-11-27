'use client';

import React from 'react';

interface VariableHoverCardProps {
  id: string;
  label?: string;
  x: number;
  y: number;
}

export function VariableHoverCard({ id, label, x, y }: VariableHoverCardProps) {
  return (
    <div
      className="pointer-events-none absolute z-20 px-3 py-2 text-xs rounded-md bg-zinc-900 text-zinc-50 shadow-xl border border-zinc-800"
      style={{
        left: Math.max(8, x),
        top: Math.max(8, y),
        transform: 'translate(-50%, -100%)',
      }}
      role="tooltip"
    >
      <div className="font-semibold leading-tight">{label || id}</div>
      {label && (
        <div className="opacity-70 text-[11px] leading-tight mt-0.5">{id}</div>
      )}
    </div>
  );
}

