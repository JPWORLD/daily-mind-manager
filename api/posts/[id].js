let prisma = null;
try {
  const { PrismaClient } = require('@prisma/client');
  prisma = new PrismaClient();
} catch (e) {
  prisma = null;
}
const fs = require('fs');
const path = require('path');
const DATA_FILE = path.resolve(__dirname, '../data/posts.json');
const readPosts = () => { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]'); } catch { return []; } };
const writePosts = (arr) => { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2)); };

module.exports = async (req, res) => {
  const id = parseInt(req.url.split('/').pop(), 10);
  if (Number.isNaN(id)) { res.statusCode = 400; res.end('Invalid id'); return; }

  if (req.method === 'GET') {
    try {
      if (prisma) {
        const post = await prisma.post.findUnique({ where: { id } });
        if (!post) { res.statusCode = 404; res.end('Not found'); return; }
        const { marked } = require('marked');
        const sanitize = require('sanitize-html');
        const postWithHtml = { ...post, html: sanitize(marked.parse(post.content || '')) };
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(postWithHtml));
      } else {
        const posts = readPosts();
        const post = posts.find(p => p.id === id);
        if (!post) { res.statusCode = 404; res.end('Not found'); return; }
        const { marked } = require('marked');
        const sanitize = require('sanitize-html');
        const postWithHtml = { ...post, html: sanitize(marked.parse(post.content || '')) };
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(postWithHtml));
      }
    } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  if (req.method === 'PUT') {
    // Protect update: centralized admin check
    const { checkAdmin } = require('../api/_auth');
    const ok = await checkAdmin(req);
    if (!ok) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
    const handleUpdate = async (data) => {
      try {
        const { title, slug, content } = data;
        if (slug && !/^[a-z0-9\-]+$/.test(slug)) { res.statusCode = 400; res.end(JSON.stringify({ error: 'invalid slug' })); return; }
        if (prisma) {
          // if slug being changed, ensure uniqueness
          if (slug) {
            const existing = await prisma.post.findUnique({ where: { slug } });
            if (existing && existing.id !== id) { res.statusCode = 409; res.end(JSON.stringify({ error: 'slug already exists' })); return; }
          }
          const post = await prisma.post.update({ where: { id }, data });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(post));
        } else {
          const posts = readPosts();
          const idx = posts.findIndex(p=>p.id===id);
          if (idx===-1) { res.statusCode=404; res.end('Not found'); return; }
          if (slug && posts.find(p => p.slug === slug && p.id !== id)) { res.statusCode = 409; res.end(JSON.stringify({ error: 'slug already exists' })); return; }
          posts[idx] = { ...posts[idx], ...data, updatedAt: new Date().toISOString() };
          writePosts(posts);
          res.setHeader('Content-Type','application/json');
          res.end(JSON.stringify(posts[idx]));
        }
      } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    };

    if (req.body && Object.keys(req.body).length) {
      await handleUpdate(req.body);
      return;
    }

    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        await handleUpdate(parsed);
      } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  if (req.method === 'DELETE') {
    // Protect delete: verify Firebase ID token if service account set, else ADMIN_TOKEN
    const authHeader = req.headers['authorization'] || req.headers['x-admin-token'];
    const token = (authHeader || '').replace(/^Bearer\s+/i, '');
    let authorizedDel = false;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const admin = require('firebase-admin');
        if (!admin.apps.length) {
          const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          admin.initializeApp({ credential: admin.credential.cert(sa) });
        }
        const decoded = await admin.auth().verifyIdToken(token);
        if (decoded && decoded.uid) authorizedDel = true;
      } catch (e) { authorizedDel = false; }
    }
    if (!authorizedDel) {
      const adminToken = process.env.ADMIN_TOKEN || process.env.DMM_ADMIN_TOKEN;
      if (!adminToken || token !== adminToken) {
        res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return;
      }
    }
    try {
      if (prisma) {
        await prisma.post.delete({ where: { id } });
        res.statusCode = 204; res.end();
      } else {
        const posts = readPosts();
        const idx = posts.findIndex(p=>p.id===id);
        if (idx===-1) { res.statusCode=404; res.end('Not found'); return; }
        posts.splice(idx,1); writePosts(posts);
        res.statusCode=204; res.end();
      }
    } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  res.statusCode = 405; res.end('Method Not Allowed');
};
