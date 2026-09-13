import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

export const prisma =
  global.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  global.prisma = prisma;
}

export function isDatabaseConnectionError(error: any): boolean {
  if (!error) return false;
  return (
    error.code === 'P1001' ||
    error.code === 'P1002' ||
    error.code === 'P1003' ||
    error.name === 'PrismaClientInitializationError' ||
    (typeof error.message === 'string' &&
      (error.message.includes("Can't reach database") ||
        error.message.includes('connect ECONNREFUSED') ||
        error.message.includes('the URL must start with the protocol') ||
        error.message.includes('database server at')))
  );
}

export const DATABASE_UNAVAILABLE_MESSAGE =
  'PostgreSQL database is currently unreachable. Please check DATABASE_URL in your .env configuration.';
