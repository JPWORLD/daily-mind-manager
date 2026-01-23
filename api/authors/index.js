const fs = require('fs');
const path = require('path');
let prisma = null;
try { const { PrismaClient } = require('@prisma/client'); prisma = new PrismaClient(); } catch (e) { prisma = null; }
const DATA_FILE = path.resolve(__dirname, '../data/authors.json');
const readAuthors = () => { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]'); } catch { return []; } };
const writeAuthors = (arr) => { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2)); };
const { checkAdmin, getAdminFromReq } = require('../_auth');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    try {
      if (prisma) {
        const authors = await prisma.author.findMany({ orderBy: { name: 'asc' } });
        res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(authors));
      } else {
        res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(readAuthors()));
      }
    } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  if (req.method === 'POST') {
    // only admin can create authors
    const admin = getAdminFromReq(req);
    if (!admin || admin.role !== 'admin') { res.statusCode = 403; res.end(JSON.stringify({ error: 'Forbidden' })); return; }
    let body = '';
    req.on('data', c => body += c.toString());
    req.on('end', async () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        const name = (parsed.name || '').trim();
        const email = (parsed.email || '').trim();
        if (!name || !email) { res.statusCode = 400; res.end(JSON.stringify({ error: 'name,email required' })); return; }
        if (prisma) {
          const existing = await prisma.author.findUnique({ where: { email } });
          if (existing) { res.statusCode = 409; res.end(JSON.stringify({ error: 'exists' })); return; }
          const author = await prisma.author.create({ data: { name, email, role: parsed.role || 'editor' } });
          res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(author));
        } else {
          const authors = readAuthors(); if (authors.find(a=>a.email===email)) { res.statusCode=409; res.end(JSON.stringify({ error:'exists' })); return; }
          const id = (authors.length ? authors[authors.length-1].id + 1 : 1);
          const entry = { id, name, email, role: parsed.role || 'editor' };
          authors.push(entry); writeAuthors(authors);
          res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(entry));
        }
      } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  res.statusCode = 405; res.end('Method Not Allowed');
};
