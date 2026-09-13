require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, userId: true }
  });
  const issues = await prisma.issue.findMany({
    select: { id: true, title: true, status: true, priority: true, categoryName: true, location: true, room: true }
  });
  console.log('--- NEON DB VERIFICATION ---');
  console.log('USERS (' + users.length + '):', JSON.stringify(users, null, 2));
  console.log('ISSUES (' + issues.length + '):', JSON.stringify(issues, null, 2));
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error(e);
  await prisma.$disconnect();
  process.exit(1);
});
