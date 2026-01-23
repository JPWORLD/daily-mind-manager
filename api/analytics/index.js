const fs = require('fs');
const path = require('path');
let prisma = null;
try { const { PrismaClient } = require('@prisma/client'); prisma = new PrismaClient(); } catch (e) { prisma = null; }

const DATA_FILE = path.resolve(__dirname, '../data/posts.json');
const readPosts = () => { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]'); } catch { return []; } };

module.exports = async (req, res) => {
  if (req.method !== 'GET') { res.statusCode = 405; res.end('Method Not Allowed'); return; }
  try {
    if (prisma) {
      const posts = await prisma.post.findMany({ orderBy: { views: 'desc' }, take: 20, select: { id: true, title: true, slug: true, views: true } });
      const total = await prisma.post.count();
      res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ top: posts, total }));
      return;
    }
    const posts = readPosts().slice().sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,20).map(p=>({ id: p.id, title: p.title, slug: p.slug, views: p.views||0 }));
    res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ top: posts, total: posts.length }));
  } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
};
