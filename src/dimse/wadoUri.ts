import fs from 'fs/promises';
import path from 'path';
import { BinaryResponse } from '../types';
import { ConfParams, config } from '../utils/config';
import { fileExists } from '../utils/fileHelper';
import { LoggerSingleton } from '../utils/logger';
import { compressFile } from './compressFile';

interface WadoUriArgs {
  studyInstanceUid: string;
  seriesInstanceUid?: string;
  sopInstanceUid: string;
}

export async function doWadoUri({ studyInstanceUid, sopInstanceUid }: WadoUriArgs): Promise<BinaryResponse> {
  const logger = LoggerSingleton.Instance;
  const storagePath = config.get<string>(ConfParams.STORAGE_PATH);
  const studyPath = path.join(storagePath, studyInstanceUid);
  const pathname = path.join(studyPath, sopInstanceUid);

  if (!(await fileExists(pathname))) {
    const message = `file not found ${pathname}`;
    logger.error(message);
    throw new Error(message);
  }

  await compressFile(pathname, studyPath);

  return {
    contentType: config.get<string>(ConfParams.MIMETYPE),
    buffer: await fs.readFile(pathname),
  };
}
