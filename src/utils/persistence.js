// Simple local queue for failed syncs (stored in localStorage)
const QUEUE_KEY = 'dmm_sync_queue_v1';

export function getQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) { return []; }
}

export function pushQueue(item) {
  const q = getQueue();
  q.push(item);
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (e) {}
}

export function popQueue() {
  const q = getQueue();
  const item = q.shift();
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch (e) {}
  return item;
}

export function clearQueue() {
  try { localStorage.removeItem(QUEUE_KEY); } catch (e) {}
}
