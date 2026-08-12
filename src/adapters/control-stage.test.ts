import { describe, expect, it } from 'vitest';

import { createContext } from '../core/context';
import { createPipeline } from '../core/pipeline';
import { harnessEventsToControlStages } from './control-stage';

describe('harnessEventsToControlStages', () => {
  it('maps lifecycle pairs to LLAAB-compatible stage records', async () => {
    const context = createContext({ cwd: '/tmp/harness', runId: 'run-control' });
    const pipeline = createPipeline({
      steps: [
        {
          name: 'prepare',
          async run(input: string): Promise<number> {
            return input.length;
          },
        },
      ],
    });
    await pipeline.run('private source', context);

    const stages = harnessEventsToControlStages(context.events);

    expect(stages).toEqual([
      {
        input: { runId: 'run-control', stepIndex: 0 },
        name: 'harness:prepare',
        output: {
          durationMs: expect.any(Number),
          usage: {
            cancelledSteps: 0,
            completedSteps: 1,
            failedSteps: 0,
            startedSteps: 1,
          },
        },
        status: 'completed',
      },
    ]);
    expect(JSON.stringify(stages)).not.toContain('private source');
  });
});
