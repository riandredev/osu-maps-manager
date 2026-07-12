[CmdletBinding()]
param(
    [string]$Tag,
    [switch]$Download
)

$ErrorActionPreference = 'Stop'
$manifest = Join-Path $PSScriptRoot '..\beatmaps.json'
$beatmaps = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json

if ($Tag) {
    $beatmaps = @($beatmaps | Where-Object { $_.tags -contains $Tag })
}

if (-not $beatmaps) {
    Write-Error "No beatmaps matched the requested tag."
}

foreach ($beatmap in $beatmaps) {
    $url = "https://osu.ppy.sh/beatmapsets/$($beatmap.setId)"
    if ($Download) { $url += '/download' }
    Start-Process $url
    Start-Sleep -Milliseconds 250
}

Write-Host "Opened $(@($beatmaps).Count) beatmap page(s)."

