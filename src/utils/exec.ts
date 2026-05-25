import { exec } from 'node:child_process';
import { promisify } from 'node:util';

const execAsync = promisify(exec);

export interface RunCommandParams {
  command: string;
  cwd: string;
}

export interface CommandResult {
  command: string;
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface ExecErrorLike {
  code?: number | string;
  stdout?: string;
  stderr?: string;
}

export async function runCommand({ command, cwd }: RunCommandParams): Promise<CommandResult> {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd });

    return {
      command,
      cwd,
      exitCode: 0,
      stdout,
      stderr,
    };
  } catch (error: unknown) {
    const commandError = error as ExecErrorLike;
    const exitCode = typeof commandError.code === 'number' ? commandError.code : Number.NaN;

    return {
      command,
      cwd,
      exitCode: Number.isNaN(exitCode) ? 1 : exitCode,
      stdout: commandError.stdout ?? '',
      stderr: commandError.stderr ?? '',
    };
  }
}
