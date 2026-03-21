import { recompress, recompressOptions } from 'dicom-dimse-native';
import { DicomResponse } from '../types';
import { ConfParams, config } from '../utils/config';
import { LoggerSingleton } from '../utils/logger';

export async function compressFile(
  inputFile: string,
  outputDirectory: string,
  transferSyntax?: string,
): Promise<void> {
  const logger = LoggerSingleton.Instance;
  const options: recompressOptions = {
    sourcePath: inputFile,
    storagePath: outputDirectory,
    writeTransfer: transferSyntax ?? config.get<string>(ConfParams.XTRANSFER),
    verbose: config.get<boolean>(ConfParams.VERBOSE),
  };

  return new Promise((resolve, reject) => {
    recompress(options, (result: string) => {
      if (!result) {
        reject(new Error('invalid result received'));
        return;
      }

      try {
        const json = JSON.parse(result) as DicomResponse;
        if (json.code === 0) {
          resolve();
          return;
        }

        const message = `recompression failure (${inputFile}): ${json.message}`;
        logger.error(message);
        reject(new Error(message));
      } catch (error) {
        logger.error(error);
        logger.error(result);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });
}
