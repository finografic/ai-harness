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
  sourceTruncated?: true;
}

export interface StructuredDebugPayload {
  task: 'fix-type-errors';
  errors: StructuredDebugError[];
  unmatchedOutput?: string;
  unmatchedOutputTruncated?: true;
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
    ...(error.sourceTruncated === true ? { sourceTruncated: true as const } : {}),
  };
}

export const structureDebugStep: HarnessStep<SlicedErrors, StructuredDebugPayload> = {
  name: 'structure-debug',
  async run(input) {
    return {
      task: 'fix-type-errors',
      errors: input.errors.map(toStructuredDebugError),
      ...(input.unmatchedOutput == null ? {} : { unmatchedOutput: input.unmatchedOutput }),
      ...(input.unmatchedOutputTruncated === true ? { unmatchedOutputTruncated: true as const } : {}),
    };
  },
};
