import { randomUUID } from 'node:crypto';

export interface HarnessTrace {
  step: string;
  timestamp: number;
}

export interface HarnessBudget {
  steps: number;
}

export interface HarnessRunLimits {
  deadline?: Date | number;
  maxSteps?: number;
}

export interface HarnessUsage {
  cancelledSteps: number;
  completedSteps: number;
  failedSteps: number;
  startedSteps: number;
}

export type HarnessStepEventStatus = 'started' | 'completed' | 'failed' | 'cancelled';

export type HarnessFailureKind = 'aborted' | 'deadline' | 'max-steps' | 'step-failed';

export interface HarnessRunEvent {
  durationMs?: number;
  endedAt?: number;
  failure?: {
    kind: HarnessFailureKind;
  };
  runId: string;
  startedAt: number;
  status: HarnessStepEventStatus;
  step: string;
  stepIndex: number;
  timestamp: number;
  usage: HarnessUsage;
}

export type HarnessEventSink = (event: HarnessRunEvent) => Promise<void> | void;

export interface HarnessContext {
  cwd: string;
  budget: HarnessBudget;
  trace: HarnessTrace[];
  eventSink?: HarnessEventSink;
  eventSinkErrors?: unknown[];
  events?: HarnessRunEvent[];
  limits?: HarnessRunLimits;
  runId?: string;
  signal?: AbortSignal;
  usage?: HarnessUsage;
}

export interface CreatedHarnessContext extends HarnessContext {
  eventSinkErrors: unknown[];
  events: HarnessRunEvent[];
  limits: HarnessRunLimits;
  runId: string;
  usage: HarnessUsage;
}

export interface CreateContextParams {
  cwd: string;
  eventSink?: HarnessEventSink;
  limits?: HarnessRunLimits;
  runId?: string;
  signal?: AbortSignal;
}

export function createContext({
  cwd,
  eventSink,
  limits = {},
  runId = randomUUID(),
  signal,
}: CreateContextParams): CreatedHarnessContext {
  return {
    cwd,
    budget: {
      steps: 0,
    },
    eventSink,
    eventSinkErrors: [],
    events: [],
    limits,
    runId,
    signal,
    trace: [],
    usage: {
      cancelledSteps: 0,
      completedSteps: 0,
      failedSteps: 0,
      startedSteps: 0,
    },
  };
}
