# Harness v0 Reference

This note captures what the initial harness scaffold was trying to establish, and what actually
shipped.

## Intended v0 shape

The original v0 direction was a small explicit pipeline system:

- context object with cwd, trace, and step budget
- sequential pipeline execution
- small utilities for command execution and file reads
- deterministic steps for typecheck-driven debugging

The early step sequence was:

```txt
run-typecheck
→ extract-errors
→ slice-code
→ structure-debug
→ optional call-llm
```

## Compressed v0 rules

The strongest parts of the original design guidance were the constraints:

### Build now

- one real debug pipeline
- boring deterministic steps
- loose-enough types to keep moving
- step budget as a stub, not full token accounting

### Do not build yet

- generic factories
- multiple pipeline families
- AST-heavy logic
- model routing
- generic “perfect” abstraction layers

## What shipped

The package currently includes:

- `src/core/context.ts`
- `src/core/types.ts`
- `src/core/pipeline.ts`
- `src/utils/exec.ts`
- `src/utils/fs.ts`
- `src/steps/run-typecheck.ts`
- `src/steps/extract-errors.ts`
- `src/steps/slice-code.ts`
- `src/steps/structure-debug.ts`
- `src/pipelines/debug.pipeline.ts`
- package exports in `src/index.ts`
- focused tests for the pipeline pieces

## What did not ship yet

These ideas were present in the original notes but are still pending:

- `call-llm` step, if still justified
- an opinionated runnable example entrypoint

## Testing guidance from the original v0 discussion

The original implementation guidance was intentionally narrow:

- test `extract-errors`
- test `slice-code`
- do not spend early momentum on heavyweight integration tests unless the first real workflow
  requires them

## Practical interpretation

The project is past “empty scaffold” status, but still before the first full workflow.

Current status:

- core primitives exist
- one real composed debug pipeline exists
- package verification is working
- CI and environment issues were cleaned up
- the next important decision is whether to deepen the debug track or pivot toward broader
  harness preparation work

## Design boundary

The useful part of the original v0 proposal was its restraint:

- explicit over magical
- composable over deeply abstract
- deterministic first
- LLM integration only when the non-LLM path is already clear

Short version:

> Structure is the product. LLM is optional.

That should remain the default unless the project proves a stronger need.
