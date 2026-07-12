$ErrorActionPreference = 'Stop'
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    throw 'pnpm is required. Install Node.js, then run: corepack enable'
}
pnpm install --frozen-lockfile
pnpm check
