#!/usr/bin/env sh
set -eu
command -v pnpm >/dev/null 2>&1 || { echo 'pnpm is required. Install Node.js, then run: npm install --global pnpm' >&2; exit 1; }
pnpm install --frozen-lockfile
pnpm check
