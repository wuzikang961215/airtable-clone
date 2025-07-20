// fixChecksums.js
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fix() {
  const dirs = fs.readdirSync('prisma/migrations').filter(d => d.startsWith('20'));
  for (const name of dirs) {
    const sql = fs.readFileSync(path.join('prisma/migrations', name, 'migration.sql'));
    const checksum = crypto.createHash('sha256').update(sql).digest('hex');
    await prisma.$executeRaw`UPDATE "_prisma_migrations" SET checksum = ${checksum} WHERE migration_name = ${name}`;
    console.log(`✅ Synced checksum for ${name}`);
  }
  await prisma.$disconnect();
}
fix().catch(console.error);
