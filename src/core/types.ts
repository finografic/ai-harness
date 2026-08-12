import type { HarnessContext, HarnessEventSink, HarnessRunLimits } from './context';

export interface HarnessRunOptions {
  eventSink?: HarnessEventSink;
  limits?: HarnessRunLimits;
  runId?: string;
  signal?: AbortSignal;
}

export interface HarnessStep<Input, Output> {
  name: string;
  run(input: Input, context: HarnessContext): Promise<Output>;
}

export type AnyHarnessStep = HarnessStep<never, unknown>;

export interface HarnessPipeline<
  Input = unknown,
  Output = unknown,
  Steps extends readonly AnyHarnessStep[] = readonly AnyHarnessStep[],
> {
  readonly steps: Steps;
  run(input: Input, context?: HarnessContext, options?: HarnessRunOptions): Promise<Output>;
}

export interface DynamicHarnessStep {
  name: string;
  run(input: unknown, context: HarnessContext): Promise<unknown>;
}

export interface DynamicHarnessPipeline {
  readonly steps: readonly DynamicHarnessStep[];
  run(input: unknown, context?: HarnessContext, options?: HarnessRunOptions): Promise<unknown>;
}
