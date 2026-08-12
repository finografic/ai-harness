import type { TokenCount } from './context-pack.types';

export interface TokenCounter<Content = string> {
  readonly name: string;
  readonly version: string;
  count(content: Content): Promise<TokenCount> | TokenCount;
}

export interface CharacterHeuristicTokenCounterParams {
  charactersPerToken?: number;
  name?: string;
  version?: string;
}

export class TokenCountError extends Error {
  readonly candidateId: string;
  readonly counterName: string;

  constructor({
    candidateId,
    cause,
    counterName,
  }: {
    candidateId: string;
    cause: unknown;
    counterName: string;
  }) {
    super(`Token counter "${counterName}" failed for candidate "${candidateId}"`, { cause });
    this.name = 'TokenCountError';
    this.candidateId = candidateId;
    this.counterName = counterName;
  }
}

export function createCharacterHeuristicTokenCounter({
  charactersPerToken = 4,
  name = 'characters-per-token',
  version = '1',
}: CharacterHeuristicTokenCounterParams = {}): TokenCounter<string> {
  if (!Number.isFinite(charactersPerToken) || charactersPerToken <= 0) {
    throw new RangeError('charactersPerToken must be greater than 0');
  }

  return {
    name,
    version,
    count(content) {
      return {
        count: Math.ceil(content.length / charactersPerToken),
        counter: { name, version },
        method: 'estimated',
      };
    },
  };
}
