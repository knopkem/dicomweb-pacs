import { echoScu, echoScuOptions, Node as DicomNode } from 'dicom-dimse-native';
import { DicomResponse } from '../types';
import { ConfParams, config } from '../utils/config';
import { LoggerSingleton } from '../utils/logger';

export async function sendEcho(): Promise<void> {
  const logger = LoggerSingleton.Instance;
  const source = config.get<DicomNode>(ConfParams.SOURCE);
  const options: echoScuOptions = {
    source,
    target: source,
    verbose: config.get<boolean>(ConfParams.VERBOSE),
  };

  logger.info(`sending C-ECHO to target: ${options.target.aet}`);

  return new Promise((resolve, reject) => {
    echoScu(options, (result: string) => {
      if (!result) {
        reject(new Error('invalid result received'));
        return;
      }

      try {
        const response = JSON.parse(result) as DicomResponse;
        if (response.code === 2) {
          logger.error(response.message);
          reject(new Error(response.message));
          return;
        }

        logger.info(response.message);
        resolve();
      } catch (error) {
        logger.error(result);
        reject(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });
}
