import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { apiClient } from '@/lib/api/client';
import { Edge, Node as GraphNode } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Box, CheckCircle2, Clock, GitBranch, Network, Pencil, Share2, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';

export interface ProjectRowProps {
  project: any;
  index: number;
  isSelected: boolean;
  onToggleSelect: () => void;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  onShare: () => void;
  className?: string;
  layoutId?: string;
  isJustCreated?: boolean;
}

export function useProjectStats(projectId: string) {
  return useQuery({
    queryKey: ['project-stats', projectId],
    queryFn: async () => {
      const [nodes, edges] = await Promise.all([
        apiClient.get<GraphNode[]>(`/nodes?project=${encodeURIComponent(projectId)}`),
        apiClient.get<Edge[]>(`/edges?project=${encodeURIComponent(projectId)}`)
      ]);
      return {
        nodes: nodes?.length || 0,
        edges: edges?.length || 0,
      };
    },
  });
}

export function ProjectRow({
  project,
  index,
  isSelected,
  onToggleSelect,
  onOpen,
  onRename,
  onDelete,
  onShare,
  className,
  layoutId,
  isJustCreated
}: ProjectRowProps) {
  const { data: stats } = useProjectStats(project.id);
  const [showCheck, setShowCheck] = useState(isJustCreated);

  useEffect(() => {
    if (isJustCreated) {
      const timer = setTimeout(() => setShowCheck(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [isJustCreated]);

  return (
    <motion.tr
      layoutId={layoutId}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{
        opacity: 1,
        scale: 1
      }}
      transition={{
        duration: 0.15,
        delay: isJustCreated ? 0 : index * 0.01
      }}
      className={`group cursor-pointer transition-colors relative ${
        isSelected
          ? 'bg-blue-50/50 dark:bg-blue-950/20'
          : 'hover:bg-zinc-50/50 dark:hover:bg-zinc-900/50'
      } ${className || ''}`}
    >
      {/* Checkbox */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
        />
      </td>

      {/* Name */}
      <td className="px-4 py-3" onClick={onOpen}>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-100 dark:bg-zinc-900 group-hover:bg-blue-100 dark:group-hover:bg-blue-950 transition-colors">
            <Network className="h-4 w-4 text-zinc-600 dark:text-zinc-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <motion.p
                layoutId={layoutId ? `${layoutId}-title` : undefined}
                className="text-sm font-medium text-zinc-900 dark:text-white"
              >
                {project.name}
              </motion.p>
              <AnimatePresence>
                {showCheck && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{
                      scale: 1,
                      rotate: 0
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15
                    }}
                    className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-950 border border-green-200 dark:border-green-800"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                    <span className="text-[10px] font-semibold text-green-700 dark:text-green-300">
                      Created
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </td>

      {/* Nodes */}
      <td className="px-4 py-3" onClick={onOpen}>
        <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <Box className="h-3.5 w-3.5" />
          <span>{stats?.nodes || 0}</span>
        </div>
      </td>

      {/* Edges */}
      <td className="px-4 py-3" onClick={onOpen}>
        <div className="flex items-center gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
          <GitBranch className="h-3.5 w-3.5" />
          <span>{stats?.edges || 0}</span>
        </div>
      </td>

      {/* Date */}
      <td className="px-4 py-3" onClick={onOpen}>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <Clock className="h-3.5 w-3.5" />
          {new Date(project.updatedAt).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onRename();
            }}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => {
              e.stopPropagation();
              onShare();
            }}
          >
            <Share2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <ArrowRight className="h-4 w-4 text-zinc-400 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </td>
    </motion.tr>
  );
}
