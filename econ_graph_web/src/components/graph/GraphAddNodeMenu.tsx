import { cn } from '@/lib/utils';
import { Layers, Plus } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface GraphAddNodeMenuProps {
  onCreateNode: () => void;
  onCreateApiNode?: () => void;
  onInsertComposite?: () => void;
  onCreateComposite?: () => void;
  className?: string;
}

export function GraphAddNodeMenu({
  onCreateNode,
  onCreateApiNode,
  onInsertComposite,
  onCreateComposite,
  className,
}: GraphAddNodeMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className={cn('relative inline-flex', className)} ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center justify-center w-9 h-9 rounded-full bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 shadow-sm transition-all"
        title="Ajouter un nœud"
      >
        <Plus
          className="h-4 w-4 text-zinc-700 dark:text-zinc-200 transition-transform duration-200"
          style={{
            transform: open ? 'rotate(45deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div className="absolute top-full mt-2 right-0 w-56 rounded-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-lg z-50">
          <div className="py-1">
            <button
              onClick={() => {
                onCreateNode();
                setOpen(false);
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <Plus className="h-4 w-4" />
              Créer un nœud
            </button>
            {onCreateApiNode && (
              <button
                onClick={() => {
                  onCreateApiNode();
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Créer un nœud API
              </button>
            )}

            {onCreateComposite && (
              <button
                onClick={() => {
                  onCreateComposite();
                  setOpen(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
              >
                <Layers className="h-4 w-4" />
                Créer un composite
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
