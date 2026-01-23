const fs = require('fs');
const path = require('path');
let prisma = null;
try { const { PrismaClient } = require('@prisma/client'); prisma = new PrismaClient(); } catch (e) { prisma = null; }
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const DATA_FILE = path.resolve(__dirname, '../data/authors.json');
const readAuthors = () => { try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8') || '[]'); } catch { return []; } };
const writeAuthors = (arr) => { fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true }); fs.writeFileSync(DATA_FILE, JSON.stringify(arr, null, 2)); };

const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

module.exports = async (req, res) => {
  if (req.method === 'POST' && req.url.endsWith('/login')) {
    // login: { email, password }
    let body = '';
    req.on('data', c => body += c.toString());
    req.on('end', async () => {
      try {
        const { email, password } = body ? JSON.parse(body) : {};
        if (!email || !password) { res.statusCode = 400; res.end(JSON.stringify({ error: 'email+password required' })); return; }
        if (prisma) {
          const user = await prisma.author.findUnique({ where: { email } });
          if (!user || !user.password) { res.statusCode = 401; res.end(JSON.stringify({ error: 'invalid' })); return; }
          const ok = await bcrypt.compare(password, user.password);
          if (!ok) { res.statusCode = 401; res.end(JSON.stringify({ error: 'invalid' })); return; }
          const token = jwt.sign({ sub: user.id, role: user.role, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
          res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ token }));
        } else {
          const users = readAuthors();
          const u = users.find(x => x.email === email);
          if (!u) { res.statusCode = 401; res.end(JSON.stringify({ error: 'invalid' })); return; }
          const ok = await bcrypt.compare(password, u.password);
          if (!ok) { res.statusCode = 401; res.end(JSON.stringify({ error: 'invalid' })); return; }
          const token = jwt.sign({ sub: u.id, role: u.role, email: u.email }, JWT_SECRET, { expiresIn: '7d' });
          res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ token }));
        }
      } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  if (req.method === 'POST' && req.url.endsWith('/register')) {
    // register: allowed only when DEV_ADMIN_OPEN=1 or no users
    let body = '';
    req.on('data', c => body += c.toString());
    req.on('end', async () => {
      try {
        const { name, email, password, role } = body ? JSON.parse(body) : {};
        if (!email || !password || !name) { res.statusCode = 400; res.end(JSON.stringify({ error: 'name,email,password required' })); return; }
        if (!process.env.DEV_ADMIN_OPEN) {
          // if authors exist, disallow
          if (prisma) {
            const count = await prisma.author.count();
            if (count > 0) { res.statusCode = 403; res.end(JSON.stringify({ error: 'registration disabled' })); return; }
          } else {
            const users = readAuthors(); if (users.length > 0) { res.statusCode = 403; res.end(JSON.stringify({ error: 'registration disabled' })); return; }
          }
        }
        const hashed = await bcrypt.hash(password, 10);
        if (prisma) {
          const user = await prisma.author.create({ data: { name, email, password: hashed, role: role || 'admin' } });
          res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ id: user.id, email: user.email }));
        } else {
          const users = readAuthors(); if (users.find(u=>u.email===email)) { res.statusCode=409; res.end(JSON.stringify({ error: 'exists' })); return; }
          const id = (users.length ? users[users.length-1].id + 1 : 1);
          const entry = { id, name, email, password: hashed, role: role || 'admin' };
          users.push(entry); writeAuthors(users);
          res.setHeader('Content-Type','application/json'); res.end(JSON.stringify({ id: entry.id, email: entry.email }));
        }
      } catch (e) { res.statusCode = 500; res.end(JSON.stringify({ error: e.message })); }
    });
    return;
  }

  res.statusCode = 405; res.end('Method Not Allowed');
};
