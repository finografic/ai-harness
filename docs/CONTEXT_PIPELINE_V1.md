# Context Pipeline v1

`@finografic/ai-harness` provides deterministic, provider-neutral preparation before model-facing
work. It does not invoke models or own application policy.

## Boundary

The package owns:

- typed sequential pipelines
- run limits, cancellation, failures, and lifecycle events
- bounded process and project-file adapters
- deterministic context selection, costs, provenance, and chunking
- privacy-safe run records and context-pack evaluation

Callers own:

- model and provider selection
- prompts and application schemas
- tool execution policy and agent loops
- provider-specific token counters and model context-window discovery
- persistence and product-specific telemetry

## Typed Pipelines

`createPipeline()` infers the input from the first step and the output from the last step. Adjacent
steps must compose.

```ts
import { createPipeline } from '@finografic/ai-harness';
import type { HarnessStep } from '@finografic/ai-harness';

const parse: HarnessStep<string, number> = {
  name: 'parse',
  async run(input) {
    return Number(input);
  },
};

const describe: HarnessStep<number, { value: number }> = {
  name: 'describe',
  async run(input) {
    return { value: input };
  },
};

const pipeline = createPipeline({ steps: [parse, describe] });
const result = await pipeline.run('42'); // { value: number }
```

Use `createDynamicPipeline()` when step types are genuinely known only at runtime. An empty
`createPipeline({ steps: [] })` remains an identity pipeline for v0 compatibility.

## Bounded Runs

Create an explicit context when the caller needs run evidence:

```ts
import { createContext } from '@finografic/ai-harness';

const context = createContext({
  cwd: process.cwd(),
  limits: {
    maxSteps: 4,
    deadline: Date.now() + 30_000,
  },
  runId: 'extraction-123',
});

const result = await pipeline.run('42', context, {
  signal: abortController.signal,
});
```

The context retains:

- configured `limits`
- separate started, completed, failed, and cancelled `usage`
- privacy-safe step lifecycle `events`
- the legacy `budget.steps` counter and name/timestamp `trace`

`HarnessRunError` preserves the original cause, failing step, failure reason, usage, and partial
events. Deadlines become cancellation signals and are checked at step boundaries. Long-running
steps must cooperate with `context.signal`; `runProcess()` does this automatically.

Event sinks are observational. Sink failures are collected in `context.eventSinkErrors` and do
not change the pipeline result.

## Context Packs

Context packs keep selection separate from prompt rendering:

```ts
import {
  createCharacterHeuristicTokenCounter,
  prepareContextPack,
} from '@finografic/ai-harness';

const pack = await prepareContextPack({
  budget: {
    maxTokens: 8_192,
    reservedOutputTokens: 1_024,
  },
  candidates: [
    {
      content: articleText,
      id: 'article-body',
      relevance: 10,
      source: {
        id: articleId,
        kind: 'article',
        location: articleUrl,
        trust: 'untrusted',
      },
    },
  ],
  policyId: 'article-extraction-v1',
  tokenCounter: createCharacterHeuristicTokenCounter({ charactersPerToken: 4 }),
});
```

The result records:

- ordered selected candidates
- stable selection and drop reasons
- byte, character, and token costs
- exact versus estimated counting method
- counter name and version
- total and per-category budget usage
- source and chunk provenance

Equal scores are ordered by stable source and candidate IDs. A token-counter failure throws
`TokenCountError`; fallback is never implicit. Supply a separately identified fallback counter if
the application permits approximation.

## Chunking

`chunkTextCandidate()` requires an explicit strategy. The package includes:

- `characterChunkStrategy` for fixed character windows
- `paragraphChunkStrategy` for paragraph-aware boundaries with a bounded fallback

Callers can provide a `TextChunkStrategy` for syntax, sentence, transcript, or document boundaries.
Every chunk receives stable IDs and parent provenance.

## Process and File Safety

Use `runProcess()` with an executable and argument array. Shell parsing is disabled by default.
The adapter supports cancellation, timeout, output byte limits, environment policy, and argument
redaction.

Use `readProjectTextFile()` with explicit allowed roots. It resolves real paths, rejects traversal
and symlink escapes, bounds file reads, and returns typed failure or truncation results.

The compatibility helpers `runCommand()` and `readTextFile()` are deprecated because they retain
the old unbounded or shell-oriented semantics.

## Run Records and Evaluation

`createHarnessRunRecord()` creates a JSON-safe record without working paths, inputs, prompts,
command output, or source contents. `normaliseHarnessRunRecord()` zeroes time-dependent fields for
stable snapshot tests.

`evaluateContextPack()` evaluates coverage, provenance, budget adherence, and selection accounting
without participating in pack generation.

`harnessEventsToControlStages()` maps lifecycle pairs to a structural shape compatible with
LLAAB's `ControlStage`. It includes run identity, duration, usage, and failure classification, but
not step contents.

## LLAAB Migration and Release Order

The current LLAAB checkout consumes published `@finografic/ai-harness@0.1.0`. The new APIs must be
released under an explicitly approved new package version before LLAAB source is committed against
them.

Required order:

1. Complete package review and approve a version/release.
2. Publish the new harness package.
3. Update LLAAB's dependency and lockfile.
4. Replace LLAAB's local heuristic with an injected harness token counter.
5. Replace local generic chunking with `chunkTextCandidate()` and context-pack preparation.
6. Remove the final pipeline result cast.
7. Map harness events to `ControlStage` and remove manually duplicated lifecycle stages.
8. Run the affected LLAAB ingestion tests and package typecheck.

Ollama context discovery, extraction instructions, `ControlContext`, and model execution remain in
LLAAB.

## Compatibility Notes

- Existing `createContext({ cwd })` calls remain valid.
- `budget.steps` and `trace` remain populated.
- Existing non-empty pipelines gain inferred types without a runtime behaviour change.
- Empty pipelines remain identity pipelines.
- Debug-pipeline payloads retain their existing fields; unmatched compiler output and truncation
  metadata appear only when applicable.
- No provider SDK or OpenTelemetry semantic-convention type is part of the public core.
