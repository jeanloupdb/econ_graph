/**
 * Une option cliquable du wizard (style Linear.app).
 * Affiche une icône Lucide, un label et une description.
 */

'use client';

import { cn } from '@/lib/utils';
import { WizardOption as WizardOptionType } from '@/types/wizard';
import * as LucideIcons from 'lucide-react';

interface WizardOptionProps {
  option: WizardOptionType;
  isSelected: boolean;
  onSelect: () => void;
}

export function WizardOption({
  option,
  isSelected,
  onSelect,
}: WizardOptionProps) {
  // Mapper l'icon string vers le composant Lucide
  const IconComponent = option.icon ? (LucideIcons as any)[option.icon] : null;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative w-full rounded-lg border p-4 text-left transition-colors duration-150',
        'focus:outline-none focus:ring-2 focus:ring-violet-500/50',
        isSelected
          ? 'border-violet-500 bg-violet-500/5'
          : 'border-zinc-800 bg-transparent hover:border-zinc-700'
      )}
    >
      {/* Selection indicator */}
      <div
        className={cn(
          'absolute right-4 top-4 h-4 w-4 rounded-full border-2 transition-colors',
          isSelected
            ? 'border-violet-500 bg-violet-500'
            : 'border-zinc-700'
        )}
      >
        {isSelected && (
          <div className="flex h-full w-full items-center justify-center">
            <div className="h-1.5 w-1.5 rounded-full bg-white" />
          </div>
        )}
      </div>

      <div className="flex items-start gap-3 pr-8">
        {/* Icon Lucide */}
        {IconComponent && (
          <div className="flex-shrink-0 mt-0.5">
            <IconComponent className="h-5 w-5 text-zinc-400" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {/* Label */}
          <div className="font-medium text-white">
            {option.label}
          </div>

          {/* Description */}
          {option.description && (
            <div className="mt-1 text-sm text-zinc-500">
              {option.description}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
