/**
 * Global state for Excel import workflow.
 * 
 * This allows the sidebar to trigger an import that shows the preview in the chat.
 */

import { create } from 'zustand';

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
  suitability_score: number;
  suitability_level: 'excellent' | 'good' | 'limited' | 'not_suitable';
  suitability_message: string;
  insights: string[];
  import_recommendation: 'direct_import' | 'import_with_simplification' | 'do_not_import';
  simplification_expected: boolean;
  refusal_reason: string | null;
  next_step_hint: string | null;
}

export interface ExcelImportResult {
  project_id: string;
  project_name: string;
  nodes_created: number;
  edges_created: number;
  summary: Record<string, unknown>;
}

interface ExcelImportState {
  // File waiting to be analyzed (set by sidebar, consumed by chat)
  pendingFile: File | null;
  
  // Analysis result
  analysis: ExcelAnalysis | null;
  
  // Import result
  importResult: ExcelImportResult | null;
  
  // Status
  status: 'idle' | 'pending' | 'analyzing' | 'analyzed' | 'importing' | 'success' | 'error';
  error: string | null;
  
  // Actions
  setPendingFile: (file: File) => void;
  setAnalysis: (analysis: ExcelAnalysis) => void;
  setImporting: () => void;
  setSuccess: (result: ExcelImportResult) => void;
  setError: (error: string) => void;
  reset: () => void;
}

export const useExcelImportStore = create<ExcelImportState>((set) => ({
  pendingFile: null,
  analysis: null,
  importResult: null,
  status: 'idle',
  error: null,
  
  setPendingFile: (file: File) => {
    set({ pendingFile: file, status: 'pending', analysis: null, error: null });
  },
  
  setAnalysis: (analysis: ExcelAnalysis) => {
    set({ analysis, status: 'analyzed', pendingFile: null });
  },
  
  setImporting: () => {
    set({ status: 'importing' });
  },
  
  setSuccess: (result: ExcelImportResult) => {
    set({ importResult: result, status: 'success' });
  },
  
  setError: (error: string) => {
    set({ error, status: 'error' });
  },
  
  reset: () => {
    set({ 
      pendingFile: null, 
      analysis: null, 
      importResult: null, 
      status: 'idle', 
      error: null 
    });
  },
}));
