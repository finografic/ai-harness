import type { HarnessStep } from '../core/types';

import { runCommand } from '../utils/exec';

export interface TypecheckResult {
  command: string;
  exitCode: number;
  raw: string;
}

export const runTypecheckStep: HarnessStep<unknown, TypecheckResult> = {
  name: 'run-typecheck',
  async run(_input, context) {
    const commandResult = await runCommand({
      command: 'pnpm typecheck',
      cwd: context.cwd,
    });

    return {
      command: commandResult.command,
      exitCode: commandResult.exitCode,
      raw: [commandResult.stdout, commandResult.stderr]
        .filter((output) => output.length > 0)
        .join('\n')
        .trim(),
    };
  },
};
