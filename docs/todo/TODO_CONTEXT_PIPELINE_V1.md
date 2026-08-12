# TODO — Context Pipeline v1

> **Status:** Not started.
>
> 📅 Aug 11, 2026.

## Outcome

Evolve `@finografic/ai-harness` from a small sequential pipeline into a dependable,
provider-neutral boundary for preparing model-facing context.

The package should own deterministic pipeline execution, budgets, provenance, context selection,
and run events. Callers should continue to own model invocation, provider routing, prompts, tools,
agent loops, and product-specific control flow.

This is a focused v1 direction, not a general agent framework.

## Why This Belongs Here

The harness already provides the right foundation:

- explicit `HarnessContext`
- composable named steps
- deterministic sequential execution
- a trace and step counter
- a debug pipeline that prepares structured model input without invoking a model

LLAAB is also a real consumer. Its ingestion package already wraps extraction preparation in
`createPipeline()` and implements token estimation, chunking, context assembly, and budget
validation as local harness steps. That validates the package boundary and exposes concrete
capability gaps to solve here.

This work overlaps the broader context-engineering topics, but it does **not** make this package
the owner of `AGENTS.md`, skills, MCP configuration, Google ADK integration, or agent runtime
policy. Those belong in agent configuration, project templates, or application-specific runtime
projects.

## Current Evidence and Gaps

| Current behaviour                                     | Observed gap                                                       | Consequence                                                  |
| ----------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------------ |
| Pipeline inputs and outputs become `unknown`          | Composition loses the type relationship between steps              | LLAAB casts the final result                                 |
| Trace entries contain only step name and timestamp    | No completion, failure, duration, or usage event                   | Consumers maintain parallel stage records                    |
| `budget.steps` is a mutable counter                   | No configured limit or enforcement                                 | “Budget” describes usage but cannot constrain a run          |
| Steps have no cancellation signal or deadline         | Long-running commands cannot be stopped cooperatively              | Callers cannot reliably bound work                           |
| `runCommand()` accepts a shell command string         | Shell parsing and unbounded output are implicit                    | Unsafe defaults and weak resource control                    |
| Code slicing accepts arbitrary resolved paths         | No allowed-root or symlink containment check                       | A model-derived path could read outside the intended project |
| TypeScript diagnostic parsing is a single regex       | ANSI output, paths with spaces, and alternate formats are fragile  | Valid diagnostics can be silently omitted                    |
| Tests cover happy paths only                          | Failure, cancellation, budget, and reuse semantics are unspecified | Core behaviour can drift during expansion                    |
| LLAAB estimates tokens with `characters / 4`          | Approximation is not represented in the result                     | Budget confidence is hidden from downstream policy           |
| LLAAB assembles an application-specific prompt object | No reusable, structured context-pack contract                      | Proven preprocessing logic cannot be shared cleanly          |

## Target Boundary

```text
caller-owned sources and tools
            |
            v
structured context candidates
            |
            v
harness-owned deterministic transforms
normalize -> filter -> rank -> budget -> select -> order
            |
            v
ContextPack + run events
            |
            v
caller-owned prompt rendering, model routing, and execution
```

Keep three concerns distinct:

1. **Pipeline core** — typed execution, limits, cancellation, errors, and events.
2. **Context primitives** — source metadata, costs, selection, chunking, and packs.
3. **Adapters** — process execution, token counters, and optional telemetry integrations.

## Design Principles

- Deterministic first. The same inputs, policies, and budgets should produce the same pack.
- Structure is the product. Do not require an LLM to prepare or evaluate ordinary context.
- Make limits separate from measured usage.
- Preserve provenance through every transform and chunk.
- Represent estimates as estimates; never present approximate token counts as exact.
- Record lifecycle metadata by default, but do not record source contents or prompts by default.
- Use consumer evidence before adding abstractions.
- Keep the core free of provider SDKs and application-specific model discovery.
- Prefer a small explicit API over a highly generic workflow engine.

## Phase 0 — Freeze the Consumer Contract ✅

- [x] Capture the current LLAAB extraction-preparation input, output, and failure behaviour as
      consumer fixtures.
- [x] Record the current compatibility surface used by LLAAB:
  - `createContext()`
  - `createPipeline()`
  - `HarnessStep`
  - `context.budget.steps`
- [x] Add a package test that models the LLAAB step chain without importing LLAAB.
- [x] Decide whether typed composition can be added compatibly in `0.x` or requires one explicit
      breaking change.
- [x] Document deprecated surfaces before removing or renaming them.
- [x] Keep publishing and consumer migration out of this phase; prove the contract locally first.

Decision: typed tuple composition is additive in `0.x`. `createDynamicPipeline()` is the explicit
escape hatch for runtime-defined step lists. No v0 export is removed in this phase, so there is no
deprecated surface yet.

### Exit criteria

- [x] Existing v0 tests remain green.
- [x] The consumer fixture captures the shape that previously required a final-result cast and
      demonstrates duplicated consumer stage reporting.
- [x] The intended v1 compatibility strategy is recorded in this file or an accepted spec.

## Phase 1 — Make Pipeline Execution Typed and Bounded

### Typed composition

- [x] Preserve the input/output relationship across a tuple of steps.
- [x] Reject adjacent steps whose output and input types do not compose.
- [x] Infer the pipeline input from the first step and result from the last step.
- [x] Remove the need for a caller to cast `pipeline.run()` from `unknown`.
- [x] Prefer tuple overloads or a small builder over recursive public type machinery that produces
      unreadable TypeScript errors.
- [x] Retain an explicit escape hatch for genuinely dynamic pipelines.

### Limits and cancellation

- [ ] Split configured limits from observed usage, for example:
  - `limits.maxSteps`
  - `limits.deadline`
  - `usage.completedSteps`
- [ ] Enforce a step limit before starting the next step.
- [ ] Accept an `AbortSignal` at run level and expose it to every step.
- [ ] Define whether deadlines are converted into cancellation signals or checked between steps.
- [ ] Ensure a fresh context and usage record per run unless a caller explicitly supplies one.
- [ ] Prove that reusing one pipeline concurrently does not leak trace or budget state between runs.

### Failure semantics

- [ ] Define a typed `HarnessRunError` that retains:
  - failing step name and index
  - original cause
  - partial trace
  - measured usage
  - cancellation or limit reason when applicable
- [ ] Do not swallow step errors or replace their causes with formatted strings.
- [ ] Specify whether a failed step increments started-step usage, completed-step usage, or both.

### Exit criteria

- [ ] A composed pipeline returns its inferred final type.
- [ ] Type tests reject an incompatible step chain.
- [ ] Tests cover success, step failure, pre-abort, mid-run cancellation, deadline, step limit,
      repeated use, and concurrent use.

## Phase 2 — Add a Stable Run-Event Model

- [ ] Replace the name/timestamp-only trace with lifecycle events or derive the legacy trace from
      them.
- [ ] Give every run a stable run ID supplied by the caller or generated at the boundary.
- [ ] Emit step lifecycle data with at least:
  - run ID
  - step name and index
  - `started`, `completed`, `failed`, or `cancelled` status
  - start and end timestamps
  - duration
  - usage snapshot
  - structured failure classification without raw prompt or source content
- [ ] Support an optional event sink so consumers can stream events without coupling the core to a
      logger or telemetry vendor.
- [ ] Keep an in-memory event list available for small runs and tests.
- [ ] Define redaction rules and make payload/content capture explicitly opt-in.
- [ ] Provide a small LLAAB adapter or mapping example so `ControlStage` does not require a second,
      manually maintained lifecycle implementation.
- [ ] Treat OpenTelemetry GenAI and CLI semantic conventions as adapter targets while they remain
      development-stage conventions; do not copy unstable attribute names into core types.

### Exit criteria

- [ ] Every started step has one terminal event.
- [ ] Failure results retain events emitted before the failure.
- [ ] Tests assert event order and duration shape without depending on wall-clock timing.
- [ ] Default events contain no source text, prompts, command output, or secrets.

## Phase 3 — Harden Process and File Adapters

### Process execution

- [ ] Replace the shell-string default with a structured request such as executable plus argument
      array.
- [ ] Keep shell execution disabled by default; require an explicit opt-in when it is unavoidable.
- [ ] Add timeout, `AbortSignal`, and maximum stdout/stderr byte limits.
- [ ] Define truncation metadata instead of silently returning partial output.
- [ ] Make environment inheritance and overrides explicit.
- [ ] Define command and argument redaction for events and errors.
- [ ] Update the typecheck step to use the structured process adapter.
- [ ] Deprecate `runCommand(string, options)` rather than silently changing its semantics.

### Project file access

- [ ] Require one or more allowed roots for code-slice reads.
- [ ] Resolve real paths and reject traversal or symlink escapes outside allowed roots.
- [ ] Set maximum file and slice sizes.
- [ ] Return typed outcomes for missing, unreadable, out-of-root, and truncated files.
- [ ] Make accepted absolute-path behaviour explicit.

### Diagnostic extraction

- [ ] Strip ANSI sequences before parsing.
- [ ] Support paths containing spaces.
- [ ] Add fixtures for `.ts`, `.tsx`, `.mts`, and `.cts` diagnostics.
- [ ] Preserve unmatched diagnostic output as a bounded fallback instead of silently losing it.
- [ ] Keep compiler-specific parsing in an adapter, not in the generic pipeline core.

### Exit criteria

- [ ] Tests cover cancellation, timeout, non-zero exit, output truncation, spaces in paths, and
      environment overrides.
- [ ] Tests prove that traversal and symlink escapes cannot read outside the configured roots.
- [ ] The debug pipeline continues to produce its current structured payload for supported input.

## Phase 4 — Introduce Provider-Neutral Context-Pack Primitives

Define a small set of data contracts before extracting algorithms:

- [ ] `ContextSource` — stable ID, kind, location, freshness, trust, sensitivity, and provenance.
- [ ] `ContextCandidate<T>` — source plus structured content and optional caller-owned relevance.
- [ ] `ContextCost` — characters, bytes, and optional token count with `exact` or `estimated` method.
- [ ] `ContextBudget` — total limit, reserved output capacity, and optional per-category limits.
- [ ] `ContextSelection` — selected and dropped candidate IDs with explicit reasons.
- [ ] `ContextPack<T>` — ordered selected content, provenance, costs, budget summary, and policy ID.
- [ ] `TokenCounter` — injected interface; no provider SDK in the core package.

### Deterministic preparation

- [ ] Provide composable transforms for normalising, filtering, budgeting, selecting, and ordering
      candidates.
- [ ] Require stable tie-breakers so equal scores produce deterministic order.
- [ ] Keep scoring caller-supplied; do not add LLM ranking or embeddings to the core.
- [ ] Return a reason for every dropped candidate, such as duplicate, filtered, over budget, or
      invalid.
- [ ] Preserve source and parent IDs when a candidate is chunked.
- [ ] Allow chunk strategies to respect caller-defined boundaries and overlap.
- [ ] Never make character slicing the only chunking strategy.
- [ ] Return structured packs; leave prompt-string rendering to the caller.
- [ ] Make policies serialisable or identifiable so a result records how it was produced.

### Token accounting

- [ ] Support exact counters supplied by a model/provider adapter.
- [ ] Supply an explicitly labelled heuristic counter only if a dependency-free fallback is useful.
- [ ] Include reserved response capacity when determining the usable input budget.
- [ ] Record counter name/version and whether each result is exact or estimated.
- [ ] Define behaviour when token counting fails; do not silently fall back without metadata.

### Exit criteria

- [ ] Repeated preparation of the same candidates and policy produces the same pack.
- [ ] Pack cost never exceeds its enforceable input budget.
- [ ] Every selected and dropped item remains auditable by stable ID and reason.
- [ ] Tests cover exact and estimated counters, ties, duplicates, chunk provenance, budget edges,
      and counter failure.

## Phase 5 — Extract the Proven LLAAB Preparation Logic

- [ ] Keep Ollama model discovery and application model selection in LLAAB.
- [ ] Have LLAAB supply the resolved context limit and, when available, a token counter.
- [ ] Replace LLAAB's local character estimator with the harness counter contract while preserving
      an explicitly labelled fallback.
- [ ] Move only generic, proven chunking and pack-building behaviour into this package.
- [ ] Keep extraction prompt shape and schema-specific fields in LLAAB.
- [ ] Replace the final `as PreparedExtractionInput` cast with inferred pipeline output.
- [ ] Map harness events to LLAAB control events or retire the duplicated manual lifecycle events.
- [ ] Compare old and new outputs using real short-article and long-article fixtures.
- [ ] Verify that the model-facing call remains behind LLAAB's existing control and routing
      boundary.

### Exit criteria

- [ ] LLAAB's short-input and chunked-input tests pass without a result cast.
- [ ] Context-window calculations preserve response reserve and model-specific limits.
- [ ] No provider SDK, extraction schema, or LLAAB control policy has moved into the harness.
- [ ] The package API is validated by a real consumer before further generalisation.

## Phase 6 — Evaluation and Observability Fixtures

- [ ] Add deterministic evaluation fixtures for:
  - context coverage
  - provenance preservation
  - dropped-item reasons
  - budget adherence
  - idempotency
  - cancellation and partial-run records
- [ ] Keep evaluators separate from the pipeline that produced the pack.
- [ ] Add a machine-readable run record suitable for snapshot tests and later telemetry adapters.
- [ ] Normalise nondeterministic fields before snapshots rather than omitting useful lifecycle data.
- [ ] Define a privacy test proving default run records exclude raw context and command output.
- [ ] Consider an OpenTelemetry adapter only after the internal event contract is proven and the
      target semantic conventions are sufficiently stable.

## Explicit Non-Goals

- Model invocation or provider SDK integration in the core package
- Model selection, fallback, or cost routing
- Prompt ownership or application-specific schemas
- Agent loops, planners, subagents, or multi-agent orchestration
- MCP servers, Google ADK integration, or remote tool discovery
- `AGENTS.md`, `CLAUDE.md`, skill, memory, or project-instruction generation
- Persistent queues, databases, schedulers, or background workers
- LLM-based ranking, summarisation, compression, or evaluation in the deterministic core
- A general DAG/workflow engine
- A public CLI unless a proven consumer requires one

## Suggested Commit Slices

1. `test(harness): capture consumer pipeline contract`
2. `feat(harness): preserve pipeline composition types`
3. `feat(harness): add limits cancellation and run errors`
4. `feat(harness): add structured run events`
5. `refactor(harness): harden process and file adapters`
6. `feat(harness): add context pack contracts`
7. `feat(harness): add deterministic context selection`
8. `test(harness): add evaluation and privacy fixtures`
9. Consumer repository: migrate LLAAB preparation to the proven API

Do not combine package publishing or broad LLAAB refactors with these implementation commits.

## Validation

Run the narrowest relevant test while implementing, then complete one package verification pass:

```bash
pnpm test:run
pnpm typecheck
pnpm lint
pnpm format:check
pnpm build
```

For the consumer migration, also run the directly affected LLAAB ingestion tests and package
typecheck. Record package and consumer verification separately.

## Completion Criteria

- [ ] Pipeline composition is type-safe from first input to final output.
- [ ] Limits constrain execution; usage reports what actually happened.
- [ ] Cancellation and typed failures preserve partial run evidence.
- [ ] Default process and file adapters are bounded and safe.
- [ ] Context packs expose provenance, deterministic selection, costs, and drop reasons.
- [ ] Approximate token counts are visibly approximate.
- [ ] LLAAB consumes the API without a final result cast or duplicated step lifecycle bookkeeping.
- [ ] Model routing and application policy remain outside this package.
- [ ] Tests prove determinism, isolation, budget enforcement, privacy defaults, and unsafe-path
      rejection.
- [ ] Any breaking API change is documented before release.
- [ ] This file is renamed to `DONE_CONTEXT_PIPELINE_V1.md` when all required items are complete.

## References

- [Project README](/README.md)
- [Project roadmap](/docs/todo/ROADMAP.md)
- [V0 architecture reference](/docs/reference/V0_ARCHITECTURE.md)
- [Anthropic: Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- [Anthropic: Effective harnesses for long-running agents](https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents)
- [Anthropic: Harness design for long-running application development](https://www.anthropic.com/engineering/harness-design-long-running-apps)
- [Anthropic: Scaling managed agents by decoupling the brain from the hands](https://www.anthropic.com/engineering/managed-agents)
- [Anthropic: Demystifying evals for AI agents](https://www.anthropic.com/engineering/demystifying-evals-for-ai-agents)
- [OpenTelemetry semantic conventions](https://opentelemetry.io/docs/specs/semconv/)
- [OpenTelemetry CLI span conventions](https://opentelemetry.io/docs/specs/semconv/cli/cli-spans/)
