'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ChevronDown, Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { forwardRef } from 'react';

interface DashboardCardProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  value?: ReactNode;
  children?: ReactNode;
  onOpen?: () => void;
  onRename?: () => void;
  onDelete?: () => void;
  usageTrigger?: ReactNode;
  className?: string;
  iconWrapperClassName?: string;
  valueClassName?: string;
  footerLabel?: string;
  footerClassName?: string;
  hoverClassName?: string;
  footerHighlightClassName?: string;
}

export const DashboardCard = forwardRef<HTMLDivElement, DashboardCardProps>(
  (
    {
      icon,
      title,
      subtitle,
      badge,
      value,
      children,
      onOpen,
      onRename,
      onDelete,
      usageTrigger,
      className,
      iconWrapperClassName,
      valueClassName,
      footerLabel = 'Ouvrir',
      footerClassName,
      hoverClassName = 'hover:border-zinc-300',
      footerHighlightClassName = 'text-zinc-500 dark:text-zinc-400',
    },
    ref,
  ) => {
    const clickable = typeof onOpen === 'function';

    const handleOpen = () => {
      if (onOpen) onOpen();
    };

    return (
      <div
        ref={ref}
        role={clickable ? 'button' : undefined}
        tabIndex={clickable ? 0 : undefined}
        onClick={handleOpen}
        onKeyDown={(e) => {
          if (!clickable) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleOpen();
          }
        }}
        className={cn(
          'group rounded-2xl border bg-white/90 dark:bg-zinc-900/70 p-4 transition-all',
          clickable && cn('cursor-pointer hover:shadow-lg', hoverClassName),
          className,
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'rounded-xl bg-zinc-100 p-2 dark:bg-zinc-800',
                iconWrapperClassName,
              )}
            >
              {icon}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white">{title}</h3>
                {onRename && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-zinc-400 hover:text-zinc-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRename();
                    }}
                  >
                    <span className="sr-only">Renommer</span>
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                {badge}
              </div>
              {subtitle && (
                <p className="text-[11px] uppercase tracking-wide text-zinc-400">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {onDelete && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="text-zinc-400 hover:text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <span className="sr-only">Supprimer</span>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>

        {value && (
          <div
            className={cn(
              'mt-4 text-3xl font-semibold text-zinc-900 dark:text-white',
              valueClassName,
            )}
          >
            {value}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
          <div
            className={cn(
              'inline-flex items-center gap-1 transition-transform group-hover:translate-x-1',
              footerHighlightClassName,
              footerClassName,
            )}
          >
            <span>{footerLabel}</span>
            <ChevronDown className="h-3 w-3 -rotate-90" />
          </div>
          {usageTrigger && (
            <div
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {usageTrigger}
            </div>
          )}
        </div>
      </div>
    );
  },
);

DashboardCard.displayName = 'DashboardCard';
