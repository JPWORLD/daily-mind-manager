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
