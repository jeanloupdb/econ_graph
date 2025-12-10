import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AgentLog } from "@/store/agentState";
import { AnimatePresence, motion } from "framer-motion";
import { Terminal, X } from "lucide-react";
import { useEffect, useRef } from "react";

interface AgentLogPopoverProps {
  logs: AgentLog[];
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AgentLogPopover({ logs, isOpen, onOpenChange }: AgentLogPopoverProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isOpen]);

  return (
    <Popover open={isOpen} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          <Terminal className="h-3.5 w-3.5" />
          Logs
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 rounded-t-lg">
          <div className="flex items-center gap-2">
            <Terminal className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">Terminal Architecte</span>
          </div>
          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => onOpenChange(false)}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
        
        <div 
          ref={scrollRef}
          className="h-[300px] overflow-y-auto p-3 font-mono text-xs space-y-1 bg-zinc-950 text-zinc-300"
        >
          <AnimatePresence initial={false}>
            {(logs || []).map((log, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className={`break-words ${
                  log.level === 'error' ? 'text-red-400' :
                  log.level === 'success' ? 'text-green-400' :
                  log.level === 'warning' ? 'text-amber-400' :
                  'text-zinc-300'
                }`}
              >
                <span className="opacity-30 mr-2">{new Date(log.timestamp || "").toLocaleTimeString()}</span>
                {log.message}
              </motion.div>
            ))}
            {logs.length === 0 && (
              <div className="text-zinc-600 italic">En attente de logs...</div>
            )}
          </AnimatePresence>
        </div>
      </PopoverContent>
    </Popover>
  );
}
