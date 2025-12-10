import { AgentLogPopover } from "@/components/agent/AgentLogPopover";
import { useSmoothedProgress } from "@/hooks/useSmoothedProgress";
import { AgentLog, AgentStatus } from "@/store/agentState";
import { motion } from "framer-motion";
import { CheckCircle2, Brain, Wrench, Target, Code } from "lucide-react";
import { useEffect, useState, useMemo } from "react";

interface AgentProjectCardProps {
  logs: AgentLog[];
  status: AgentStatus;
  currentStep?: string;
  projectId?: string;
  onProjectClick?: (projectId: string) => void;
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

export function AgentProjectCard({ logs, status, currentStep, projectId, onProjectClick }: AgentProjectCardProps) {
  const [isLogOpen, setIsLogOpen] = useState(false);
  const [projectName, setProjectName] = useState<string | null>(null);
  const [messageIndex, setMessageIndex] = useState(0);

  const currentStepData = STEPS.find(s => s.id === currentStep) || STEPS[0];
  const StepIcon = currentStepData.icon;
  const isSuccess = status === 'success';

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

  // Detailed storytelling during initialization - rotate messages
  useEffect(() => {
    if (!currentStep || currentStep === 'analyste') {
      setMessageIndex(0);
      const interval = setInterval(() => {
        setMessageIndex(prev => (prev + 1) % ANALYSIS_MESSAGES.length);
      }, 3000); // 3 secondes

      return () => clearInterval(interval);
    } else {
      setMessageIndex(0);
    }
  }, [currentStep]);

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

  const getStepStatus = (stepId: string) => {
    if (status === 'error') return 'error';
    if (status === 'success') return 'completed';

    const currentIndex = STEPS.findIndex(s => s.id === currentStep);
    const stepIndex = STEPS.findIndex(s => s.id === stepId);

    // Si currentStep n'est pas défini ou est 'analyste', la première étape est active
    if (currentIndex === -1 && stepIndex === 0) return 'active';

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'active';
    return 'pending';
  };

  const progress = useSmoothedProgress(status, currentStep);

  const handleClick = () => {
    if (isSuccess && projectId && onProjectClick) {
      onProjectClick(projectId);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isSuccess ? [1, 1.03, 1] : 1
      }}
      exit={{
        opacity: 0,
        scale: 0.9,
        y: -30,
        transition: { duration: 0.5 }
      }}
      transition={{ duration: 0.2 }}
      onClick={handleClick}
      className={`relative rounded-xl border ${
        isSuccess
          ? 'border-green-300 dark:border-green-700 shadow-lg shadow-green-500/20'
          : 'border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-md'
      } bg-white dark:bg-zinc-950 p-5 h-full flex flex-col transition-all duration-300 ${
        isSuccess && projectId && onProjectClick ? 'cursor-pointer hover:shadow-xl hover:scale-[1.02]' : ''
      }`}
    >
      {/* Top gradient accent */}
      <motion.div
        className={`absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r ${
          isSuccess
            ? 'from-transparent via-green-500 to-transparent'
            : 'from-transparent via-blue-500 to-transparent'
        }`}
        animate={isSuccess ? {
          opacity: [0.5, 1, 0.5],
        } : {}}
        transition={isSuccess ? {
          duration: 1,
          repeat: 3,
        } : {}}
      />

      {/* Header */}
      <div className="flex items-start gap-3 mb-4">
        {/* Clean animated icon */}
        <div className="relative flex h-11 w-11 items-center justify-center shrink-0 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/10 dark:from-blue-500/20 dark:to-blue-600/20 border border-blue-200/50 dark:border-blue-800/50">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
          >
            <StepIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </motion.div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
              {projectName || "AI Agent"}
            </h3>
            {isSuccess && (
              <motion.span
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
              >
                <CheckCircle2 className="w-3 h-3" />
                Complete
              </motion.span>
            )}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs text-zinc-600 dark:text-zinc-400">
              <motion.span
                className={`inline-block w-1.5 h-1.5 rounded-full ${
                  isSuccess ? 'bg-green-500' : 'bg-blue-500'
                }`}
                animate={isSuccess ? {} : { opacity: [1, 0.3, 1] }}
                transition={isSuccess ? {} : { duration: 2, repeat: Infinity }}
              />
              <span className="font-medium">
                {isSuccess ? 'Project Ready' : currentStepData.label}
              </span>
            </div>
            {detailedMessage && (
              <motion.p
                key={detailedMessage}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className={`text-[10px] truncate ${
                  isSuccess
                    ? 'text-green-600 dark:text-green-400 font-medium'
                    : 'text-zinc-500 dark:text-zinc-500'
                }`}
              >
                {isSuccess ? '✓ ' : ''}{detailedMessage}
              </motion.p>
            )}
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center justify-between h-4">
          <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Progress
          </span>
          <div className="flex items-center gap-2">
            {nodeCount > 0 && (
              <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-500">
                {nodeCount} node{nodeCount > 1 ? 's' : ''}
              </span>
            )}
            <span className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 min-w-[35px] text-right">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Clean progress bar */}
        <div className="relative h-2 w-full bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
          <motion.div
            className="absolute inset-0 bg-blue-600 dark:bg-blue-500"
            initial={{ width: "0%" }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
          >
            {/* Subtle shimmer */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </motion.div>
        </div>
      </div>

      {/* Steps list - clean and minimalist */}
      <div className="flex-1 space-y-2 mb-4">
        {STEPS.map((step, index) => {
          const stepStatus = getStepStatus(step.id);
          const isActive = stepStatus === 'active';
          const isCompleted = stepStatus === 'completed';
          const StepIconComponent = step.icon;

          return (
            <div
              key={step.id}
              className="flex items-center gap-3 group relative"
            >
              {/* Icon */}
              <div className={`relative flex items-center justify-center w-6 h-6 rounded transition-all duration-200 ${
                isActive ? 'bg-blue-600 dark:bg-blue-500' :
                isCompleted ? 'bg-green-600 dark:bg-green-500' :
                'bg-zinc-200 dark:bg-zinc-800'
              }`}>
                {isActive && !isSuccess ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                  >
                    <StepIconComponent className="h-3 w-3 text-white" />
                  </motion.div>
                ) : (
                  <StepIconComponent
                    className={`h-3 w-3 ${
                      isActive || isCompleted ? 'text-white' : 'text-zinc-400 dark:text-zinc-600'
                    }`}
                  />
                )}
              </div>

              {/* Step label */}
              <span className={`text-xs transition-colors ${
                isActive ? 'font-medium text-zinc-900 dark:text-zinc-100' :
                isCompleted ? 'text-zinc-500 dark:text-zinc-400' :
                'text-zinc-400 dark:text-zinc-600'
              }`}>
                {step.label}
              </span>

              {/* Checkmark for completed */}
              {isCompleted && (
                <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-500 ml-auto" />
              )}

              {/* Active indicator */}
              {isActive && !isSuccess && (
                <motion.div
                  className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-blue-500"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              )}

              {/* Connector line */}
              {index < STEPS.length - 1 && (
                <div className={`absolute left-3 top-6 w-px h-2 transition-colors ${
                  isCompleted ? 'bg-green-600 dark:bg-green-500' :
                  isActive ? 'bg-blue-600 dark:bg-blue-500' :
                  'bg-zinc-200 dark:bg-zinc-800'
                }`} />
              )}
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-zinc-100 dark:border-zinc-800">
        <div className="flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500" />
          <span>Just now</span>
        </div>

        <AgentLogPopover
          logs={logs}
          isOpen={isLogOpen}
          onOpenChange={setIsLogOpen}
        />
      </div>
    </motion.div>
  );
}
