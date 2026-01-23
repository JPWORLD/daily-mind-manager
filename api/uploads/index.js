const fs = require('fs');
const path = require('path');

const UPLOAD_DIR = path.resolve(__dirname, '../public/uploads');

const ensureDir = (dir) => { try { fs.mkdirSync(dir, { recursive: true }); } catch (e) {} };

const saveDataUrlLocal = (dataUrl, filename) => {
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('Invalid data URL');
  const mime = match[1];
  const base64 = match[2];
  const ext = mime.split('/').pop().split('+')[0];
  const name = filename || `upload-${Date.now()}.${ext}`;
  ensureDir(UPLOAD_DIR);
  const filePath = path.join(UPLOAD_DIR, name);
  fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
  return { url: `/uploads/${name}`, path: filePath };
};

const saveDataUrlS3 = async (dataUrl, filename) => {
  // requires AWS credentials via env: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION, AWS_S3_BUCKET
  const AWS = require('aws-sdk');
  const match = /^data:(.+);base64,(.+)$/.exec(dataUrl);
  if (!match) throw new Error('Invalid data URL');
  const mime = match[1];
  const base64 = match[2];
  const ext = mime.split('/').pop().split('+')[0];
  const name = filename || `upload-${Date.now()}.${ext}`;
  const bucket = process.env.AWS_S3_BUCKET;
  if (!bucket) throw new Error('AWS_S3_BUCKET not set');
  const s3 = new AWS.S3({ region: process.env.AWS_REGION });
  const buffer = Buffer.from(base64, 'base64');
  const params = { Bucket: bucket, Key: name, Body: buffer, ContentType: mime, ACL: 'public-read' };
  await s3.putObject(params).promise();
  // construct public URL (best-effort)
  const url = process.env.AWS_S3_PUBLIC_URL || `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${name}`;
  return { url, key: name };
};

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.statusCode = 405; res.end('Method Not Allowed'); return; }

  // auth: accept JWT with admin/editor roles, or fallback to Firebase/static token
  try {
    const { checkAdmin, getAdminFromReq } = require('../_auth');
    const decoded = getAdminFromReq(req);
    let allowed = false;
    if (decoded && (decoded.role === 'admin' || decoded.role === 'editor')) allowed = true;
    else {
      const ok = await checkAdmin(req);
      if (ok) allowed = true;
    }
    if (!allowed) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
  } catch (e) {
    const tokenHeader = req.headers['authorization'] || req.headers['x-admin-token'] || '';
    const token = (tokenHeader || '').replace(/^Bearer\s+/i, '');
    const adminToken = process.env.ADMIN_TOKEN || process.env.DMM_ADMIN_TOKEN;
    if (!adminToken || token !== adminToken) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Unauthorized' })); return; }
  }

  try {
    const { filename, data } = req.body || {};
    if (!data) { res.statusCode = 400; res.end(JSON.stringify({ error: 'missing data' })); return; }
    // If AWS env present, upload to S3
    let result;
    if (process.env.AWS_S3_BUCKET && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        result = await saveDataUrlS3(data, filename);
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ url: result.url, storage: 's3' }));
        return;
      } catch (e) {
        // fallback to local
        console.error('S3 upload failed, falling back to local:', e.message);
      }
    }
    const saved = saveDataUrlLocal(data, filename);
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ url: saved.url, storage: 'local' }));
  } catch (e) {
    res.statusCode = 500; res.end(JSON.stringify({ error: e.message }));
  }
};
