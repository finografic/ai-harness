import type { TypeScriptError } from '../steps/extract-errors';

export const MAX_UNMATCHED_DIAGNOSTIC_CHARACTERS = 8_192;

const diagnosticPattern = /^(.+\.(?:cts|mts|ts|tsx))\((\d+),(\d+)\): error (TS\d+): (.+)$/;

export interface ParsedTypeScriptDiagnostics {
  errors: TypeScriptError[];
  unmatchedOutput?: string;
  unmatchedOutputTruncated?: true;
}

export function stripAnsi(value: string): string {
  let output = '';
  let index = 0;

  while (index < value.length) {
    if (value.codePointAt(index) !== 27) {
      output += value[index];
      index += 1;
      continue;
    }

    index += 1;
    if (value[index] !== '[') {
      index += 1;
      continue;
    }

    index += 1;
    while (index < value.length) {
      const codePoint = value.codePointAt(index) ?? 0;
      index += 1;
      if (codePoint >= 64 && codePoint <= 126) break;
    }
  }

  return output;
}

export function parseTypeScriptDiagnostics(raw: string): ParsedTypeScriptDiagnostics {
  const errors: TypeScriptError[] = [];
  const unmatchedLines: string[] = [];

  for (const line of stripAnsi(raw).split('\n')) {
    const match = diagnosticPattern.exec(line);
    if (match == null) {
      if (line.length > 0) unmatchedLines.push(line);
      continue;
    }

    const [, file, lineNumber, column, code, message] = match;
    errors.push({
      code,
      column: Number(column),
      file,
      line: Number(lineNumber),
      message,
    });
  }

  const unmatchedOutput = unmatchedLines.join('\n');
  return {
    errors,
    ...(unmatchedOutput.length === 0
      ? {}
      : { unmatchedOutput: unmatchedOutput.slice(0, MAX_UNMATCHED_DIAGNOSTIC_CHARACTERS) }),
    ...(unmatchedOutput.length > MAX_UNMATCHED_DIAGNOSTIC_CHARACTERS
      ? { unmatchedOutputTruncated: true as const }
      : {}),
  };
}
