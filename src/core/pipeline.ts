import type { HarnessContext } from './context';
import type { HarnessPipeline, HarnessStep } from './types';

import { createContext } from './context';

export interface CreatePipelineParams {
  steps: Array<HarnessStep<unknown, unknown>>;
}

export function createPipeline({ steps }: CreatePipelineParams): HarnessPipeline {
  return {
    steps,
    async run(input: unknown, context?: HarnessContext): Promise<unknown> {
      const activeContext = context ?? createContext({ cwd: process.cwd() });
      let currentValue: unknown = input;

      for (const step of steps) {
        activeContext.budget.steps += 1;
        activeContext.trace.push({
          step: step.name,
          timestamp: Date.now(),
        });

        currentValue = await step.run(currentValue, activeContext);
      }

      return currentValue;
    },
  };
}
