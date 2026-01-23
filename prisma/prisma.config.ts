import { resolve } from 'path';

// Minimal Prisma 7 config for local dev using SQLite. This file provides
// the connection URL for Prisma CLI and tools so `url` can be omitted
// from the schema (Prisma 7 requires moving connection strings here).

const DATABASE_URL = process.env.DATABASE_URL || `file:${resolve(process.cwd(), 'dev.db')}`;
const PRISMA_PROVIDER = process.env.PRISMA_PROVIDER || 'sqlite';

export default {
  datasources: {
    db: {
      provider: PRISMA_PROVIDER === 'postgres' ? 'postgresql' : 'sqlite',
      url: DATABASE_URL,
    },
  },
};
