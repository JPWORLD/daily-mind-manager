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
        // increment view count for JSON fallback
        post.views = (post.views || 0) + 1;
        const idx = posts.findIndex(p => p.id === id);
        if (idx !== -1) { posts[idx] = post; writePosts(posts); }
        const postWithHtml = { ...post, html: sanitize(marked.parse(post.content || '')) };
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(postWithHtml));
      }
    } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  if (req.method === 'PUT') {
    // Protect update: require admin/editor. Support JWT roles or static/Firebase fallback.
    const { checkAdmin, getAdminFromReq } = require('../_auth');
    const adminInfo = getAdminFromReq(req);
    let allowed = false;
    if (adminInfo && (adminInfo.role === 'admin' || adminInfo.role === 'editor')) allowed = true;
    else {
      const ok = await checkAdmin(req);
      if (ok) allowed = true;
    }
    if (!allowed) { res.statusCode = 403; res.end(JSON.stringify({ error: 'Forbidden' })); return; }
    const handleUpdate = async (data) => {
      try {
        const { title, slug, content, categories, subcategories, published, image } = data;
        if (slug && !/^[a-z0-9\-]+$/.test(slug)) { res.statusCode = 400; res.end(JSON.stringify({ error: 'invalid slug' })); return; }
        if (prisma) {
          // if slug being changed, ensure uniqueness
          if (slug) {
            const existing = await prisma.post.findUnique({ where: { slug } });
            if (existing && existing.id !== id) { res.statusCode = 409; res.end(JSON.stringify({ error: 'slug already exists' })); return; }
          }
          // load current post to create a version
          const current = await prisma.post.findUnique({ where: { id }, include: { categories: true, tags: true } });
          if (!current) { res.statusCode = 404; res.end(JSON.stringify({ error: 'Not found' })); return; }
          // create version record
          try {
            await prisma.postVersion.create({ data: { postId: id, content: current.content, title: current.title } });
          } catch (e) { /* ignore version errors */ }

          const updateData = { title, slug, content, image, scheduledFor: data.scheduledFor || null };
          updateData.status = published ? 'PUBLISHED' : (data.status || 'DRAFT');

          // sync categories (set to provided names)
          if (Array.isArray(categories)) {
            const catConnect = [];
            for (const name of categories) {
              const trimmed = String(name || '').trim();
              if (!trimmed) continue;
              let cat = await prisma.category.findUnique({ where: { name: trimmed } });
              if (!cat) cat = await prisma.category.create({ data: { name: trimmed } });
              catConnect.push({ id: cat.id });
            }
            updateData.categories = { set: catConnect };
          }

          // sync subcategories -> tags
          if (Array.isArray(subcategories)) {
            const tagConnect = [];
            for (const name of subcategories) {
              const trimmed = String(name || '').trim();
              if (!trimmed) continue;
              let tag = await prisma.tag.findUnique({ where: { name: trimmed } });
              if (!tag) tag = await prisma.tag.create({ data: { name: trimmed } });
              tagConnect.push({ id: tag.id });
            }
            updateData.tags = { set: tagConnect };
          }

          try {
            const post = await prisma.post.update({ where: { id }, data: updateData, include: { categories: true, tags: true } });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(post));
          } catch (e) {
            const post = await prisma.post.update({ where: { id }, data: { title, slug, content, published, image } });
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(post));
          }
        } else {
          const posts = readPosts();
          const idx = posts.findIndex(p=>p.id===id);
          if (idx===-1) { res.statusCode=404; res.end('Not found'); return; }
          if (slug && posts.find(p => p.slug === slug && p.id !== id)) { res.statusCode = 409; res.end(JSON.stringify({ error: 'slug already exists' })); return; }
          posts[idx] = { ...posts[idx], ...data, categories: categories || posts[idx].categories || [], subcategories: subcategories || posts[idx].subcategories || [], updatedAt: new Date().toISOString() };
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
    // Protect delete: require admin role via JWT or accept static/Firebase fallback
    const { checkAdmin, getAdminFromReq: getReqAdmin } = require('../_auth');
    const info = getReqAdmin(req);
    let canDelete = false;
    if (info && info.role === 'admin') canDelete = true;
    else {
      const ok = await checkAdmin(req);
      if (ok) canDelete = true;
    }
    if (!canDelete) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
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
