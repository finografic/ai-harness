import type { HarnessStep } from '../core/types';
import type { SlicedError, SlicedErrors } from './slice-code';

export interface StructuredDebugError {
  file: string;
  absoluteFilePath: string;
  line: number;
  column: number;
  code: string;
  message: string;
  snippet: string;
}

export interface StructuredDebugPayload {
  task: 'fix-type-errors';
  errors: StructuredDebugError[];
}

function toStructuredDebugError(error: SlicedError): StructuredDebugError {
  return {
    file: error.file,
    absoluteFilePath: error.absoluteFilePath,
    line: error.line,
    column: error.column,
    code: error.code,
    message: error.message,
    snippet: error.excerpt.snippet,
  };
}

export const structureDebugStep: HarnessStep<SlicedErrors, StructuredDebugPayload> = {
  name: 'structure-debug',
  async run(input) {
    return {
      task: 'fix-type-errors',
      errors: input.errors.map(toStructuredDebugError),
    };
  },
};
