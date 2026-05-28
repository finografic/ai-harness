# ai-harness — Handoff

## Project

`@finografic/ai-harness` — deterministic, composable harness primitives for preprocessing and
inspecting inputs before LLM usage.

Current phase: v0 scaffold and first composed debug pipeline shipped, docs/roadmap recently
consolidated, next work should be driven by the LLAAB consumer integration path.

## Architecture

Current library shape is small and explicit:

- `src/core/` contains the context, pipeline, and core step contracts
- `src/pipelines/` contains the first composed workflow
- `src/steps/` contains deterministic step implementations
- `src/utils/` contains small execution and filesystem helpers
- `src/index.ts` exports the public package surface

Important boundary:

- this package is currently a library, not a CLI or executable workflow package
- one higher-level debug pipeline now exists
- LLM-specific behavior is still deferred

## Stack

- TypeScript (strict, ESM)
- pnpm
- tsdown
- vitest
- oxlint
- oxfmt
- husky + lint-staged

## Schema / Types

| Type                   | Purpose                                                |
| ---------------------- | ------------------------------------------------------ |
| `HarnessTrace`         | Per-step trace entry with step name and timestamp      |
| `HarnessBudget`        | Mutable execution budget state, currently step count   |
| `HarnessContext`       | Runtime context containing cwd, budget, and trace      |
| `HarnessStep<I, O>`    | Async deterministic pipeline step contract             |
| `HarnessPipeline`      | Sequential pipeline contract                           |
| `TypecheckResult`      | Raw result wrapper for the `pnpm typecheck` step       |
| `TypeScriptError`      | Parsed `tsc` error shape                               |
| `ExtractedErrors`      | Collection of parsed TypeScript errors                 |
| `CodeExcerpt`          | Snippet metadata for contextual source slices          |
| `SlicedError`          | Parsed TS error enriched with absolute path and excerpt |
| `SlicedErrors`         | Collection of enriched sliced errors                   |
| `StructuredDebugError` | Flattened debug-ready error shape                      |
| `StructuredDebugPayload` | Final structured debug payload                       |

## Public API

Current package exports:

- `createContext`
- `createPipeline`
- `runTypecheckStep`
- `extractErrorsStep`
- `createSliceCodeStep`
- `structureDebugStep`
- `debugPipeline`
- `runCommand`
- `readTextFile`
- related public types from those modules

## Commands

| Command              | Status | Notes                                          |
| -------------------- | ------ | ---------------------------------------------- |
| `pnpm format:check`  | Done   | Passing in the intended local Node/pnpm setup  |
| `pnpm format:fix`    | Done   | Passing                                         |
| `pnpm lint`          | Done   | Passing                                         |
| `pnpm typecheck`     | Done   | Passing                                         |
| `pnpm test:run`      | Done   | Passing                                         |
| `pnpm build`         | Done   | Passing                                         |

## Decisions

1. The first real composed workflow is the typecheck/debug pipeline; use that as the concrete
   baseline before widening the package scope. (2026-05-28)
2. Keep the package library-first for now; do not add CLI-style workflow entrypoints until a
   concrete use case justifies them. (2026-05-28)
3. Keep the roadmap lean and move reusable scaffold/reference material into `docs/` instead of
   leaving it under `docs/todo/`. (2026-05-28)
4. Do not change `package.json` scripts just to accommodate Codex runtime friction; fix the
   environment/bootstrap instead. (2026-05-28)
5. Ship a minimal explicit v0 scaffold first, then decide the first real workflow afterwards.
   (2026-05-26)

## Open Questions

1. Is the shipped debug payload shape sufficient for the real LLAAB consumer flow, or are
   additional fields needed?
2. Should the next step deepen the debug track, or should the package pivot toward long-input
   harness preparation aligned with LLAAB?
3. Is a stub `call-llm` step useful as part of a later phase, or is it just noise until a real
   integration exists?

## Status

Implemented and shipped:

- v0 scaffold from commit `9521f54`
- context, pipeline, step contracts, deterministic core steps, exports, test, and README updates
- composed debug pipeline with `structure-debug` and `src/pipelines/debug.pipeline.ts`
- CI and markdown/doc cleanup after the scaffold
- environment bootstrap documentation in `CODEX.md`
- `v0.0.1` tag exists on `master`

Current docs layout:

- roadmap: `docs/todo/ROADMAP.md`
- reusable Codex/scaffold guidance: `docs/BUILDING_WITH_CODEX.md`
- v0 reference/status: `docs/HARNESS_V0_REFERENCE.md`
- completed debug pipeline note: `docs/todo/DONE_DEBUG_PIPELINE.md`

Current working tree state:

- docs consolidation follow-up, debug pipeline implementation, and handoff updates are local
  changes right now
- there are also unrelated local changes already present under `.github/`, `AGENTS.md`,
  `.gitignore`, and an untracked `Icon` file
- be careful not to sweep unrelated work into the next commit unless explicitly intended
