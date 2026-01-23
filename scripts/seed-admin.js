const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
let prisma = null;
try { const { PrismaClient } = require('@prisma/client'); prisma = new PrismaClient(); } catch (e) { prisma = null; }

const email = process.env.ADMIN_EMAIL || 'admin@example.com';
const password = process.env.ADMIN_PASSWORD || 'admin123';
const name = process.env.ADMIN_NAME || 'Admin';
(async ()=>{
  const hashed = await bcrypt.hash(password, 10);
  if (prisma) {
    const existing = await prisma.author.findUnique({ where: { email } });
    if (existing) { console.log('Admin exists:', existing.email); process.exit(0); }
    const user = await prisma.author.create({ data: { name, email, password: hashed, role: 'admin' } });
    console.log('Created admin:', user.email);
  } else {
    const DATA_FILE = path.resolve(__dirname, '../api/data/authors.json');
    let users = [];
    try { users = JSON.parse(fs.readFileSync(DATA_FILE,'utf8')||'[]'); } catch(e) { users = []; }
    if (users.find(u=>u.email===email)) { console.log('Admin exists'); process.exit(0); }
    const id = (users.length ? users[users.length-1].id + 1 : 1);
    users.push({ id, name, email, password: hashed, role: 'admin' });
    fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(users, null, 2));
    console.log('Created admin (JSON):', email);
  }
  process.exit(0);
})();
