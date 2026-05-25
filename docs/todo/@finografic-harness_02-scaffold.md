You *can* use Claude Code to scaffold this — just don’t fall back into letting it “figure things out”.

You want:

> **Claude as a code generator, not a repo explorer**

------

# The correct way to use Claude Code here

## ❌ Don’t do this

```txt
“build me a harness package based on our discussion”
```

That triggers:

- repo exploration
- abstraction drift
- over-engineering
- subagents

------

## ✅ Do this instead (critical pattern)

You give Claude:

1. **Exact file structure**
2. **Exact constraints**
3. **File-by-file generation**

👉 You *drive*, Claude *types*

------

# Step-by-step (clean workflow)

## 1. Create empty package yourself

```bash
pnpm create package @finografic/harness
```

(or however you scaffold in your monorepo)

Then create folders:

```txt
src/
  core/
  steps/
  pipelines/
  utils/
```

------

## 2. Open Claude Code in THAT folder only

This is important.

👉 Do NOT open from monorepo root
👉 Do NOT give access to other repos

------

## 3. Use THIS prompt (copy exactly)



We are scaffolding a minimal package.

```typescript
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

We are building a small pipeline system with:

- HarnessStep
- HarnessPipeline
- simple sequential execution

------

TASK 1:
Create file: src/core/context.ts

Requirements:

- define HarnessContext
- include cwd, budget.steps, trace[]
- include createContext()

Return ONLY the file content.
```



------

## 4. Then iterate file-by-file

Next prompt:

```txt
TASK 2:
Create file: src/core/types.ts

Requirements:
- HarnessStep<I, O>
- HarnessPipeline (loose typing for now)

Return ONLY the file content.
```

Then:

```txt
TASK 3:
Create file: src/core/pipeline.ts

Requirements:
- sequential execution
- updates ctx.budget.steps
- records trace
- no abstractions

Return ONLY the file content.
```

…and so on.

------

# Why this works (important)

You are:

- eliminating exploration
- eliminating planning
- eliminating architecture drift

👉 Claude becomes a **deterministic code emitter**

------

# Optional (faster but still safe)

If you want to speed up:

You can batch **small groups**, like:

```txt
Create these files:

- src/utils/exec.ts
- src/utils/fs.ts

Requirements:
- minimal implementations
- no extra features

Return each file clearly separated.
```

------

# ⚠️ What to watch for (Claude failure modes)

Even with constraints, Claude may try to:

### 1. Over-abstract

```ts
createStepFactory()
PipelineBuilder()
```

👉 Reject immediately

------

### 2. Add “helpful” features

- logging systems
- config layers
- plugin systems

👉 Reject

------

### 3. Change your design

👉 You say:

```txt
Do not change architecture. Follow instructions exactly.
```

------

# The “tight loop” workflow (best practice)

For each file:

1. Ask Claude
2. Paste result into file
3. Run TypeScript
4. Fix errors (Claude or manually)

👉 repeat

------

# Where Claude Code actually shines here

- writing boilerplate quickly
- small refactors
- fixing type errors
- generating repetitive step code

------

# Where you stay in control

- architecture
- step boundaries
- pipeline design
- what gets built

------

# Bonus: your “pin” idea (CLI injection) — minimal version

Once you have structure step working:

You can do:

```ts
import { exec } from "node:child_process"

exec(`echo "${prompt}" | claude`)
```

But:

👉 Only after your pipeline is stable
👉 Not during scaffolding

------

# Blunt advice (based on your usage patterns)

If you let Claude:

> “help design the harness”

You’ll recreate the exact problem you’re trying to solve.

If you use Claude to:

> “write exactly this file”

You’ll move fast *and* stay clean.

------

# If you want

I can generate a **Claude-ready prompt sequence (10–12 steps)** so you can just paste → paste → paste and scaffold the entire package cleanly.