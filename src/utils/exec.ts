import { spawn } from 'node:child_process';
import type { ChildProcessWithoutNullStreams, SpawnOptionsWithoutStdio } from 'node:child_process';

export const DEFAULT_MAX_OUTPUT_BYTES = 1_048_576;

export interface RunProcessParams {
  arguments?: readonly string[];
  cwd: string;
  environment?: NodeJS.ProcessEnv;
  file: string;
  inheritEnvironment?: boolean;
  maxOutputBytes?: number;
  redactArgumentIndexes?: readonly number[];
  shell?: boolean;
  signal?: AbortSignal;
  timeoutMs?: number;
}

export interface RunCommandParams {
  command: string;
  cwd: string;
}

export interface CommandResult {
  aborted: boolean;
  arguments: string[];
  command: string;
  cwd: string;
  exitCode: number;
  file: string;
  signal: NodeJS.Signals | null;
  stderr: string;
  stderrTruncated: boolean;
  stdout: string;
  stdoutTruncated: boolean;
  timedOut: boolean;
}

interface BoundedOutput {
  append(chunk: Buffer): void;
  text(): string;
  truncated(): boolean;
}

function createBoundedOutput(maxBytes: number): BoundedOutput {
  const chunks: Buffer[] = [];
  let capturedBytes = 0;
  let outputTruncated = false;

  return {
    append(chunk) {
      const remainingBytes = maxBytes - capturedBytes;
      if (remainingBytes <= 0) {
        outputTruncated = true;
        return;
      }

      if (chunk.byteLength > remainingBytes) {
        chunks.push(chunk.subarray(0, remainingBytes));
        capturedBytes += remainingBytes;
        outputTruncated = true;
        return;
      }

      chunks.push(chunk);
      capturedBytes += chunk.byteLength;
    },
    text() {
      return Buffer.concat(chunks).toString('utf8');
    },
    truncated() {
      return outputTruncated;
    },
  };
}

function redactArguments(arguments_: readonly string[], redactArgumentIndexes: readonly number[]): string[] {
  const redactedIndexes = new Set(redactArgumentIndexes);
  return arguments_.map((argument, index) => (redactedIndexes.has(index) ? '[REDACTED]' : argument));
}

function formatCommand(file: string, arguments_: readonly string[]): string {
  return [file, ...arguments_].join(' ');
}

function resultForUnstartedProcess({
  arguments: arguments_ = [],
  cwd,
  file,
  redactArgumentIndexes = [],
}: RunProcessParams): CommandResult {
  const displayArguments = redactArguments(arguments_, redactArgumentIndexes);
  return {
    aborted: true,
    arguments: displayArguments,
    command: formatCommand(file, displayArguments),
    cwd,
    exitCode: 1,
    file,
    signal: null,
    stderr: '',
    stderrTruncated: false,
    stdout: '',
    stdoutTruncated: false,
    timedOut: false,
  };
}

function createSpawnOptions({
  cwd,
  environment,
  inheritEnvironment = true,
  shell = false,
}: RunProcessParams): SpawnOptionsWithoutStdio {
  return {
    cwd,
    env: {
      ...(inheritEnvironment ? process.env : {}),
      ...environment,
    },
    shell,
    stdio: 'pipe',
  };
}

function attachOutput(
  child: ChildProcessWithoutNullStreams,
  stdout: BoundedOutput,
  stderr: BoundedOutput,
): void {
  child.stdout.on('data', (chunk: Buffer) => stdout.append(chunk));
  child.stderr.on('data', (chunk: Buffer) => stderr.append(chunk));
}

export async function runProcess(params: RunProcessParams): Promise<CommandResult> {
  const {
    arguments: arguments_ = [],
    cwd,
    file,
    maxOutputBytes = DEFAULT_MAX_OUTPUT_BYTES,
    redactArgumentIndexes = [],
    signal,
    timeoutMs,
  } = params;

  if (maxOutputBytes < 0) throw new RangeError('maxOutputBytes must be at least 0');
  if (timeoutMs != null && timeoutMs < 0) throw new RangeError('timeoutMs must be at least 0');
  if (signal?.aborted === true) return resultForUnstartedProcess(params);

  const displayArguments = redactArguments(arguments_, redactArgumentIndexes);
  const stdout = createBoundedOutput(maxOutputBytes);
  const stderr = createBoundedOutput(maxOutputBytes);

  return new Promise((resolve) => {
    const child = spawn(file, arguments_, createSpawnOptions(params));
    let aborted = false;
    let spawnError: Error | undefined;
    let timedOut = false;

    attachOutput(child, stdout, stderr);

    const stopForAbort = (): void => {
      aborted = true;
      child.kill('SIGTERM');
    };
    signal?.addEventListener('abort', stopForAbort, { once: true });

    const timeout =
      timeoutMs == null
        ? undefined
        : setTimeout(() => {
            timedOut = true;
            child.kill('SIGTERM');
          }, timeoutMs);
    timeout?.unref();

    child.once('error', (error) => {
      spawnError = error;
    });

    child.once('close', (exitCode, exitSignal) => {
      if (timeout != null) clearTimeout(timeout);
      signal?.removeEventListener('abort', stopForAbort);

      const capturedStderr = stderr.text();
      resolve({
        aborted,
        arguments: displayArguments,
        command: formatCommand(file, displayArguments),
        cwd,
        exitCode: exitCode ?? 1,
        file,
        signal: exitSignal,
        stderr: capturedStderr.length === 0 && spawnError != null ? spawnError.message : capturedStderr,
        stderrTruncated: stderr.truncated(),
        stdout: stdout.text(),
        stdoutTruncated: stdout.truncated(),
        timedOut,
      });
    });
  });
}

/**
 * @deprecated Use `runProcess()` with an executable and argument array. This compatibility wrapper
 * opts into shell parsing and should not receive model-generated commands.
 */
export async function runCommand({ command, cwd }: RunCommandParams): Promise<CommandResult> {
  return runProcess({ cwd, file: command, shell: true });
}
