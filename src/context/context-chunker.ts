import type { ContextCandidate } from './context-pack.types';

export interface TextChunkBoundary {
  endCharacter: number;
  startCharacter: number;
}

export interface TextChunkStrategy {
  readonly id: string;
  split(params: {
    maxCharacters: number;
    overlapCharacters: number;
    text: string;
  }): readonly TextChunkBoundary[];
}

export interface ChunkTextCandidateParams {
  maxCharacters: number;
  overlapCharacters?: number;
  strategy: TextChunkStrategy;
}

function validateChunkParams(maxCharacters: number, overlapCharacters: number): void {
  if (!Number.isInteger(maxCharacters) || maxCharacters <= 0) {
    throw new RangeError('maxCharacters must be a positive integer');
  }
  if (!Number.isInteger(overlapCharacters) || overlapCharacters < 0) {
    throw new RangeError('overlapCharacters must be a non-negative integer');
  }
  if (overlapCharacters >= maxCharacters) {
    throw new RangeError('overlapCharacters must be smaller than maxCharacters');
  }
}

function splitAtCharacterLimit({
  maxCharacters,
  overlapCharacters,
  text,
}: {
  maxCharacters: number;
  overlapCharacters: number;
  text: string;
}): TextChunkBoundary[] {
  const boundaries: TextChunkBoundary[] = [];
  let startCharacter = 0;
  while (startCharacter < text.length) {
    const endCharacter = Math.min(startCharacter + maxCharacters, text.length);
    boundaries.push({ endCharacter, startCharacter });
    if (endCharacter === text.length) break;
    startCharacter = endCharacter - overlapCharacters;
  }
  return boundaries;
}

export const characterChunkStrategy: TextChunkStrategy = {
  id: 'characters-v1',
  split(params) {
    return splitAtCharacterLimit(params);
  },
};

export const paragraphChunkStrategy: TextChunkStrategy = {
  id: 'paragraphs-v1',
  split({ maxCharacters, overlapCharacters, text }) {
    const boundaries: TextChunkBoundary[] = [];
    let startCharacter = 0;
    while (startCharacter < text.length) {
      const hardEnd = Math.min(startCharacter + maxCharacters, text.length);
      const paragraphEnd = text.lastIndexOf('\n\n', Math.max(startCharacter, hardEnd - 2));
      const endCharacter =
        hardEnd === text.length || paragraphEnd <= startCharacter ? hardEnd : paragraphEnd + 2;
      boundaries.push({ endCharacter, startCharacter });
      if (endCharacter === text.length) break;
      startCharacter = Math.max(startCharacter + 1, endCharacter - overlapCharacters);
    }
    return boundaries;
  },
};

function validateBoundaries(
  text: string,
  boundaries: readonly TextChunkBoundary[],
  maxCharacters: number,
): void {
  if (text.length > 0 && boundaries.length === 0) {
    throw new Error('Chunk strategy returned no boundaries for non-empty text');
  }
  let previousStart = -1;
  let previousEnd = 0;
  for (const [index, boundary] of boundaries.entries()) {
    if (
      !Number.isInteger(boundary.startCharacter) ||
      !Number.isInteger(boundary.endCharacter) ||
      boundary.startCharacter < 0 ||
      boundary.endCharacter <= boundary.startCharacter ||
      boundary.endCharacter > text.length ||
      boundary.endCharacter - boundary.startCharacter > maxCharacters ||
      (index === 0 && boundary.startCharacter !== 0) ||
      boundary.startCharacter <= previousStart ||
      boundary.startCharacter > previousEnd
    ) {
      throw new Error('Chunk strategy returned an invalid boundary');
    }
    previousStart = boundary.startCharacter;
    previousEnd = boundary.endCharacter;
  }
  if (boundaries.at(-1)?.endCharacter !== text.length) {
    throw new Error('Chunk strategy did not cover the complete text');
  }
}

export function chunkTextCandidate(
  candidate: ContextCandidate<string>,
  { maxCharacters, overlapCharacters = 0, strategy }: ChunkTextCandidateParams,
): Array<ContextCandidate<string>> {
  validateChunkParams(maxCharacters, overlapCharacters);
  if (candidate.content.length <= maxCharacters) return [candidate];

  const boundaries = strategy.split({ maxCharacters, overlapCharacters, text: candidate.content });
  validateBoundaries(candidate.content, boundaries, maxCharacters);

  const chunks: Array<ContextCandidate<string>> = [];
  for (const [index, { endCharacter, startCharacter }] of boundaries.entries()) {
    chunks.push({
      ...candidate,
      content: candidate.content.slice(startCharacter, endCharacter),
      id: `${candidate.id}:chunk:${index}`,
      source: {
        ...candidate.source,
        id: `${candidate.source.id}:chunk:${index}`,
        provenance: {
          ...candidate.source.provenance,
          derivedFrom: [...(candidate.source.provenance?.derivedFrom ?? []), candidate.source.id],
          parentCandidateId: candidate.id,
          parentSourceId: candidate.source.id,
        },
      },
    });
  }
  return chunks;
}
