export type SessionStatus =
  | "uploaded"
  | "scanning"
  | "awaiting_selection"
  | "qualified_refused"
  | "importing"
  | "completed"
  | "failed"
  | "cancelled";

export interface CandidateBlock {
  block_id: string;
  label: string;
  source_sheet: string;
  sheet_type: "input" | "calculation" | "output" | "mixed" | "raw_data" | "decorative" | "unknown";
  estimated_node_count: number;
  formula_count: number;
  value_count: number;
  interest_score: number; // 0–100
  is_recommended: boolean;
  warnings: string[];
}

export interface RecommendedScope {
  kind: "sheet" | "block" | "kpi_chain";
  target_id: string;
  reason: string;
  includes: string[];
  excludes: string[];
}

export interface SelectedScope {
  mode: "sheet" | "block" | "full";
  target_ids: string[];
}

export interface WorkbookSummary {
  sheet_count: number;
  total_formulas: number;
  total_values: number;
  formula_blocks_count: number;
  verdict: string;
}

export interface ImportSession {
  id: string;
  status: SessionStatus;
  file_name: string;
  file_size: number;
  classification: "importable" | "partially_importable" | "not_suitable" | null;
  verdict_message: string | null;
  workbook_summary: WorkbookSummary | null;
  candidate_blocks: CandidateBlock[];
  recommended_scope: RecommendedScope | null;
  selected_scope: SelectedScope | null;
  project_id: string | null;
  warnings: string[];
  errors: string[];
  created_at: string;
}

export interface ImportGuideEntry {
  label: string;
  value: number | null;
  slug: string;
}

export interface ImportGuide {
  key_inputs: ImportGuideEntry[];
  key_outputs: ImportGuideEntry[];
}

export interface CommitResult {
  session_id: string;
  status: "completed";
  project_id: string;
  nodes_created: number;
  edges_created: number;
  summary: {
    parameters: number;
    calculations: number;
    results: number;
  };
  import_guide?: ImportGuide;
}
