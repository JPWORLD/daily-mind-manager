const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const sanitize = require('sanitize-html');

async function loadPosts() {
  const dataFile = path.resolve(__dirname, '../api/data/posts.json');
  try { return JSON.parse(fs.readFileSync(dataFile, 'utf8') || '[]'); } catch { return []; }
}

function buildItem(p, siteUrl) {
  const link = `${siteUrl}/blog/post.html?slug=${encodeURIComponent(p.slug)}`;
  const content = sanitize(marked.parse(p.content || ''));
  return `  <item>\n    <title>${escapeXml(p.title)}</title>\n    <link>${link}</link>\n    <guid>${link}</guid>\n    <pubDate>${new Date(p.createdAt).toUTCString()}</pubDate>\n    <description><![CDATA[${content}]]></description>\n  </item>`;
}

function escapeXml(s){ return (s||'').replace(/[<>&"']/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[c])); }

(async ()=>{
  const posts = await loadPosts();
  const siteUrl = process.env.SITE_URL || 'https://example.com';
  const items = posts.filter(p=>p.published).sort((a,b)=> new Date(b.createdAt)-new Date(a.createdAt)).map(p=>buildItem(p, siteUrl)).join('\n');
  const rss = `<?xml version="1.0" encoding="UTF-8" ?>\n<rss version="2.0">\n<channel>\n  <title>Daily Mind Manager</title>\n  <link>${siteUrl}</link>\n  <description>Latest posts</description>\n${items}\n</channel>\n</rss>`;
  const outDir = path.resolve(__dirname, '../dist');
  try { fs.mkdirSync(outDir, { recursive: true }); } catch(e){}
  fs.writeFileSync(path.join(outDir, 'rss.xml'), rss);
  console.log('rss.xml written to', path.join(outDir, 'rss.xml'));
})();
