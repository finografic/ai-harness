# ai-harness — Roadmap

> **This is the primary high-level plan for the project.**
> Check this file before proposing new work. Add new items here when conceiving features.
> Keep it ordered by priority, and move completed work to the Done section at the bottom.

---

## How to use this file

| Tier | Meaning                                   |
| ---- | ----------------------------------------- |
| P0   | Active — being worked on now              |
| P1   | Next — fully scoped, ready to start       |
| P2   | Planned — direction decided, detail TBD   |
| P3   | Backlog — good ideas, not yet prioritised |

Each item should stay short and outcome-focused. Add a separate `TODO_*.md` or `DONE_*.md`
file only when a feature becomes large enough that the roadmap entry alone is not sufficient.
Reusable implementation guidance should live in `docs/`, not here.

---

## P0 — Active

### 1. Release Context Pipeline v1 and migrate the LLAAB consumer

The package-owned implementation is complete and verified locally. The remaining consumer phase is
release-gated: publish an explicitly approved new package version, update LLAAB's dependency, then
migrate extraction preparation to the new token, chunk, context-pack, typed-pipeline, and event
contracts.

Detail: [`./TODO_CONTEXT_PIPELINE_V1.md`](./TODO_CONTEXT_PIPELINE_V1.md)
Guide: [`../CONTEXT_PIPELINE_V1.md`](../CONTEXT_PIPELINE_V1.md)

---

## P1 — Next Up

### 2. Validate the debug pipeline inside the LLAAB consumer flow

The first composed debug pipeline now exists in this package. The next useful step is to validate
it from the real consumer side:

- install or wire it into the LLAAB monorepo
- confirm the exported debug payload shape is useful in practice
- identify any missing fields before adding more abstraction

Reference: [`../HARNESS_V0_REFERENCE.md`](../HARNESS_V0_REFERENCE.md)
Detail: [`./DONE_DEBUG_PIPELINE.md`](./DONE_DEBUG_PIPELINE.md)

### 3. Decide the next primary harness track

Now that the first real use case has landed, choose the next track intentionally:

- deepen the typecheck/debug workflow
- add more generic preprocessing utilities
- move toward long-input preparation aligned with the broader LLAAB harness direction

Consumer context matters here: this package is intended to be installed and used by the larger
LLAAB monorepo, so the next track should be chosen based on the consumer integration path rather
than on standalone package neatness.

---

## P2 — Planned

### 4. Long-input harness direction

If this package becomes the reusable version of the broader harness idea, the next major layer is
around input preparation before model execution:

- token counting
- chunking long inputs
- structured context assembly
- deterministic routing or selection decisions

The package-side API is implemented by Context Pipeline v1. Keep this item until the published API
has been validated through LLAAB's real extraction flow.

### 5. Developer environment resilience

Most of the friction so far has been environment/runtime setup rather than package code. Revisit
only if the problem recurs:

- Husky behavior if Codex/runtime mismatch becomes persistent friction
- possible helper tooling beyond the existing documented bootstrap

No `package.json` script changes are required right now.

---

## P3 — Backlog / Ideas

### Library vs executable boundary

Decide whether `@finografic/ai-harness` should remain a small composable library only, or whether
it should also ship first-party runnable workflows or CLI-style entrypoints.

### Additional step families

Potential future step groups, only after the first real use case is proven:

- prompt/context shaping
- chunk merge/reduce stages
- model invocation adapters
- result validation/repair stages

---

## Done

| Date       | Item                                                                                         |
| ---------- | -------------------------------------------------------------------------------------------- |
| 2026-05-28 | First composed debug pipeline shipped — [`DONE_DEBUG_PIPELINE.md`](./DONE_DEBUG_PIPELINE.md) |
| 2026-05-28 | Added explicit debug-pipeline detail doc and folded in LLAAB consumer context                |
| 2026-05-28 | Roadmap consolidated; scaffold/todo notes moved into reference docs under `docs/`            |
| 2026-05-28 | Environment bootstrap documented in `CODEX.md`; Codex setup script corrected                 |
| 2026-05-28 | Markdown/CI follow-up completed; todo docs reformatted; CI passing                           |
| 2026-05-26 | v0 scaffold shipped — context, pipeline, core steps, exports, test, and README alignment     |
