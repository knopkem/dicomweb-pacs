import {
  Node as DicomNode,
  shutdownScu,
  shutdownScuOptions,
  startStoreScp,
  storeScpOptions,
} from 'dicom-dimse-native';
import { DicomResponse } from '../types';
import { ConfParams, config } from '../utils/config';
import { LoggerSingleton } from '../utils/logger';

export function startScp() {
  const logger = LoggerSingleton.Instance;
  const source = config.get<DicomNode>(ConfParams.SOURCE);
  const peers = config.get<DicomNode[]>(ConfParams.PEERS);
  const transferSyntax = config.get<string>(ConfParams.XTRANSFER);

  const options: storeScpOptions = {
    source,
    peers: [...peers, source],
    storagePath: config.get<string>(ConfParams.STORAGE_PATH),
    permissive: config.get<boolean>(ConfParams.PERMISSIVE),
    verbose: config.get<boolean>(ConfParams.VERBOSE),
    netTransferPrefer: transferSyntax,
    netTransferPropose: transferSyntax,
    writeTransfer: transferSyntax,
  };

  logger.info(`pacs-server listening on port: ${options.source.port}`);
  startStoreScp(options, (result: string) => {
    if (!result) {
      return;
    }

    try {
      logger.info(JSON.parse(result));
    } catch (error) {
      logger.error('failed to parse store-scp result', error);
      logger.error(result);
    }
  });
}

export async function shutdown(): Promise<void> {
  const logger = LoggerSingleton.Instance;
  const source = config.get<DicomNode>(ConfParams.SOURCE);
  const options: shutdownScuOptions = {
    source,
    target: source,
    verbose: config.get<boolean>(ConfParams.VERBOSE),
  };

  logger.info(`sending shutdown request to target: ${options.target.aet}`);

  return new Promise((resolve, reject) => {
    shutdownScu(options, (result: string) => {
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
