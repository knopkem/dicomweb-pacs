import fs from 'fs/promises';
import path from 'path';
import { ConfParams, config } from './config';
import { LoggerSingleton } from './logger';

export async function ensureDirectories() {
  const paths = [
    config.get<string>(ConfParams.LOG_DIR),
    config.get<string>(ConfParams.STORAGE_PATH),
  ];

  await Promise.all(paths.map((targetPath) => fs.mkdir(targetPath, { recursive: true })));
}

export async function fileExists(pathname: string): Promise<boolean> {
  try {
    await fs.stat(pathname);
    return true;
  } catch {
    return false;
  }
}

export async function collectDirectories(rootPath: string): Promise<string[]> {
  const directories = [rootPath];
  const entries = await fs.readdir(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      directories.push(...(await collectDirectories(path.join(rootPath, entry.name))));
    }
  }

  return directories;
}

export async function collectFiles(rootPath: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await fs.readdir(rootPath, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(rootPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectFiles(entryPath)));
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

export async function listFiles(pathname: string): Promise<string[]> {
  try {
    return await fs.readdir(pathname);
  } catch (error) {
    LoggerSingleton.Instance.warn('failed to list files', pathname, error);
    return [];
  }
}
