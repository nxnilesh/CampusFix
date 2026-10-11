import 'dotenv/config';
import { randomInt } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../server/auth.js';

const prisma = new PrismaClient();

async function createAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Campus Administrator';
  const department = process.env.ADMIN_DEPARTMENT?.trim() || 'Campus Operations & Administration';

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error('Set ADMIN_EMAIL to a valid email address.');
  }
  if (!password) {
    throw new Error('Set ADMIN_PASSWORD in the environment before creating the admin account.');
  }
  if (
    password.length < 8 ||
    !/[A-Z]/.test(password) ||
    !/[a-z]/.test(password) ||
    !/[0-9]/.test(password)
  ) {
    throw new Error('ADMIN_PASSWORD must be at least 8 characters and contain uppercase, lowercase, and numeric characters.');
  }

  const existing = await prisma.user.findFirst({
    where: { email: { equals: email, mode: 'insensitive' } },
    select: { userId: true, role: true },
  });

  if (existing) {
    if (existing.role !== 'admin') {
      throw new Error('An account with ADMIN_EMAIL already exists and is not an admin; no account was changed.');
    }
    console.log(`Admin account already exists (ID: ${existing.userId}); no changes made.`);
    return;
  }

  let userId: string | undefined;
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const candidate = `ADM${randomInt(1000, 10000)}`;
    const userIdExists = await prisma.user.findUnique({
      where: { userId: candidate },
      select: { id: true },
    });
    if (!userIdExists) {
      userId = candidate;
      break;
    }
  }

  if (!userId) {
    throw new Error('Unable to allocate a unique administrator ID; please retry.');
  }

  const passwordHash = await hashPassword(password);
  const admin = await prisma.user.create({
    data: {
      email,
      userId,
      name,
      role: 'admin',
      status: 'ACTIVE',
      emailVerified: true,
      department,
      year: 'Staff',
      passwordHash,
      isActive: true,
      settings: {
        create: {
          theme: 'system',
          compactMode: false,
          emailNotifications: true,
          statusAlerts: true,
        },
      },
    },
    select: { userId: true },
  });

  console.log(`Admin account created successfully (ID: ${admin.userId}).`);
}

createAdmin()
  .catch((error: unknown) => {
    console.error(
      '[CampusFix Admin Setup] Failed to create admin:',
      error instanceof Error ? error.message : 'Unknown error.'
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
