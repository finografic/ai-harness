import { describe, expect, it } from 'vitest';
import type { HarnessStep } from './types';

import { createContext } from './context';
import { createPipeline } from './pipeline';

describe('createPipeline', () => {
  it('runs steps sequentially and records trace metadata', async () => {
    const incrementStep: HarnessStep<unknown, unknown> = {
      name: 'increment',
      async run(input) {
        return Number(input) + 1;
      },
    };

    const doubleStep: HarnessStep<unknown, unknown> = {
      name: 'double',
      async run(input) {
        return Number(input) * 2;
      },
    };

    const pipeline = createPipeline({
      steps: [incrementStep, doubleStep],
    });
    const context = createContext({ cwd: '/tmp/harness' });

    const result = await pipeline.run(2, context);

    expect(result).toBe(6);
    expect(context.budget.steps).toBe(2);
    expect(context.trace.map(({ step }) => step)).toEqual(['increment', 'double']);
  });
});
