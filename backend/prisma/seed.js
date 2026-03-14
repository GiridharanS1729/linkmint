import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@linkvio';
  const password = 'admin123';
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      role: 'GAdmin',
      apiKey: crypto.randomBytes(24).toString('hex'),
    },
    update: {
      passwordHash,
      role: 'GAdmin',
    },
  });

  console.log('Seeded admin: admin@linkvio / admin123');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
