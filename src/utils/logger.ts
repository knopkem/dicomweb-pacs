import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { ConfParams, config } from './config';

export interface CompatLogger {
  info(...args: unknown[]): void;
  warn(...args: unknown[]): void;
  error(...args: unknown[]): void;
  debug(...args: unknown[]): void;
}

function formatArg(arg: unknown): string {
  if (arg instanceof Error) {
    return arg.stack ?? arg.message;
  }
  if (typeof arg === 'string') {
    return arg;
  }
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

function formatMessage(...args: unknown[]): string {
  return args.map((arg) => formatArg(arg)).join(' ');
}

function createCompatLogger(base: pino.Logger): CompatLogger {
  return {
    info: (...args) => base.info(formatMessage(...args)),
    warn: (...args) => base.warn(formatMessage(...args)),
    error: (...args) => base.error(formatMessage(...args)),
    debug: (...args) => base.debug(formatMessage(...args)),
  };
}

export class LoggerSingleton {
  private static instance: CompatLogger;

  public static get Instance(): CompatLogger {
    if (!this.instance) {
      const logDir = path.resolve(config.get<string>(ConfParams.LOG_DIR));
      fs.mkdirSync(logDir, { recursive: true });

      const pinoLogger = pino(
        { level: 'info' },
        pino.transport({
          targets: [
            {
              target: 'pino/file',
              options: { destination: 1 },
            },
            {
              target: 'pino-roll',
              options: {
                file: path.join(logDir, 'roll'),
                frequency: 'daily',
                extension: '.log',
                mkdir: true,
              },
            },
          ],
        }),
      );

      this.instance = createCompatLogger(pinoLogger);
    }

    return this.instance;
  }
}
