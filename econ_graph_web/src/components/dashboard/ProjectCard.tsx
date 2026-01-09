import { useProjectStats } from "@/components/dashboard/ProjectRow";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ProjectPromptTooltip } from "@/components/ui/ProjectPromptTooltip";
import { AnimatePresence, motion } from "framer-motion";
import {
  Box,
  CheckCircle2,
  GitBranch,
  Info,
  Pencil,
  Share2,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { SmartGraphLogo } from "../ui/SmartGraphLogo";

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

export function ProjectCard({
  project,
  index,
  isSelected,
  onToggleSelect,
  onOpen,
  onRename,
  onDelete,
  onShare,
  isJustCreated,
}: ProjectCardProps) {
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
        scale: 1,
      }}
      transition={{
        duration: 0.15,
        delay: isJustCreated ? 0 : index * 0.03,
      }}
      onClick={onOpen}
      className={`group relative rounded-xl border bg-zinc-900/50 backdrop-blur-sm p-5 cursor-pointer transition-all hover:bg-zinc-900 ${
        isSelected
          ? "border-violet-500/50 ring-1 ring-violet-500/20"
          : "border-zinc-800 hover:border-zinc-700"
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
            <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500 text-white shadow-lg text-xs font-medium">
              <CheckCircle2 className="h-3 w-3" />
              Créé
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Checkbox */}
      <div
        className="absolute top-4 right-4"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onToggleSelect}
          className="border-zinc-700 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
        />
      </div>

      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 rounded-lg bg-zinc-800/50 border border-zinc-700/50">
          <SmartGraphLogo size={28} />
        </div>
        <div className="flex-1 min-w-0 pr-6">
          <div className="flex items-center gap-1.5 mb-0.5">
            <h3 className="text-sm font-medium text-white truncate">
              {project.name}
            </h3>
            {(project.generation_prompt || project.description) && (
              <ProjectPromptTooltip
                generationPrompt={project.generation_prompt}
                description={project.description}
                side="right"
                className="flex-shrink-0 p-0.5 rounded-md text-zinc-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all duration-200"
              >
                <Info className="h-3.5 w-3.5" />
              </ProjectPromptTooltip>
            )}
          </div>
          <p className="text-xs text-zinc-500">
            {new Date(project.updatedAt).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <Box className="h-3.5 w-3.5" />
          <span>{stats?.nodes || 0} nœuds</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-zinc-500">
          <GitBranch className="h-3.5 w-3.5" />
          <span>{stats?.edges || 0} liens</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 pt-3 border-t border-zinc-800">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 flex-1 text-xs text-zinc-400 hover:text-white hover:bg-zinc-800"
          onClick={(e) => {
            e.stopPropagation();
            onRename();
          }}
        >
          <Pencil className="h-3 w-3 mr-1.5" />
          Renommer
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-zinc-800"
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
          className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
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
