import { describe, expect, it } from 'vitest';
import type { ContextCandidate, TokenCount } from './context-pack.types';
import type { TokenCounter } from './token-counter';

import { chunkTextCandidate, paragraphChunkStrategy } from './context-chunker';
import { prepareContextPack } from './context-pack';
import { createCharacterHeuristicTokenCounter, TokenCountError } from './token-counter';

function candidate(id: string, content: string, relevance = 0, category?: string): ContextCandidate<string> {
  return {
    category,
    content,
    id,
    relevance,
    source: { id: `source-${id}`, kind: 'test', trust: 'trusted' },
  };
}

const exactCounter: TokenCounter<string> = {
  name: 'word-counter',
  version: '1',
  count(content): TokenCount {
    return {
      count: content.length === 0 ? 0 : content.split(/\s+/).length,
      counter: { name: this.name, version: this.version },
      method: 'exact',
    };
  },
};

describe('prepareContextPack', () => {
  it('selects deterministically by score and stable IDs', async () => {
    const candidates = [candidate('b', 'two words', 1), candidate('a', 'one word', 1)];
    const params = {
      budget: { maxTokens: 10, reservedOutputTokens: 2 },
      candidates,
      policyId: 'test-v1',
      tokenCounter: exactCounter,
    };

    const first = await prepareContextPack(params);
    const second = await prepareContextPack(params);

    expect(first).toEqual(second);
    expect(first.selection.selectedCandidateIds).toEqual(['a', 'b']);
    expect(first.cost).toMatchObject({ tokenCountMethod: 'exact', tokens: 4 });
    expect(first.budget).toMatchObject({
      remainingInputTokens: 4,
      reservedOutputTokens: 2,
      usableInputTokens: 8,
      usedInputTokens: 4,
    });
  });

  it('records duplicate, filtered, invalid, and over-budget reasons', async () => {
    const result = await prepareContextPack({
      budget: { maxTokens: 2 },
      candidates: [
        candidate('selected', 'one', 2),
        candidate('selected', 'duplicate', 1),
        candidate('filtered', 'one', 1),
        candidate('', 'invalid', 1),
        candidate('large', 'one two three', 0),
      ],
      filterCandidate: ({ id }) => id !== 'filtered',
      policyId: 'drop-reasons-v1',
      tokenCounter: exactCounter,
    });

    expect(result.selection).toEqual({
      dropped: [
        { candidateId: 'selected', reason: 'duplicate' },
        { candidateId: 'filtered', reason: 'filtered' },
        { candidateId: '', reason: 'invalid' },
        { candidateId: 'large', reason: 'over-budget' },
      ],
      selectedCandidateIds: ['selected'],
    });
  });

  it('enforces category budgets separately from the total budget', async () => {
    const result = await prepareContextPack({
      budget: { categoryMaxTokens: { docs: 2 }, maxTokens: 10 },
      candidates: [candidate('first', 'one two', 2, 'docs'), candidate('second', 'three', 1, 'docs')],
      policyId: 'categories-v1',
      tokenCounter: exactCounter,
    });

    expect(result.selection).toEqual({
      dropped: [{ candidateId: 'second', reason: 'category-budget' }],
      selectedCandidateIds: ['first'],
    });
    expect(result.budget.categoryUsedTokens).toEqual({ docs: 2 });
  });

  it('labels heuristic token counts as estimated', async () => {
    const result = await prepareContextPack({
      budget: { maxTokens: 10 },
      candidates: [candidate('estimated', '12345678')],
      policyId: 'estimated-v1',
      tokenCounter: createCharacterHeuristicTokenCounter({ charactersPerToken: 4 }),
    });

    expect(result.candidates[0]?.cost.tokens).toMatchObject({ count: 2, method: 'estimated' });
    expect(result.cost.tokenCountMethod).toBe('estimated');
  });

  it('fails explicitly when token counting fails', async () => {
    const failingCounter: TokenCounter<string> = {
      name: 'failing',
      version: '1',
      count() {
        throw new Error('counter unavailable');
      },
    };

    const error = await prepareContextPack({
      budget: { maxTokens: 10 },
      candidates: [candidate('failed', 'content')],
      policyId: 'failure-v1',
      tokenCounter: failingCounter,
    }).catch((cause: unknown) => cause);

    expect(error).toBeInstanceOf(TokenCountError);
    expect(error).toMatchObject({ candidateId: 'failed', counterName: 'failing' });
  });
});

describe('chunkTextCandidate', () => {
  it('preserves stable parent provenance with a boundary-aware strategy', () => {
    const chunks = chunkTextCandidate(candidate('article', 'first paragraph\n\nsecond paragraph'), {
      maxCharacters: 20,
      overlapCharacters: 2,
      strategy: paragraphChunkStrategy,
    });

    expect(chunks).toHaveLength(2);
    expect(chunks.map(({ id }) => id)).toEqual(['article:chunk:0', 'article:chunk:1']);
    expect(chunks[0]?.content).toBe('first paragraph\n\n');
    expect(chunks[1]?.source.provenance).toMatchObject({
      derivedFrom: ['source-article'],
      parentCandidateId: 'article',
      parentSourceId: 'source-article',
    });
  });
});
