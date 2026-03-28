# Excel Qualification Spec

## Purpose

Qualification happens before import.

Its job is to answer:

1. Is this workbook suitable for Smart Graph?
2. If yes, what scope should be imported?
3. If partially, what should be ignored?
4. If no, how do we refuse cleanly?

## Output Contract

The scanner must output:

- workbook summary,
- per-sheet summaries,
- candidate blocks,
- a qualification verdict,
- recommended scope,
- warnings,
- refusal reasons if relevant.

## Qualification Levels

### `importable`

Use when:

- a coherent model is present,
- the workbook has formula-driven logic,
- the expected graph is still readable after compression,
- unsupported features are limited.

### `partially_importable`

Use when:

- only some sheets or blocks are model-like,
- raw data dominates but some useful logic exists,
- the workbook is large but a smaller decision scope is recoverable.

### `not_suitable`

Use when:

- the workbook is mostly raw data,
- formulas are absent or too weak,
- macros or external references are critical,
- cycles or unsupported constructs block meaningful conversion,
- any resulting graph would be misleading or unusable.

## Workbook Signals

The scanner should collect at least:

- workbook size,
- sheet count,
- used cells count,
- formula cell count,
- formula density,
- named ranges count,
- merged cells count,
- hidden sheets count,
- external references detected,
- macros detected,
- estimated raw-data dominance,
- circular dependency risk.

## Sheet Typing

Each sheet should be classified into one of:

- `input`
- `calculation`
- `output`
- `raw_data`
- `mixed`
- `decorative`
- `unknown`

Signals to use:

- density of formulas,
- presence of labels and totals,
- repeated tabular patterns,
- presence of charts or presentation-only zones,
- proximity of formulas to KPI-like outputs.

## Block Segmentation

The scanner must segment useful scopes instead of treating the workbook as a single unit.

Candidate block types:

- full-sheet model,
- input-to-output formula chain,
- KPI-centered dependency subgraph,
- named range cluster,
- dense formula island.

Each block must include:

- `block_id`
- `label`
- `source_sheet`
- `range`
- `estimated_node_count`
- `estimated_edge_count`
- `input_candidates`
- `output_candidates`
- `interest_score`
- `warnings`

## Recommendation Logic

The scanner must return a recommended path:

- `import_recommended_block`
- `import_recommended_sheet`
- `import_recommended_kpi_chain`
- `partial_only`
- `refuse`

The recommendation must also say:

- what is included,
- what is excluded,
- why that recommendation is safer than full import.

## Complexity Guardrails

The scanner should down-rank or refuse scopes likely to create unreadable graphs.

Examples:

- too many repeated tabular rows,
- too many formula cells for a first graph,
- too many unresolved references,
- too many disconnected regions,
- too many outputs with no obvious decision relevance.

## Refusal Policy

When refusing, always provide:

- a plain-language reason,
- the strongest alternative,
- whether a smaller partial import is possible.

Example alternatives:

- target one KPI,
- select one sheet,
- add a short business question,
- describe the relationships to model if the workbook is mostly raw data.

## Acceptance Criteria

Qualification is ready when:

1. It produces a verdict without trying to build the graph.
2. It explains the verdict in plain language.
3. It proposes a recommended import scope when possible.
4. It refuses clearly when Smart Graph would not add value.
5. It protects the rest of the pipeline from oversized or low-value imports.
