export { createContext } from './core/context';
export type { CreateContextParams, HarnessBudget, HarnessContext, HarnessTrace } from './core/context';

export { createDynamicPipeline, createPipeline } from './core/pipeline';
export type { CreateDynamicPipelineParams, CreatePipelineParams, HarnessStepTuple } from './core/pipeline';

export type {
  AnyHarnessStep,
  DynamicHarnessPipeline,
  DynamicHarnessStep,
  HarnessPipeline,
  HarnessStep,
} from './core/types';

export { debugPipeline } from './pipelines/debug.pipeline';

export { extractErrorsStep } from './steps/extract-errors';
export type { ExtractedErrors, RawTypecheckResult, TypeScriptError } from './steps/extract-errors';

export { runTypecheckStep } from './steps/run-typecheck';
export type { TypecheckResult } from './steps/run-typecheck';

export { createSliceCodeStep } from './steps/slice-code';
export type { CodeExcerpt, SliceCodeParams, SlicedError, SlicedErrors } from './steps/slice-code';

export { structureDebugStep } from './steps/structure-debug';
export type { StructuredDebugError, StructuredDebugPayload } from './steps/structure-debug';

export { readTextFile } from './utils/fs';
export type { ReadTextFileParams } from './utils/fs';

export { runCommand } from './utils/exec';
export type { CommandResult, RunCommandParams } from './utils/exec';
