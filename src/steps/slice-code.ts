import { isAbsolute, resolve } from 'node:path';
import type { HarnessStep } from '../core/types';
import type { ExtractedErrors, TypeScriptError } from './extract-errors';

import { readTextFile } from '../utils/fs';

export interface SliceCodeParams {
  contextLines?: number;
}

export interface CodeExcerpt {
  startLine: number;
  endLine: number;
  snippet: string;
}

export interface SlicedError extends TypeScriptError {
  absoluteFilePath: string;
  excerpt: CodeExcerpt;
}

export interface SlicedErrors {
  errors: SlicedError[];
}

function createSnippet({
  fileContents,
  line,
  contextLines,
}: {
  fileContents: string;
  line: number;
  contextLines: number;
}): CodeExcerpt {
  const lines = fileContents.split('\n');
  const startLine = Math.max(1, line - contextLines);
  const endLine = Math.min(lines.length, line + contextLines);
  const snippet = lines
    .slice(startLine - 1, endLine)
    .map((content, index) => {
      const currentLine = startLine + index;
      return `${String(currentLine).padStart(4, ' ')} | ${content}`;
    })
    .join('\n');

  return {
    startLine,
    endLine,
    snippet,
  };
}

export function createSliceCodeStep({ contextLines = 3 }: SliceCodeParams = {}): HarnessStep<
  ExtractedErrors,
  SlicedErrors
> {
  return {
    name: 'slice-code',
    async run(input, context) {
      const errors: SlicedError[] = [];

      for (const error of input.errors) {
        const absoluteFilePath = isAbsolute(error.file) ? error.file : resolve(context.cwd, error.file);
        const fileContents = await readTextFile({ filePath: absoluteFilePath });

        errors.push({
          ...error,
          absoluteFilePath,
          excerpt: createSnippet({
            fileContents,
            line: error.line,
            contextLines,
          }),
        });
      }

      return { errors };
    },
  };
}
