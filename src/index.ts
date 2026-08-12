export { createContext } from './core/context';
export type {
  CreatedHarnessContext,
  CreateContextParams,
  HarnessBudget,
  HarnessContext,
  HarnessEventSink,
  HarnessFailureKind,
  HarnessRunEvent,
  HarnessRunLimits,
  HarnessStepEventStatus,
  HarnessTrace,
  HarnessUsage,
} from './core/context';

export { createDynamicPipeline, createPipeline, HarnessRunError } from './core/pipeline';
export type { CreateDynamicPipelineParams, CreatePipelineParams, HarnessStepTuple } from './core/pipeline';

export type {
  AnyHarnessStep,
  DynamicHarnessPipeline,
  DynamicHarnessStep,
  HarnessPipeline,
  HarnessRunOptions,
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

export { ProjectFileReadError, readProjectTextFile, readTextFile } from './utils/fs';
export type {
  ProjectFileReadFailure,
  ProjectFileReadFailureReason,
  ProjectFileReadResult,
  ProjectFileReadSuccess,
  ReadProjectTextFileParams,
  ReadTextFileParams,
} from './utils/fs';

export { runCommand, runProcess } from './utils/exec';
export type { CommandResult, RunCommandParams, RunProcessParams } from './utils/exec';

export { parseTypeScriptDiagnostics, stripAnsi } from './adapters/typescript-diagnostics';
export type { ParsedTypeScriptDiagnostics } from './adapters/typescript-diagnostics';

export {
  characterChunkStrategy,
  chunkTextCandidate,
  paragraphChunkStrategy,
} from './context/context-chunker';
export type {
  ChunkTextCandidateParams,
  TextChunkBoundary,
  TextChunkStrategy,
} from './context/context-chunker';

export { prepareContextPack } from './context/context-pack';
export type { PrepareContextPackParams } from './context/context-pack';

export type {
  ContextBudget,
  ContextBudgetSummary,
  ContextCandidate,
  ContextCost,
  ContextDropReason,
  ContextPack,
  ContextPackCost,
  ContextProvenance,
  ContextSelection,
  ContextSensitivity,
  ContextSource,
  ContextTrust,
  DroppedContextCandidate,
  PackedContextCandidate,
  TokenCount,
  TokenCounterIdentity,
  TokenCountMethod,
} from './context/context-pack.types';

export { createCharacterHeuristicTokenCounter, TokenCountError } from './context/token-counter';
export type { CharacterHeuristicTokenCounterParams, TokenCounter } from './context/token-counter';
