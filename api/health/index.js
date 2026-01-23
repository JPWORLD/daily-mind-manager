let prisma = null;
try { const { PrismaClient } = require('@prisma/client'); prisma = new PrismaClient(); } catch (e) { prisma = null; }
const logger = require('../_logger');
module.exports = async (req, res) => {
  if (req.method !== 'GET') { res.statusCode = 405; res.end('Method Not Allowed'); return; }
  try {
    const info = { ok: true, time: new Date().toISOString() };
    if (prisma) {
      try {
        await prisma.$queryRawUnsafe('SELECT 1');
        info.db = 'ok';
      } catch (e) { info.db = 'error'; info.dbError = e.message; }
    } else {
      info.db = 'unconfigured';
    }
    res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(info));
  } catch (e) {
    logger.error('health-check-failed', { error: e.message });
    res.statusCode = 500; res.end(JSON.stringify({ ok: false, error: e.message }));
  }
};
