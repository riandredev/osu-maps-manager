$ErrorActionPreference = 'Stop'
$manifest = Join-Path $PSScriptRoot '..\beatmaps.json'
$beatmaps = Get-Content -LiteralPath $manifest -Raw | ConvertFrom-Json

$required = 'setId', 'artist', 'title', 'tags'
foreach ($beatmap in $beatmaps) {
    foreach ($field in $required) {
        if ($null -eq $beatmap.$field -or $beatmap.$field -eq '') {
            throw "Beatmap entry is missing '$field': $($beatmap | ConvertTo-Json -Compress)"
        }
    }
}

$duplicates = $beatmaps | Group-Object setId | Where-Object Count -gt 1
if ($duplicates) {
    throw "Duplicate set IDs: $($duplicates.Name -join ', ')"
}

Write-Host "Manifest is valid: $(@($beatmaps).Count) unique beatmap sets."
