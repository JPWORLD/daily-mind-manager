# Changelog

## v1.0.0 — 2026-01-20

### Added
- Initial public MVP release of DailyMindManager PWA
- Pomodoro timer with ambient sounds, custom alarms, and history
- Onboarding flow, Hold list, export/import, scorecard and achievements
- Offline-first sync scaffolding (local queue + Firebase wrapper)
- Playwright E2E smoke tests and CI build
- PWA manifest and service worker for installability

### Fixed
- CI deploy: explicit Vercel project targeting to avoid auto-name rejection
- Theme toggle, icon theming, and onboarding UX fixes from QA

### Notes
- To enable automatic aliasing during CI, add the `VERCEL_TOKEN` repository secret with a deploy token that has aliasing permissions for the `dist` project.
