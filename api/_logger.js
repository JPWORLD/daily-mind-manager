const LEVELS = { info: 'info', warn: 'warn', error: 'error', debug: 'debug' };
function ts(){ return new Date().toISOString(); }
function log(level, message, meta){
  const out = { ts: ts(), level, message };
  if (meta) out.meta = meta;
  try { console.log(JSON.stringify(out)); } catch (e) { console.log(ts() + ' ' + level + ' ' + message); }
}
module.exports = {
  info: (msg, meta) => log(LEVELS.info, msg, meta),
  warn: (msg, meta) => log(LEVELS.warn, msg, meta),
  error: (msg, meta) => log(LEVELS.error, msg, meta),
  debug: (msg, meta) => { if (process.env.NODE_ENV !== 'production') log(LEVELS.debug, msg, meta); }
};
