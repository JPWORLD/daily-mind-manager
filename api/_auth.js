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

const getTokenFromReq = (req) => {
  const authHeader = req.headers['authorization'] || req.headers['x-admin-token'] || '';
  return (authHeader || '').replace(/^Bearer\s+/i, '');
};

async function checkAdmin(req) {
  const token = getTokenFromReq(req);
  if (!token) return false;

  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    if (!firebaseAdmin) initFirebase(process.env.FIREBASE_SERVICE_ACCOUNT);
    if (firebaseAdmin) {
      try {
        const decoded = await firebaseAdmin.auth().verifyIdToken(token);
        return !!(decoded && decoded.uid);
      } catch (e) {
        return false;
      }
    }
  }

  const adminToken = process.env.ADMIN_TOKEN || process.env.DMM_ADMIN_TOKEN;
  if (!adminToken) return false;
  return token === adminToken;
}

module.exports = { checkAdmin, getTokenFromReq };
