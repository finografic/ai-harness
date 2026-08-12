# `@finografic/ai-harness`

Small, deterministic pipeline primitives for preparing and structuring data before optional LLM
usage.

The package is intentionally narrow:

- compose async steps in order
- keep runtime context explicit
- turn noisy inputs into structured payloads
- stay useful even when no model call is involved

## Installation

```bash
pnpm add @finografic/ai-harness
```

## What it includes

Current public surface:

- `createContext()` for runtime state such as `cwd`, `trace`, and step budget
- `createPipeline()` for composing explicit sequential workflows
- `runTypecheckStep` for local TypeScript command execution
- `extractErrorsStep` for parsing `tsc` output
- `createSliceCodeStep()` for attaching local source excerpts
- `structureDebugStep` for producing a structured debug payload
- `debugPipeline` as the first ready-made composed workflow

## Quick start

Use the built-in debug pipeline to turn `pnpm typecheck` output into structured JSON:

```ts
import { createContext, debugPipeline } from '@finografic/ai-harness';

const result = await debugPipeline.run(undefined, createContext({ cwd: process.cwd() }));

console.log(JSON.stringify(result, null, 2));
```

The resulting payload is shaped like:

```ts
{
  task: 'fix-type-errors',
  errors: [
    {
      file: 'src/example.ts',
      absoluteFilePath: '/absolute/path/to/src/example.ts',
      line: 12,
      column: 7,
      code: 'TS2322',
      message: 'Type ... is not assignable to type ...',
      snippet: '  11 | ...\n  12 | ...\n  13 | ...'
    }
  ]
}
```

## Configuration

The package keeps configuration minimal.

### `createContext({ cwd })`

- `cwd`: working directory used by steps that read files or run local commands

### `createSliceCodeStep({ contextLines })`

- `contextLines`: number of surrounding lines to include on either side of the failing line
- default: `3`

## Composing your own pipeline

You can compose the exported steps yourself when you need a different flow:

```ts
import {
  createContext,
  createPipeline,
  createSliceCodeStep,
  extractErrorsStep,
  runTypecheckStep,
  structureDebugStep,
} from '@finografic/ai-harness';

const pipeline = createPipeline({
  steps: [runTypecheckStep, extractErrorsStep, createSliceCodeStep({ contextLines: 2 }), structureDebugStep],
});

const result = await pipeline.run(undefined, createContext({ cwd: process.cwd() }));
```

## Current scope

This package currently focuses on deterministic preprocessing and structuring.

Intentionally not included yet:

- model routing
- token budgeting beyond the current step counter stub
- AST-heavy analysis
- CLI entrypoints

## Further reading

- roadmap: [docs/todo/ROADMAP.md](./docs/todo/ROADMAP.md)
- v0 reference: [docs/HARNESS_V0_REFERENCE.md](./docs/HARNESS_V0_REFERENCE.md)
- Codex/scaffold guidance: [docs/BUILDING_WITH_CODEX.md](./docs/BUILDING_WITH_CODEX.md)

## Development

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test:run
pnpm build
```

## License

MIT © [Justin Rankin](https://github.com/finografic)
