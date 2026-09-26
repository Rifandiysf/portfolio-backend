import * as bcrypt from 'bcrypt';
import { PrismaClient } from './generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  const hashed = await bcrypt.hash(process.env.SEED_ADMIN_PASSWORD!, 10);
  await prisma.admin.upsert({
    where: { email: process.env.SEED_ADMIN_EMAIL! },
    update: {},
    create: { email: process.env.SEED_ADMIN_EMAIL!, password: hashed },
  });
}

void main().finally(() => prisma.$disconnect());
