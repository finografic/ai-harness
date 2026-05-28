# DONE_DEBUG_PIPELINE

## Goal

Build one real end-to-end debug pipeline on top of the existing v0 primitives.

Status: completed on 2026-05-28.

## What shipped

- `run-typecheck`
- `extract-errors`
- `slice-code`
- `structure-debug`
- `src/pipelines/debug.pipeline.ts`
- package export for `debugPipeline`
- focused tests for `extract-errors`, `slice-code`, and `structure-debug`

Resulting flow:

```txt
pnpm typecheck
→ raw output
→ parsed errors
→ code slices
→ structured debug payload
```

## What was intentionally deferred

- `call-llm` step
- executable or CLI-style entrypoint
- heavier abstraction layers
- AST-based analysis
- token-budget enforcement beyond the current step counter stub
- model routing

## Outcome

The package now has one real composed workflow instead of only disconnected primitives.

That makes the next phase much clearer:

- validate the pipeline inside the LLAAB consumer flow
- decide whether to deepen the debug track or pivot toward broader harness preparation work
