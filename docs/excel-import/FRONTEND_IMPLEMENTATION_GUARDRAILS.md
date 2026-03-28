# Frontend Implementation Guardrails

This document translates the product rules into frontend coding rules.

It also incorporates the relevant discipline from the `audit-frontend` and `shadcn` skills so the Excel-import flow is implemented without degrading the current Smart Graph UX.

## Core UX Rule

Do not show spreadsheet complexity before showing user value.

The default order is:

1. upload,
2. scan,
3. explain,
4. recommend,
5. let the user choose,
6. import,
7. summarize,
8. then expose the graph.

## Core Design Rule

Do not let the Excel-import flow introduce a second product language.

The user should feel that:

- the landing promises the same product they actually use,
- the dashboard prepares the same product they will enter,
- the import flow belongs to the same product,
- the graph page is the culmination of the same design system.

## UX Architecture

The Excel-import flow should stay inside the existing Smart Graph shell, not create a parallel product.

- Entry point lives in the dashboard flow.
- The graph page remains the destination after a successful import.
- The import flow should feel like an extension of project creation, not a separate tool.
- The post-import experience should reuse the current graph column mode before inventing a new exploration paradigm.

## Reuse Anchors

The first frontend implementation should treat these pieces as stable foundations:

- [econ_graph_web/src/components/dashboard/ExcelImportView.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/dashboard/ExcelImportView.tsx) for dashboard entry and initial upload behavior.
- [econ_graph_web/src/hooks/useExcelImport.ts](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/hooks/useExcelImport.ts) and [econ_graph_web/src/store/excelImportState.ts](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/store/excelImportState.ts) for state evolution, not replacement.
- [econ_graph_web/src/components/graph/CausalStateView.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/graph/CausalStateView.tsx) for the three-column destination state.
- [econ_graph_web/src/components/graph/common/ColumnShell.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/graph/common/ColumnShell.tsx) for consistent shell, header, loading, and scroll affordances.

The preferred move is:

- add qualification and recommendation UI before graph entry,
- then land the user in the existing graph/columns experience with import-aware summaries and warnings.

Avoid:

- a new full-screen Excel workspace,
- a second graph-like page just for imports,
- bespoke layout systems that bypass the current graph shell.

## Design Center Of Gravity

Use the graph column mode as the main product reference.

This is the current strongest expression of Smart Graph because it:

- explains the model clearly,
- exposes parameters, calculations, and results as distinct layers,
- feels product-native instead of marketing-native,
- can support import, analysis, and scenario work without a redesign.

So the implementation rule is:

- landing should gradually echo this structure,
- dashboard should prepare this structure,
- import should feed this structure,
- dashboard widgets remain secondary until they reach the same maturity.

## Rules Imported From `audit-frontend`

### 1. Diagnose before adding UI

Before adding a screen or component, state:

- what user problem it solves,
- why it matters in the flow,
- what the corrective UX move is.

If a screen has no strong user problem, cut it.

### 2. Maintain hierarchy

Every step must have:

- one primary action,
- one main message,
- one visible state.

Do not present multiple equal-priority choices at the same time.

### 3. Guided states over expert control

Prefer:

- recommended cards,
- detected blocks,
- "import this KPI chain",
- a single next action.

Avoid exposing advanced import settings on first contact.

### 4. Feedback must be explicit

At each stage, the user should understand:

- what Smart Graph found,
- what will be imported,
- what is ignored,
- what failed,
- what to do next.

### 5. Preserve perceived polish

The import flow must match the quality bar of the rest of the product:

- clean spacing,
- stable typography,
- deliberate hierarchy,
- strong empty, loading, warning, and success states.

### 6. No fake-front / real-product split

When a page looks cleaner than the actual product but does not share its structure, that polish is misleading.

Prefer:

- product-real previews,
- product-real states,
- product-real shells.

Avoid:

- showcase-only layouts,
- visual storytelling disconnected from the actual workspace,
- screens that will obviously need to be rebuilt once the feature becomes real.

## Rules Imported From `shadcn`

### 1. Reuse the current system first

Before building anything custom:

- inspect `econ_graph_web/src/components/ui/`,
- check whether a current wrapper or pattern already exists,
- prefer extending shared components instead of adding isolated one-off UI.

### 2. Use semantic tokens, not hardcoded colors

Prefer:

- `bg-background` over `bg-white`,
- `text-foreground` over `text-zinc-900`,
- `text-muted-foreground` over `text-zinc-500`,
- `border-border` over `border-zinc-200`,
- `bg-muted` over `bg-zinc-100`,
- `hover:bg-accent` over `hover:bg-zinc-100`.

Do not create a new Excel-specific color language unless it represents a semantic state such as success, warning, or refusal.

### 3. Prefer wrappers and variants over utility piles

If the same shell appears more than once, extract it:

- scanner result card,
- recommendation card,
- import block card,
- warning summary,
- status banner.

Prefer `variant` and `size` patterns over repeating long class strings.

### 4. Blocks before custom layouts

When building:

- step panels,
- cards,
- tabs,
- dialogs,
- drawers,
- alerts,
- side panels,

start from existing shadcn patterns and adapt them to Smart Graph.

### 5. Do not fork the design language

The Excel import flow should inherit the project visual system:

- typography scale,
- spacing rhythm,
- shell structure,
- card language,
- overlay behavior,
- motion style.

### 6. Build durable page primitives

Prioritize shared building blocks that can live across pages:

- workspace shell,
- section header,
- summary card,
- warning banner,
- recommendation card,
- empty-state block,
- progress / stage panel.

Those should be usable in dashboard, import qualification, graph side panels, and dashboard insights.

## State Model

The UI must model these states explicitly:

- `idle`
- `uploading`
- `scanning`
- `qualified_importable`
- `qualified_partial`
- `qualified_refused`
- `awaiting_selection`
- `extracting_logic`
- `building_graph`
- `enriching`
- `completed`
- `failed_cleanly`

Each state must have:

- one headline,
- one short explanation,
- one primary CTA,
- one fallback path if relevant.

## Layout Rules

- Do not send the user directly to a huge graph after file upload.
- Keep the first post-upload screen summary-first.
- Keep warnings close to the affected scope, not buried in toasts.
- Avoid full-screen interruption when a local panel is enough.
- Use progressive disclosure for advanced details.
- If a post-import explanation can be expressed as a column or panel in the existing graph mode, prefer that over a new page.

## Page-Level Convergence Rules

### Landing

- Reduce the gap between promise and actual product interaction.
- Show more of the `parameters -> calculations -> results` logic.
- Prefer real product-derived visuals over abstract hero-only storytelling.

### Dashboard

- Treat it as a preparation workspace, not a separate experience.
- Use it to qualify, recommend, and launch.
- Make it visually converge toward the graph workspace.

### Import Qualification

- Keep this in the dashboard shell.
- Present verdict, recommendation, and scope selection with the same card and section language used elsewhere.

### Graph

- Keep it as the canonical destination.
- Add import summary, warnings, and suggested next steps as extensions of the current workspace, not as foreign overlays.

### Dashboard Widgets / Insights

- Use them as a secondary synthesis layer.
- Do not let them outrank the graph column mode until they are equally robust and equally legible.

## Existing Code Touchpoints

These files are the first integration points:

- [econ_graph_web/src/components/dashboard/ExcelImportView.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/components/dashboard/ExcelImportView.tsx)
- [econ_graph_web/src/hooks/useExcelImport.ts](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/hooks/useExcelImport.ts)
- [econ_graph_web/src/store/excelImportState.ts](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/store/excelImportState.ts)
- [econ_graph_web/src/app/(protected)/dashboard/page.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/app/(protected)/dashboard/page.tsx)
- [econ_graph_web/src/app/(protected)/graph/page.tsx](/home/jlal/jlal_perso/perso/gave/econ_graph/econ_graph_web/src/app/(protected)/graph/page.tsx)

## Definition Of Done

A frontend change in this initiative is only done if:

1. The step has a clear user purpose.
2. The state is explicit.
3. The UI uses shared system primitives where possible.
4. The flow remains easier than the workbook it came from.
5. The graph remains a destination for understanding, not the first burden placed on the user.
6. The page strengthens convergence between landing, dashboard, import, and graph instead of widening the gap.
