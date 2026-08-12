# Cladle - Deployment Guide

This document describes how to deploy the Cladle application to Vercel.

## Table of Contents

- [Overview](#overview)
- [Prerequisites](#prerequisites)
- [Vercel Deployment](#vercel-deployment)
- [Environment Variables](#environment-variables)
- [Build Configuration](#build-configuration)
- [Troubleshooting](#troubleshooting)

## Overview

Cladle is configured for **hybrid deployment** on Vercel: prerendered client pages (`ssr: false`) plus Nitro serverless API routes.

**Deployment Strategy:**
- **Platform:** Vercel
- **Build Mode:** Static pages + Nitro serverless functions
- **Build Command:** `pnpm run build`
- **Framework:** Nuxt with `ssr: false` (pages) and `server/api/*` (functions)
- **Output:** Let the Nuxt/Vercel preset handle output (do **not** force `.output/public` only, or API routes will be dropped)

## Prerequisites

Before deploying, ensure you have:

1. **GitHub/GitLab/Bitbucket Account** - For repository hosting
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Git Repository** - Code pushed to a Git provider
4. **Dependencies Installed** - Run `pnpm install` locally to verify
5. **GitHub fine-grained PAT** (for bug reports) - Issues: Read and write on `nobabar/cladle`

## Vercel Deployment

### Option 1: Automatic Deployment (Recommended)

Vercel automatically detects Nuxt projects and configures deployment settings.

1. **Connect Repository:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Select your Git provider (GitHub, GitLab, Bitbucket)
   - Choose the `cladle` repository
   - Click "Import"

2. **Configure Project:**
   - **Framework Preset:** Vercel auto-detects "Nuxt.js"
   - **Build Command:** `pnpm run build` (auto-detected)
   - **Output Directory:** leave unset / use Nuxt defaults
   - **Install Command:** `pnpm install` (auto-detected)

3. **Environment variables:** Add `NUXT_GITHUB_TOKEN` (and optionally owner/repo) as below, then deploy.

4. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete (typically 2-3 minutes)
   - Your app will be live at `https://your-project.vercel.app`

5. **Automatic Deployments:**
   - Every push to `main` branch → Production deployment
   - Every push to other branches → Preview deployment
   - Every pull request → Unique preview URL

### Option 2: Manual Deployment via Vercel CLI

For manual deployments or local testing:

1. **Install Vercel CLI:**
   ```bash
   pnpm add -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   # Deploy to preview
   vercel

   # Deploy to production
   vercel --prod
   ```

### Option 3: GitHub Actions CI/CD

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`).
See the CI/CD configuration for details.

## Environment Variables

### Required for bug reports

Private (server-only) variables for creating GitHub issues from the in-app form:

| Variable | Description |
| -------- | ----------- |
| `NUXT_GITHUB_TOKEN` | Fine-grained PAT with **Issues: Read and write** on the repo |
| `NUXT_GITHUB_OWNER` | GitHub owner (default `nobabar`) |
| `NUXT_GITHUB_REPO` | Repository name (default `cladle`) |

These map to Nuxt `runtimeConfig` (`githubToken`, `githubOwner`, `githubRepo`). Never use the `NUXT_PUBLIC_` prefix for the token.

#### Configuring in Vercel

1. Go to your project in the Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Add `NUXT_GITHUB_TOKEN` (and owner/repo if you override defaults)
4. Select Production, Preview, and Development as needed
5. Save and **re-deploy**

#### Local Development

Copy [`.env.example`](.env.example) to `.env` and fill in values:

```bash
NUXT_GITHUB_TOKEN=github_pat_...
NUXT_GITHUB_OWNER=nobabar
NUXT_GITHUB_REPO=cladle
```

**Note:** Never commit `.env` to Git. The `.gitignore` file already excludes it.

### Public Variables (Available in Browser)

Public variables are prefixed with `NUXT_PUBLIC_` and exposed to the client-side.
They must be set at **BUILD TIME** for prerendered pages.

## Build Configuration

### App configuration

```typescript
export default defineNuxtConfig({
  ssr: false,
  // runtimeConfig.githubToken ← NUXT_GITHUB_TOKEN (server only)
});
```

### Vercel Configuration

[`vercel.json`](vercel.json) sets build/install commands and git deployment rules. It does **not** set `outputDirectory`, so Nitro can emit both static assets and serverless functions.

### Verifying Build Locally

```bash
pnpm run build
pnpm run preview
```

Confirm `/api/bug-report` is available in preview when `NUXT_GITHUB_TOKEN` is set.

## Deployment Workflow

### Standard Deployment Flow

1. **Develop Locally:**
   ```bash
   pnpm run dev
   ```

2. **Run Tests:**
   ```bash
   pnpm run test
   pnpm run lint
   ```

3. **Commit and Push:**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin main
   ```

4. **Automatic Deployment:**
   - Vercel detects the push
   - Runs build command
   - Deploys static pages and serverless API routes

5. **Verify Deployment:**
   - Check Vercel dashboard for build status
   - Visit deployment URL
   - Test the in-app bug report form (requires token)

### Branch Deployments

- **`main` branch** → Production deployment (`https://cladle.vercel.app`)
- **Other branches** → Preview deployments (`https://cladle-git-branch-name.vercel.app`)
- **Pull Requests** → Unique preview URLs automatically commented on PR

## Troubleshooting

### Build Fails on Vercel

**Check build logs** in the Vercel dashboard for the failed deployment.

**Common issues:**
- **Missing dependencies:** Ensure `package.json` includes all required packages
- **Build command fails:** Verify `pnpm run build` works locally
- **Node version mismatch:** Vercel uses Node 18+ by default

### Bug report API returns 500 / not configured

- Confirm `NUXT_GITHUB_TOKEN` is set for that Vercel environment
- Re-deploy after adding or changing the variable
- Ensure the PAT still has Issues write access on the target repo

### Environment Variables Not Working

- Private `NUXT_*` (non-public) secrets are available at **runtime** on serverless functions
- Public `NUXT_PUBLIC_*` values for SSG pages must be present at **build** time
- Re-deploy after changing variables

### Deployment Succeeds but App Doesn't Work

**Check browser console** (DevTools → Console / Network).

**Common issues:**
- **API calls failing:** Check that `/api/bug-report` is deployed (output was not forced to static-only)
- **Missing assets:** Verify build output includes `_nuxt/` assets
- **Routing issues:** Ensure Vercel uses the Nuxt framework preset

### Preview Deployment Not Created

**Verify GitHub integration:**
1. Go to Vercel dashboard → Settings → Git
2. Ensure GitHub integration is active
3. Check repository permissions

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Nuxt Deployment Guide](https://nuxt.com/docs/getting-started/deployment)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [GitHub Issues API](https://docs.github.com/en/rest/issues/issues)

## Support

For deployment issues:
- **Vercel Support:** [vercel.com/support](https://vercel.com/support)
- **Project Issues:** Use the in-app bug report form, or open an issue in the project repository
- **Nuxt Community:** [nuxt.com/community](https://nuxt.com/community)

---

**Last Updated:** July 2026
**Build Mode:** Hybrid (SSG pages + Nitro API)
**Platform:** Vercel
