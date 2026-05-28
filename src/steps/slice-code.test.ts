import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { createSliceCodeStep } from './slice-code';

describe('createSliceCodeStep', () => {
  it('reads source and attaches a contextual excerpt', async () => {
    const directoryPath = await mkdtemp(join(tmpdir(), 'ai-harness-'));
    const filePath = join(directoryPath, 'example.ts');

    await writeFile(
      filePath,
      ['const start = 1;', 'const middle = 2;', 'const target = start + middle;', 'const end = 3;'].join(
        '\n',
      ),
      'utf8',
    );

    const step = createSliceCodeStep({ contextLines: 1 });
    const result = await step.run(
      {
        errors: [
          {
            code: 'TS2322',
            column: 5,
            file: filePath,
            line: 3,
            message: 'Example error',
          },
        ],
      },
      {
        budget: { steps: 0 },
        cwd: directoryPath,
        trace: [],
      },
    );

    expect(result).toEqual({
      errors: [
        {
          absoluteFilePath: filePath,
          code: 'TS2322',
          column: 5,
          excerpt: {
            endLine: 4,
            snippet: [
              '   2 | const middle = 2;',
              '   3 | const target = start + middle;',
              '   4 | const end = 3;',
            ].join('\n'),
            startLine: 2,
          },
          file: filePath,
          line: 3,
          message: 'Example error',
        },
      ],
    });
  });
});
