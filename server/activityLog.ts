import { prisma } from './db.js';
import { Request } from 'express';

/**
 * Activity logger — writes to ActivityLog table.
 * Fire-and-forget: never throws, never blocks request flow.
 */
export async function logActivity(params: {
  userId?: string | null;
  action: string;
  entityId?: string | null;
  entityType?: string | null;
  details?: Record<string, unknown> | string | null;
  req?: Request;
}): Promise<void> {
  try {
    const ip =
      (params.req?.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      params.req?.socket?.remoteAddress ||
      null;

    const detailsStr =
      params.details == null
        ? null
        : typeof params.details === 'string'
        ? params.details
        : JSON.stringify(params.details);

    await prisma.activityLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        entityId: params.entityId ?? null,
        entityType: params.entityType ?? null,
        details: detailsStr,
        ipAddress: ip,
      },
    });
  } catch {
    // Never propagate — logging must not break request flow
  }
}
