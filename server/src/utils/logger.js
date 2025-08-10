import pino from 'pino';
let logger;
export function getLogger() {
  if (!logger) {
    logger = pino({ level: process.env.LOG_LEVEL || 'info' });
  }
  return logger;
}
