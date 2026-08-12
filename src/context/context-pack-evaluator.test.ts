import { describe, expect, it } from 'vitest';

import { prepareContextPack } from './context-pack';
import { evaluateContextPack } from './context-pack-evaluator';
import { createCharacterHeuristicTokenCounter } from './token-counter';

describe('evaluateContextPack', () => {
  it('reports coverage, provenance, accounting, and budget adherence separately', async () => {
    const pack = await prepareContextPack({
      budget: { maxTokens: 2 },
      candidates: [
        {
          content: '1234',
          id: 'selected',
          relevance: 1,
          source: { id: 'source-selected', kind: 'fixture' },
        },
        {
          content: '12345678',
          id: 'dropped',
          relevance: 0,
          source: { id: 'source-dropped', kind: 'fixture' },
        },
      ],
      policyId: 'evaluation-v1',
      tokenCounter: createCharacterHeuristicTokenCounter(),
    });

    expect(evaluateContextPack(pack, { expectedCandidateIds: ['selected', 'missing'] })).toEqual({
      allSelectionsAccountedFor: true,
      budgetAdhered: true,
      coverage: {
        matchedCandidateIds: ['selected'],
        missingCandidateIds: ['missing'],
        ratio: 0.5,
      },
      provenanceComplete: true,
    });
  });
});
