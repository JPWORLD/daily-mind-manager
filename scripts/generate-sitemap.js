const fs = require('fs');
const path = require('path');

async function loadPosts() {
  const dataFile = path.resolve(__dirname, '../api/data/posts.json');
  try { return JSON.parse(fs.readFileSync(dataFile, 'utf8') || '[]'); } catch { return []; }
}

function buildUrl(loc, lastmod){ return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${new Date(lastmod).toISOString()}</lastmod>\n  </url>` }

(async ()=>{
  const posts = await loadPosts();
  const siteUrl = process.env.SITE_URL || 'https://example.com';
  const urls = [];
  urls.push(buildUrl(siteUrl + '/', new Date()));
  urls.push(buildUrl(siteUrl + '/blog/', new Date()));
  posts.filter(p=>p.published).forEach(p=>{
    urls.push(buildUrl(siteUrl + `/blog/post.html?slug=${encodeURIComponent(p.slug)}`, p.updatedAt || p.createdAt));
  });
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`;
  const outDir = path.resolve(__dirname, '../dist');
  try { fs.mkdirSync(outDir, { recursive: true }); } catch(e){}
  fs.writeFileSync(path.join(outDir, 'sitemap.xml'), sitemap);
  console.log('sitemap.xml written to', path.join(outDir, 'sitemap.xml'));
})();
