const fs = require('fs');
const path = require('path');
let prisma = null;
try { const { PrismaClient } = require('@prisma/client'); prisma = new PrismaClient(); } catch (e) { prisma = null; }

const DATA_FILE = path.resolve(__dirname, '../data/posts.json');
const readPosts = () => { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]'); } catch { return []; } };

module.exports = async (req, res) => {
  if (req.method !== 'GET') { res.statusCode = 405; res.end('Method Not Allowed'); return; }
  try {
    const url = require('url');
    const q = (url.parse(req.url || '', true).query || {}).q || '';
    const limit = Math.min(50, parseInt((url.parse(req.url || '', true).query || {}).limit || 10, 10) || 10);
    if (!q) { res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ results: [], total: 0 })); return; }
    if (prisma) {
      // use Postgres full-text search via raw query if possible
      try {
        const raw = await prisma.$queryRawUnsafe(`SELECT id, title, slug, left(content, 300) as excerpt, views FROM "Post" WHERE to_tsvector('english', content || ' ' || title) @@ plainto_tsquery($1) ORDER BY ts_rank(to_tsvector('english', content || ' ' || title), plainto_tsquery($1)) DESC LIMIT ${limit}`, q);
        res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ results: raw, total: raw.length })); return;
      } catch (e) {
        // fallback to Prisma findMany simple contains
        const posts = await prisma.post.findMany({ where: { OR: [{ title: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }] }, take: limit, orderBy: { createdAt: 'desc' } });
        res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ results: posts, total: posts.length })); return;
      }
    }
    // JSON fallback: simple substring search in title/content
    const all = readPosts();
    const lower = q.toLowerCase();
    const results = all.filter(p => ((p.title||'').toLowerCase().includes(lower) || (p.content||'').toLowerCase().includes(lower))).slice(0, limit).map(p=>({ id: p.id, title: p.title, slug: p.slug, excerpt: (p.content||'').slice(0,300), views: p.views||0 }));
    res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ results, total: results.length }));
  } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
};
