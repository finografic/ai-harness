import type {
  CreatedHarnessContext,
  HarnessContext,
  HarnessFailureKind,
  HarnessRunEvent,
  HarnessRunLimits,
  HarnessUsage,
} from './context';
import type {
  AnyHarnessStep,
  DynamicHarnessPipeline,
  DynamicHarnessStep,
  HarnessPipeline,
  HarnessRunOptions,
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

export class HarnessRunError extends Error {
  readonly events: readonly HarnessRunEvent[];
  readonly reason: HarnessFailureKind;
  readonly stepIndex: number;
  readonly stepName: string;
  readonly usage: HarnessUsage;

  constructor({
    cause,
    context,
    reason,
    stepIndex,
    stepName,
  }: {
    cause?: unknown;
    context: CreatedHarnessContext;
    reason: HarnessFailureKind;
    stepIndex: number;
    stepName: string;
  }) {
    super(createRunErrorMessage({ reason, stepName }), { cause });
    this.name = 'HarnessRunError';
    this.events = [...context.events];
    this.reason = reason;
    this.stepIndex = stepIndex;
    this.stepName = stepName;
    this.usage = snapshotUsage(context.usage);
  }
}

function createRunErrorMessage({
  reason,
  stepName,
}: {
  reason: HarnessFailureKind;
  stepName: string;
}): string {
  switch (reason) {
    case 'aborted':
      return `Harness run aborted during step "${stepName}"`;
    case 'deadline':
      return `Harness run deadline exceeded during step "${stepName}"`;
    case 'max-steps':
      return `Harness step limit reached before step "${stepName}"`;
    case 'step-failed':
      return `Harness step "${stepName}" failed`;
  }
}

function snapshotUsage(usage: HarnessUsage): HarnessUsage {
  return { ...usage };
}

function deadlineTimestamp(deadline: Date | number | undefined): number | undefined {
  return deadline instanceof Date ? deadline.getTime() : deadline;
}

function mergeLimits(
  contextLimits: HarnessRunLimits | undefined,
  optionLimits: HarnessRunLimits | undefined,
): HarnessRunLimits {
  return { ...contextLimits, ...optionLimits };
}

function createDeadlineSignal(deadline: Date | number | undefined): {
  cleanup: () => void;
  signal?: AbortSignal;
} {
  const timestamp = deadlineTimestamp(deadline);
  if (timestamp == null) return { cleanup() {} };

  const controller = new AbortController();
  const remainingMs = timestamp - Date.now();
  if (remainingMs <= 0) {
    controller.abort(new Error('Harness run deadline exceeded'));
    return { cleanup() {}, signal: controller.signal };
  }

  const timeout = setTimeout(() => {
    controller.abort(new Error('Harness run deadline exceeded'));
  }, remainingMs);
  timeout.unref();

  return {
    cleanup() {
      clearTimeout(timeout);
    },
    signal: controller.signal,
  };
}

function combineSignals(signals: Array<AbortSignal | undefined>): AbortSignal | undefined {
  const activeSignals = signals.filter((signal): signal is AbortSignal => signal != null);
  if (activeSignals.length === 0) return undefined;
  if (activeSignals.length === 1) return activeSignals[0];
  return AbortSignal.any(activeSignals);
}

function prepareContext(
  context: HarnessContext | undefined,
  options: HarnessRunOptions | undefined,
): { cleanup: () => void; context: CreatedHarnessContext } {
  const activeContext = context ?? createContext({ cwd: process.cwd() });
  const limits = mergeLimits(activeContext.limits, options?.limits);
  const deadline = createDeadlineSignal(limits.deadline);

  activeContext.runId =
    options?.runId ?? activeContext.runId ?? createContext({ cwd: activeContext.cwd }).runId;
  activeContext.limits = limits;
  activeContext.usage ??= {
    cancelledSteps: 0,
    completedSteps: 0,
    failedSteps: 0,
    startedSteps: activeContext.budget.steps,
  };
  activeContext.eventSinkErrors ??= [];
  activeContext.events ??= [];
  activeContext.eventSink = options?.eventSink ?? activeContext.eventSink;
  activeContext.signal = combineSignals([options?.signal, activeContext.signal, deadline.signal]);

  return {
    cleanup: deadline.cleanup,
    context: activeContext as CreatedHarnessContext,
  };
}

function classifyFailure(
  context: CreatedHarnessContext,
  fallback: HarnessFailureKind = 'step-failed',
): HarnessFailureKind {
  const deadline = deadlineTimestamp(context.limits.deadline);
  if (deadline != null && Date.now() >= deadline) return 'deadline';
  if (context.signal?.aborted === true) return 'aborted';
  return fallback;
}

function assertCanStartStep(
  context: CreatedHarnessContext,
  step: DynamicHarnessStep,
  stepIndex: number,
): void {
  const failureKind = classifyFailure(context, 'step-failed');
  if (failureKind !== 'step-failed') {
    throw new HarnessRunError({
      cause: context.signal?.reason,
      context,
      reason: failureKind,
      stepIndex,
      stepName: step.name,
    });
  }

  if (context.limits.maxSteps != null && context.usage.startedSteps >= context.limits.maxSteps) {
    throw new HarnessRunError({
      context,
      reason: 'max-steps',
      stepIndex,
      stepName: step.name,
    });
  }
}

async function emitEvent(context: CreatedHarnessContext, event: HarnessRunEvent): Promise<void> {
  context.events.push(event);
  try {
    await context.eventSink?.(event);
  } catch (error: unknown) {
    context.eventSinkErrors.push(error);
  }
}

function createStartedEvent({
  context,
  startedAt,
  step,
  stepIndex,
}: {
  context: CreatedHarnessContext;
  startedAt: number;
  step: DynamicHarnessStep;
  stepIndex: number;
}): HarnessRunEvent {
  return {
    runId: context.runId,
    startedAt,
    status: 'started',
    step: step.name,
    stepIndex,
    timestamp: startedAt,
    usage: snapshotUsage(context.usage),
  };
}

function createTerminalEvent({
  context,
  endedAt,
  failureKind,
  startedAt,
  status,
  step,
  stepIndex,
}: {
  context: CreatedHarnessContext;
  endedAt: number;
  failureKind?: HarnessFailureKind;
  startedAt: number;
  status: 'cancelled' | 'completed' | 'failed';
  step: DynamicHarnessStep;
  stepIndex: number;
}): HarnessRunEvent {
  return {
    durationMs: Math.max(0, endedAt - startedAt),
    endedAt,
    failure: failureKind == null ? undefined : { kind: failureKind },
    runId: context.runId,
    startedAt,
    status,
    step: step.name,
    stepIndex,
    timestamp: endedAt,
    usage: snapshotUsage(context.usage),
  };
}

async function runSteps(
  steps: readonly DynamicHarnessStep[],
  input: unknown,
  context?: HarnessContext,
  options?: HarnessRunOptions,
): Promise<unknown> {
  const prepared = prepareContext(context, options);
  const activeContext = prepared.context;
  let currentValue = input;

  try {
    for (const [stepIndex, step] of steps.entries()) {
      assertCanStartStep(activeContext, step, stepIndex);

      const startedAt = Date.now();
      activeContext.budget.steps += 1;
      activeContext.usage.startedSteps += 1;
      activeContext.trace.push({ step: step.name, timestamp: startedAt });
      await emitEvent(
        activeContext,
        createStartedEvent({ context: activeContext, startedAt, step, stepIndex }),
      );

      try {
        const nextValue = await step.run(currentValue, activeContext);
        const failureKind = classifyFailure(activeContext, 'step-failed');
        if (failureKind !== 'step-failed') throw activeContext.signal?.reason;

        currentValue = nextValue;
        activeContext.usage.completedSteps += 1;
        await emitEvent(
          activeContext,
          createTerminalEvent({
            context: activeContext,
            endedAt: Date.now(),
            startedAt,
            status: 'completed',
            step,
            stepIndex,
          }),
        );
      } catch (cause: unknown) {
        const failureKind = classifyFailure(activeContext);
        const status = failureKind === 'aborted' || failureKind === 'deadline' ? 'cancelled' : 'failed';
        if (status === 'cancelled') activeContext.usage.cancelledSteps += 1;
        else activeContext.usage.failedSteps += 1;

        await emitEvent(
          activeContext,
          createTerminalEvent({
            context: activeContext,
            endedAt: Date.now(),
            failureKind,
            startedAt,
            status,
            step,
            stepIndex,
          }),
        );

        throw new HarnessRunError({
          cause,
          context: activeContext,
          reason: failureKind,
          stepIndex,
          stepName: step.name,
        });
      }
    }

    return currentValue;
  } finally {
    prepared.cleanup();
  }
}

export function createPipeline<const Steps extends HarnessStepTuple>({
  steps,
}: CreatePipelineParams<Steps>): HarnessPipeline<PipelineInput<Steps>, PipelineOutput<Steps>, Steps> {
  const runnableSteps = steps as readonly DynamicHarnessStep[];

  return {
    steps,
    async run(
      input: PipelineInput<Steps>,
      context?: HarnessContext,
      options?: HarnessRunOptions,
    ): Promise<PipelineOutput<Steps>> {
      return runSteps(runnableSteps, input, context, options) as Promise<PipelineOutput<Steps>>;
    },
  };
}

export function createDynamicPipeline({ steps }: CreateDynamicPipelineParams): DynamicHarnessPipeline {
  return {
    steps,
    async run(input: unknown, context?: HarnessContext, options?: HarnessRunOptions): Promise<unknown> {
      return runSteps(steps, input, context, options);
    },
  };
}
