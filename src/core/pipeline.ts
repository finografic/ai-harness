import type { HarnessContext } from './context';
import type {
  AnyHarnessStep,
  DynamicHarnessPipeline,
  DynamicHarnessStep,
  HarnessPipeline,
  HarnessStep,
} from './types';

import { createContext } from './context';

type StepInput<Step> = Step extends HarnessStep<infer Input, unknown> ? Input : never;
type StepOutput<Step> = Step extends HarnessStep<never, infer Output> ? Output : never;

type StepsCompose<Steps extends readonly AnyHarnessStep[]> = Steps extends readonly [
  infer Current extends AnyHarnessStep,
  infer Next extends AnyHarnessStep,
  ...infer Remaining extends readonly AnyHarnessStep[],
]
  ? StepOutput<Current> extends StepInput<Next>
    ? StepsCompose<readonly [Next, ...Remaining]>
    : false
  : true;

type ComposableSteps<Steps extends readonly AnyHarnessStep[]> =
  StepsCompose<Steps> extends true ? Steps : never;

type PipelineInput<Steps extends readonly AnyHarnessStep[]> = Steps extends readonly [
  infer First extends AnyHarnessStep,
  ...(readonly AnyHarnessStep[]),
]
  ? StepInput<First>
  : never;

type PipelineOutput<Steps extends readonly AnyHarnessStep[]> = Steps extends readonly [
  ...(readonly AnyHarnessStep[]),
  infer Last extends AnyHarnessStep,
]
  ? StepOutput<Last>
  : never;

export type HarnessStepTuple = readonly [AnyHarnessStep, ...AnyHarnessStep[]];

export interface CreatePipelineParams<Steps extends HarnessStepTuple> {
  steps: ComposableSteps<Steps>;
}

export interface CreateDynamicPipelineParams {
  steps: readonly DynamicHarnessStep[];
}

export function createPipeline<const Steps extends HarnessStepTuple>({
  steps,
}: CreatePipelineParams<Steps>): HarnessPipeline<PipelineInput<Steps>, PipelineOutput<Steps>, Steps> {
  const runnableSteps = steps as readonly DynamicHarnessStep[];

  return {
    steps,
    async run(input: PipelineInput<Steps>, context?: HarnessContext): Promise<PipelineOutput<Steps>> {
      const activeContext = context ?? createContext({ cwd: process.cwd() });
      let currentValue: unknown = input;

      for (const step of runnableSteps) {
        activeContext.budget.steps += 1;
        activeContext.trace.push({
          step: step.name,
          timestamp: Date.now(),
        });

        currentValue = await step.run(currentValue, activeContext);
      }

      return currentValue as PipelineOutput<Steps>;
    },
  };
}

export function createDynamicPipeline({ steps }: CreateDynamicPipelineParams): DynamicHarnessPipeline {
  return {
    steps,
    async run(input: unknown, context?: HarnessContext): Promise<unknown> {
      const activeContext = context ?? createContext({ cwd: process.cwd() });
      let currentValue = input;

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
