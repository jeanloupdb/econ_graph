/**
 * Hook for the dashboard import flow.
 *
 * Excel files use the session-based qualification flow.
 * SmartGraph `.smgp` files are imported directly.
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
import { importSmgpProject, type SmgpImportResult } from "@/lib/api/smgp";
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
  result: CommitResult | SmgpImportResult | null;
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

  /** Upload + qualify an Excel file. Returns full session with candidate blocks. */
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

  /** Commit the qualified Excel import and create the SmartGraph project. */
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

  /** Direct import for canonical SmartGraph files. */
  const importSmgp = useCallback(async (
    file: File,
    projectName?: string,
    options?: { signal?: AbortSignal }
  ): Promise<SmgpImportResult | null> => {
    setFlowState({ status: "importing", session: null, result: null, error: null });
    try {
      const effectiveProjectName = projectName || file.name.replace(/\.[^.]+$/, "");
      const result = await importSmgpProject(file, effectiveProjectName, options?.signal);
      setFlowState({ status: "success", session: null, result, error: null });

      await load();
      setCurrentProject(result.project_id);

      toast.success(
        `Projet importé avec ${result.nodes_created} variables, ${result.scenarios_created} scénario(x) et ${result.composites_created} composite(s)`,
        { duration: 4000 }
      );

      router.push(`/graph?project=${result.project_id}`);
      return result;
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setFlowState({ status: "idle", session: null, result: null, error: null });
        return null;
      }
      const msg = err instanceof Error ? err.message : "Échec de l'import SmartGraph";
      setFlowState({ status: "error", session: null, result: null, error: msg });
      toast.error(msg);
      return null;
    }
  }, [load, router, setCurrentProject]);

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

  const isSmgpFile = useCallback((file: File): boolean => {
    const name = file.name.toLowerCase();
    return name.endsWith(".smgp");
  }, []);

  const isSupportedImportFile = useCallback((file: File): boolean => {
    return isExcelFile(file) || isSmgpFile(file);
  }, [isExcelFile, isSmgpFile]);

  return {
    ...flowState,
    isCreating: flowState.status === "creating",
    isImporting: flowState.status === "importing",
    isSelecting: flowState.status === "selecting",
    isLoading: ["creating", "importing", "selecting"].includes(flowState.status),
    createSession,
    selectScope,
    commit,
    importSmgp,
    cancel,
    reset,
    isExcelFile,
    isSmgpFile,
    isSupportedImportFile,
  };
}
