# XIZOAHUB CODE — Advanced (Client-side IDE)

This repo provides a lightweight but advanced client-side IDE: Monaco editor, file explorer, run/preview, local persistence, import/export and PWA support.

## Features
- Multi-file editor with Monaco (CDN)
- Explorer (create/delete/open files)
- Run preview (iframe srcdoc)
- Save to LocalStorage
- Export/Import project JSON
- PWA: service worker + manifest
- Simple password lock (see `js/config.js`)

## Quick start (GitHub + Vercel)
1. Create a new GitHub repo and push these files.
2. Sign in to Vercel and import the repo.
3. Deploy (no build step required — static).
4. Open deployed URL.

## Local testing
Just serve with any static server:
```bash
# using Python 3
python -m http.server 8000
# open http://localhost:8000
