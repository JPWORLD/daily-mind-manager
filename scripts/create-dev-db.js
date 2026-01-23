const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.resolve(__dirname, '..', 'dev.db');
if (fs.existsSync(DB_PATH)) fs.unlinkSync(DB_PATH);
const db = new sqlite3.Database(DB_PATH);

function run(sql) {
  return new Promise((res, rej) => db.run(sql, function (err) { if (err) rej(err); else res(this); }));
}

(async ()=>{
  try {
    await run(`PRAGMA journal_mode = WAL;`);
    await run(`CREATE TABLE Author (id INTEGER PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE, password TEXT, role TEXT, createdAt TEXT, updatedAt TEXT);`);
    await run(`CREATE TABLE Tag (id INTEGER PRIMARY KEY, name TEXT UNIQUE);`);
    await run(`CREATE TABLE Category (id INTEGER PRIMARY KEY, name TEXT UNIQUE);`);
    await run(`CREATE TABLE Post (id INTEGER PRIMARY KEY, title TEXT NOT NULL, slug TEXT UNIQUE, summary TEXT, content TEXT, status TEXT, image TEXT, views INTEGER DEFAULT 0, authorId INTEGER, scheduledFor TEXT, createdAt TEXT, updatedAt TEXT, FOREIGN KEY(authorId) REFERENCES Author(id));`);
    await run(`CREATE TABLE PostVersion (id INTEGER PRIMARY KEY, postId INTEGER NOT NULL, content TEXT, title TEXT, createdAt TEXT, FOREIGN KEY(postId) REFERENCES Post(id));`);
    await run(`CREATE TABLE Post_Tags (postId INTEGER NOT NULL, tagId INTEGER NOT NULL, PRIMARY KEY(postId,tagId));`);
    await run(`CREATE TABLE Post_Categories (postId INTEGER NOT NULL, categoryId INTEGER NOT NULL, PRIMARY KEY(postId,categoryId));`);

    // Load JSON fallback data if present
    const postsFile = path.resolve(__dirname, '..', 'api', 'data', 'posts.json');
    const authorsFile = path.resolve(__dirname, '..', 'api', 'data', 'authors.json');
    const tagsFile = path.resolve(__dirname, '..', 'api', 'data', 'tags.json');
    const catsFile = path.resolve(__dirname, '..', 'api', 'data', 'categories.json');

    const posts = fs.existsSync(postsFile) ? JSON.parse(fs.readFileSync(postsFile,'utf8')) : [];
    const authors = fs.existsSync(authorsFile) ? JSON.parse(fs.readFileSync(authorsFile,'utf8')) : [];
    const tags = fs.existsSync(tagsFile) ? JSON.parse(fs.readFileSync(tagsFile,'utf8')) : [];
    const cats = fs.existsSync(catsFile) ? JSON.parse(fs.readFileSync(catsFile,'utf8')) : [];

    for (const a of authors) {
      await run(`INSERT INTO Author (id,name,email,password,role,createdAt,updatedAt) VALUES (${a.id||null}, "${(a.name||'').replace(/"/g,'\"')}", ${a.email? '"'+a.email+'"':'NULL'}, ${a.password? '"'+a.password.replace(/"/g,'\"')+'"':'NULL'}, ${a.role? '"'+a.role+'"':'NULL'}, ${a.createdAt? '"'+a.createdAt+'"':'NULL'}, ${a.updatedAt? '"'+a.updatedAt+'"':'NULL'});`);
    }

    for (const t of tags) {
      await run(`INSERT INTO Tag (id,name) VALUES (${t.id||'NULL'}, "${(t.name||'').replace(/"/g,'\"')}");`);
    }
    for (const c of cats) {
      await run(`INSERT INTO Category (id,name) VALUES (${c.id||'NULL'}, "${(c.name||'').replace(/"/g,'\"')}");`);
    }

    for (const p of posts) {
      const createdAt = p.createdAt ? `"${p.createdAt}"` : 'NULL';
      const updatedAt = p.updatedAt ? `"${p.updatedAt}"` : 'NULL';
      const image = p.image ? `"${(p.image||'').replace(/"/g,'\"')}"` : 'NULL';
      const content = p.content ? `"${(p.content||'').replace(/"/g,'\"')}"` : 'NULL';
      await run(`INSERT INTO Post (id,title,slug,summary,content,status,image,views,authorId,scheduledFor,createdAt,updatedAt) VALUES (${p.id||'NULL'}, "${(p.title||'').replace(/"/g,'\"')}", "${(p.slug||'').replace(/"/g,'\"')}", ${p.summary? '"'+p.summary.replace(/"/g,'\"')+'"':'NULL'}, ${content}, ${p.published? '"PUBLISHED"':'"DRAFT"'}, ${image}, ${p.views||0}, ${p.authorId||'NULL'}, ${p.scheduledFor? '"'+p.scheduledFor+'"':'NULL'}, ${createdAt}, ${updatedAt});`);
    }

    // Simple counts
    const row = await new Promise((res, rej) => db.get(`SELECT (SELECT COUNT(*) FROM Author) as authors, (SELECT COUNT(*) FROM Post) as posts, (SELECT COUNT(*) FROM Tag) as tags, (SELECT COUNT(*) FROM Category) as categories;`, (err, r) => err ? rej(err) : res(r)));
    console.log('Created dev.db with counts:', row);
    db.close();
  } catch (e) {
    console.error('Error creating dev DB:', e);
    db.close();
    process.exit(1);
  }
})();
