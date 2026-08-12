import { open, readFile, realpath, stat } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';

export const DEFAULT_MAX_FILE_BYTES = 1_048_576;

export interface ReadTextFileParams {
  filePath: string;
}

export interface ReadProjectTextFileParams {
  allowedRoots: readonly string[];
  filePath: string;
  maxBytes?: number;
}

export type ProjectFileReadFailureReason = 'invalid-root' | 'not-found' | 'out-of-root' | 'unreadable';

export interface ProjectFileReadSuccess {
  bytesRead: number;
  content: string;
  filePath: string;
  ok: true;
  truncated: boolean;
}

export interface ProjectFileReadFailure {
  filePath: string;
  ok: false;
  reason: ProjectFileReadFailureReason;
}

export type ProjectFileReadResult = ProjectFileReadFailure | ProjectFileReadSuccess;

export class ProjectFileReadError extends Error {
  readonly filePath: string;
  readonly reason: ProjectFileReadFailureReason;

  constructor(result: ProjectFileReadFailure) {
    super(`Cannot read project file "${result.filePath}": ${result.reason}`);
    this.name = 'ProjectFileReadError';
    this.filePath = result.filePath;
    this.reason = result.reason;
  }
}

function isWithinRoot(filePath: string, rootPath: string): boolean {
  const relativePath = relative(rootPath, filePath);
  return relativePath === '' || (!relativePath.startsWith('..') && !isAbsolute(relativePath));
}

function classifyReadError(error: unknown): 'not-found' | 'unreadable' {
  const { code } = error as NodeJS.ErrnoException;
  return code === 'ENOENT' || code === 'ENOTDIR' ? 'not-found' : 'unreadable';
}

async function resolveAllowedRoots(allowedRoots: readonly string[]): Promise<string[] | undefined> {
  if (allowedRoots.length === 0) return undefined;

  try {
    return await Promise.all(allowedRoots.map((rootPath) => realpath(resolve(rootPath))));
  } catch {
    return undefined;
  }
}

export async function readProjectTextFile({
  allowedRoots,
  filePath,
  maxBytes = DEFAULT_MAX_FILE_BYTES,
}: ReadProjectTextFileParams): Promise<ProjectFileReadResult> {
  if (maxBytes < 0) throw new RangeError('maxBytes must be at least 0');

  const resolvedRoots = await resolveAllowedRoots(allowedRoots);
  if (resolvedRoots == null) return { filePath, ok: false, reason: 'invalid-root' };

  let realFilePath: string;
  try {
    realFilePath = await realpath(resolve(filePath));
  } catch (error: unknown) {
    return { filePath, ok: false, reason: classifyReadError(error) };
  }

  if (!resolvedRoots.some((rootPath) => isWithinRoot(realFilePath, rootPath))) {
    return { filePath: realFilePath, ok: false, reason: 'out-of-root' };
  }

  try {
    const fileStats = await stat(realFilePath);
    const bytesToRead = Math.min(fileStats.size, maxBytes);
    const fileHandle = await open(realFilePath, 'r');
    try {
      const buffer = Buffer.alloc(bytesToRead);
      const { bytesRead } = await fileHandle.read(buffer, 0, bytesToRead, 0);
      return {
        bytesRead,
        content: buffer.subarray(0, bytesRead).toString('utf8'),
        filePath: realFilePath,
        ok: true,
        truncated: fileStats.size > bytesRead,
      };
    } finally {
      await fileHandle.close();
    }
  } catch (error: unknown) {
    return { filePath: realFilePath, ok: false, reason: classifyReadError(error) };
  }
}

/** @deprecated Use `readProjectTextFile()` with explicit allowed roots and a byte limit. */
export async function readTextFile({ filePath }: ReadTextFileParams): Promise<string> {
  return readFile(filePath, 'utf8');
}
