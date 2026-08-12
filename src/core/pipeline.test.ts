import { describe, expect, it } from 'vitest';
import type { HarnessStep } from './types';

import { createContext } from './context';
import { createPipeline, HarnessRunError } from './pipeline';

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

describe('createPipeline', () => {
  it('runs steps sequentially and records trace metadata', async () => {
    const pipeline = createPipeline({
      steps: [incrementStep, doubleStep],
    });
    const context = createContext({ cwd: '/tmp/harness' });

    const result = await pipeline.run(2, context);

    expect(result).toBe(6);
    expect(context.budget.steps).toBe(2);
    expect(context.usage).toEqual({
      cancelledSteps: 0,
      completedSteps: 2,
      failedSteps: 0,
      startedSteps: 2,
    });
    expect(context.trace.map(({ step }) => step)).toEqual(['increment', 'double']);
    expect(context.events.map(({ status, step }) => `${step}:${status}`)).toEqual([
      'increment:started',
      'increment:completed',
      'double:started',
      'double:completed',
    ]);
    expect(context.events.every((event) => event.runId === context.runId)).toBe(true);
    expect(context.events.filter((event) => event.status === 'completed')).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          durationMs: expect.any(Number),
          endedAt: expect.any(Number),
          startedAt: expect.any(Number),
        }),
      ]),
    );
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

  it('enforces the step limit before starting the next step', async () => {
    const pipeline = createPipeline({ steps: [incrementStep, doubleStep] });
    const context = createContext({ cwd: '/tmp/harness', limits: { maxSteps: 1 } });

    const error = await pipeline.run(2, context).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(HarnessRunError);
    expect(error).toMatchObject({
      reason: 'max-steps',
      stepIndex: 1,
      stepName: 'double',
      usage: { completedSteps: 1, startedSteps: 1 },
    });
    expect(context.events.map(({ status }) => status)).toEqual(['started', 'completed']);
  });

  it('preserves the cause and partial events when a step fails', async () => {
    const originalError = new Error('private input must not enter events');
    const failingStep: HarnessStep<number, number> = {
      name: 'fail',
      async run() {
        throw originalError;
      },
    };
    const context = createContext({ cwd: '/tmp/harness', runId: 'run-failure' });
    const pipeline = createPipeline({ steps: [incrementStep, failingStep] });

    const error = await pipeline.run(1, context).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(HarnessRunError);
    expect(error).toMatchObject({
      cause: originalError,
      reason: 'step-failed',
      stepIndex: 1,
      stepName: 'fail',
      usage: { completedSteps: 1, failedSteps: 1, startedSteps: 2 },
    });
    expect(context.events.map(({ status }) => status)).toEqual(['started', 'completed', 'started', 'failed']);
    expect(JSON.stringify(context.events)).not.toContain(originalError.message);
  });

  it('rejects a run that is aborted before the first step', async () => {
    const controller = new AbortController();
    controller.abort(new Error('stop'));
    const context = createContext({ cwd: '/tmp/harness' });
    const pipeline = createPipeline({ steps: [incrementStep] });

    const error = await pipeline
      .run(1, context, { signal: controller.signal })
      .catch((cause: unknown) => cause);

    expect(error).toMatchObject({ reason: 'aborted', stepIndex: 0, stepName: 'increment' });
    expect(context.usage.startedSteps).toBe(0);
    expect(context.events).toEqual([]);
  });

  it('records cancellation when a running step observes an abort', async () => {
    const controller = new AbortController();
    const abortingStep: HarnessStep<number, number> = {
      name: 'abort',
      async run(input) {
        controller.abort(new Error('stop'));
        return input;
      },
    };
    const context = createContext({ cwd: '/tmp/harness' });
    const pipeline = createPipeline({ steps: [abortingStep] });

    const error = await pipeline
      .run(1, context, { signal: controller.signal })
      .catch((cause: unknown) => cause);

    expect(error).toMatchObject({ reason: 'aborted', usage: { cancelledSteps: 1, startedSteps: 1 } });
    expect(context.events.map(({ status }) => status)).toEqual(['started', 'cancelled']);
  });

  it('enforces an expired deadline before starting work', async () => {
    const context = createContext({ cwd: '/tmp/harness' });
    const pipeline = createPipeline({ steps: [incrementStep] });

    const error = await pipeline
      .run(1, context, { limits: { deadline: Date.now() - 1 } })
      .catch((cause: unknown) => cause);

    expect(error).toMatchObject({ reason: 'deadline', stepIndex: 0 });
    expect(context.events).toEqual([]);
  });

  it('isolates default contexts across concurrent runs', async () => {
    const events: Array<{ runId: string; status: string }> = [];
    const pipeline = createPipeline({ steps: [incrementStep, doubleStep] });

    const [first, second] = await Promise.all([
      pipeline.run(1, undefined, {
        eventSink(event) {
          events.push({ runId: event.runId, status: event.status });
        },
        runId: 'run-a',
      }),
      pipeline.run(3, undefined, {
        eventSink(event) {
          events.push({ runId: event.runId, status: event.status });
        },
        runId: 'run-b',
      }),
    ]);

    expect([first, second]).toEqual([4, 8]);
    expect(events.filter(({ runId }) => runId === 'run-a')).toHaveLength(4);
    expect(events.filter(({ runId }) => runId === 'run-b')).toHaveLength(4);
  });

  it('keeps event sink failures observational', async () => {
    const sinkError = new Error('telemetry unavailable');
    const context = createContext({
      cwd: '/tmp/harness',
      eventSink() {
        throw sinkError;
      },
    });
    const pipeline = createPipeline({ steps: [incrementStep] });

    await expect(pipeline.run(1, context)).resolves.toBe(2);
    expect(context.events.map(({ status }) => status)).toEqual(['started', 'completed']);
    expect(context.eventSinkErrors).toEqual([sinkError, sinkError]);
  });
});
