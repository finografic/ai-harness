import type {
  ContextBudget,
  ContextBudgetSummary,
  ContextCandidate,
  ContextCost,
  ContextPack,
  ContextPackCost,
  DroppedContextCandidate,
  PackedContextCandidate,
  TokenCount,
} from './context-pack.types';
import type { TokenCounter } from './token-counter';

import { TokenCountError } from './token-counter';

export interface PrepareContextPackParams<Content> {
  budget: ContextBudget;
  candidates: ReadonlyArray<ContextCandidate<Content>>;
  filterCandidate?: (candidate: ContextCandidate<Content>) => boolean;
  normaliseCandidate?: (candidate: ContextCandidate<Content>) => ContextCandidate<Content>;
  policyId: string;
  scoreCandidate?: (candidate: ContextCandidate<Content>) => number;
  serialiseContent?: (content: Content) => string;
  tokenCounter: TokenCounter<string>;
}

interface CostedCandidate<Content> extends PackedContextCandidate<Content> {
  originalIndex: number;
}

function defaultSerialiseContent<Content>(content: Content): string {
  if (typeof content === 'string') return content;
  const serialised = JSON.stringify(content);
  return serialised ?? String(content);
}

function validateBudget(budget: ContextBudget): void {
  const reservedOutputTokens = budget.reservedOutputTokens ?? 0;
  if (!Number.isInteger(budget.maxTokens) || budget.maxTokens < 0) {
    throw new RangeError('budget.maxTokens must be a non-negative integer');
  }
  if (!Number.isInteger(reservedOutputTokens) || reservedOutputTokens < 0) {
    throw new RangeError('budget.reservedOutputTokens must be a non-negative integer');
  }

  for (const [category, limit] of Object.entries(budget.categoryMaxTokens ?? {})) {
    if (category.length === 0 || !Number.isInteger(limit) || limit < 0) {
      throw new RangeError('category token limits require a category and non-negative integer');
    }
  }
}

function isValidCandidate<Content>(candidate: ContextCandidate<Content>, score: number): boolean {
  return (
    candidate.id.trim().length > 0 &&
    candidate.source.id.trim().length > 0 &&
    candidate.source.kind.trim().length > 0 &&
    (candidate.category == null || candidate.category.trim().length > 0) &&
    Number.isFinite(score)
  );
}

function validateTokenCount(tokenCount: TokenCount): void {
  if (!Number.isInteger(tokenCount.count) || tokenCount.count < 0) {
    throw new RangeError('token counters must return a non-negative integer count');
  }
  if (tokenCount.counter.name.trim().length === 0 || tokenCount.counter.version.trim().length === 0) {
    throw new RangeError('token counters must identify their name and version');
  }
}

async function costCandidate<Content>({
  candidate,
  originalIndex,
  score,
  serialiseContent,
  tokenCounter,
}: {
  candidate: ContextCandidate<Content>;
  originalIndex: number;
  score: number;
  serialiseContent: (content: Content) => string;
  tokenCounter: TokenCounter<string>;
}): Promise<CostedCandidate<Content>> {
  const serialised = serialiseContent(candidate.content);
  let tokens: TokenCount;
  try {
    tokens = await tokenCounter.count(serialised);
    validateTokenCount(tokens);
  } catch (error: unknown) {
    throw new TokenCountError({ candidateId: candidate.id, cause: error, counterName: tokenCounter.name });
  }

  const cost: ContextCost = {
    bytes: Buffer.byteLength(serialised),
    characters: serialised.length,
    tokens,
  };
  return { ...candidate, cost, originalIndex, score };
}

function compareCostedCandidates<Content>(
  first: CostedCandidate<Content>,
  second: CostedCandidate<Content>,
): number {
  return (
    second.score - first.score ||
    first.source.id.localeCompare(second.source.id) ||
    first.id.localeCompare(second.id) ||
    first.originalIndex - second.originalIndex
  );
}

function createBudgetSummary(budget: ContextBudget): ContextBudgetSummary {
  const reservedOutputTokens = budget.reservedOutputTokens ?? 0;
  const usableInputTokens = Math.max(0, budget.maxTokens - reservedOutputTokens);
  return {
    categoryMaxTokens: { ...budget.categoryMaxTokens },
    categoryUsedTokens: {},
    maxTokens: budget.maxTokens,
    remainingInputTokens: usableInputTokens,
    reservedOutputTokens,
    usableInputTokens,
    usedInputTokens: 0,
  };
}

function addCandidateToBudget<Content>(
  budget: ContextBudgetSummary,
  candidate: CostedCandidate<Content>,
): void {
  const tokens = candidate.cost.tokens.count;
  budget.usedInputTokens += tokens;
  budget.remainingInputTokens = budget.usableInputTokens - budget.usedInputTokens;
  if (candidate.category != null) {
    const categoryUsedTokens = budget.categoryUsedTokens as Record<string, number>;
    categoryUsedTokens[candidate.category] = (categoryUsedTokens[candidate.category] ?? 0) + tokens;
  }
}

function dropReasonForBudget<Content>(
  budget: ContextBudgetSummary,
  candidate: CostedCandidate<Content>,
): 'category-budget' | 'over-budget' | undefined {
  const tokens = candidate.cost.tokens.count;
  if (tokens > budget.remainingInputTokens) return 'over-budget';
  if (candidate.category == null) return undefined;

  const categoryLimit = budget.categoryMaxTokens[candidate.category];
  const categoryUsed = budget.categoryUsedTokens[candidate.category] ?? 0;
  return categoryLimit != null && categoryUsed + tokens > categoryLimit ? 'category-budget' : undefined;
}

function summariseCost<Content>(candidates: ReadonlyArray<PackedContextCandidate<Content>>): ContextPackCost {
  return candidates.reduce<ContextPackCost>(
    (cost, candidate) => ({
      bytes: cost.bytes + candidate.cost.bytes,
      characters: cost.characters + candidate.cost.characters,
      tokenCountMethod:
        cost.tokenCountMethod === 'estimated' || candidate.cost.tokens.method === 'estimated'
          ? 'estimated'
          : 'exact',
      tokens: cost.tokens + candidate.cost.tokens.count,
    }),
    { bytes: 0, characters: 0, tokenCountMethod: 'exact', tokens: 0 },
  );
}

export async function prepareContextPack<Content>({
  budget: requestedBudget,
  candidates,
  filterCandidate = () => true,
  normaliseCandidate = (candidate) => candidate,
  policyId,
  scoreCandidate = (candidate) => candidate.relevance ?? 0,
  serialiseContent = defaultSerialiseContent,
  tokenCounter,
}: PrepareContextPackParams<Content>): Promise<ContextPack<Content>> {
  validateBudget(requestedBudget);
  if (policyId.trim().length === 0) throw new RangeError('policyId must not be empty');

  const dropped: DroppedContextCandidate[] = [];
  const seenCandidateIds = new Set<string>();
  const candidatesToCost: Array<{
    candidate: ContextCandidate<Content>;
    originalIndex: number;
    score: number;
  }> = [];

  for (const [originalIndex, originalCandidate] of candidates.entries()) {
    const candidate = normaliseCandidate(originalCandidate);
    const score = scoreCandidate(candidate);
    if (!isValidCandidate(candidate, score)) {
      dropped.push({ candidateId: candidate.id, reason: 'invalid' });
      continue;
    }
    if (seenCandidateIds.has(candidate.id)) {
      dropped.push({ candidateId: candidate.id, reason: 'duplicate' });
      continue;
    }
    seenCandidateIds.add(candidate.id);
    if (!filterCandidate(candidate)) {
      dropped.push({ candidateId: candidate.id, reason: 'filtered' });
      continue;
    }
    candidatesToCost.push({ candidate, originalIndex, score });
  }

  const costedCandidates = await Promise.all(
    candidatesToCost.map(({ candidate, originalIndex, score }) =>
      costCandidate({ candidate, originalIndex, score, serialiseContent, tokenCounter }),
    ),
  );
  costedCandidates.sort(compareCostedCandidates);

  const budget = createBudgetSummary(requestedBudget);
  const selected: Array<PackedContextCandidate<Content>> = [];
  for (const candidate of costedCandidates) {
    const dropReason = dropReasonForBudget(budget, candidate);
    if (dropReason != null) {
      dropped.push({ candidateId: candidate.id, reason: dropReason });
      continue;
    }

    const { originalIndex: _originalIndex, ...packedCandidate } = candidate;
    selected.push(packedCandidate);
    addCandidateToBudget(budget, candidate);
  }

  return {
    budget,
    candidates: selected,
    cost: summariseCost(selected),
    policyId,
    selection: {
      dropped,
      selectedCandidateIds: selected.map(({ id }) => id),
    },
  };
}
