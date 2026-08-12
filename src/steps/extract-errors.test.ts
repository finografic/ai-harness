import { describe, expect, it } from 'vitest';

import { extractErrorsStep } from './extract-errors';

describe('extractErrorsStep', () => {
  it('parses tsc output into structured errors', async () => {
    const result = await extractErrorsStep.run(
      {
        raw: [
          "src/example.ts(4,12): error TS2322: Type 'string' is not assignable to type 'number'.",
          "src/other.ts(9,3): error TS7006: Parameter 'value' implicitly has an 'any' type.",
        ].join('\n'),
      },
      {
        budget: { steps: 0 },
        cwd: process.cwd(),
        trace: [],
      },
    );

    expect(result).toEqual({
      errors: [
        {
          code: 'TS2322',
          column: 12,
          file: 'src/example.ts',
          line: 4,
          message: "Type 'string' is not assignable to type 'number'.",
        },
        {
          code: 'TS7006',
          column: 3,
          file: 'src/other.ts',
          line: 9,
          message: "Parameter 'value' implicitly has an 'any' type.",
        },
      ],
    });
  });

  it('handles ANSI output, paths with spaces, module extensions, and unmatched lines', async () => {
    const result = await extractErrorsStep.run(
      {
        raw: [
          '\u001B[31msrc/path with spaces/example.tsx(2,4): error TS1000: Example error.\u001B[0m',
          'src/module.mts(3,5): error TS1001: MTS error.',
          'src/module.cts(4,6): error TS1002: CTS error.',
          'compiler summary retained',
        ].join('\n'),
      },
      {
        budget: { steps: 0 },
        cwd: process.cwd(),
        trace: [],
      },
    );

    expect(result.errors.map(({ file }) => file)).toEqual([
      'src/path with spaces/example.tsx',
      'src/module.mts',
      'src/module.cts',
    ]);
    expect(result.unmatchedOutput).toBe('compiler summary retained');
    expect(result.unmatchedOutputTruncated).toBeUndefined();
  });
});
