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
- `structureDebugStep` for producing a structured debug payload
- `debugPipeline` as the first composed end-to-end workflow

## Usage

```ts
import {
  createContext,
  debugPipeline,
} from '@finografic/ai-harness';

const result = await debugPipeline.run(undefined, createContext({ cwd: process.cwd() }));
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
