import { describe, expect, it } from 'vitest';

import { structureDebugStep } from './structure-debug';

describe('structureDebugStep', () => {
  it('flattens sliced errors into a debug payload', async () => {
    const result = await structureDebugStep.run(
      {
        errors: [
          {
            absoluteFilePath: '/tmp/example.ts',
            code: 'TS2322',
            column: 7,
            excerpt: {
              endLine: 4,
              snippet: '   3 | const value = 1;',
              startLine: 3,
            },
            file: 'src/example.ts',
            line: 3,
            message: 'Type string is not assignable to type number.',
          },
        ],
      },
      {
        budget: { steps: 0 },
        cwd: '/tmp',
        trace: [],
      },
    );

    expect(result).toEqual({
      errors: [
        {
          absoluteFilePath: '/tmp/example.ts',
          code: 'TS2322',
          column: 7,
          file: 'src/example.ts',
          line: 3,
          message: 'Type string is not assignable to type number.',
          snippet: '   3 | const value = 1;',
        },
      ],
      task: 'fix-type-errors',
    });
  });
});
