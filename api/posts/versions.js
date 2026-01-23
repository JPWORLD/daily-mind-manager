let prisma = null;
try { const { PrismaClient } = require('@prisma/client'); prisma = new PrismaClient(); } catch (e) { prisma = null; }
const fs = require('fs');
const path = require('path');
const DATA_FILE = path.resolve(__dirname, '../data/posts.json');
const readPosts = () => { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]'); } catch { return []; } };

module.exports = async (req, res) => {
  const parts = (req.url || '').split('/').filter(Boolean);
  const id = parseInt(parts[parts.length-1], 10);
  if (Number.isNaN(id)) { res.statusCode = 400; res.end('Invalid id'); return; }
  if (req.method !== 'GET') { res.statusCode = 405; res.end('Method Not Allowed'); return; }
  try {
    if (prisma) {
      const versions = await prisma.postVersion.findMany({ where: { postId: id }, orderBy: { createdAt: 'desc' } });
      res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(versions)); return;
    }
    // fallback: no versions stored in JSON dev mode
    res.setHeader('Content-Type','application/json'); res.end(JSON.stringify([]));
  } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
};
