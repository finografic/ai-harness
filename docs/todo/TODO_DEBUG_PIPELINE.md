# TODO_DEBUG_PIPELINE

## Goal

Build one real end-to-end debug pipeline on top of the existing v0 primitives.

This is the first concrete workflow for `@finografic/ai-harness`, and it should stay small,
explicit, and useful to the package consumer in LLAAB.

## Locked v0 scope

### Must have

- pipeline runner
- `run-typecheck`
- `extract-errors`
- `slice-code`
- `structure-debug`
- one composed debug pipeline under `src/pipelines/`

### Optional

- `call-llm` step only if it adds immediate value

### Must not build yet

- generic step factories
- advanced typing gymnastics
- multiple pipelines
- AST-based extraction
- token-budget enforcement beyond the current step counter stub
- model routing

## Success condition

Calling the debug pipeline should return structured JSON shaped for debugging or follow-on
automation, not just a pile of raw terminal output.

Target flow:

```txt
pnpm typecheck
→ raw output
→ parsed errors
→ code slices
→ structured debug payload
```

## Notes

- Structure is the product. LLM integration is optional.
- Prefer a library-first result over introducing a runnable entrypoint too early.
- If a `call-llm` step is added later, it should come after the non-LLM debug payload is already
  useful on its own.

