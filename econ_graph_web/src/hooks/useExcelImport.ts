/**
 * Hook for Excel import functionality.
 * 
 * Provides:
 * - Quick analysis of Excel files (preview before import)
 * - Direct import to create SmartGraph projects
 * - Integration with the conversational chat flow
 */

import { apiClient } from '@/lib/api/client';
import { useProjectStore } from '@/store/projectState';
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

const LAST_EXCEL_IMPORT_KEY = 'sg_last_excel_import';

// Types for Excel analysis response
export interface ExcelAnalysis {
  filename: string;
  total_cells: number;
  formula_count: number;
  sheet_count: number;
  parameters_count: number;
  calculations_count: number;
  results_count: number;
  detected_kpis: string[];
  sample_labels: string[];
  estimated_nodes: number;
  can_import: boolean;
  warning: string | null;
  
  // Suitability assessment
  suitability_score: number;  // 0-100
  suitability_level: 'excellent' | 'good' | 'limited' | 'not_suitable';
  suitability_message: string;
  insights: string[];
  import_recommendation: 'direct_import' | 'import_with_simplification' | 'do_not_import';
  simplification_expected: boolean;
  refusal_reason: string | null;
  next_step_hint: string | null;
}

// Types for Excel import response
export interface ExcelImportResult {
  project_id: string;
  project_name: string;
  nodes_created: number;
  edges_created: number;
  summary: {
    total_cells: number;
    parameters: number;
    calculations: number;
    results: number;
  };
}

export type ExcelImportState = 
  | { status: 'idle' }
  | { status: 'analyzing'; file: File }
  | { status: 'analyzed'; file: File; analysis: ExcelAnalysis }
  | { status: 'importing'; file: File }
  | { status: 'success'; result: ExcelImportResult }
  | { status: 'error'; error: string };

export function useExcelImport() {
  const router = useRouter();
  const { load, setCurrentProject } = useProjectStore();
  const [state, setState] = useState<ExcelImportState>({ status: 'idle' });

  /**
   * Analyze an Excel file without importing it.
   * Returns statistics and detected KPIs for preview.
   */
  const analyzeFile = useCallback(async (
    file: File,
    options?: { signal?: AbortSignal }
  ): Promise<ExcelAnalysis | null> => {
    setState({ status: 'analyzing', file });

    try {
      const formData = new FormData();
      formData.append('file', file);

      const analysis = await apiClient.post<ExcelAnalysis>(
        '/projects/analyze-excel',
        formData,
        { signal: options?.signal }
      );

      setState({ status: 'analyzed', file, analysis });
      return analysis;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setState({ status: 'idle' });
        return null;
      }
      const message = error instanceof Error ? error.message : 'Échec de l\'analyse';
      setState({ status: 'error', error: message });
      toast.error(message);
      return null;
    }
  }, []);

  /**
   * Import an Excel file and create a new project.
   */
  const importFile = useCallback(async (
    file: File,
    projectName?: string,
    maxCells: number = 5000,
    options?: { signal?: AbortSignal }
  ): Promise<ExcelImportResult | null> => {
    setState({ status: 'importing', file });

    try {
      const formData = new FormData();
      formData.append('file', file);
      if (projectName) {
        formData.append('project_name', projectName);
      }
      formData.append('max_cells', maxCells.toString());

      const result = await apiClient.post<ExcelImportResult>(
        '/projects/import/excel',
        formData,
        { signal: options?.signal }
      );

      setState({ status: 'success', result });

      // Reload projects and set current
      await load();
      setCurrentProject(result.project_id);

      toast.success(
        `Projet créé avec ${result.nodes_created} variables et ${result.edges_created} dépendances`,
        { duration: 4000 }
      );

      try {
        sessionStorage.setItem(
          LAST_EXCEL_IMPORT_KEY,
          JSON.stringify({
            project_id: result.project_id,
            project_name: result.project_name,
            nodes_created: result.nodes_created,
            edges_created: result.edges_created,
            summary: result.summary,
          })
        );
      } catch {
        // ignore storage errors
      }

      // Navigate to graph view with the newly created project selected
      router.push(`/graph?project=${result.project_id}`);

      return result;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        setState({ status: 'idle' });
        return null;
      }
      const message = error instanceof Error ? error.message : 'Échec de l\'import';
      setState({ status: 'error', error: message });
      toast.error(message);
      return null;
    }
  }, [load, setCurrentProject, router]);

  /**
   * Reset the state to idle.
   */
  const reset = useCallback(() => {
    setState({ status: 'idle' });
  }, []);

  /**
   * Check if a file is an Excel file.
   */
  const isExcelFile = useCallback((file: File): boolean => {
    const name = file.name.toLowerCase();
    const validExtension = name.endsWith('.xlsx') || name.endsWith('.xls');
    const validMime = !file.type ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.type === 'application/vnd.ms-excel';
    return validExtension && validMime;
  }, []);

  const currentFile = 'file' in state ? state.file : undefined;

  return {
    state,
    analyzeFile,
    importFile,
    reset,
    isExcelFile,
    isAnalyzing: state.status === 'analyzing',
    isImporting: state.status === 'importing',
    isProcessing: state.status === 'analyzing' || state.status === 'importing',
    analysis: state.status === 'analyzed' ? state.analysis : null,
    currentFile,
  };
}

export { LAST_EXCEL_IMPORT_KEY };
