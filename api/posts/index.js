let prisma = null;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
} catch (e) {
  // prisma client not available locally — fall back to a simple JSON file store for dev
  prisma = null;
}
const fs = require('fs');
const path = require('path');
const DATA_FILE = path.resolve(__dirname, '../data/posts.json');
const readPosts = () => {
  try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]'); } catch { return []; }
};
const writePosts = (arr) => { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2)); };
const { checkAdmin } = require('../_auth');

const slugify = (s) => {
  if (!s) return '';
  return s.toString().toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
};

const validatePostInput = async ({ title, slug, content }, isCreate = true) => {
  const errors = [];
  if (!title || !String(title).trim()) errors.push('title is required');
  if (!content || !String(content).trim()) errors.push('content is required');
  if (slug && !/^[a-z0-9\-]+$/.test(slug)) errors.push('slug contains invalid characters');
  return errors;
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      const { parse } = require('url');
      const q = parse(req.url || '', true).query || {};
      const page = Math.max(1, parseInt(q.page) || 1);
      const perPage = Math.max(1, parseInt(q.perPage || q.limit) || 10);
      const { marked } = require('marked');
      const sanitize = require('sanitize-html');

      if (prisma) {
        const where = { published: true };
        const total = await prisma.post.count({ where });
        const posts = await prisma.post.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * perPage, take: perPage });
        const postsWithHtml = posts.map(p => ({ ...p, html: sanitize(marked.parse(p.content || '')) }));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ posts: postsWithHtml, total, page, perPage }));
      } else {
        const all = readPosts().filter(p => p.published).sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
        const total = all.length;
        const slice = all.slice((page - 1) * perPage, (page - 1) * perPage + perPage);
        const postsWithHtml = slice.map(p => ({ ...p, html: sanitize(marked.parse(p.content || '')) }));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ posts: postsWithHtml, total, page, perPage }));
      }
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === 'POST') {
    // Protect write APIs: try Firebase Admin verify if service account present, otherwise ADMIN_TOKEN
    const ok = await checkAdmin(req);
    if (!ok) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
    // Basic create - support both raw stream and express.json() parsed body
    const handleCreate = async (data) => {
      try {
        let { title, slug, content, published, image } = data;
        if (!slug) slug = slugify(title || content || Date.now());
        const errors = await validatePostInput({ title, slug, content });
        if (errors.length) { res.statusCode = 400; res.end(JSON.stringify({ error: errors.join('; ') })); return; }

        if (prisma) {
          // ensure slug unique
          const exists = await prisma.post.findUnique({ where: { slug } });
          if (exists) { res.statusCode = 409; res.end(JSON.stringify({ error: 'slug already exists' })); return; }
          const post = await prisma.post.create({ data: { title, slug, content, published: !!published, image } });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(post));
        } else {
          const posts = readPosts();
          if (posts.find(p => p.slug === slug)) { res.statusCode = 409; res.end(JSON.stringify({ error: 'slug already exists' })); return; }
          const id = (posts.length ? posts[posts.length-1].id + 1 : 1);
          const entry = { id, title, slug, content, published: !!published, image, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          posts.push(entry); writePosts(posts);
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(entry));
        }
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    };

    if (req.body && Object.keys(req.body).length) {
      await handleCreate(req.body);
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        await handleCreate(parsed);
      } catch (e) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.statusCode = 405;
  res.end('Method Not Allowed');
};
