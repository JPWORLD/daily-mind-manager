To enable automatic aliasing/deploy to your domain from GitHub Actions you must set these repository secrets:

- `VERCEL_TOKEN`: your personal Vercel token (create at https://vercel.com/account/tokens).
- `VERCEL_ORG_ID` (optional): organization id if needed by your workflow.
- `VERCEL_PROJECT_ID` (optional): project id if needed by your workflow.

Add them in your repository Settings → Secrets and variables → Actions → New repository secret.

The `deploy-vercel.yml` workflow in this repo expects `VERCEL_TOKEN` to exist for automated aliasing.