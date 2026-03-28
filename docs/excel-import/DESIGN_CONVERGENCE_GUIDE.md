# Design Convergence Guide

## Purpose

This initiative should not produce a polished front layer that later needs to be replaced by the "real" product UI.

The design goal is convergence:

- one product,
- one visual language,
- one interaction logic,
- multiple entry points.

## Product Effect To Preserve

Smart Graph should feel:

- serious,
- calm,
- structured,
- intelligent,
- progressively clarifying.

It should not feel:

- flashy first and useful second,
- like a marketing shell hiding a separate product,
- like an Excel clone with nicer colors.

## Design Center Of Gravity

The current graph page in column mode is the strongest product expression.

Why:

- it exposes model structure immediately,
- it creates a strong mental model,
- it balances density and clarity,
- it already feels like a real tool, not a demo.

That means the rest of the product should converge toward it.

## Convergence Rule By Page

### Landing

The landing should promise the real product.

It should move toward:

- real workspace-derived visuals,
- real parameter / calculation / result logic,
- clearer proof of what the tool actually does.

It should move away from:

- abstract storytelling disconnected from the actual interface,
- overly generic AI-product hero patterns.

### Dashboard

The dashboard should act as a preparation workspace.

It should:

- collect intent,
- qualify files,
- recommend next steps,
- transition naturally into the graph.

It should not feel like a separate mini-product with a different grammar.

### Excel Qualification Flow

This should be an extension of the dashboard, not a separate import app.

Its UI should reuse:

- the same shell,
- the same section rhythm,
- the same card logic,
- the same status language.

### Graph

This remains the canonical destination and truth layer.

Enhancements for import should be added as:

- summaries,
- warnings,
- recommendations,
- scenarios,

within or alongside the existing graph workspace.

### Dashboard / Insight Widgets

These are secondary.

They should synthesize the model, but they should not replace the graph as the main explanation surface until they reach the same maturity.

## Durable Primitives To Build

Prefer durable primitives over page-specific one-offs:

- workspace shell,
- stage / progress panel,
- summary card,
- recommendation card,
- warning / refusal banner,
- import scope card,
- section header,
- empty state,
- success state.

These should be usable across:

- landing proof modules,
- dashboard qualification,
- import selection,
- graph side panels,
- dashboard synthesis.

## Motion And Visual Tone

Motion should support comprehension, not spectacle.

Use motion for:

- stage transitions,
- panel reveals,
- loading progression,
- emphasis of recommended actions.

Avoid motion that makes the flow feel ornamental or marketing-heavy.

## Roadmap Implication

Add a transverse design-convergence track to every product phase.

### Phase 1

- define shared shells and status states,
- keep qualification in the dashboard system.

### Phase 2

- define reusable recommendation and import-scope cards,
- align qualification visuals with graph workspace language.

### Phase 3

- land imports in graph column mode,
- add import summary and warnings inside the real workspace.

### Phase 4

- align landing proof modules with real product structure,
- improve dashboard synthesis only if it stays product-native.

## Review Questions

Before shipping any UI in this initiative, ask:

1. Does this screen feel like the same product as the graph page?
2. Could this UI survive long term without being rebuilt?
3. Does it teach the user the Smart Graph mental model?
4. Does it reduce the distance between marketing, onboarding, and product reality?
5. Does it make the real product stronger instead of adding a parallel layer?
