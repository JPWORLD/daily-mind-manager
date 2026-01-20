# Deployment & Secrets

This document lists steps to prepare environment secrets and verify ads configuration for production.

1. DO NOT commit secrets to git. Add these environment variables to your hosting provider or CI:

- `VITE_GA_MEASUREMENT_ID` — your GA4 measurement id (G-...)
- `VITE_ADSENSE_CLIENT` — your AdSense publisher client id (pub-...)
- `VITE_ADSENSE_FOOTER_SLOT` — optional Ad unit id for footer slot

2. Verify `ads.txt` matches `VITE_ADSENSE_CLIENT`

Locally you can run:

```bash
# provide the client id via env or as arg
VITE_ADSENSE_CLIENT=pub-4324475413458467 npm run verify-ads
```

3. Build & deploy

```bash
npm run build
# Upload `dist/` to your static host or use your CI/CD workflow.
```

4. Submit sitemap & verify domain in Google Search Console (use https://<your-domain>/sitemap.xml)

Search Console steps (summary):

1. Open https://search.google.com/search-console
2. Add property -> choose URL-prefix and enter your site (https://daily.bitmenders.in)
3. Verify ownership via DNS TXT (recommended) or HTML file upload
4. After verification, go to Sitemaps and submit `/sitemap.xml`

I cannot verify ownership on your behalf — you must complete the verification step in Search Console. Once verified, CI and sitemap submission will allow Google to crawl new pages.

5. Rotate keys if they were previously committed. If secrets were exposed, rotate them in the provider.

6. Recommended CI steps (GitHub Actions example):
- Add repository secrets: `VITE_GA_MEASUREMENT_ID`, `VITE_ADSENSE_CLIENT`, `VITE_ADSENSE_FOOTER_SLOT`, `VERCEL_TOKEN` (if using Vercel)
- In your build step, ensure `NODE_ENV=production` and that the host injects env vars into the build (Vite reads env from process.env when prefixed with VITE_)

Database & Prisma notes:

- For development we use SQLite via `DATABASE_URL="file:./dev.db"` and Prisma schema in `prisma/schema.prisma`.
- For production you should use a hosted Postgres (Planetscale, Supabase, Railway, etc.) and add `DATABASE_URL` as a secret in your hosting provider. Vercel ephemeral filesystem means SQLite is not suitable for production.
- CI steps to run migrations:
Environment variables to add to your hosting/CI (minimum):

- `DATABASE_URL` — production DB connection string (Postgres recommended)
- `ADMIN_TOKEN` — secret admin token used to protect write APIs and admin UI (store securely)
- `VITE_ADSENSE_CLIENT`, `VITE_ADSENSE_FOOTER_SLOT`, `VITE_GA_MEASUREMENT_ID` as before

In GitHub Actions or Vercel secrets: add `ADMIN_TOKEN` and `DATABASE_URL`. The CI will run migrations and the serverless API will use `ADMIN_TOKEN` to validate admin requests.

```bash
npm run prisma:generate
npx prisma migrate deploy --schema=prisma/schema.prisma
```

Add `prisma:generate` and migration scripts to `package.json` and ensure `DATABASE_URL` is set in CI.

Example GitHub Actions workflow (already added in `.github/workflows/ci-deploy.yml`) will:

- install deps and build using `VITE_` secrets
- start a local static server and run Playwright E2E tests
- run `node scripts/verify-ads.js` when `VITE_ADSENSE_CLIENT` is provided
- deploy to Vercel when `VERCEL_TOKEN` secret is set

To set secrets for GitHub Actions:

1. Go to your repository -> Settings -> Secrets -> Actions
2. Add `VITE_GA_MEASUREMENT_ID`, `VITE_ADSENSE_CLIENT`, `VITE_ADSENSE_FOOTER_SLOT` and `VERCEL_TOKEN` as needed.

