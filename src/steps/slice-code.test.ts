import { mkdir, mkdtemp, realpath, writeFile } from 'node:fs/promises';
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
    const realFilePath = await realpath(filePath);

    expect(result).toEqual({
      errors: [
        {
          absoluteFilePath: realFilePath,
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

  it('bounds the attached snippet', async () => {
    const directoryPath = await mkdtemp(join(tmpdir(), 'ai-harness-'));
    const filePath = join(directoryPath, 'example.ts');
    await writeFile(filePath, 'const example = "a long source line";', 'utf8');

    const step = createSliceCodeStep({ contextLines: 0, maxSnippetCharacters: 12 });
    const result = await step.run(
      {
        errors: [{ code: 'TS1000', column: 1, file: filePath, line: 1, message: 'Example error' }],
      },
      { budget: { steps: 0 }, cwd: directoryPath, trace: [] },
    );

    expect(result.errors[0]?.excerpt).toMatchObject({
      snippet: '   1 | const',
      truncated: true,
    });
  });

  it('rejects relative traversal outside the working root', async () => {
    const parentPath = await mkdtemp(join(tmpdir(), 'ai-harness-parent-'));
    const rootPath = join(parentPath, 'project');
    const outsidePath = join(parentPath, 'outside.ts');
    await mkdir(rootPath);
    await writeFile(outsidePath, 'secret', 'utf8');
    const step = createSliceCodeStep();

    const error = await step
      .run(
        {
          errors: [
            {
              code: 'TS1000',
              column: 1,
              file: '../outside.ts',
              line: 1,
              message: 'Example error',
            },
          ],
        },
        { budget: { steps: 0 }, cwd: rootPath, trace: [] },
      )
      .catch((cause: unknown) => cause);

    expect(error).toMatchObject({ reason: 'out-of-root' });
  });
});
