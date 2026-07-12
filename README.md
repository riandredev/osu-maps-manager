# osu! beatmaps

A typed, cross-platform CLI and versioned manifest for tracking and restoring my favourite osu! beatmapsets. Beatmap archives are deliberately excluded from Git.

## Setup

Install [Node.js 20+](https://nodejs.org/) and pnpm, then:

```powershell
pnpm install
pnpm check
```

If `pnpm` is not installed, run `npm install --global pnpm`. Corepack is not required.

## Everyday workflow (osu!lazer)

1. In osu!, add a beatmap you like to the collection named `repo`.
2. Close osu! if the database is busy.
3. From this repository, run:

```powershell
pnpm sync -- --push
```

The command reads `client.realm` in read-only mode, adds new online beatmapsets, regenerates this table, validates the manifest, commits, and pushes. Omit `--push` to preview the file changes before publishing.

For a map found on the website:

```powershell
pnpm dev -- add "https://osu.ppy.sh/beatmapsets/1234567#osu/7654321" --collection repo --push
```

## Restore after reinstalling

```powershell
git clone https://github.com/riandredev/osu-beatmaps.git
cd osu-beatmaps
pnpm install
pnpm download
```

`download` opens the official authenticated osu! download endpoint for each set. The CLI intentionally does not store login cookies or use unofficial mirrors because osu!'s public API does not provide `.osz` archive downloads.

## Commands

| Command                    | Purpose                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `pnpm sync`                | Sync the lazer collection named `repo`                        |
| `pnpm dev -- add <url...>` | Add one or many website URLs                                  |
| `pnpm download`            | Open official download pages for restoration                  |
| `pnpm verify`              | Validate the versioned manifest and duplicates                |
| `pnpm readme`              | Regenerate the table below                                    |
| `pnpm check`               | Run linting, formatting checks, tests, and a production build |

All mutating commands only push when passed `--push`. Override the lazer database path with `--database` or `OSU_REALM_PATH`.

## Beatmaps

<!-- beatmaps:start -->

| Artist                  | Title                                    | Collections |                                                    Beatmapset |
| ----------------------- | ---------------------------------------- | ----------- | ------------------------------------------------------------: |
| A.SAKA                  | Yosakura Fubuki                          | favourite   |   [858337](https://osu.ppy.sh/beatmapsets/858337#osu/1793794) |
| AK X LYNX ft. Veela     | Virtual Paradise                         | favourite   |   [477725](https://osu.ppy.sh/beatmapsets/477725#osu/1056415) |
| DJ OKAWARI              | Flower Dance                             | favourite   |               [476691](https://osu.ppy.sh/beatmapsets/476691) |
| Feint                   | Horizons (feat. Veela)                   | favourite   |    [288528](https://osu.ppy.sh/beatmapsets/288528#osu/650683) |
| Feint                   | Times Like These (Fracture Design Remix) | favourite   |      [82635](https://osu.ppy.sh/beatmapsets/82635#osu/228607) |
| Hige Driver join. SELEN | Dadadadadadadadadada                     | favourite   |    [206750](https://osu.ppy.sh/beatmapsets/206750#osu/487592) |
| momori                  | Togameru Kage                            | favourite   |      [55926](https://osu.ppy.sh/beatmapsets/55926#osu/184722) |
| Otokaze                 | Kiro -KaeriMichi-                        | favourite   |               [928223](https://osu.ppy.sh/beatmapsets/928223) |
| Soulja Baka             | Soulja Baka                              | favourite   |    [239801](https://osu.ppy.sh/beatmapsets/239801#osu/568290) |
| Stonebank               | Be Alright (feat. EMEL) (Cut Ver.)       | favourite   | [1151309](https://osu.ppy.sh/beatmapsets/1151309#osu/2405790) |
| Yorushika               | Deep Indigo                              | favourite   | [1245222](https://osu.ppy.sh/beatmapsets/1245222#osu/2590064) |
| Yorushika               | Itte.                                    | favourite   |               [985066](https://osu.ppy.sh/beatmapsets/985066) |

<!-- beatmaps:end -->

## Security and storage

- `.osz`, `.env`, downloads, build output, and dependencies are ignored.
- The lazer database is opened read-only and is never committed.
- No credentials are required for collection sync, validation, or manifest editing.
- GitHub Actions runs the full quality check for every push and pull request.
