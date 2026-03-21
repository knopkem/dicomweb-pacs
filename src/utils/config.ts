import conf from 'config';

export enum ConfParams {
  LOG_DIR,
  STORAGE_PATH,
  XTRANSFER,
  MIMETYPE,
  SOURCE,
  PEERS,
  VERBOSE,
  MIN_CHARS,
  APPEND_WILDCARD,
  HTTP_PORT,
  HTTP_IP,
  PERMISSIVE,
}

const confDef = new Map<ConfParams, string[]>([
  [ConfParams.LOG_DIR, ['logDir']],
  [ConfParams.STORAGE_PATH, ['storagePath']],
  [ConfParams.XTRANSFER, ['transferSyntax']],
  [ConfParams.MIMETYPE, ['mimeType']],
  [ConfParams.SOURCE, ['source']],
  [ConfParams.PEERS, ['peers']],
  [ConfParams.VERBOSE, ['verboseLogging']],
  [ConfParams.MIN_CHARS, ['qidoMinChars']],
  [ConfParams.APPEND_WILDCARD, ['qidoAppendWildcard']],
  [ConfParams.HTTP_PORT, ['webserverPort', 'httpPort']],
  [ConfParams.HTTP_IP, ['httpIp']],
  [ConfParams.PERMISSIVE, ['permissiveMode']],
]);

interface IConfig {
  get<T>(setting: ConfParams): T;
  has(setting: ConfParams): boolean;
}

class Config implements IConfig {
  private resolveKey(setting: ConfParams): string {
    const keys = confDef.get(setting);
    if (!keys) {
      throw new Error(`Unknown config setting: ${setting}`);
    }

    for (const key of keys) {
      if (conf.has(key)) {
        return key;
      }
    }

    throw new Error(`Missing config setting: ${setting}`);
  }

  get<T>(setting: ConfParams): T {
    return conf.get<T>(this.resolveKey(setting));
  }

  has(setting: ConfParams): boolean {
    const keys = confDef.get(setting);
    return keys ? keys.some((key) => conf.has(key)) : false;
  }
}

export const config = new Config();
