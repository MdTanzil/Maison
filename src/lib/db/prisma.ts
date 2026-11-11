import fs from 'fs';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import { PGlite } from '@electric-sql/pglite';
import { createPrismaPGliteAdapter } from './pglite-adapter';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
  pgLite: PGlite | undefined;
  dbInitializedPromise: Promise<void> | undefined;
};

function createClient(): { prisma: PrismaClient; pgLite?: PGlite } {
  if (process.env.USE_EXTERNAL_PG === 'true') {
    return {
      prisma: new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
      }),
    };
  }

  const dataDir = path.resolve(process.cwd(), process.env.PGLITE_DATA_DIR || './.pgdata');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  const pgLite = globalForPrisma.pgLite ?? new PGlite(dataDir);
  globalForPrisma.pgLite = pgLite;

  const adapter = createPrismaPGliteAdapter(pgLite);
  const prisma = new PrismaClient({
    adapter: adapter as never,
  });

  return { prisma, pgLite };
}

const clientBundle = globalForPrisma.prisma
  ? { prisma: globalForPrisma.prisma, pgLite: globalForPrisma.pgLite }
  : createClient();

export const prisma = clientBundle.prisma;
export const pgLiteInstance = clientBundle.pgLite;

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export async function ensureDatabaseReady(): Promise<void> {
  if (globalForPrisma.dbInitializedPromise) {
    return globalForPrisma.dbInitializedPromise;
  }

  globalForPrisma.dbInitializedPromise = (async () => {
    if (process.env.USE_EXTERNAL_PG !== 'true' && pgLiteInstance) {
      await pgLiteInstance.waitReady;
      const checkTable = await pgLiteInstance.query<{ exists: boolean }>(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' AND table_name = 'User'
        ) AS "exists";`
      );

      if (!checkTable.rows[0]?.exists) {
        const sqlPath = path.resolve(process.cwd(), 'prisma/init.sql');
        if (fs.existsSync(sqlPath)) {
          let ddl = fs.readFileSync(sqlPath, 'utf8');
          // Strip UTF-8 BOM if present
          ddl = ddl.replace(/^\uFEFF/, '');
          await pgLiteInstance.exec(ddl);
        }
      }
    }

    const userCount = await prisma.user.count();
    if (userCount === 0) {
      const { seedDatabase } = await import('../../../prisma/seed');
      await seedDatabase(prisma);
    }
  })();

  return globalForPrisma.dbInitializedPromise;
}
