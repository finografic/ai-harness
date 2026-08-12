import type { ContextPack } from './context-pack.types';

export interface EvaluateContextPackParams {
  expectedCandidateIds?: readonly string[];
}

export interface ContextCoverageEvaluation {
  matchedCandidateIds: string[];
  missingCandidateIds: string[];
  ratio: number;
}

export interface ContextPackEvaluation {
  allSelectionsAccountedFor: boolean;
  budgetAdhered: boolean;
  coverage?: ContextCoverageEvaluation;
  provenanceComplete: boolean;
}

export function evaluateContextPack<Content>(
  pack: ContextPack<Content>,
  { expectedCandidateIds }: EvaluateContextPackParams = {},
): ContextPackEvaluation {
  const selectedIds = new Set(pack.selection.selectedCandidateIds);
  const packedIds = new Set(pack.candidates.map(({ id }) => id));
  let coverage: ContextCoverageEvaluation | undefined;
  if (expectedCandidateIds != null) {
    const matchedCandidateIds = expectedCandidateIds.filter((id) => selectedIds.has(id));
    const missingCandidateIds = expectedCandidateIds.filter((id) => !selectedIds.has(id));
    coverage = {
      matchedCandidateIds,
      missingCandidateIds,
      ratio: expectedCandidateIds.length === 0 ? 1 : matchedCandidateIds.length / expectedCandidateIds.length,
    };
  }

  return {
    allSelectionsAccountedFor:
      pack.selection.selectedCandidateIds.length === selectedIds.size &&
      pack.candidates.length === packedIds.size &&
      selectedIds.size === packedIds.size &&
      [...selectedIds].every((id) => packedIds.has(id)),
    budgetAdhered:
      pack.cost.tokens <= pack.budget.usableInputTokens &&
      pack.budget.remainingInputTokens >= 0 &&
      Object.entries(pack.budget.categoryUsedTokens).every(
        ([category, usedTokens]) =>
          usedTokens <= (pack.budget.categoryMaxTokens[category] ?? Number.POSITIVE_INFINITY),
      ),
    coverage,
    provenanceComplete: pack.candidates.every(({ id, source }) => {
      const baseProvenanceComplete = source.id.trim().length > 0 && source.kind.trim().length > 0;
      if (!id.includes(':chunk:')) return baseProvenanceComplete;
      return (
        baseProvenanceComplete &&
        source.provenance?.parentCandidateId != null &&
        source.provenance.parentSourceId != null
      );
    }),
  };
}
