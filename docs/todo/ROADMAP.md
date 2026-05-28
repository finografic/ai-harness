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

_Nothing active right now._

---

## P1 — Next Up

### 1. Complete the first composed debug pipeline

The package ships the v0 primitives already, but not the higher-level assembled workflow.
Finish the first end-to-end pipeline on top of the current core:

- add a `structure-debug` step
- decide whether a stub `call-llm` step is still useful or just noise
- add a composed debug pipeline under `src/pipelines/`
- decide whether the package should expose an example runnable entry or stay library-only

Scope should stay explicit and deterministic. Do not add abstraction layers just to look
"framework-ready."

Reference: [`../HARNESS_V0_REFERENCE.md`](../HARNESS_V0_REFERENCE.md)

### 2. Decide the first real harness use case

The current scaffold proves the package shape. Next we need to choose the first real technical
driver so the package does not drift into generic tooling. Candidate directions implied by the
original notes:

- typecheck/debug assistance pipeline
- structured preprocessing before LLM usage
- transcript or long-input preparation pipeline aligned with the larger LLAAB direction

This choice should drive the next concrete API additions.

---

## P2 — Planned

### 3. Long-input harness direction

If this package becomes the reusable version of the broader harness idea, the next major layer is
around input preparation before model execution:

- token counting
- chunking long inputs
- structured context assembly
- deterministic routing or selection decisions

This is still directional, not yet committed to a concrete API in this package.

### 4. Developer environment resilience

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

| Date       | Item                                                                                      |
| ---------- | ----------------------------------------------------------------------------------------- |
| 2026-05-28 | Roadmap consolidated; scaffold/todo notes moved into reference docs under `docs/`         |
| 2026-05-28 | Environment bootstrap documented in `CODEX.md`; Codex setup script corrected              |
| 2026-05-28 | Markdown/CI follow-up completed; todo docs reformatted; CI passing                        |
| 2026-05-26 | v0 scaffold shipped — context, pipeline, core steps, exports, test, and README alignment |
