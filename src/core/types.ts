import type { HarnessContext } from './context';

export interface HarnessStep<Input, Output> {
  name: string;
  run(input: Input, context: HarnessContext): Promise<Output>;
}

export interface HarnessPipeline {
  steps: Array<HarnessStep<unknown, unknown>>;
  run(input: unknown, context?: HarnessContext): Promise<unknown>;
}
