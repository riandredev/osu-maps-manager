<p align="center">
  <img src="assets/app-icon.png" width="112" alt="osu! Maps Manager icon">
</p>

<h1 align="center">osu! Maps Manager</h1>

<p align="center">
  Sync osu!lazer collections, keep a portable beatmap manifest, and restore missing maps without opening hundreds of browser tabs.
</p>

<p align="center">
  <a href="https://github.com/riandredev/osu-maps-manager/releases/latest"><img src="https://img.shields.io/github/v/release/riandredev/osu-maps-manager?style=flat-square" alt="Latest release"></a>
  <a href="https://github.com/riandredev/osu-maps-manager/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/riandredev/osu-maps-manager/ci.yml?branch=main&style=flat-square&label=CI" alt="CI status"></a>
  <img src="https://img.shields.io/badge/platform-Windows-7b5cff?style=flat-square" alt="Windows">
</p>

<!-- beatmaps:start -->
<div align="center">
  <p>🎧 <strong>Your beatmap library is ready</strong></p>
  <p>Connect your fork in the app, then sync a lazer collection to fill this space.</p>
</div>
<!-- beatmaps:end -->

## What it does

|     | Feature                                                                          |
| --- | -------------------------------------------------------------------------------- |
| 🎵  | Detects every collection in your local osu!lazer installation                    |
| ☁️  | Syncs selected collections into a version-controlled manifest                    |
| 📦  | Restores all maps or one remote collection at a time                             |
| ✅  | Validates downloaded OSZ archives before importing them                          |
| 🔁  | Falls back across rai.moe, Nerinyan, and Catboy when a provider is unavailable   |
| 🔒  | Opens lazer's Realm database read-only and never stores osu! credentials         |
| ⬆️  | Prompts when a newer app version is available and installs it after confirmation |

The `main` branch intentionally contains an empty beatmap manifest, so forks and fresh installs start clean.

## Install

1. Open the [latest GitHub Release](https://github.com/riandredev/osu-maps-manager/releases/latest).
2. Download `osu-maps-manager-*-setup.exe`.
3. Run the installer.
4. Launch **osu! Maps Manager** from the Start menu or desktop shortcut.

Windows SmartScreen may warn about the installer because this community project does not yet have a commercial code-signing certificate.

## First-time setup

### Option A: local-only library

The application creates an empty writable library automatically. This is enough for local collection sync and restoration, but **Sync and push** remains disabled because the folder is not a Git repository.

### Option B: fork and connect the repository (recommended)

Use this when you want remote backup and push support:

1. Sign in to GitHub and select **Fork** at the top of this repository.
2. Keep the default `main` branch. Your fork begins with an empty beatmap library.
3. Open **Settings** in the app.
4. Enter your fork URL: `https://github.com/YOUR_USERNAME/osu-maps-manager.git`.
5. Enter `main` as the branch.
6. Select **Connect repository**.

The manager clones or updates that branch into its per-user application-data directory and makes it the active library.

You can also select an existing local clone with **Choose existing folder**.

## Sync collections

1. Create and manage collections normally inside osu!lazer.
2. Fully close osu!lazer so its local database can be read safely.
3. Open **Collections** in the manager and select **Refresh**.
4. Select one or more detected collections.
5. Choose:
   - **Sync locally** to update only `beatmaps.json`.
   - **Sync and push** to update, commit, and push a connected Git repository.

You need only **one fork for your entire library**. Collection names and membership are stored alongside each beatmapset in the same `beatmaps.json`, allowing any number of collections to share a map without duplicating it. For example, one map can belong to both `favourites` and `warmup`.

Syncing a selected collection replaces that collection's membership in the manifest while leaving every unselected collection untouched.

## Application updates

Installed builds check GitHub Releases shortly after startup and every four hours while running. When a newer version exists, the app asks before downloading it and asks again before restarting to install it. Development builds do not check for updates.

## Restore maps

1. Fully close osu!lazer.
2. Open **Restore**.
3. Choose all remote collections or one specific collection.
4. Leave **Auto fallback** enabled unless troubleshooting a provider.
5. Select **Download and import**.

The app downloads only missing maps by default, shows per-map progress, retries failures, validates each archive, and then hands completed files to osu!lazer for import.

> The manager restores the maps belonging to a collection, but it does not write collection membership directly into lazer's Realm database. Direct writes could corrupt the game database. Regroup imported maps inside lazer when needed.

## Troubleshooting

### “The selected library folder is not a Git repository”

The active library is local-only. Open **Settings** and connect a GitHub repository, or continue using **Sync locally**.

### “No tracked beatmaps matched this restore”

The active manifest is empty. Connect the correct repository and branch in **Settings**, or sync a local collection first.

### Collections are not detected

Fully exit osu!lazer and select **Refresh**. The game keeps `client.realm` open while running.

### A mirror returns JSON or an invalid file

Use **Auto fallback**. The manager rejects non-archive responses and tries the next provider automatically.

## Development

Requirements: Node.js 20+, pnpm, Git, and Windows for installer builds.

```powershell
git clone https://github.com/riandredev/osu-maps-manager.git
cd osu-maps-manager
pnpm install
pnpm check
pnpm gui
```

Build the Windows installer:

```powershell
pnpm package:win
```

Tagged versions are packaged by GitHub Actions and published automatically under Releases.

## Contributing

Issues and pull requests are welcome. Fork the repository, create a focused branch, run
`pnpm check`, and describe the behaviour your change adds or fixes.

## License

osu! Maps Manager is open-source software licensed under the [MIT License](LICENSE).

## CLI commands

| Command                    | Purpose                                                           |
| -------------------------- | ----------------------------------------------------------------- |
| `pnpm sync`                | Sync the lazer collection named `repo`                            |
| `pnpm dev -- add <url...>` | Add one or more beatmapset URLs                                   |
| `pnpm restore`             | Download missing maps and import them into lazer                  |
| `pnpm verify`              | Validate the manifest and detect duplicate IDs                    |
| `pnpm readme`              | Regenerate the beatmap table                                      |
| `pnpm check`               | Run linting, formatting checks, tests, and TypeScript compilation |
