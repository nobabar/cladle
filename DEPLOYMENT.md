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

Cladle is configured for **Static Site Generation (SSG)** deployment on Vercel. The application is built entirely as static files and served without a server runtime.

**Deployment Strategy:**
- **Platform:** Vercel
- **Build Mode:** Static Site Generation (SSG)
- **Build Command:** `pnpm run build`
- **Output Directory:** `.output/public`
- **Framework:** Nuxt 3 with `ssr: false`

## Prerequisites

Before deploying, ensure you have:

1. **GitHub/GitLab/Bitbucket Account** - For repository hosting
2. **Vercel Account** - Sign up at [vercel.com](https://vercel.com)
3. **Git Repository** - Code pushed to a Git provider
4. **Dependencies Installed** - Run `pnpm install` locally to verify

## Vercel Deployment

### Option 1: Automatic Deployment (Recommended)

Vercel automatically detects Nuxt 3 projects and configures deployment settings.

1. **Connect Repository:**
   - Go to [vercel.com/new](https://vercel.com/new)
   - Select your Git provider (GitHub, GitLab, Bitbucket)
   - Choose the `cladle` repository
   - Click "Import"

2. **Configure Project:**
   - **Framework Preset:** Vercel auto-detects "Nuxt.js"
   - **Build Command:** `pnpm run build` (auto-detected)
   - **Output Directory:** `.output/public` (auto-detected)
   - **Install Command:** `pnpm install` (auto-detected)

3. **Deploy:**
   - Click "Deploy"
   - Wait for build to complete (typically 2-3 minutes)
   - Your app will be live at `https://your-project.vercel.app`

4. **Automatic Deployments:**
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

The project includes a GitHub Actions workflow (`.github/workflows/ci.yml`) that can be extended to deploy to Vercel automatically. See the CI/CD configuration for details.

## Environment Variables

### Current Status (MVP)

**No environment variables are required** for the MVP deployment. The application runs entirely client-side and fetches data from public APIs.

### Future Environment Variables

If you need to add environment variables in the future:

#### Public Variables (Available in Browser)

Public variables are prefixed with `NUXT_PUBLIC_` and exposed to the client-side. They must be set at **BUILD TIME** for SSG.

**Example:**
```bash
NUXT_PUBLIC_API_BASE_URL=https://api.example.com
```

#### Configuring in Vercel

1. Go to your project in the Vercel dashboard
2. Navigate to **Settings** → **Environment Variables**
3. Click **Add New**
4. Enter:
   - **Key:** Variable name (e.g., `NUXT_PUBLIC_API_BASE_URL`)
   - **Value:** Variable value
   - **Environments:** Select Production, Preview, Development as needed
5. Click **Save**
6. **Important:** Re-deploy after adding environment variables

#### Local Development

Create a `.env` file in the project root:

```bash
# .env (local development only)
NUXT_PUBLIC_API_BASE_URL=https://api.example.com
```

**Note:** Never commit `.env` to Git. The `.gitignore` file already excludes it.

## Build Configuration

### SSG Configuration

The application is configured for Static Site Generation in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  // SSG configuration - Static Site Generation for MVP
  ssr: false,
  // ... other config
});
```

### Vercel Configuration

The `vercel.json` file provides explicit build configuration:

```json
{
  "buildCommand": "pnpm run build",
  "outputDirectory": ".output/public",
  "installCommand": "pnpm install",
  "framework": "nuxtjs",
  "devCommand": "pnpm run dev"
}
```

**Note:** This file is optional. Vercel auto-detects Nuxt 3 projects, but explicit configuration provides better control.

### Build Output

After running `pnpm run build`, the following files are generated:

- **`.output/public/`** - Static files served by Vercel
  - `index.html` - Main HTML file
  - `_nuxt/` - JavaScript, CSS, and assets
  - Other prerendered pages

### Verifying Build Locally

Before deploying, verify the build works locally:

```bash
# Build the application
pnpm run build

# Preview the build (optional)
pnpm run preview

# Check output directory
ls -la .output/public
```

Expected output:
- `index.html` and prerendered pages
- `_nuxt/` directory with bundled assets
- No server files (SSG is client-side only)

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
   - Deploys to production (if main branch)
   - Or creates preview URL (if feature branch)

5. **Verify Deployment:**
   - Check Vercel dashboard for build status
   - Visit deployment URL
   - Test functionality

### Branch Deployments

- **`main` branch** → Production deployment (`https://cladle.vercel.app`)
- **Other branches** → Preview deployments (`https://cladle-git-branch-name.vercel.app`)
- **Pull Requests** → Unique preview URLs automatically commented on PR

## Troubleshooting

### Build Fails on Vercel

**Check build logs:**
1. Go to Vercel dashboard
2. Select your project
3. Click on the failed deployment
4. Review build logs

**Common issues:**
- **Missing dependencies:** Ensure `package.json` includes all required packages
- **Build command fails:** Verify `pnpm run build` works locally
- **Node version mismatch:** Vercel uses Node 18+ by default (compatible with Nuxt 3)

### Environment Variables Not Working

**For SSG deployments:**
- Public variables (`NUXT_PUBLIC_*`) must be set at build time
- Re-deploy after adding/changing environment variables
- Check Vercel dashboard to confirm variables are set

### Deployment Succeeds but App Doesn't Work

**Check browser console:**
- Open browser DevTools (F12)
- Check Console tab for JavaScript errors
- Check Network tab for failed requests

**Common issues:**
- **API calls failing:** Check CORS configuration on API server
- **Missing assets:** Verify build output includes all necessary files
- **Routing issues:** Ensure Vercel routing is configured for SPA mode

### Preview Deployment Not Created

**Verify GitHub integration:**
1. Go to Vercel dashboard → Settings → Git
2. Ensure GitHub integration is active
3. Check if the repository has the correct permissions

### Build Takes Too Long

**Optimization tips:**
- Vercel free tier has build limits (6 minutes)
- Check for large dependencies or slow build steps
- Consider upgrading to Vercel Pro for longer build times

## Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Nuxt 3 Deployment Guide](https://nuxt.com/docs/getting-started/deployment)
- [Vercel CLI Documentation](https://vercel.com/docs/cli)
- [GitHub Actions Integration](https://vercel.com/docs/deployments/git/vercel-for-github)

## Migration to SSR/Hybrid (Future)

If you need server-side rendering in the future:

1. **Update `nuxt.config.ts`:**
   ```typescript
   export default defineNuxtConfig({
     ssr: true, // or remove this line (SSR is default)
     // ... other config
   });
   ```

2. **Update Vercel Configuration:**
   - Vercel will automatically detect SSR mode
   - Server functions will be deployed to Vercel Edge/Serverless

3. **Re-deploy:**
   - Push changes to trigger new deployment
   - Vercel will deploy with SSR runtime

## Support

For deployment issues:
- **Vercel Support:** [vercel.com/support](https://vercel.com/support)
- **Project Issues:** Open an issue in the project repository
- **Nuxt Community:** [nuxt.com/community](https://nuxt.com/community)

---

**Last Updated:** January 2026
**Build Mode:** Static Site Generation (SSG)
**Platform:** Vercel
