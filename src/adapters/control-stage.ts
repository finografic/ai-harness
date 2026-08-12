import type { HarnessRunEvent, HarnessUsage } from '../core/context';

export interface HarnessControlStage {
  error?: string;
  input: {
    runId: string;
    stepIndex: number;
  };
  name: string;
  output?: {
    durationMs?: number;
    failureKind?: string;
    usage: HarnessUsage;
  };
  status: 'completed' | 'failed' | 'pending';
}

function eventKey(event: HarnessRunEvent): string {
  return `${event.runId}:${event.stepIndex}`;
}

export function harnessEventsToControlStages(events: readonly HarnessRunEvent[]): HarnessControlStage[] {
  const stages: HarnessControlStage[] = [];
  const stageIndexes = new Map<string, number>();

  for (const event of events) {
    const key = eventKey(event);
    const existingIndex = stageIndexes.get(key);
    if (event.status === 'started') {
      stageIndexes.set(key, stages.length);
      stages.push({
        input: { runId: event.runId, stepIndex: event.stepIndex },
        name: `harness:${event.step}`,
        status: 'pending',
      });
      continue;
    }

    if (existingIndex == null) continue;
    const existingStage = stages[existingIndex];
    if (existingStage == null) continue;
    stages[existingIndex] = {
      ...existingStage,
      ...(event.status === 'completed' ? {} : { error: event.failure?.kind ?? event.status }),
      output: {
        ...(event.durationMs == null ? {} : { durationMs: event.durationMs }),
        ...(event.failure == null ? {} : { failureKind: event.failure.kind }),
        usage: { ...event.usage },
      },
      status: event.status === 'completed' ? 'completed' : 'failed',
    };
  }

  return stages;
}
