# osu! beatmaps

My portable list of favourite osu! beatmaps. This repository tracks metadata and links only; `.osz` archives are deliberately excluded so the repo stays small.

## Restore after a fresh install

1. Clone this repository.
2. Run `powershell -ExecutionPolicy Bypass -File .\scripts\Open-Beatmaps.ps1 -Download`.
3. Sign in to osu! if prompted and download each opened beatmapset.
4. Open the downloaded `.osz` files to import them into osu!.

Run without `-Download` to open the beatmap information pages instead. Filter a future category with `-Tag warmup`, for example.

## Beatmaps

| Artist | Title | Beatmapset |
| --- | --- | ---: |
| Stonebank | Be Alright (feat. EMEL) (Cut Ver.) | [1151309](https://osu.ppy.sh/beatmapsets/1151309#osu/2405790) |
| AK X LYNX ft. Veela | Virtual Paradise | [477725](https://osu.ppy.sh/beatmapsets/477725#osu/1056415) |
| Yorushika | Deep Indigo | [1245222](https://osu.ppy.sh/beatmapsets/1245222#osu/2590064) |
| momori | Togameru Kage | [55926](https://osu.ppy.sh/beatmapsets/55926#osu/184722) |
| Hige Driver join. SELEN | Dadadadadadadadadada | [206750](https://osu.ppy.sh/beatmapsets/206750#osu/487592) |
| Feint | Horizons (feat. Veela) | [288528](https://osu.ppy.sh/beatmapsets/288528#osu/650683) |
| Otokaze | Kiro -KaeriMichi- | [928223](https://osu.ppy.sh/beatmapsets/928223) |
| A.SAKA | Yosakura Fubuki | [858337](https://osu.ppy.sh/beatmapsets/858337#osu/1793794) |
| Soulja Baka | Soulja Baka | [239801](https://osu.ppy.sh/beatmapsets/239801#osu/568290) |
| Feint | Times Like These (Fracture Design Remix) | [82635](https://osu.ppy.sh/beatmapsets/82635#osu/228607) |
| Yorushika | Itte. | [985066](https://osu.ppy.sh/beatmapsets/985066) |
| DJ OKAWARI | Flower Dance | [476691](https://osu.ppy.sh/beatmapsets/476691) |

## Add a beatmap

Add an object to `beatmaps.json`, keeping the numeric beatmapset ID from the osu! URL. Use `tags` for categories such as `favourite`, `warmup`, `aim`, or `stream`, then run:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\Test-Manifest.ps1
```

Do not commit `.osz` files, login cookies, API keys, or `.env` files.

