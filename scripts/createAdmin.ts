import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createAdmin() {
  const args = process.argv.slice(2);
  const getArg = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    if (idx !== -1 && args[idx + 1]) {
      return args[idx + 1];
    }
    return undefined;
  };

  const email = getArg('--email') || process.env.ADMIN_EMAIL;
  const name = getArg('--name') || process.env.ADMIN_NAME || 'Campus Administrator';
  const password = getArg('--password') || process.env.ADMIN_PASSWORD;
  const department = getArg('--department') || 'Campus Operations & Administration';

  if (!email || !password) {
    console.error(`
[CampusFix Admin Setup]
Usage:
  npx tsx scripts/createAdmin.ts --email admin@campus.edu --password SecurePassword123! [--name "Admin Name"] [--department "Department"]

Or set environment variables:
  ADMIN_EMAIL="admin@campus.edu"
  ADMIN_PASSWORD="SecurePassword123!"
  ADMIN_NAME="Admin Name"
`);
    process.exit(1);
  }

  if (password.length < 8) {
    console.error('Password must be at least 8 characters long.');
    process.exit(1);
  }

  console.log(`[CampusFix Admin Setup] Creating administrator account for: ${email}`);

  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  const adminUserId = 'ADM' + Math.floor(1000 + Math.random() * 9000);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email }, { userId: adminUserId }],
    },
  });

  let adminUser;
  if (existing) {
    adminUser = await prisma.user.update({
      where: { id: existing.id },
      data: {
        name,
        role: 'admin',
        department,
        passwordHash,
        isActive: true,
      },
    });
    console.log(`[CampusFix Admin Setup] Updated existing account to administrator: ${adminUser.email} (${adminUser.userId})`);
  } else {
    adminUser = await prisma.user.create({
      data: {
        email,
        userId: adminUserId,
        name,
        role: 'admin',
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
    });
    console.log(`[CampusFix Admin Setup] Successfully created new administrator: ${adminUser.email} (ID: ${adminUser.userId})`);
  }

  console.log('Admin account is ready for sign in.');
}

createAdmin()
  .catch((err) => {
    console.error('[CampusFix Admin Setup] Failed to create admin:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
