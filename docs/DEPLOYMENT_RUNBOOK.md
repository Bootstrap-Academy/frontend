# Deployment Runbook: `develop` -> `latest` -> `prod`

Last executed on **February 11, 2026**.

This workflow ships changes from `origin/develop` to production by first updating `origin/latest`, then merging into `prod/prod`.

## Prerequisites

- Remote `origin` points to `https://github.com/Bootstrap-Academy/frontend.git`
- Remote `prod` points to `https://github.com/Bootstrap-Academy/frontend-prod.git`

## Exact Steps

```bash
# 1) Add the prod remote (one-time setup)
git remote add prod https://github.com/Bootstrap-Academy/frontend-prod.git

# 2) Fetch latest refs
git fetch origin --prune
git fetch prod --prune

# 3) Fast-forward latest from origin/develop
git switch -c latest --track origin/latest   # if local branch does not exist yet
# otherwise: git switch latest
git merge --ff-only origin/develop
git push origin latest:latest

# 4) Merge latest into prod/prod
git switch -c prod --track prod/prod         # if local branch does not exist yet
# otherwise: git switch prod
git merge origin/latest
```

## Conflict Handling (as seen on 2026-02-11)

During `origin/latest -> prod/prod`, there was one conflict in `nuxt.config.ts`.

Resolution:

- Keep the **production values** (not test values) in `runtimeConfig.public`, especially:
  - `BASE_API_URL=https://api.bootstrap.academy`
  - `BASE_WEB_URL=https://bootstrap.academy`
  - existing `Gleap_API_KEY`

Then continue:

```bash
git add nuxt.config.ts
git commit -m "Merge origin/latest into prod/prod"
git push prod prod:prod
git switch develop
```

## Verification

```bash
git ls-remote --heads origin latest
git ls-remote --heads prod prod
```

Result on 2026-02-11:

- `origin/latest` at `200fc0d`
- `prod/prod` at `5f560c2` (merge commit)
