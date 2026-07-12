# osu! Maps Manager

A desktop application and typed CLI for syncing osu!lazer collections, tracking beatmapsets, and restoring missing maps without opening hundreds of browser tabs. The `main` branch ships with an empty manifest so anyone can use it as a clean starting point.

## Install on Windows

Download the latest `osu-maps-manager-*-setup.exe` from [GitHub Releases](https://github.com/riandredev/osu-beatmaps/releases), run the installer, and launch **osu! Maps Manager** from the Start menu or desktop shortcut.

The installed application stores its default writable library under its per-user application data directory. In **Settings**, you can choose a cloned Git repository as the library folder to enable version-controlled Sync and push.

## Setup

Install [Node.js 20+](https://nodejs.org/) and pnpm, then:

```powershell
pnpm install
pnpm check
```

If `pnpm` is not installed, run `npm install --global pnpm`. Corepack is not required.

## Collection workflow

1. Organise maps into any number of collections inside osu!lazer.
2. Fully close osu!lazer.
3. Open the manager and refresh.
4. Open **Collections**, select one or more detected collections, then sync locally or push them to the selected Git repository.
5. Open **Restore** to restore all tracked maps or one remote collection.

Collection names and membership are stored in `beatmaps.json`. Restoring one collection downloads and imports only its beatmaps. The manager does not write collection membership directly into lazer's Realm database; doing so would risk database corruption. Imported maps can be regrouped in-game after import.

For a map found on the website:

```powershell
pnpm dev -- add "https://osu.ppy.sh/beatmapsets/1234567#osu/7654321" --collection repo --push
```

## Desktop manager

Launch the GUI:

```powershell
pnpm gui
```

The desktop manager provides collection sync, installed/missing detection, a bounded download queue, detailed per-map progress, cancellation, three retry attempts, `.part` files, archive validation, skip-existing behaviour, and automatic handoff to osu!lazer. It opens no beatmap browser tabs.

The default **Auto fallback** provider tries rai.moe, Nerinyan, and Catboy in order. It rejects non-archive responses before import. Mirrors are independent community services, are not operated or endorsed by osu!, and may be unavailable or have incomplete content.

For database scans and collection sync, close osu!lazer first. The application starts lazer automatically when it is ready to import downloaded archives.

## Development

```powershell
pnpm install
pnpm check
pnpm gui
```

Alternatively, restore without the GUI:

```powershell
pnpm restore
```

## Commands

| Command                    | Purpose                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `pnpm sync`                | Sync the lazer collection named `repo` from the CLI           |
| `pnpm dev -- add <url...>` | Add one or many website URLs                                  |
| `pnpm restore`             | Download missing maps and import them into lazer              |
| `pnpm verify`              | Validate the versioned manifest and duplicates                |
| `pnpm readme`              | Regenerate the table below                                    |
| `pnpm check`               | Run linting, formatting checks, tests, and a production build |

All mutating commands only push when passed `--push`. Override the lazer database path with `--database` or `OSU_REALM_PATH`.

## Beatmaps

<!-- beatmaps:start -->

| Artist | Title | Collections | Beatmapset |
| ------ | ----- | ----------- | ---------: |

<!-- beatmaps:end -->

## Security and storage

- `.osz`, `.env`, downloads, build output, and dependencies are ignored.
- The lazer database is opened read-only and is never committed.
- No credentials are required for collection sync, validation, or manifest editing.
- Downloads use a configurable community mirror and are validated before import.
- Installed builds never modify files inside the installation directory.
- GitHub Actions runs the full quality check for every push and pull request.
