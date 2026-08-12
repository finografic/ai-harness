import type { HarnessStep } from '../core/types';

import { parseTypeScriptDiagnostics } from '../adapters/typescript-diagnostics';

export interface TypeScriptError {
  code: string;
  file: string;
  line: number;
  column: number;
  message: string;
}

export interface ExtractedErrors {
  errors: TypeScriptError[];
  unmatchedOutput?: string;
  unmatchedOutputTruncated?: true;
}

export interface RawTypecheckResult {
  raw: string;
}

export const extractErrorsStep: HarnessStep<RawTypecheckResult, ExtractedErrors> = {
  name: 'extract-errors',
  async run(input) {
    return parseTypeScriptDiagnostics(input.raw);
  },
};
