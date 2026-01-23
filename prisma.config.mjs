import { resolve } from 'path';

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
