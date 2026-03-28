# Import Session API Contract

## Purpose

Move Excel import from a single-shot endpoint to a session-based flow.

That allows Smart Graph to:

- scan first,
- recommend scope,
- let the user choose,
- import only the useful model,
- expose warnings and uncertainty cleanly.

## Compatibility Rule

The current direct endpoint may remain as a fast path:

- `POST /projects/import/excel`

But the target architecture should use session endpoints for the guided flow.

Implementation rule:

- evolve the existing import path in [econ_graph_api/app/api/export.py](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_api/app/api/export.py),
- reuse and split the current logic in [econ_graph_api/app/services/excel_import.py](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_api/app/services/excel_import.py),
- do not replace the current backend with a second disconnected import stack.

## Resource Model

### Import Session

```json
{
  "id": "imp_123",
  "status": "scanning",
  "file_name": "forecast.xlsx",
  "file_size": 251993,
  "created_at": "2026-03-13T10:00:00Z",
  "classification": null,
  "workbook_summary": null,
  "sheet_summaries": [],
  "candidate_blocks": [],
  "recommended_scope": null,
  "selected_scope": null,
  "warnings": [],
  "errors": []
}
```

### Recommended Scope

```json
{
  "kind": "block",
  "target_id": "blk_margin_model",
  "reason": "Best balance between model quality and graph readability",
  "includes": ["Revenue drivers", "Cost drivers", "Net margin output"],
  "excludes": ["Raw sales export", "Archive sheet"]
}
```

### Selected Scope

```json
{
  "mode": "block",
  "target_ids": ["blk_margin_model"],
  "depth_limit": 3,
  "kpi_targets": ["net_margin"]
}
```

## Session Statuses

- `uploaded`
- `scanning`
- `qualified_importable`
- `qualified_partial`
- `qualified_refused`
- `awaiting_selection`
- `extracting_logic`
- `building_graph`
- `enriching`
- `completed`
- `failed`

## Proposed Endpoints

### 1. Create Session

`POST /excel-import/sessions`

Multipart form data:

- `file`
- `question` optional
- `target_kpi` optional

Response:

```json
{
  "id": "imp_123",
  "status": "scanning"
}
```

### 2. Get Session

`GET /excel-import/sessions/{session_id}`

Response:

```json
{
  "id": "imp_123",
  "status": "qualified_partial",
  "classification": "partially_importable",
  "workbook_summary": {
    "sheet_count": 7,
    "used_cells": 18543,
    "formula_cells": 1298,
    "formula_density": 0.07,
    "named_ranges": 4,
    "macros_detected": false,
    "external_references_detected": true,
    "complexity_score": 72
  },
  "sheet_summaries": [],
  "candidate_blocks": [],
  "recommended_scope": {
    "kind": "block",
    "target_id": "blk_cash_flow",
    "reason": "The cash-flow chain is coherent and importable.",
    "includes": ["Inputs", "Monthly cash balance", "Runway output"],
    "excludes": ["CRM export", "Historic dump"]
  },
  "warnings": [
    "External references were detected and will be ignored.",
    "Only one block is recommended for import."
  ],
  "errors": []
}
```

### 3. Select Scope

`POST /excel-import/sessions/{session_id}/selection`

Request:

```json
{
  "mode": "block",
  "target_ids": ["blk_cash_flow"],
  "depth_limit": 3,
  "kpi_targets": ["runway_months"]
}
```

Response:

```json
{
  "id": "imp_123",
  "status": "awaiting_selection",
  "selected_scope": {
    "mode": "block",
    "target_ids": ["blk_cash_flow"],
    "depth_limit": 3,
    "kpi_targets": ["runway_months"]
  }
}
```

### 4. Commit Import

`POST /excel-import/sessions/{session_id}/commit`

Response:

```json
{
  "id": "imp_123",
  "status": "completed",
  "project_id": "proj_456",
  "result": {
    "nodes_created": 24,
    "edges_created": 31,
    "inputs_detected": 8,
    "outputs_detected": 4,
    "ignored_elements": [
      "External references",
      "Archive sheet",
      "2 unsupported formulas"
    ],
    "unresolved_formulas": 2,
    "warnings": [
      "Some formulas were simplified during conversion."
    ],
    "summary": "Monthly cash-flow model with runway, burn, and margin outputs."
  }
}
```

### 5. Cancel Session

`DELETE /excel-import/sessions/{session_id}`

Response:

- `204 No Content`

## Error Contract

Errors should be explicit and user-safe.

```json
{
  "code": "workbook_not_suitable",
  "message": "This workbook is mostly raw data and is not a good fit for Smart Graph.",
  "retryable": false,
  "recommended_next_step": "Select one KPI or upload a model-oriented sheet."
}
```

## Frontend Expectations

The frontend should assume:

- polling or streaming may be needed while scanning and importing,
- qualification can finish without a graph,
- refusal is a first-class success state,
- partial import is a valid happy path.

## Backend Expectations

The backend should separate:

- file ingestion,
- qualification,
- selection persistence,
- graph extraction,
- enrichment,
- final project creation.

That keeps scanner failures and graph-build failures distinct.

This separation should be implemented by refactoring the current service into clearer stages, not by discarding the existing working import path.
