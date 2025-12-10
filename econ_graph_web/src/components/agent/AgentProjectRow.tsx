import { AgentLogPopover } from "@/components/agent/AgentLogPopover";
import { ProjectRow } from "@/components/dashboard/ProjectRow";
import { useSmoothedProgress } from "@/hooks/useSmoothedProgress";
import { AgentLog, AgentStatus } from "@/store/agentState";
import { motion } from "framer-motion";
import { Brain, CheckCircle2, Code, Target, Wrench } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

interface AgentProjectRowProps {
  logs: AgentLog[];
  status: AgentStatus;
  currentStep?: string;
  projectId?: string;
  onProjectClick?: (projectId: string) => void;
  // Props for the morphed ProjectRow
  project?: any;
  onRename?: () => void;
  onDelete?: () => void;
  onShare?: () => void;
  onToggleSelect?: () => void;
  isSelected?: boolean;
}

const STEPS = [
  { id: 'analyste', label: 'Analyzing', icon: Brain },
  { id: 'planificateur', label: 'Planning', icon: Target },
  { id: 'executeur', label: 'Building', icon: Wrench },
  { id: 'validateur', label: 'Validating', icon: CheckCircle2 },
  { id: 'correcteur', label: 'Finalizing', icon: Code },
];

const ANALYSIS_MESSAGES = [
  "Reading your requirements...",
  "Parsing input parameters...",
  "Identifying key variables...",
  "Detecting relationships...",
  "Analyzing dependencies...",
  "Building computation graph...",
  "Optimizing node structure...",
  "Planning data flows...",
  "Validating model coherence...",
  "Structuring calculations...",
  "Preparing execution plan...",
  "Finalizing architecture...",
  "Almost ready..."
];

export function AgentProjectRow(props: AgentProjectRowProps) {
  const { logs, status, currentStep, projectId, onProjectClick } = props;
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);

  const currentStepData = STEPS.find(s => s.id === currentStep) || STEPS[0];
  const StepIcon = currentStepData.icon;

  // Try to extract project name from logs
  useEffect(() => {
    const nameLog = logs.find(l => l.message.includes("Projet créé:"));
    if (nameLog) {
      const match = nameLog.message.match(/Projet créé:\s*(.+)/);
      if (match) {
        setProjectName(match[1]);
      }
    }
  }, [logs]);

  // Count nodes created based on logs
  const nodeCount = logs.filter(l => l.message.includes("Création du nœud") || l.message.includes("Created node")).length;

  const currentStepIndex = STEPS.findIndex(s => s.id === currentStep);
  const progress = useSmoothedProgress(status, currentStep);

  // Detailed storytelling during initialization - rotate messages
  useEffect(() => {
    if (!currentStep || currentStep === 'analyste') {
      setMessageIndex(0);
      const interval = setInterval(() => {
        setMessageIndex(prev => (prev + 1) % ANALYSIS_MESSAGES.length);
      }, 4000); // 3 secondes au lieu de 1.8s

      return () => clearInterval(interval);
    } else {
      setMessageIndex(0);
    }
  }, [currentStep]);

  const isSuccess = status === 'success';

  // Compute detailed message based on status and step
  const detailedMessage = useMemo(() => {
    if (isSuccess) {
      return "Project created successfully!";
    }

    if (!currentStep || currentStep === 'analyste') {
      return ANALYSIS_MESSAGES[messageIndex];
    }

    if (currentStep === 'planificateur') {
      return "Designing architecture...";
    }

    if (currentStep === 'executeur') {
      return nodeCount > 0 ? `Creating node ${nodeCount}...` : "Initializing builder...";
    }

    if (currentStep === 'validateur') {
      return "Running validation checks...";
    }

    if (currentStep === 'correcteur') {
      return "Finalizing project...";
    }

    return ANALYSIS_MESSAGES[0];
  }, [isSuccess, currentStep, messageIndex, nodeCount]);

  const handleClick = () => {
    if (isSuccess && projectId && onProjectClick) {
      onProjectClick(projectId);
    }
  };

  // When success, try to use the passed project or construct a temporary one
  const effectiveProject = props.project || (isSuccess && projectId ? {
    id: projectId,
    name: projectName || "New Project",
    updatedAt: new Date().toISOString(),
    // Add dummy stats if needed, or handle undefined in ProjectRow
  } : null);

  // When success and we have a project (real or temp), morph into ProjectRow
  if (isSuccess && effectiveProject) {
    return (
      <ProjectRow
        project={effectiveProject}
        index={0}
        isSelected={props.isSelected || false}
        onToggleSelect={props.onToggleSelect || (() => {})}
        onOpen={() => props.onProjectClick?.(props.projectId!)}
        onRename={props.onRename || (() => {})}
        onDelete={props.onDelete || (() => {})}
        onShare={props.onShare || (() => {})}
        className="animate-in fade-in duration-500 bg-green-50/30 dark:bg-green-900/10"
        layoutId={`project-row-${props.projectId}`}
        isJustCreated={true}
      />
    );
  }

  return (
    <motion.tr
      layoutId={projectId ? `project-row-${projectId}` : undefined}
      initial={{ opacity: 0, y: -10 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isSuccess ? [1, 1.02, 1] : 1
      }}
      exit={{
        opacity: 0,
        scale: 0.95,
        y: -20,
        transition: { duration: 0.4 }
      }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={`group relative border-b border-zinc-100 dark:border-zinc-800/50 ${
        isSuccess && projectId && onProjectClick ? 'cursor-pointer hover:bg-green-50/50 dark:hover:bg-green-950/20' : ''
      }`}
    >
      {/* Single cell spanning all columns with relative positioning for absolute children */}
      <td className="px-6 py-4 relative" colSpan={6}>
        {/* Animated gradient background - now inside the cell */}
        <motion.div
          className={`absolute inset-0 pointer-events-none ${
            isSuccess
              ? 'bg-gradient-to-r from-green-500/[0.08] via-emerald-500/[0.06] to-green-500/[0.08]'
              : 'bg-gradient-to-r from-blue-500/[0.03] via-purple-500/[0.02] to-blue-500/[0.03]'
          }`}
          animate={isSuccess ? {
            opacity: [0.5, 1, 0.5],
          } : {
            backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
          }}
          transition={isSuccess ? {
            duration: 1,
            repeat: 3,
          } : {
            duration: 8,
            repeat: Infinity,
            ease: "linear"
          }}
          style={{ backgroundSize: "200% 100%" }}
        />

        <div className="flex items-center justify-between gap-6 relative z-10">
          {/* Left: Avatar + Name + Status */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="relative flex h-10 w-10 items-center justify-center shrink-0 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-blue-500/20">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              >
                <StepIcon className="h-5 w-5 text-white" />
              </motion.div>
              <motion.div
                className="absolute inset-0 rounded-xl bg-gradient-to-tr from-white/20 to-transparent"
                animate={{ opacity: [0.5, 0.8, 0.5] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <motion.p 
                  layoutId={projectId ? `project-row-${projectId}-title` : undefined}
                  className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate"
                >
                  {projectName || "AI Agent"}
                </motion.p>
                {isSuccess ? (
                  <motion.span
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800 shrink-0"
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Complete
                  </motion.span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 shrink-0">
                    <motion.span
                      className="inline-block w-1 h-1 rounded-full bg-blue-500"
                      animate={{ opacity: [1, 0.3, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                    Working
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 shrink-0">
                  {isSuccess ? 'Project Ready' : currentStepData.label}
                </span>
                {detailedMessage && (
                  <>
                    <span className="text-zinc-300 dark:text-zinc-700 shrink-0">•</span>
                    <motion.span
                      key={detailedMessage}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.4 }}
                      className={`text-[11px] truncate ${
                        isSuccess
                          ? 'text-green-600 dark:text-green-400 font-medium'
                          : 'text-zinc-500 dark:text-zinc-500 italic'
                      }`}
                    >
                      {isSuccess ? '✓ ' : ''}{detailedMessage}
                    </motion.span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Progress + Steps + Actions */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Node count */}
            {nodeCount > 0 && (
              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                {nodeCount} node{nodeCount > 1 ? 's' : ''}
              </span>
            )}

            {/* Progress bar */}
            <div className="flex items-center gap-2">
              <div className="relative h-1.5 w-24 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-600"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent"
                    animate={{ x: ["-100%", "100%"] }}
                    transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                  />
                </motion.div>
              </div>
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 w-9 text-right">
                {Math.round(progress)}%
              </span>
            </div>

            {/* Steps */}
            <div className="flex items-center gap-1">
              {STEPS.map((step, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex || (idx === 0 && currentStepIndex === -1);
                const StepIconSmall = step.icon;

                return (
                  <div
                    key={step.id}
                    className={`relative w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${
                      isCompleted ? 'bg-gradient-to-br from-blue-500 to-purple-500' :
                      isCurrent ? 'bg-blue-500' :
                      'bg-zinc-200 dark:bg-zinc-800'
                    }`}
                    title={step.label}
                  >
                    {isCurrent && !isSuccess ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                      >
                        <StepIconSmall className="h-3 w-3 text-white" />
                      </motion.div>
                    ) : (
                      <StepIconSmall className={`h-3 w-3 ${
                        isCompleted || isCurrent ? 'text-white' : 'text-zinc-400'
                      }`} />
                    )}
                    {isCurrent && !isSuccess && (
                      <motion.div
                        className="absolute inset-0 rounded-full border-2 border-blue-400"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.8, 0, 0.8] }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Actions */}
            <AgentLogPopover
              logs={logs}
              isOpen={isLogOpen}
              onOpenChange={setIsLogOpen}
            />
          </div>
        </div>
      </td>
    </motion.tr>
  );
}
