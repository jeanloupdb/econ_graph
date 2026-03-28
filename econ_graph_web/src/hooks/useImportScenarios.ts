/**
 * Triggers post-import scenario generation for a freshly imported project.
 * Calls POST /ai/projects/{project_id}/suggest-import-scenarios once,
 * then invalidates the scenario query so the UI picks up the new scenarios.
 */

import { apiClient } from "@/lib/api/client";
import { useCallback, useRef, useState } from "react";

const SUGGESTED_KEY = "sg_import_scenarios_suggested";

interface SuggestedScenario {
  id: string;
  name: string;
  color: string;
  description: string;
}

interface UseScenariosResult {
  scenarios: SuggestedScenario[];
  isGenerating: boolean;
  suggest: (projectId: string) => Promise<void>;
}

export function useImportScenarios(): UseScenariosResult {
  const [isGenerating, setIsGenerating] = useState(false);
  const [scenarios, setScenarios] = useState<SuggestedScenario[]>([]);
  const calledRef = useRef(false);

  const suggest = useCallback(async (projectId: string) => {
    // Only run once per project
    const alreadyDone = sessionStorage.getItem(`${SUGGESTED_KEY}_${projectId}`);
    if (alreadyDone || calledRef.current) return;
    calledRef.current = true;

    setIsGenerating(true);
    try {
      const result = await apiClient.post<{ scenarios: SuggestedScenario[] }>(
        `/ai/projects/${projectId}/suggest-import-scenarios`,
        {}
      );
      const created = result.scenarios ?? [];
      setScenarios(created);
      sessionStorage.setItem(`${SUGGESTED_KEY}_${projectId}`, "1");
    } catch (e) {
      // Non-fatal — scenario generation is a best-effort enhancement
      console.warn("Import scenario suggestions failed (non-fatal):", e);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  return { scenarios, isGenerating, suggest };
}
