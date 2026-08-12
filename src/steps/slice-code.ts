import { isAbsolute, resolve } from 'node:path';
import type { HarnessStep } from '../core/types';
import type { ExtractedErrors, TypeScriptError } from './extract-errors';

import { ProjectFileReadError, readProjectTextFile } from '../utils/fs';

export interface SliceCodeParams {
  allowedRoots?: readonly string[];
  contextLines?: number;
  maxFileBytes?: number;
  maxSnippetCharacters?: number;
}

export interface CodeExcerpt {
  endLine: number;
  snippet: string;
  startLine: number;
  truncated?: true;
}

export interface SlicedError extends TypeScriptError {
  absoluteFilePath: string;
  excerpt: CodeExcerpt;
  sourceTruncated?: true;
}

export interface SlicedErrors {
  errors: SlicedError[];
  unmatchedOutput?: string;
  unmatchedOutputTruncated?: true;
}

function createSnippet({
  fileContents,
  line,
  contextLines,
  maxSnippetCharacters,
}: {
  fileContents: string;
  line: number;
  contextLines: number;
  maxSnippetCharacters: number;
}): CodeExcerpt {
  const lines = fileContents.split('\n');
  const startLine = Math.max(1, line - contextLines);
  const endLine = Math.min(lines.length, line + contextLines);
  const fullSnippet = lines
    .slice(startLine - 1, endLine)
    .map((content, index) => {
      const currentLine = startLine + index;
      return `${String(currentLine).padStart(4, ' ')} | ${content}`;
    })
    .join('\n');
  const snippet = fullSnippet.slice(0, maxSnippetCharacters);

  return {
    startLine,
    endLine,
    snippet,
    ...(fullSnippet.length > snippet.length ? { truncated: true as const } : {}),
  };
}

export function createSliceCodeStep({
  allowedRoots,
  contextLines = 3,
  maxFileBytes,
  maxSnippetCharacters = 32_768,
}: SliceCodeParams = {}): HarnessStep<ExtractedErrors, SlicedErrors> {
  return {
    name: 'slice-code',
    async run(input, context) {
      const errors: SlicedError[] = [];

      for (const error of input.errors) {
        const absoluteFilePath = isAbsolute(error.file) ? error.file : resolve(context.cwd, error.file);
        const readResult = await readProjectTextFile({
          allowedRoots: allowedRoots ?? [context.cwd],
          filePath: absoluteFilePath,
          maxBytes: maxFileBytes,
        });
        if (!readResult.ok) throw new ProjectFileReadError(readResult);

        errors.push({
          ...error,
          absoluteFilePath: readResult.filePath,
          excerpt: createSnippet({
            fileContents: readResult.content,
            line: error.line,
            contextLines,
            maxSnippetCharacters,
          }),
          ...(readResult.truncated ? { sourceTruncated: true as const } : {}),
        });
      }

      return {
        errors,
        ...(input.unmatchedOutput == null ? {} : { unmatchedOutput: input.unmatchedOutput }),
        ...(input.unmatchedOutputTruncated === true ? { unmatchedOutputTruncated: true as const } : {}),
      };
    },
  };
}
