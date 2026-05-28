import { createPipeline } from '../core/pipeline';
import { extractErrorsStep } from '../steps/extract-errors';
import { runTypecheckStep } from '../steps/run-typecheck';
import { createSliceCodeStep } from '../steps/slice-code';
import { structureDebugStep } from '../steps/structure-debug';

export const debugPipeline = createPipeline({
  steps: [runTypecheckStep, extractErrorsStep, createSliceCodeStep(), structureDebugStep],
});
