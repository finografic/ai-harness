import { describe, expect, it } from 'vitest';
import type { HarnessStep } from './types';

import { createContext } from './context';
import { createPipeline } from './pipeline';
import { createHarnessRunRecord, normaliseHarnessRunRecord } from './run-record';

describe('harness run records', () => {
  it('creates a machine-readable privacy-safe record', async () => {
    const privateInput = 'private source content';
    const step: HarnessStep<string, number> = {
      name: 'measure',
      async run(input) {
        return input.length;
      },
    };
    const context = createContext({
      cwd: '/private/project/path',
      limits: { deadline: new Date(Date.now() + 10_000), maxSteps: 2 },
      runId: 'run-record',
    });

    await createPipeline({ steps: [step] }).run(privateInput, context);
    const record = createHarnessRunRecord(context);
    const normalised = normaliseHarnessRunRecord(record);

    expect(normalised).toMatchObject({
      events: [
        { runId: 'run-record', startedAt: 0, status: 'started', timestamp: 0 },
        {
          durationMs: 0,
          endedAt: 0,
          runId: 'run-record',
          startedAt: 0,
          status: 'completed',
          timestamp: 0,
        },
      ],
      limits: { deadline: 0, maxSteps: 2 },
      runId: 'run-record',
      usage: { completedSteps: 1, startedSteps: 1 },
    });
    expect(JSON.stringify(record)).not.toContain(privateInput);
    expect(JSON.stringify(record)).not.toContain(context.cwd);
  });
});
