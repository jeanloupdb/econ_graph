# Product Guardrails

## Real User Job

Users do not want a spreadsheet parser.

They want to move from:

- an opaque spreadsheet,
- a half-built model,
- or a messy workbook,

to:

- a readable causal model,
- a set of useful scenarios,
- and a defensible decision.

## Product Promise

`Upload a workbook -> understand what matters -> import the right scope -> get a readable Smart Graph model -> act on it`

## What Smart Graph Must Stay

- A product for understanding, simulation, and decisions.
- A graph-native interface where the graph is the source of truth.
- A guided experience that hides unnecessary technical complexity.
- A cleaner and more opinionated experience than Excel.
- A visually coherent product where landing, dashboard, import, and graph feel like one system.

## What Smart Graph Must Not Become

- A generic workbook viewer.
- A "supports every Excel file" product.
- A spreadsheet engineering IDE.
- A raw-table ingestion product.
- A canvas-first expert tool for every user.

## Scope Wedge

Build around one wedge first:

- `business plan`,
- `unit economics`,
- or `cash-flow / forecasting`.

Do not position the first version as universal Excel import.

## What To Cut For Now

- Full workbook fidelity.
- VBA / macros support.
- External references as a default path.
- Huge raw data table ingestion.
- Perfect support for every exotic Excel function.
- Deep customization before the qualification flow is strong.

## What To Add Early

- A workbook scanner.
- A clear qualification verdict.
- Guided import by block, sheet, or KPI.
- A clean refusal path.
- A summary after import.
- Suggested scenarios and key levers.
- A design convergence track so new Excel-import UX reuses the real product language.

## Design DNA To Preserve

The current product already has a visible design center of gravity.

It should keep feeling:

- serious and calm,
- structured rather than flashy,
- AI-assisted but not theatrical,
- dense where needed, but never noisy,
- progressively clarifying instead of immediately overwhelming.

The strongest current product expression is the graph page in column mode.

That means:

- the real product UI should lead the brand,
- the landing should increasingly resemble the logic of the product,
- the import flow should inherit the same structure and interaction language.

## Product Design Rule

Do not build disposable UX.

Every new Excel-import screen must either:

- become part of the durable product flow,
- or reuse durable primitives already present in the product.

Avoid building temporary showcase UI that will have to be replaced once the import flow is real.

## Acceptable Failure Modes

These are acceptable:

- "This workbook is not suitable."
- "Only these 2 blocks are worth importing."
- "This formula could not be converted."
- "This import was simplified."

These are not acceptable:

- A silent failure.
- A giant unreadable graph.
- A successful import with no user insight.
- A misleading claim that the model is complete when it is not.

## Review Questions For Every Sprint

1. Did we reduce time to first insight?
2. Did we preserve a guided UX?
3. Did we keep the graph as the canonical model?
4. Did we avoid exposing spreadsheet complexity too early?
5. Did we produce a result that is easier to reason about than the original workbook?
6. Did we strengthen the shared product language instead of adding a second visual system?

## Definition Of Success

The initiative is on track when:

- most importable workbooks get a scanner verdict quickly,
- users can select scope without confusion,
- imported graphs stay readable,
- the post-import summary is more valuable than the raw graph alone,
- the product remains recognizably Smart Graph.
