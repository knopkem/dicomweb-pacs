/* eslint-disable no-console */
import path from 'path';
import { Node as DicomNode, storeScu, storeScuOptions } from 'dicom-dimse-native';
import { DicomResponse } from './types';
import { ConfParams, config } from './utils/config';
import { ensureDirectories, fileExists } from './utils/fileHelper';
import { LoggerSingleton } from './utils/logger';

function buildImportOptions(importRoot: string): storeScuOptions {
  const source = config.get<DicomNode>(ConfParams.SOURCE);
  return {
    source,
    target: source,
    sourcePath: importRoot,
    verbose: config.get<boolean>(ConfParams.VERBOSE),
  };
}

async function importFiles(importRoot: string): Promise<void> {
  const logger = LoggerSingleton.Instance;
  const options = buildImportOptions(importRoot);

  logger.info(
    `importing DICOM files from ${importRoot} via C-STORE to ${options.target.aet}@${options.target.ip}:${options.target.port}`,
  );

  await new Promise<void>((resolve, reject) => {
    let settled = false;
    storeScu(options, (result: string) => {
      if (settled) {
        return;
      }
      if (!result) {
        settled = true;
        reject(new Error('invalid result received'));
        return;
      }

      try {
        const response = JSON.parse(result) as DicomResponse;
        if (response.code === 1) {
          logger.info(response.message);
          return;
        }
        if (response.code === 2) {
          settled = true;
          reject(new Error(response.message));
          return;
        }

        logger.info(response.message);
        settled = true;
        resolve();
      } catch (error) {
        logger.error(result);
        settled = true;
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });
}

async function main() {
  await ensureDirectories();
  const importRoot = path.resolve(__dirname, '../import');
  if (!(await fileExists(importRoot))) {
    throw new Error(`Import path does not exist: ${importRoot}`);
  }

  await importFiles(importRoot);
  console.log({ importedFrom: importRoot, status: 'success' });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
