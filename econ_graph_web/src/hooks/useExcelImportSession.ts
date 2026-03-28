/**
 * Hook for the session-based Excel import flow (Lot 2).
 *
 * States: idle → creating → scanning → awaiting_selection → selecting →
 *         importing → success
 *                   ↓
 *                refused
 */

import {
  cancelImportSession,
  commitImportSession,
  createImportSession,
  selectImportScope,
} from "@/lib/api/excel-import-sessions";
import { useProjectStore } from "@/store/projectState";
import type { CommitResult, ImportSession, SelectedScope } from "@/types/excel-import-session";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { LAST_EXCEL_IMPORT_KEY } from "./useExcelImport";

export type SessionFlowStatus =
  | "idle"
  | "creating"
  | "awaiting_selection"
  | "refused"
  | "selecting"
  | "importing"
  | "success"
  | "error";

interface SessionFlowState {
  status: SessionFlowStatus;
  session: ImportSession | null;
  result: CommitResult | null;
  error: string | null;
}

export function useExcelImportSession() {
  const router = useRouter();
  const { load, setCurrentProject } = useProjectStore();

  const [flowState, setFlowState] = useState<SessionFlowState>({
    status: "idle",
    session: null,
    result: null,
    error: null,
  });

  /** Upload + qualify a file. Returns full session with candidate blocks. */
  const createSession = useCallback(async (
    file: File,
    options?: { signal?: AbortSignal }
  ): Promise<ImportSession | null> => {
    setFlowState({ status: "creating", session: null, result: null, error: null });
    try {
      const session = await createImportSession(file, options?.signal);
      const status: SessionFlowStatus =
        session.status === "qualified_refused" ? "refused" : "awaiting_selection";
      setFlowState({ status, session, result: null, error: null });
      return session;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setFlowState({ status: "idle", session: null, result: null, error: null });
        return null;
      }
      const msg = err instanceof Error ? err.message : "Échec de l'analyse";
      setFlowState({ status: "error", session: null, result: null, error: msg });
      toast.error(msg);
      return null;
    }
  }, []);

  /** Set the scope the user wants to import. */
  const selectScope = useCallback(async (
    scope: SelectedScope,
    options?: { signal?: AbortSignal }
  ): Promise<void> => {
    const session = flowState.session;
    if (!session) return;
    setFlowState(s => ({ ...s, status: "selecting" }));
    try {
      const updated = await selectImportScope(session.id, scope, options?.signal);
      setFlowState(s => ({ ...s, status: "awaiting_selection", session: updated }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erreur";
      setFlowState(s => ({ ...s, status: "awaiting_selection", error: msg }));
    }
  }, [flowState.session]);

  /** Commit the import — creates the Smart Graph project. */
  const commit = useCallback(async (
    projectName?: string,
    options?: { signal?: AbortSignal }
  ): Promise<CommitResult | null> => {
    const session = flowState.session;
    if (!session) return null;
    setFlowState(s => ({ ...s, status: "importing" }));
    try {
      const result = await commitImportSession(session.id, projectName || session.file_name.replace(/\.[^.]+$/, ""), options?.signal);
      setFlowState(s => ({ ...s, status: "success", result }));

      // Persist summary + import_guide for the graph page banner
      try {
        sessionStorage.setItem(LAST_EXCEL_IMPORT_KEY, JSON.stringify({
          project_id: result.project_id,
          project_name: projectName || session.file_name.replace(/\.[^.]+$/, ""),
          nodes_created: result.nodes_created,
          edges_created: result.edges_created,
          summary: result.summary,
          import_guide: result.import_guide,
        }));
      } catch { /* ignore */ }

      await load();
      setCurrentProject(result.project_id);
      router.push(`/graph?project=${result.project_id}`);
      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setFlowState(s => ({ ...s, status: "awaiting_selection" }));
        return null;
      }
      const msg = err instanceof Error ? err.message : "Échec de l'import";
      setFlowState(s => ({ ...s, status: "error", error: msg }));
      toast.error(msg);
      return null;
    }
  }, [flowState.session, load, setCurrentProject, router]);

  /** Cancel the session and reset. */
  const cancel = useCallback(async (): Promise<void> => {
    const session = flowState.session;
    if (session) {
      try { await cancelImportSession(session.id); } catch { /* ignore */ }
    }
    setFlowState({ status: "idle", session: null, result: null, error: null });
  }, [flowState.session]);

  const reset = useCallback(() => {
    setFlowState({ status: "idle", session: null, result: null, error: null });
  }, []);

  const isExcelFile = useCallback((file: File): boolean => {
    const name = file.name.toLowerCase();
    return name.endsWith(".xlsx") || name.endsWith(".xls");
  }, []);

  return {
    ...flowState,
    isCreating: flowState.status === "creating",
    isImporting: flowState.status === "importing",
    isSelecting: flowState.status === "selecting",
    isLoading: ["creating", "importing", "selecting"].includes(flowState.status),
    createSession,
    selectScope,
    commit,
    cancel,
    reset,
    isExcelFile,
  };
}
