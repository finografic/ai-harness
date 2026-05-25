import { readFile } from 'node:fs/promises';

export interface ReadTextFileParams {
  filePath: string;
}

export async function readTextFile({ filePath }: ReadTextFileParams): Promise<string> {
  return readFile(filePath, 'utf8');
}
