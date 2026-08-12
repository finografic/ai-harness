import { describe, expect, it } from 'vitest';
import type { HarnessStep } from './types';

import { createContext } from './context';
import { createPipeline } from './pipeline';

describe('createPipeline', () => {
  it('runs steps sequentially and records trace metadata', async () => {
    const incrementStep: HarnessStep<number, number> = {
      name: 'increment',
      async run(input) {
        return input + 1;
      },
    };

    const doubleStep: HarnessStep<number, number> = {
      name: 'double',
      async run(input) {
        return input * 2;
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

  it('infers the first input and final output types', async () => {
    const parseStep: HarnessStep<string, number> = {
      name: 'parse',
      async run(input) {
        return Number(input);
      },
    };
    const describeStep: HarnessStep<number, { value: number }> = {
      name: 'describe',
      async run(input) {
        return { value: input };
      },
    };
    const pipeline = createPipeline({ steps: [parseStep, describeStep] });

    const result: { value: number } = await pipeline.run('42');

    expect(result).toEqual({ value: 42 });
  });

  it('rejects incompatible adjacent steps at typecheck time', () => {
    const numberStep: HarnessStep<number, number> = {
      name: 'number',
      async run(input) {
        return input;
      },
    };
    const stringStep: HarnessStep<string, string> = {
      name: 'string',
      async run(input) {
        return input;
      },
    };

    expect(() => {
      // @ts-expect-error A number output cannot feed a string input.
      createPipeline({ steps: [numberStep, stringStep] });
    }).not.toThrow();
  });
});
