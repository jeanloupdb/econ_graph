import { AgentStatus } from "@/store/agentState";
import { useEffect, useState } from "react";

const STEP_TARGETS: Record<string, number> = {
  'analyste': 40,      // Analysis takes the longest, give it 40%
  'planificateur': 70, // Planning is substantial, up to 70%
  'executeur': 90,     // Execution is fast, up to 90%
  'validateur': 95,    // Validation is very fast
  'correcteur': 98,    // Correction if needed
};

export function useSmoothedProgress(status: AgentStatus, currentStep?: string) {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    if (status === 'success') {
      setDisplayProgress(100);
      return;
    }
    
    if (status === 'error') {
      return;
    }

    // Determine target
    let target = 0;
    if (!currentStep) {
      target = 5; // Initializing
    } else {
      target = STEP_TARGETS[currentStep] || 0;
    }

    const interval = setInterval(() => {
      setDisplayProgress(prev => {
        // If we reached 100, stay there
        if (prev >= 100) return 100;
        
        // Distance to target
        const distance = target - prev;
        
        // If we are far behind, move faster. If close, move slower.
        // BUT ensure we always move a tiny bit to avoid "frozen" feel.
        
        let increment = 0;
        
        if (distance > 0) {
          // Normal approach
          increment = Math.max(0.05, distance * 0.02); 
        } else {
          // We passed the target (waiting for next step), creep forward very slowly
          // This solves the "wait" issue. We pretend to keep working.
          // Cap at 99% though.
          if (prev < 99) {
             increment = 0.02; // Very slow creep
          }
        }
        
        // Add a tiny bit of noise for organic feel
        if (increment > 0) {
            increment += Math.random() * 0.05;
        }

        return Math.min(99, prev + increment);
      });
    }, 50); // Faster updates (50ms) for smoother animation

    return () => clearInterval(interval);
  }, [status, currentStep]);

  return displayProgress;
}
