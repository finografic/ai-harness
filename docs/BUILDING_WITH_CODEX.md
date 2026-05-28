# Building With Codex

This note captures the reusable parts of the original scaffold guide. It is not a planning
document. Use it when you want Codex to help build a small package without drifting into
architecture churn.

## Core stance

Use Codex as a **code generator**, not a repo explorer.

Bad prompt shape:

```txt
build me a harness package based on our discussion
```

That usually causes:

- broad repo exploration
- abstraction drift
- unnecessary architecture decisions

Better prompt shape:

1. Define the exact file to create or update.
2. State explicit constraints.
3. Keep the request local to that file or small file group.

## Good scaffolding workflow

1. Create the empty package structure yourself.
2. Keep the target scope narrow.
3. Ask for one file or one small cluster at a time.
4. Run the real verification command after a useful batch of work.

For this package shape, the initial file structure was:

```txt
src/
  core/
  steps/
  utils/
```

## Prompt pattern

Use prompts shaped like this:

```txt
STRICT RULES:

- Do NOT explore the repo
- Do NOT open unrelated files
- Do NOT infer anything outside this prompt
- Generate ONLY what is explicitly requested
- Keep code minimal, explicit, no abstractions

Context:

- TypeScript (strict)
- ESM
- No frameworks
- explicit > implicit

TASK:
Create file: src/core/context.ts

Requirements:

- define HarnessContext
- include cwd, budget.steps, trace[]
- include createContext()

Return ONLY the file content.
```

## Preferred cadence

The safest loop for early package work is:

1. Ask for a concrete file.
2. Apply the result.
3. Batch a few related files.
4. Run one meaningful verification pass.

## Failure modes to reject early

- Over-abstraction such as builders, factories, or plugin systems before they are needed
- “Helpful” extra layers like config systems or logging frameworks
- Design changes that were not requested

When that happens, restate the boundary:

```txt
Do not change the architecture. Follow instructions exactly.
```

## Where Codex is strongest here

- boilerplate generation
- small refactors
- repetitive step definitions
- type-error repair

## Where you should stay opinionated

- overall architecture
- package boundaries
- pipeline composition
- what is intentionally deferred

