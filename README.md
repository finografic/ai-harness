# `@finografic/ai-harness`

Deterministic, composable harness primitives for preprocessing and inspecting inputs before
LLM usage.

## Installation

```bash
pnpm add @finografic/ai-harness
```

## v0 Scope

This package currently ships a small explicit core:

- `createContext()` for cwd + trace + step budget state
- `createPipeline()` for sequential step execution
- `runTypecheckStep` for local TypeScript command execution
- `extractErrorsStep` for parsing `tsc` output
- `createSliceCodeStep()` for attaching local code excerpts to parsed errors

## Usage

```ts
import {
  createContext,
  createPipeline,
  createSliceCodeStep,
  extractErrorsStep,
  runTypecheckStep,
} from '@finografic/ai-harness';

const pipeline = createPipeline({
  steps: [runTypecheckStep, extractErrorsStep, createSliceCodeStep()],
});

const result = await pipeline.run(undefined, createContext({ cwd: process.cwd() }));
```

## Development

```bash
pnpm build
pnpm lint
pnpm typecheck
pnpm test:run
```

## License

MIT © Justin Rankin
