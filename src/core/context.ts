export interface HarnessTrace {
  step: string;
  timestamp: number;
}

export interface HarnessBudget {
  steps: number;
}

export interface HarnessContext {
  cwd: string;
  budget: HarnessBudget;
  trace: HarnessTrace[];
}

export interface CreateContextParams {
  cwd: string;
}

export function createContext({ cwd }: CreateContextParams): HarnessContext {
  return {
    cwd,
    budget: {
      steps: 0,
    },
    trace: [],
  };
}
