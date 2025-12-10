"use client";

import { cn } from "@/lib/utils";
import { useAgentStore } from "@/store/agentState";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { AgentCompactStatus } from "../agent/AgentCompactStatus";
import { RawLogViewer } from "../agent/RawLogViewer";

interface AgentStatusPanelProps {
  className?: string;
}

export function AgentStatusPanel({ className }: AgentStatusPanelProps) {
  const { currentTask } = useAgentStore();

  if (!currentTask) {
    return null;
  }

  const isCompleted = currentTask.status === "success" || currentTask.status === "error";
  const isSuccess = currentTask.status === "success";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={cn(
        "relative rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-xl overflow-hidden",
        className
      )}
    >
      <div className="p-4 space-y-4">
        {/* Compact Status Bar */}
        <AgentCompactStatus 
          logs={currentTask.logs} 
          status={currentTask.status} 
        />

        {/* Action Button - Only appears on success */}
        {isCompleted && isSuccess && currentTask.projectId && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="flex justify-end"
          >
            <button
              onClick={() => {
                window.location.href = `/graph?project=${currentTask.projectId}`;
              }}
              className="inline-flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-md font-medium text-xs hover:opacity-90 transition-opacity"
            >
              <span>Voir le projet</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </motion.div>
        )}

        {/* Debug Logs - Collapsible */}
        <div className="pt-2">
          <RawLogViewer logs={currentTask.logs} />
        </div>
      </div>
    </motion.div>
  );
}
