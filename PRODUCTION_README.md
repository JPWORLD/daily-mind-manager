Production setup checklist

1. Set environment variables (.env or hosting provider):

- `DATABASE_URL` (Postgres)
- `ADMIN_TOKEN` (strong secret)
- `FIREBASE_SERVICE_ACCOUNT` (optional, JSON string)
- `WAQI_TOKEN` (optional)

2. Install and generate Prisma client locally (for migrations):

```bash
npm install
npx prisma generate
```

3. Run migrations (development):

```bash
npx prisma migrate dev --name init
```

4. For production deploy, run migrations: 

```bash
npx prisma migrate deploy
```

5. Build and deploy:

```bash
npm run build
# Deploy `dist/` through your hosting (Vercel, Netlify, etc.)
```

6. Start server for API/static (if self-hosting):

```bash
# ensure DATABASE_URL and ADMIN_TOKEN set in env
npm run dev:server
# serve dist via a static server
npx serve dist
```

7. Post-deploy checks:
- Visit `/admin.html` and login using `ADMIN_TOKEN` via the admin UI or store it in localStorage as before.
- Verify `/blog/` and `/blog/post.html?slug=post-1` render correctly.
- Submit sitemap to Google Search Console.

Security notes:
- Never commit production `.env`.
- Use strong `ADMIN_TOKEN` and rotate regularly.
- Consider adding authentication for admin UI and HTTPS termination on production.

GitHub Actions secrets
----------------------

- Add the `ADMIN_TOKEN` as a repository Actions secret so CI can run admin-side E2E tests.

	1. Go to your repository on GitHub.
	2. Settings → Secrets and variables → Actions → New repository secret.
	3. Name: `ADMIN_TOKEN`, Value: your strong token (same value used in production `.env`).

	Compatibility: some local tests use `DMM_ADMIN_TOKEN`. The server accepts either `ADMIN_TOKEN` or `DMM_ADMIN_TOKEN` (prefers `ADMIN_TOKEN`).

- Optionally add `DATABASE_URL` and `FIREBASE_SERVICE_ACCOUNT` as repository secrets if your CI or deploy steps need them.

Once `ADMIN_TOKEN` is set as a secret, the included CI workflow (`.github/workflows/ci.yml`) will pass the value into the E2E step via `env: ADMIN_TOKEN: ${{ secrets.ADMIN_TOKEN }}`.

Model provider (Anthropic / Claude Haiku 4.5)
-------------------------------------------

If you want all clients to use Claude Haiku 4.5, follow these steps:

1. Provision an API key from your model provider (for Claude/Anthropic use the Anthropic console).
2. Add the API key as a GitHub Actions secret:

	- Name: `ANTHROPIC_API_KEY`
	- Value: the API key string

3. Set the model name in your environment (or in the hosting provider's env settings):

```bash
MODEL_NAME=claude-haiku-4.5
```

4. Update your server / client config to read `MODEL_NAME` (if your code supports runtime model selection). If your project doesn't yet read `MODEL_NAME`, set it in the environment where the client/service runs.

5. Redeploy the service so the new environment variables take effect.

Notes:
- Use a secure secret for `ANTHROPIC_API_KEY` and never commit keys to source control.
- If you need a gradual rollout, implement a feature flag that defaults to the previous model and flips to `claude-haiku-4.5` after verification.
