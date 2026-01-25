import 'reflect-metadata';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 12;

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4] || null;

  if (!email || !password) {
    console.error('Usage: npx tsx scripts/seed-admin.ts <email> <password> [name]');
    process.exit(1);
  }

  const prisma = new PrismaClient();

  try {
    const existing = await prisma.admin.findUnique({ where: { email } });
    if (existing) {
      console.error(`Admin with email "${email}" already exists.`);
      process.exit(1);
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const admin = await prisma.admin.create({
      data: {
        email,
        passwordHash,
        name,
      },
    });

    console.log(`Admin created successfully:`);
    console.log(`  ID: ${admin.id}`);
    console.log(`  Email: ${admin.email}`);
    console.log(`  Name: ${admin.name || '(none)'}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
