export type ContextTrust = 'trusted' | 'untrusted' | 'unknown';
export type ContextSensitivity = 'internal' | 'public' | 'sensitive';

export interface ContextProvenance {
  derivedFrom?: readonly string[];
  parentCandidateId?: string;
  parentSourceId?: string;
}

export interface ContextSource {
  id: string;
  freshness?: Date | number | string;
  kind: string;
  location?: string;
  provenance?: ContextProvenance;
  sensitivity?: ContextSensitivity;
  trust?: ContextTrust;
}

export interface ContextCandidate<Content> {
  category?: string;
  content: Content;
  id: string;
  relevance?: number;
  source: ContextSource;
}

export type TokenCountMethod = 'estimated' | 'exact';

export interface TokenCounterIdentity {
  name: string;
  version: string;
}

export interface TokenCount {
  count: number;
  counter: TokenCounterIdentity;
  method: TokenCountMethod;
}

export interface ContextCost {
  bytes: number;
  characters: number;
  tokens: TokenCount;
}

export interface PackedContextCandidate<Content> extends ContextCandidate<Content> {
  cost: ContextCost;
  score: number;
}

export interface ContextBudget {
  categoryMaxTokens?: Readonly<Record<string, number>>;
  maxTokens: number;
  reservedOutputTokens?: number;
}

export interface ContextBudgetSummary {
  categoryMaxTokens: Readonly<Record<string, number>>;
  categoryUsedTokens: Readonly<Record<string, number>>;
  maxTokens: number;
  remainingInputTokens: number;
  reservedOutputTokens: number;
  usableInputTokens: number;
  usedInputTokens: number;
}

export type ContextDropReason = 'category-budget' | 'duplicate' | 'filtered' | 'invalid' | 'over-budget';

export interface DroppedContextCandidate {
  candidateId: string;
  reason: ContextDropReason;
}

export interface ContextSelection {
  dropped: DroppedContextCandidate[];
  selectedCandidateIds: string[];
}

export interface ContextPackCost {
  bytes: number;
  characters: number;
  tokenCountMethod: TokenCountMethod;
  tokens: number;
}

export interface ContextPack<Content> {
  budget: ContextBudgetSummary;
  candidates: Array<PackedContextCandidate<Content>>;
  cost: ContextPackCost;
  policyId: string;
  selection: ContextSelection;
}
