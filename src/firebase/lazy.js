import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged as fbOnAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, doc, onSnapshot, setDoc } from 'firebase/firestore';

let app = null;
let auth = null;
let db = null;
let storedAppId = null;

export async function init(config = {}, appId = 'default-app-id') {
  if (app) return;
  app = initializeApp(config);
  auth = getAuth(app);
  db = getFirestore(app);
  storedAppId = appId;
}

export async function signInAnonymouslyWrapper() {
  if (!auth) throw new Error('not inited');
  return await signInAnonymously(auth);
}

export function onAuthStateChanged(cb) {
  if (!auth) throw new Error('not inited');
  return fbOnAuthStateChanged(auth, cb);
}

export async function signInWithCustomTokenWrapper(token) {
  if (!auth) throw new Error('not inited');
  return await signInWithCustomToken(auth, token);
}

export function subscribeUserDoc(uid, callback) {
  if (!db) throw new Error('not inited');
  const userDocRef = doc(db, 'artifacts', storedAppId, 'users', uid, 'settings', 'userState');
  return onSnapshot(userDocRef, callback);
}

export async function setUserDoc(uid, data) {
  if (!db) throw new Error('not inited');
  const userDocRef = doc(db, 'artifacts', storedAppId, 'users', uid, 'settings', 'userState');
  return await setDoc(userDocRef, data, { merge: true });
}
