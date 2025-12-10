import { useProjectStats } from '@/components/dashboard/ProjectRow';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AnimatePresence, motion } from 'framer-motion';
import { Box, CheckCircle2, GitBranch, Network, Pencil, Share2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ProjectCardProps {
  project: any;
  index: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onShare: () => void;
  isJustCreated?: boolean;
}

export function ProjectCard({ project, index, isSelected, onToggleSelect, onOpen, onRename, onDelete, onShare, isJustCreated }: ProjectCardProps) {
  const { data: stats } = useProjectStats(project.id);
  const [showCheck, setShowCheck] = useState(isJustCreated);

  useEffect(() => {
    if (isJustCreated) {
      const timer = setTimeout(() => setShowCheck(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isJustCreated]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1
      }}
      transition={{
        duration: 0.15,
        delay: isJustCreated ? 0 : index * 0.03
      }}
      onClick={onOpen}
      className={`group relative rounded-lg border bg-white dark:bg-zinc-900/50 p-5 cursor-pointer transition-all hover:shadow-md ${
        isSelected
          ? 'border-blue-400 dark:border-blue-600 ring-2 ring-blue-100 dark:ring-blue-900'
          : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
      }`}
    >
      {/* Victory badge */}
      <AnimatePresence>
        {showCheck && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="absolute -top-2 -right-2 z-10"
          >
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500 text-white shadow-lg text-xs font-semibold">
              <CheckCircle2 className="h-3 w-3" />
              New
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Checkbox */}
      <div className="absolute top-4 right-4" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
        />
      </div>

      <div className="flex items-start gap-3 mb-4">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 group-hover:bg-blue-100 dark:group-hover:bg-blue-950 transition-colors">
          <Network className="h-5 w-5 text-zinc-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
              {project.name}
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {new Date(project.updatedAt).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              year: 'numeric'
            })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="flex items-center gap-2 text-xs">
          <Box className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-zinc-600 dark:text-zinc-400">{stats?.nodes || 0} nœuds</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <GitBranch className="h-3.5 w-3.5 text-zinc-400" />
          <span className="text-zinc-600 dark:text-zinc-400">{stats?.edges || 0} liens</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 flex-1 text-xs"
          onClick={(e) => {
            e.stopPropagation();
            onRename();
          }}
        >
          <Pencil className="h-3 w-3 mr-1" />
          Renommer
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
        >
          <Share2 className="h-3 w-3" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>
    </motion.div>
  );
}
