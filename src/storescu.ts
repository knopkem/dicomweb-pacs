/* eslint-disable no-console */
import fs from 'fs/promises';
import path from 'path';
import dicomParser from 'dicom-parser';
import { ConfParams, config } from './utils/config';
import { collectFiles, ensureDirectories, fileExists } from './utils/fileHelper';
import { LoggerSingleton } from './utils/logger';

function getRequiredTag(dataset: dicomParser.DataSet, tag: string): string {
  const value = dataset.string(`x${tag.toLowerCase()}`);
  if (!value) {
    throw new Error(`Missing required DICOM tag ${tag}`);
  }
  return value;
}

async function importFile(sourcePath: string): Promise<string> {
  const data = await fs.readFile(sourcePath);
  const dataset = dicomParser.parseDicom(data);
  const studyInstanceUid = getRequiredTag(dataset, '0020000D');
  const sopInstanceUid = getRequiredTag(dataset, '00080018');
  const storagePath = config.get<string>(ConfParams.STORAGE_PATH);
  const targetDir = path.join(storagePath, studyInstanceUid);
  const targetPath = path.join(targetDir, sopInstanceUid);

  await fs.mkdir(targetDir, { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
  return targetPath;
}

async function main() {
  const logger = LoggerSingleton.Instance;
  await ensureDirectories();
  const importRoot = path.join(__dirname, '../import');
  if (!(await fileExists(importRoot))) {
    throw new Error(`Import path does not exist: ${importRoot}`);
  }

  const files = await collectFiles(importRoot);
  let imported = 0;
  let skipped = 0;

  for (const filePath of files) {
    try {
      const targetPath = await importFile(filePath);
      logger.info('imported DICOM file', filePath, targetPath);
      imported += 1;
    } catch (error) {
      console.error(`failed to import ${filePath}`, error);
      skipped += 1;
    }
  }

  console.log({ imported, skipped, status: 'success' });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
