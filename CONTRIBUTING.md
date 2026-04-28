# Contributing

Thanks for the interest in Miro.

This repository is public for review, but it is **not** run as an open-source contribution funnel.

## What is welcome

- reproducible bug reports
- documentation corrections
- small clarity fixes
- technical questions backed by concrete evidence

## What is not the default path

- drive-by feature PRs
- product-direction rewrites
- reuse requests disguised as contributions
- deployments or forks presented as if they were official

## Before opening an issue

1. Check the live product: [https://ai-blogersite.vercel.app/](https://ai-blogersite.vercel.app/)
2. Check the release proof:
   - [docs/launch-checklist.md](docs/launch-checklist.md)
   - [docs/SMOKE_REPORT.md](docs/SMOKE_REPORT.md)
3. Check whether the problem is already explained in:
   - [README.md](README.md)
   - [SUPPORT.md](SUPPORT.md)
   - [SECURITY.md](SECURITY.md)

## Local verification

```bash
npm install
npm run typecheck
npm run build
```

## Pull requests

External PRs are reviewed selectively.

If you submit one, keep it:

- narrow in scope
- evidence-backed
- build-safe
- aligned with the current product direction

PRs that expand the product surface without coordination may be closed.
