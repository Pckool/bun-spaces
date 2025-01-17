import chalk, { type Chalk } from 'chalk';
import winston, { createLogger } from 'winston';

// export const logger = createLogger({
//   msgPrefix: '[  ] ',
//   level: process.env.NODE_ENV === 'test' ? 'silent' : process.env.NODE_ENV === 'development' ? 'debug' : 'info',
//   transport: {
//     target: 'pino-pretty',
//     options: {
//       color: true,
//     },
//   },
// });
const colorMap: Record<string, Chalk> = {
  error: chalk.red,
  warn: chalk.yellow,
  info: chalk.cyan,
  debug: chalk.white,
};

const devConsole = new winston.transports.Console({
  format: winston.format.printf(({ level, message, error, prefix, ...rest }) => {
    const colorizer = colorMap[level] || chalk.white;

    const hour = new Date().toLocaleTimeString('en-US', { hour12: false });

    const logPrefix = `[${colorizer(level.toUpperCase())}][${hour}]${prefix ? `[${prefix}]` : ''}`;
    const log = [logPrefix, message];

    if (Object.keys(rest).length) {
      log.push(`\n${JSON.stringify(rest, null, 2)}`);
    }

    if (Object.values(error ?? {}).filter(Boolean).length && error instanceof Error && error.message) {
      const { stack, message, ...errorRest } = error;
      const rest = errorRest ? JSON.stringify(errorRest, null, 2) : '';

      log.push(`\n${error.stack} ${rest}`);
    }

    return log.join(' ').trim();
  }),
});

const errorFormatter = winston.format((info) => {
  if (info.error instanceof Error) {
    const error = info.error as Partial<{
      name: string;
      module: string;
      type: string;
      data: unknown;
    }>;

    info.error = Object.assign({}, info.error, {
      message: info.error.message,
      stack: info.error.stack,
      name: error.name,
      module: error.module,
      type: error.type,
      data: error.data,
    });
    // Remove undefined properties from error object
    if (info.error) {
      Object.keys(info.error).forEach((key) => {
        if (info.error && info.error[key as keyof typeof info.error] === undefined) {
          delete info.error[key as keyof typeof info.error];
        }
      });
    }
  }

  return info;
});

export const logger = createLogger({
  level: (process.env.LOG_LEVEL ?? process.env.NODE_ENV === 'development') ? 'debug' : 'info',
  format: winston.format.combine(errorFormatter(), winston.format.errors({ stack: true }), winston.format.json()),
});

process.env.NODE_ENV === 'development' ? logger.add(devConsole) : logger.add(new winston.transports.Console());

export default logger;
