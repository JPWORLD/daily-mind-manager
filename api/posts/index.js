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

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      if (prisma) {
        const posts = await prisma.post.findMany({ where: { published: true }, orderBy: { createdAt: 'desc' } });
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(posts));
      } else {
        const posts = readPosts().filter(p => p.published).sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt));
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(posts));
      }
    } catch (e) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  if (req.method === 'POST') {
    // Protect write APIs: try Firebase Admin verify if service account present, otherwise ADMIN_TOKEN
    const authHeader = req.headers['authorization'] || req.headers['x-admin-token'];
    const token = (authHeader || '').replace(/^Bearer\s+/i, '');
    let authorized = false;
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      try {
        const admin = require('firebase-admin');
        if (!admin.apps.length) {
          const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
          admin.initializeApp({ credential: admin.credential.cert(sa) });
        }
        const decoded = await admin.auth().verifyIdToken(token);
        if (decoded && decoded.uid) authorized = true;
      } catch (e) {
        authorized = false;
      }
    }
    if (!authorized) {
      if (!process.env.ADMIN_TOKEN || token !== process.env.ADMIN_TOKEN) {
        res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return;
      }
    }
    // Basic create - support both raw stream and express.json() parsed body
    const handleCreate = async (data) => {
      try {
        const { title, slug, content, published, image } = data;
        if (prisma) {
          const post = await prisma.post.create({ data: { title, slug, content, published: !!published, image } });
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(post));
        } else {
          const posts = readPosts();
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
