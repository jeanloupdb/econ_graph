import { cn } from "@/lib/utils";
import { AgentLog } from "@/store/agentState";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Circle, Loader2, Terminal, XCircle } from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface AgentCompactStatusProps {
  logs: AgentLog[];
  status: "idle" | "initializing" | "analyzing" | "planning" | "executing" | "validating" | "correcting" | "success" | "error";
  className?: string;
}

const STEP_LABELS: Record<string, string> = {
  idle: "Prêt",
  initializing: "Initialisation",
  analyzing: "Analyse",
  planning: "Planification",
  executing: "Exécution",
  validating: "Validation",
  correcting: "Correction",
  success: "Terminé",
  error: "Erreur",
};

const STEP_ICONS: Record<string, any> = {
  idle: Circle,
  initializing: Loader2,
  analyzing: Terminal,
  planning: Terminal,
  executing: Terminal,
  validating: Terminal,
  correcting: Terminal,
  success: CheckCircle2,
  error: XCircle,
};

export function AgentCompactStatus({ logs, status, className }: AgentCompactStatusProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [lastLog, setLastLog] = useState<string>("");

  // Update last log message when logs change
  useEffect(() => {
    if (logs.length > 0) {
      const last = logs[logs.length - 1];
      setLastLog(last.message);
    }
  }, [logs]);

  const Icon = STEP_ICONS[status] || Circle;
  const isSpinning = ["initializing", "analyzing", "planning", "executing", "validating", "correcting"].includes(status);
  const isError = status === "error";
  const isSuccess = status === "success";

  return (
    <div className={cn(
      "flex items-center gap-4 h-14 px-4 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-lg font-mono text-sm overflow-hidden",
      className
    )}>
      {/* Left: Status Indicator */}
      <div className="flex items-center gap-2 shrink-0 min-w-[140px] border-r border-zinc-200 dark:border-zinc-800 pr-4">
        <div className={cn(
          "relative flex items-center justify-center w-5 h-5",
          isError ? "text-red-500" : isSuccess ? "text-green-500" : "text-blue-500"
        )}>
          <Icon className={cn("w-4 h-4", isSpinning && "animate-spin")} />
        </div>
        <span className="font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-tight text-xs">
          {STEP_LABELS[status] || status}
        </span>
      </div>

      {/* Right: Scrolling Log */}
      <div className="flex-1 relative overflow-hidden h-full flex items-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={lastLog} // Key change triggers animation
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="absolute w-full truncate text-zinc-500 dark:text-zinc-400"
          >
            <span className="mr-2 text-zinc-400 dark:text-zinc-600">$</span>
            {lastLog || "En attente..."}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
