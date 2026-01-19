# Daily Mind Manager — React PWA

Quick scaffold of your DailyMindManager sketch as an installable React PWA (Vite + Tailwind).

Getting started

1. Install dependencies

```bash
npm install
```

2. Set environment variables (create a `.env` file at project root):

```
VITE_FIREBASE_CONFIG={"apiKey":"...","authDomain":"..."}
VITE_APP_ID=your-app-id
VITE_INITIAL_AUTH_TOKEN=
```

3. Run dev server

```bash
npm run dev
```

Build and preview

```bash
npm run build
npm run preview
```

Notes and next steps

- Pomodoro timer, offline caching tweaks, and notifications are included in the scaffold.

PWA notes
- Service worker is registered via the Vite PWA plugin and auto-updates are enabled.
- You can install the app from mobile browser menu or via the Install button in `Settings` when the browser supports it.
- Replace the placeholder icons in `public/` with your branded PNG/SVG assets: `pwa-192.svg`, `pwa-512.svg`.
PWA notes
- Service worker is registered via the Vite PWA plugin and auto-updates are enabled.
- You can install the app from mobile browser menu or via the Install button in `Settings` when the browser supports it.
- Replace the placeholder icons in `public/` with your branded PNG/SVG assets: `pwa-192.svg`, `pwa-512.svg`.

CI / Deploy
- A GitHub Actions workflow is included at `.github/workflows/ci.yml` which runs `npm ci` and `npm run build` on pushes and PRs.
- A GitHub Pages workflow is included at `.github/workflows/deploy-pages.yml` for static hosting on GitHub Pages.
- A Netlify deploy workflow is included at `.github/workflows/deploy-netlify.yml`. To use it add two repository secrets:
	- `NETLIFY_AUTH_TOKEN` — a personal access token from Netlify (user-level)
	- `NETLIFY_SITE_ID` — the target site id in Netlify

	After adding those secrets the workflow will build and deploy `dist/` on pushes to `main`/`master`.

Deploy options
- Vercel: connect the repo in Vercel and set the build command to `npm run build` and publish directory to `dist`.
- Netlify: connect the repo in Netlify or use the included workflow; for direct Netlify projects set build command `npm run build` and publish `dist`.
E2E testing
- End-to-end tests using Playwright are included. Run locally after building and serving the `dist/` folder:

```bash
npm install
npm run build
npx http-server ./dist -p 8080
npx playwright test
```

The CI pipeline runs Playwright on push/PR via `.github/workflows/e2e.yml`.

Offline sync behavior
- Failed cloud saves are queued locally in `localStorage` and retried when the device goes back online or when your anonymous `user` becomes available.

MVP checklist
- Replace placeholder icons in `public/` with final PNG/SVG assets (`pwa-192.png`, `pwa-512.png`, optionally SVG).
- Test install flow on iOS/Android (Add to Home Screen) and confirm notifications/vibration behavior.
- Connect a Git remote and enable one of the provided deploy workflows (GitHub Pages / Netlify / Vercel).

Ready for MVP
- Core features implemented: one-task focus, brain-dump, Hold list, Pomodoro with persistence, offline queue and PWA install support.


