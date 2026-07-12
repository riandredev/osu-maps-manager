$ErrorActionPreference = 'Stop'
if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
    throw 'pnpm is required. Install Node.js, then run: npm install --global pnpm'
}
pnpm install --frozen-lockfile
pnpm check
