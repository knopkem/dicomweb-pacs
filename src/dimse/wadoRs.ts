import { randomBytes } from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import dicomParser from 'dicom-parser';
import { BinaryResponse } from '../types';
import { ConfParams, config } from '../utils/config';
import { fileExists } from '../utils/fileHelper';
import { LoggerSingleton } from '../utils/logger';
import { compressFile } from './compressFile';

interface WadoRsArgs {
  studyInstanceUid: string;
  seriesInstanceUid?: string;
  sopInstanceUid: string;
  frame?: string;
}

function buildContentLocation(
  studyInstanceUid: string,
  seriesInstanceUid: string | undefined,
  sopInstanceUid: string,
): string {
  let contentLocation = `/studies/${studyInstanceUid}`;
  if (seriesInstanceUid) {
    contentLocation += `/series/${seriesInstanceUid}`;
  }
  contentLocation += `/instance/${sopInstanceUid}`;
  return contentLocation;
}

export async function doWadoRsFrame({
  studyInstanceUid,
  seriesInstanceUid,
  sopInstanceUid,
}: WadoRsArgs): Promise<BinaryResponse> {
  const logger = LoggerSingleton.Instance;
  const storagePath = config.get<string>(ConfParams.STORAGE_PATH);
  const studyPath = path.join(storagePath, studyInstanceUid);
  const pathname = path.join(studyPath, sopInstanceUid);

  if (!(await fileExists(pathname))) {
    throw new Error(`File ${pathname} not found`);
  }

  try {
    await compressFile(pathname, studyPath, '1.2.840.10008.1.2');
  } catch (error) {
    logger.error(error);
    throw new Error(`failed to compress ${pathname}`);
  }

  const data = await fs.readFile(pathname);
  const dataset = dicomParser.parseDicom(data);
  const pixelDataElement = dataset.elements.x7fe00010;
  if (!pixelDataElement) {
    throw new Error(`PixelData not found in ${pathname}`);
  }

  const byteOffset = dataset.byteArray.byteOffset ?? 0;
  const pixelData = Buffer.from(
    dataset.byteArray.buffer,
    byteOffset + pixelDataElement.dataOffset,
    pixelDataElement.length,
  );

  const boundary = randomBytes(16).toString('hex');
  const term = '\r\n';
  const contentLocation = buildContentLocation(
    studyInstanceUid,
    seriesInstanceUid,
    sopInstanceUid,
  );

  const body = Buffer.concat([
    Buffer.from(`--${boundary}${term}`),
    Buffer.from(`Content-Location:${contentLocation};${term}`),
    Buffer.from(`Content-Type:application/octet-stream;${term}`),
    Buffer.from(term),
    pixelData,
    Buffer.from(`${term}--${boundary}--${term}`),
  ]);

  return {
    contentType: `multipart/related; type="application/octet-stream"; boundary="${boundary}"`,
    buffer: body,
  };
}
