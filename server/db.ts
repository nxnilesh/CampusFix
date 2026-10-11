import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

interface PrismaConnectionError {
  code?: unknown;
  name?: unknown;
  message?: unknown;
}

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

export function isDatabaseConnectionError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;

  const candidate = error as PrismaConnectionError;
  const code = candidate.code;
  const name = candidate.name;
  const message = typeof candidate.message === 'string' ? candidate.message : '';

  return (
    ['P1000', 'P1001', 'P1002', 'P1003', 'P1008', 'P1011', 'P1013', 'P1017', 'P2024'].includes(String(code)) ||
    name === 'PrismaClientInitializationError' ||
    /Can't reach database|connect ECONNREFUSED|connect ETIMEDOUT|connect ECONNRESET|the URL must start with the protocol|database server at/i.test(
      message
    )
  );
}

export function logDatabaseError(context: string, error: unknown): void {
  const candidate = error && typeof error === 'object' ? (error as PrismaConnectionError) : {};
  const name = typeof candidate.name === 'string' ? candidate.name : 'UnknownError';
  const code = typeof candidate.code === 'string' ? candidate.code : undefined;
  const message =
    typeof candidate.message === 'string'
      ? candidate.message.replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, 'postgresql://[REDACTED]')
      : String(error).replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, 'postgresql://[REDACTED]');

  console.error(`[CampusFix] ${context}`, { name, code, message });
}

export const DATABASE_UNAVAILABLE_MESSAGE =
  'Service temporarily unavailable. Please try again.';
