import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { apiClient } from "@/lib/api/client";
import { Edge, Node as GraphNode } from "@/lib/types";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Box,
  CheckCircle2,
  Clock,
  GitBranch,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { SmartGraphLogo } from "../ui/SmartGraphLogo";
import { useEffect, useState } from "react";

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
    queryKey: ["project-stats", projectId],
    queryFn: async () => {
      const [nodes, edges] = await Promise.all([
        apiClient.get<GraphNode[]>(
          `/nodes?project=${encodeURIComponent(projectId)}`
        ),
        apiClient.get<Edge[]>(
          `/edges?project=${encodeURIComponent(projectId)}`
        ),
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
  isJustCreated,
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
        scale: 1,
      }}
      transition={{
        duration: 0.15,
        delay: isJustCreated ? 0 : index * 0.01,
      }}
      className={`group cursor-pointer transition-colors relative ${
        isSelected
          ? "bg-violet-500/5"
          : "hover:bg-zinc-800/50"
      } ${className || ""}`}
    >
      {/* Checkbox */}
      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          className="border-zinc-700 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
        />
      </td>

      {/* Name */}
      <td className="px-4 py-3" onClick={onOpen}>
        <div className="flex items-center gap-3">
          <div className="p-1.5 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
            <SmartGraphLogo size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <motion.p
                layoutId={layoutId ? `${layoutId}-title` : undefined}
                className="text-sm font-medium text-white"
              >
                {project.name}
              </motion.p>
              <AnimatePresence>
                {showCheck && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{
                      scale: 1,
                      rotate: 0,
                    }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{
                      type: "spring",
                      stiffness: 200,
                      damping: 15,
                    }}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20"
                  >
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    <span className="text-[10px] font-medium text-emerald-400">
                      Créé
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
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Box className="h-3.5 w-3.5" />
          <span>{stats?.nodes || 0}</span>
        </div>
      </td>

      {/* Edges */}
      <td className="px-4 py-3" onClick={onOpen}>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <GitBranch className="h-3.5 w-3.5" />
          <span>{stats?.edges || 0}</span>
        </div>
      </td>

      {/* Date */}
      <td className="px-4 py-3" onClick={onOpen}>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Clock className="h-3.5 w-3.5" />
          {new Date(project.updatedAt).toLocaleDateString("fr-FR", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
      </td>

      {/* Actions */}
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-white hover:bg-zinc-800"
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
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-white hover:bg-zinc-800"
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
            className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
          <ArrowRight className="h-4 w-4 text-zinc-600 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </td>
    </motion.tr>
  );
}
