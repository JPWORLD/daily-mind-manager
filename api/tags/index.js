const fs = require('fs');
const path = require('path');
let prisma = null;
try { const { PrismaClient } = require('@prisma/client'); prisma = new PrismaClient(); } catch (e) { prisma = null; }
const DATA_FILE = path.resolve(__dirname, '../data/tags.json');
const readTags = () => { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]'); } catch { return []; } };
const writeTags = (arr) => { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2)); };
const { checkAdmin } = require('../_auth');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      if (prisma) {
        const tags = await prisma.tag.findMany({ orderBy: { name: 'asc' } });
        res.setHeader('Content-Type','application/json');
        res.end(JSON.stringify(tags));
      } else {
        res.setHeader('Content-Type','application/json');
        res.end(JSON.stringify(readTags()));
      }
    } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  if (req.method === 'POST') {
    const { getAdminFromReq } = require('../_auth');
    const admin = getAdminFromReq(req);
    if (!admin || admin.role !== 'admin') { res.statusCode = 403; res.end(JSON.stringify({ error: 'Forbidden' })); return; }
    let body = '';
    req.on('data', c => body += c.toString());
    req.on('end', async () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        const name = (parsed.name || '').trim();
        if (!name) { res.statusCode = 400; res.end(JSON.stringify({ error: 'name required' })); return; }
        if (prisma) {
          let existing = await prisma.tag.findUnique({ where: { name } });
          if (existing) { res.statusCode = 409; res.end(JSON.stringify({ error: 'exists' })); return; }
          const tag = await prisma.tag.create({ data: { name } });
          res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(tag));
        } else {
          const tags = readTags();
          if (tags.find(t => t.name === name)) { res.statusCode = 409; res.end(JSON.stringify({ error: 'exists' })); return; }
          const id = (tags.length ? tags[tags.length-1].id + 1 : 1);
          const entry = { id, name };
          tags.push(entry); writeTags(tags);
          res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(entry));
        }
      } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  res.statusCode = 405; res.end('Method Not Allowed');
};
