import { describe, expect, it } from 'vitest';

import { runProcess } from './exec';

describe('runProcess', () => {
  it('passes an explicit environment to a shell-free process', async () => {
    const result = await runProcess({
      arguments: ['-e', 'process.stdout.write(process.env.HARNESS_TEST ?? "missing")'],
      cwd: process.cwd(),
      environment: { HARNESS_TEST: 'available' },
      file: process.execPath,
      inheritEnvironment: false,
    });

    expect(result).toMatchObject({
      aborted: false,
      exitCode: 0,
      stdout: 'available',
      timedOut: false,
    });
  });

  it('reports non-zero exits without rejecting', async () => {
    const result = await runProcess({
      arguments: ['-e', 'process.stderr.write("failed"); process.exit(7)'],
      cwd: process.cwd(),
      file: process.execPath,
    });

    expect(result).toMatchObject({ exitCode: 7, stderr: 'failed' });
  });

  it('bounds captured output and records truncation', async () => {
    const result = await runProcess({
      arguments: ['-e', 'process.stdout.write("x".repeat(20)); process.stderr.write("y".repeat(20))'],
      cwd: process.cwd(),
      file: process.execPath,
      maxOutputBytes: 8,
    });

    expect(result).toMatchObject({
      stderr: 'y'.repeat(8),
      stderrTruncated: true,
      stdout: 'x'.repeat(8),
      stdoutTruncated: true,
    });
  });

  it('terminates a process after its timeout', async () => {
    const result = await runProcess({
      arguments: ['-e', 'setInterval(() => {}, 1_000)'],
      cwd: process.cwd(),
      file: process.execPath,
      timeoutMs: 25,
    });

    expect(result.timedOut).toBe(true);
    expect(result.signal).toBe('SIGTERM');
  });

  it('terminates a process when cancelled', async () => {
    const controller = new AbortController();
    const resultPromise = runProcess({
      arguments: ['-e', 'setInterval(() => {}, 1_000)'],
      cwd: process.cwd(),
      file: process.execPath,
      signal: controller.signal,
    });

    setTimeout(() => controller.abort(), 25);
    const result = await resultPromise;

    expect(result.aborted).toBe(true);
    expect(result.signal).toBe('SIGTERM');
  });

  it('redacts configured arguments from result metadata', async () => {
    const secretArgument = 'process.stdout.write("secret-value")';
    const result = await runProcess({
      arguments: ['-e', secretArgument],
      cwd: process.cwd(),
      file: process.execPath,
      redactArgumentIndexes: [1],
    });

    expect(result.stdout).toBe('secret-value');
    expect(result.arguments).toEqual(['-e', '[REDACTED]']);
    expect(result.command).not.toContain(secretArgument);
  });
});
