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
- package exports in `src/index.ts`
- a basic pipeline test

## What did not ship yet

These ideas were present in the original notes but are still pending:

- `structure-debug` step
- `call-llm` step, if still justified
- a composed pipeline under `src/pipelines/`
- an opinionated runnable example entrypoint

## Practical interpretation

The project is past “empty scaffold” status, but still before the first full workflow.

Current status:

- core primitives exist
- package verification is working
- CI and environment issues were cleaned up
- the first real end-to-end use case is still the next important decision

## Design boundary

The useful part of the original v0 proposal was its restraint:

- explicit over magical
- composable over deeply abstract
- deterministic first
- LLM integration only when the non-LLM path is already clear

That should remain the default unless the project proves a stronger need.
