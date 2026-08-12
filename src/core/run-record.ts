import type { HarnessContext, HarnessRunEvent, HarnessRunLimits, HarnessUsage } from './context';

export interface HarnessRecordedLimits {
  deadline?: number;
  maxSteps?: number;
}

export interface HarnessRunRecord {
  events: HarnessRunEvent[];
  limits: HarnessRecordedLimits;
  runId: string;
  usage: HarnessUsage;
}

function recordLimits(limits: HarnessRunLimits | undefined): HarnessRecordedLimits {
  const deadline = limits?.deadline;
  return {
    ...(deadline == null ? {} : { deadline: deadline instanceof Date ? deadline.getTime() : deadline }),
    ...(limits?.maxSteps == null ? {} : { maxSteps: limits.maxSteps }),
  };
}

export function createHarnessRunRecord(context: HarnessContext): HarnessRunRecord {
  return {
    events: [...(context.events ?? [])],
    limits: recordLimits(context.limits),
    runId: context.runId ?? 'unknown',
    usage: {
      cancelledSteps: context.usage?.cancelledSteps ?? 0,
      completedSteps: context.usage?.completedSteps ?? 0,
      failedSteps: context.usage?.failedSteps ?? 0,
      startedSteps: context.usage?.startedSteps ?? context.budget.steps,
    },
  };
}

export function normaliseHarnessRunRecord(record: HarnessRunRecord): HarnessRunRecord {
  return {
    ...record,
    events: record.events.map((event) => ({
      ...event,
      ...(event.durationMs == null ? {} : { durationMs: 0 }),
      ...(event.endedAt == null ? {} : { endedAt: 0 }),
      startedAt: 0,
      timestamp: 0,
    })),
    limits: {
      ...record.limits,
      ...(record.limits.deadline == null ? {} : { deadline: 0 }),
    },
  };
}
