## Daily Mind Manager — Release Draft

Release version: draft
Date: 2026-01-20

Summary
- Vite + React PWA with offline-first sync (lazy Firebase), onboarding (en/hi), Hold list, Pomodoro timer with ambient sounds and custom alarm upload, Scorecard and Achievements, export/import, and Playwright E2E tests.

Build & Test
- Production build: `npm run build` — completed locally; `dist/` generated.
- Playwright E2E: all tests passed locally (4/4).

What’s included
- PWA manifest & service worker
- Pomodoro: ambient (mp3/wav) support, procedural fallback, custom alarm upload
- Onboarding (username + language) persisted to `localStorage`
- Hold list CRUD with emoji/icon support
- Scorecard modal with achievements and badges in `public/badges`
- Export/Import includes `pomo_history`, `pomoState`, `pomo_achievements`, and app meta
- Offline sync queue and lazy Firebase wrapper (optional cloud sync)

Assets added
- `public/badges/*` — polished SVG badge visuals
- `public/ambient/rain.wav`, `public/ambient/sea.wav` — generated ambient WAV placeholders
- `scripts/generate_ambient.py` — generator used to create WAV files

Deployment (Vercel)
1. Connect repo to Vercel (if not already).
2. CI workflow located at `.github/workflows/deploy-vercel.yml` will build and deploy the `dist/` folder.
3. To enable automatic aliasing to `daily.bitmenders.in`, create a repository secret named `VERCEL_TOKEN` with a Vercel personal token that has Project and Alias permissions. The workflow checks for this secret and will alias only if present.

Manual local deploy / testing
```bash
# Build
npm ci
npm run build

# Serve locally (static):
npx http-server ./dist -p 8080

# Run Playwright tests:
npx playwright test --reporter=list
```

Notes & Next Steps
- If you want me to trigger the CI deploy and alias automatically, please add `VERCEL_TOKEN` to the repository secrets and tell me to proceed.
- I can also create a GitHub Release draft (tag + notes) and attach the `dist/` zip if you'd like a downloadable artifact.
