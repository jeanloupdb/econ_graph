# Excel Import Initiative

This folder defines the product and implementation rules for the `Excel -> Smart Graph` initiative.

The goal is not to clone spreadsheets. The goal is to turn a spreadsheet into a readable Smart Graph model, then into insight, scenarios, and a decision.

## Canonical Outcome

In less than 5 minutes, a user should be able to:

- upload an Excel workbook,
- understand what in the workbook is usable,
- import only the useful model scope,
- get a readable graph,
- get a short summary with key levers and scenario suggestions.

## Non-Negotiable Product Rule

Smart Graph must never become an Excel viewer.

- Excel is an input channel.
- The graph remains the canonical product model.
- The UI must simplify the model instead of reproducing spreadsheet complexity.

## Document Map

- [PRODUCT_GUARDRAILS.md](/home/jlal/jlal_perso/perso/gave/econ_graph/docs/excel-import/PRODUCT_GUARDRAILS.md)
  Product scope, guardrails, review questions, and what not to build now.
- [FRONTEND_IMPLEMENTATION_GUARDRAILS.md](/home/jlal/jlal_perso/perso/gave/econ_graph/docs/excel-import/FRONTEND_IMPLEMENTATION_GUARDRAILS.md)
  UX and frontend coding rules, including the relevant discipline from `audit-frontend` and `shadcn`.
- [DESIGN_CONVERGENCE_GUIDE.md](/home/jlal/jlal_perso/perso/gave/econ_graph/docs/excel-import/DESIGN_CONVERGENCE_GUIDE.md)
  Shared design language, page convergence rules, and how to keep the roadmap aligned with the real product UI.
- [LOT1_IMPLEMENTATION_PLAN.md](/home/jlal/jlal_perso/perso/gave/econ_graph/docs/excel-import/LOT1_IMPLEMENTATION_PLAN.md)
  Concrete pre-build freeze for the first implementation slice: exact scope, files to touch, sequencing, and acceptance criteria.
- [EXCEL_QUALIFICATION_SPEC.md](/home/jlal/jlal_perso/perso/gave/econ_graph/docs/excel-import/EXCEL_QUALIFICATION_SPEC.md)
  Workbook scanner, qualification logic, segmentation, and refusal policy.
- [IMPORT_SESSION_API_CONTRACT.md](/home/jlal/jlal_perso/perso/gave/econ_graph/docs/excel-import/IMPORT_SESSION_API_CONTRACT.md)
  Proposed API contracts for a session-based Excel import flow.

## Build Order

1. Qualification first.
2. Guided selection second.
3. Graph extraction third.
4. Summary and scenarios fourth.
5. Design convergence in parallel with the product flow.
6. Advanced edge cases last.

## Reuse First

This initiative should be built by extending the strongest existing foundations, not by creating a parallel Excel product.

- Reuse the current import backend in [econ_graph_api/app/services/excel_import.py](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_api/app/services/excel_import.py) and evolve it toward qualification and session flow.
- Reuse the current API surface in [econ_graph_api/app/api/export.py](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_api/app/api/export.py) as the compatibility layer during migration.
- Reuse the dashboard entry points in [econ_graph_web/src/components/dashboard/ExcelImportView.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/dashboard/ExcelImportView.tsx) and related hooks/stores instead of creating a new standalone Excel area.
- Reuse the graph destination and its proven column-mode shell in [econ_graph_web/src/components/graph/CausalStateView.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/graph/CausalStateView.tsx) and [econ_graph_web/src/components/graph/common/ColumnShell.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/graph/common/ColumnShell.tsx).
- Prefer adding an import-specific summary/recommendation layer on top of the current graph experience rather than replacing the graph page.

## Current Code Touchpoints

- [econ_graph_web/src/components/dashboard/ExcelImportView.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/dashboard/ExcelImportView.tsx)
- [econ_graph_web/src/hooks/useExcelImport.ts](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/hooks/useExcelImport.ts)
- [econ_graph_web/src/store/excelImportState.ts](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/store/excelImportState.ts)
- [econ_graph_web/src/components/graph/CausalStateView.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/graph/CausalStateView.tsx)
- [econ_graph_web/src/components/graph/common/ColumnShell.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/graph/common/ColumnShell.tsx)
- [econ_graph_api/app/services/excel_import.py](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_api/app/services/excel_import.py)
- [econ_graph_api/app/api/export.py](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_api/app/api/export.py)

## Decision Filter

Before shipping any Excel-import feature, ask:

1. Does this reduce time to first insight?
2. Does this make the model clearer than Excel?
3. Does this preserve the Smart Graph UX and visual identity?
4. Does this help decision-making, not just import fidelity?
5. Does this reuse and strengthen the real product UI instead of creating disposable UI?
