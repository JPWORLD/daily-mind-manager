let firebaseAdmin = null;
const initFirebase = (saJson) => {
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      const sa = typeof saJson === 'string' ? JSON.parse(saJson) : saJson;
      admin.initializeApp({ credential: admin.credential.cert(sa) });
    }
    firebaseAdmin = admin;
  } catch (e) {
    // ignore - firebase-admin not configured
    firebaseAdmin = null;
  }
};

const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret';

const getTokenFromReq = (req) => {
  const authHeader = req.headers['authorization'] || req.headers['x-admin-token'] || '';
  return (authHeader || '').replace(/^Bearer\s+/i, '');
};

async function checkAdmin(req) {
  const token = getTokenFromReq(req);
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return !!(decoded && decoded.sub);
  } catch (e) {
    // fallthrough
  }
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    if (!firebaseAdmin) initFirebase(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (firebaseAdmin) {
      try {
        const decoded = await firebaseAdmin.auth().verifyIdToken(token);
        return !!(decoded && decoded.uid);
      } catch (e) { }
    }
  }
  const adminToken = process.env.ADMIN_TOKEN || process.env.DMM_ADMIN_TOKEN;
  if (adminToken && token === adminToken) return true;
  return false;
}

// returns decoded JWT payload or null
function getAdminFromReq(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (e) {
    return null;
  }
}

module.exports = { checkAdmin, getTokenFromReq, getAdminFromReq };
