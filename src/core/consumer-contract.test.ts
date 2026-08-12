import { describe, expect, it } from 'vitest';
import type { HarnessStep } from './types';

import { createContext } from './context';
import { createPipeline } from './pipeline';

interface PreparationSeed {
  model: string;
  originalText: string;
}

interface CountedInput extends PreparationSeed {
  estimatedTokens: number;
  stages: string[];
}

interface ChunkedInput extends CountedInput {
  chunks: string[];
}

interface ContextualInput extends ChunkedInput {
  instructions: string;
}

interface PreparedInput extends ContextualInput {
  valid: true;
}

const countStep: HarnessStep<PreparationSeed, CountedInput> = {
  name: 'count',
  async run(input) {
    return {
      ...input,
      estimatedTokens: Math.ceil(input.originalText.length / 4),
      stages: ['count'],
    };
  },
};

const chunkStep: HarnessStep<CountedInput, ChunkedInput> = {
  name: 'chunk',
  async run(input) {
    return { ...input, chunks: [input.originalText], stages: [...input.stages, 'chunk'] };
  },
};

const contextStep: HarnessStep<ChunkedInput, ContextualInput> = {
  name: 'context',
  async run(input) {
    return {
      ...input,
      instructions: 'Return structured JSON.',
      stages: [...input.stages, 'context'],
    };
  },
};

const validateStep: HarnessStep<ContextualInput, PreparedInput> = {
  name: 'validate',
  async run(input) {
    return { ...input, stages: [...input.stages, 'validate'], valid: true };
  },
};

describe('LLAAB-shaped consumer contract', () => {
  it('preserves the final result type without a cast', async () => {
    const pipeline = createPipeline({ steps: [countStep, chunkStep, contextStep, validateStep] });
    const context = createContext({ cwd: '/tmp/llaab' });

    const result: PreparedInput = await pipeline.run(
      { model: 'example-model', originalText: 'example transcript' },
      context,
    );

    expect(result.valid).toBe(true);
    expect(result.estimatedTokens).toBe(5);
    expect(result.stages).toEqual(['count', 'chunk', 'context', 'validate']);
    expect(context.budget.steps).toBe(4);
    expect(context.trace.map(({ step }) => step)).toEqual(['count', 'chunk', 'context', 'validate']);
  });
});
