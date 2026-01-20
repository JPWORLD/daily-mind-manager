const fs = require('fs');
const path = require('path');

const adsPath = path.resolve(__dirname, '../public/ads.txt');
let adsTxt = '';
try {
  adsTxt = fs.readFileSync(adsPath, 'utf8');
} catch (e) {
  console.error('Could not read public/ads.txt', e.message);
  process.exit(2);
}

const envClient = process.env.VITE_ADSENSE_CLIENT || process.argv[2] || '';
if (!envClient) {
  console.error('No VITE_ADSENSE_CLIENT provided. Pass it via env or as first arg.');
  console.error('Example: VITE_ADSENSE_CLIENT=pub-123 npm run verify-ads');
  process.exit(2);
}

const matched = adsTxt.split(/\n/).map(l=>l.trim()).find(l => l && l.includes(envClient));
if (matched) {
  console.log('ads.txt contains the publisher id:', envClient);
  process.exit(0);
} else {
  console.error('ads.txt does NOT contain the publisher id:', envClient);
  console.error('ads.txt content:\n', adsTxt);
  process.exit(3);
}
