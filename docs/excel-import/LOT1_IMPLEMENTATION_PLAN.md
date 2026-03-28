# Lot 1 Implementation Plan

## Goal

Ship the first durable Excel-import slice without creating disposable UX.

Lot 1 is not "full Excel import". It is:

- upload,
- qualification,
- verdict,
- recommendation,
- clean refusal when needed.

The purpose is to make the current import flow safe, legible, and product-native before expanding scope.

## Scope Freeze

### In Scope

- Analyze an uploaded workbook before import.
- Show a user-facing verdict and recommendation.
- Reuse the existing dashboard entry flow.
- Reuse the existing backend analysis path.
- Preserve compatibility with the current direct import endpoint.

### Out Of Scope

- Session-based multi-step import backend.
- Full selective import by block or KPI.
- New graph-side import summary UI.
- New dashboard-first decision workspace.
- Major landing rewrite.

Those belong to later lots.

## Product Decision

Lot 1 solves:

`Should Smart Graph import this workbook, and what should the user expect?`

It does not yet solve:

`Exactly which subgraph should be imported and how should it be edited afterward?`

## Existing Assets To Reuse

### Backend

- [econ_graph_api/app/api/export.py](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_api/app/api/export.py)
- [econ_graph_api/app/services/excel_import.py](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_api/app/services/excel_import.py)

### Frontend

- [econ_graph_web/src/components/dashboard/ExcelImportView.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/dashboard/ExcelImportView.tsx)
- [econ_graph_web/src/hooks/useExcelImport.ts](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/hooks/useExcelImport.ts)
- [econ_graph_web/src/store/excelImportState.ts](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/store/excelImportState.ts)
- [econ_graph_web/src/app/(protected)/dashboard/page.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/app/(protected)/dashboard/page.tsx)
- [econ_graph_web/src/components/agent/AiCreationOverlay.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/agent/AiCreationOverlay.tsx)

## Target User Flow

1. User opens the existing Excel entry point in the dashboard.
2. User uploads a workbook.
3. App analyzes the workbook before import.
4. App shows:
   - suitability level,
   - short explanation,
   - a few structural insights,
   - whether import is recommended,
   - whether simplification is expected.
5. User either:
   - proceeds with direct import,
   - goes back,
   - or stops because the file is refused.

This is still a guided front door to the existing import path.

## UX Deliverables

### 1. Analysis Result Card

Add a durable analysis state to the existing Excel flow.

Must show:

- file name,
- suitability badge,
- one-sentence recommendation,
- formula count,
- sheet count,
- estimated nodes,
- detected KPIs,
- 3 to 5 structural insights,
- warning if simplification is likely.

### 2. Clean Refusal State

When `can_import = false`, show:

- why the workbook is not a good fit,
- what kind of file Smart Graph expects,
- what the user can do next.

No dead-end error toast as the primary UX.

### 3. Proceed CTA

If import is allowed:

- primary CTA: `Importer dans Smart Graph`
- secondary CTA: `Choisir un autre fichier`

The CTA copy should reflect suitability:

- `Importer tel quel` for strong files,
- `Importer avec simplification` for weaker but acceptable files.

## API Strategy

Use the current analysis endpoint as the Lot 1 contract.

Current endpoint:

- `POST /projects/analyze-excel`

Current import endpoint:

- `POST /projects/import/excel`

Lot 1 should improve the UX around these endpoints before introducing session APIs.

## Backend Tasks

### Task B1. Stabilize Analysis Contract

File:

- [econ_graph_api/app/api/export.py](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_api/app/api/export.py)

Actions:

- confirm current response fields are enough for the analysis UI,
- add fields only if required by the UI,
- keep backward compatibility for current frontend callers.

Candidate additions if needed:

- `import_recommendation`
- `simplification_expected`
- `refusal_reason`
- `next_step_hint`

### Task B2. Separate Qualification Language From Raw Metrics

File:

- [econ_graph_api/app/api/export.py](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_api/app/api/export.py)

Actions:

- keep raw counts for transparency,
- ensure user-facing messages are plain language,
- make suitability language consistent:
  - `excellent`
  - `good`
  - `limited`
  - `not_suitable`

### Task B3. Leave Import Path Intact

File:

- [econ_graph_api/app/api/export.py](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_api/app/api/export.py)

Actions:

- do not replace `POST /projects/import/excel`,
- keep current import working,
- only gate it through analysis in the frontend flow.

## Frontend Tasks

### Task F1. Make `useExcelImport` The Main Lot 1 Integration Point

File:

- [econ_graph_web/src/hooks/useExcelImport.ts](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/hooks/useExcelImport.ts)

Actions:

- use `analyzeFile()` as the first step,
- only call `importFile()` after explicit user confirmation,
- make status transitions explicit.

### Task F2. Refactor `ExcelImportView` Into Explicit States

File:

- [econ_graph_web/src/components/dashboard/ExcelImportView.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/dashboard/ExcelImportView.tsx)

States to implement:

- `idle`
- `analyzing`
- `analyzed.importable`
- `analyzed.limited`
- `analyzed.refused`
- `importing`

Actions:

- stop using upload as an immediate import trigger,
- show analysis before import,
- make refusal and warnings visible in-page,
- keep the current overlay only for analysis/import progress, not as the only feedback surface.

### Task F3. Use Shared UI Patterns

Files to inspect and reuse:

- [econ_graph_web/src/components/ui/card.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/ui/card.tsx)
- [econ_graph_web/src/components/ui/dialog.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/ui/dialog.tsx)
- [econ_graph_web/src/components/ui/progress.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/ui/progress.tsx)

Actions:

- keep the Excel view inside the current dashboard shell,
- use shared cards and status styling,
- avoid a one-off visual system for Excel.

### Task F4. Keep Current Success Path

Files:

- [econ_graph_web/src/hooks/useExcelImport.ts](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/hooks/useExcelImport.ts)
- [econ_graph_web/src/components/dashboard/ExcelImportView.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/dashboard/ExcelImportView.tsx)

Actions:

- after import success, continue redirecting to `/graph`,
- do not add a new post-import page in Lot 1.

## Suggested Sequence

### Step 1

Refine backend analysis response only if needed.

### Step 2

Refactor `useExcelImport` usage in the Excel dashboard entry.

### Step 3

Refactor `ExcelImportView` into a real state machine UI.

### Step 4

Verify:

- refused workbook,
- limited workbook,
- good workbook,
- successful import path.

## Acceptance Criteria

Lot 1 is done when:

1. Uploading a workbook no longer triggers import immediately.
2. The user always sees an analysis step first.
3. Refused files are explained in-page.
4. Acceptable files show a clear recommendation before import.
5. Import still reaches the current graph experience unchanged.
6. The UI remains inside the current dashboard/product shell.

## Test Corpus Needed Before Coding

Prepare at least:

- 3 clearly importable model workbooks,
- 3 partially suitable workbooks,
- 3 raw-data-heavy workbooks to refuse,
- 3 edge-case workbooks with large size or awkward formulas.

Store or track them outside the production repo if needed, but freeze the corpus before iteration.

## Commit Strategy

Suggested sequence:

1. `docs: add lot 1 implementation plan`
2. `feat: gate excel import behind analysis step`
3. `feat: add qualification UI states for excel import`
4. `refactor: align excel import feedback with shared dashboard UI`

## Immediate Next Step

Before writing feature code, freeze:

- the exact analysis response fields to display,
- the 12-file test corpus,
- the final CTA copy for each suitability level.

Once those three are fixed, implementation can start directly.
