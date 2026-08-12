import { mkdtemp, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

import { readProjectTextFile } from './fs';

describe('readProjectTextFile', () => {
  it('reads within an allowed root and reports truncation', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'ai-harness-root-'));
    const filePath = join(rootPath, 'example.ts');
    await writeFile(filePath, 'abcdefgh', 'utf8');

    const result = await readProjectTextFile({ allowedRoots: [rootPath], filePath, maxBytes: 4 });

    expect(result).toMatchObject({
      bytesRead: 4,
      content: 'abcd',
      ok: true,
      truncated: true,
    });
  });

  it('rejects a file outside the allowed root', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'ai-harness-root-'));
    const outsidePath = join(await mkdtemp(join(tmpdir(), 'ai-harness-outside-')), 'outside.ts');
    await writeFile(outsidePath, 'secret', 'utf8');

    const result = await readProjectTextFile({ allowedRoots: [rootPath], filePath: outsidePath });

    expect(result).toMatchObject({ ok: false, reason: 'out-of-root' });
  });

  it('rejects a symlink that escapes the allowed root', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'ai-harness-root-'));
    const outsidePath = join(await mkdtemp(join(tmpdir(), 'ai-harness-outside-')), 'outside.ts');
    const linkPath = join(rootPath, 'linked.ts');
    await writeFile(outsidePath, 'secret', 'utf8');
    await symlink(outsidePath, linkPath);

    const result = await readProjectTextFile({ allowedRoots: [rootPath], filePath: linkPath });

    expect(result).toMatchObject({ ok: false, reason: 'out-of-root' });
  });

  it('returns a typed result for a missing file', async () => {
    const rootPath = await mkdtemp(join(tmpdir(), 'ai-harness-root-'));

    const result = await readProjectTextFile({
      allowedRoots: [rootPath],
      filePath: join(rootPath, 'missing.ts'),
    });

    expect(result).toMatchObject({ ok: false, reason: 'not-found' });
  });
});
