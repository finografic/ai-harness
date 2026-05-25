import type { HarnessStep } from '../core/types';

export interface TypeScriptError {
  code: string;
  file: string;
  line: number;
  column: number;
  message: string;
}

export interface ExtractedErrors {
  errors: TypeScriptError[];
}

export interface RawTypecheckResult {
  raw: string;
}

const typeScriptErrorPattern = /([^\s()]+\.(?:cts|mts|ts|tsx))\((\d+),(\d+)\): error (TS\d+): (.+)/g;

export const extractErrorsStep: HarnessStep<RawTypecheckResult, ExtractedErrors> = {
  name: 'extract-errors',
  async run(input) {
    const errors: TypeScriptError[] = [];

    for (const match of input.raw.matchAll(typeScriptErrorPattern)) {
      const [, file, line, column, code, message] = match;

      errors.push({
        code,
        file,
        line: Number(line),
        column: Number(column),
        message,
      });
    }

    return { errors };
  },
};
