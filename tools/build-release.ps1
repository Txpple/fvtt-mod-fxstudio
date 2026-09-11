# Build the release zip for a GitHub release (the sisters' ritual, CLAUDE.md "Release ritual").
#
# ⚠ DO NOT USE Compress-Archive FOR THIS. On Windows PowerShell 5.1 it writes directory
# separators as BACKSLASHES ("scripts\fxstudio.js"), which Node-based extractors treat as one
# literal filename at the archive root — so `esmodules: ["scripts/fxstudio.js"]` points at nothing
# and the module loads as an empty shell. Battle Flow shipped fifteen releases that way before it
# was caught. Entry names are written explicitly, with forward slashes, through ZipArchive.
#
# Usage, from the repo root:
#   powershell -ExecutionPolicy Bypass -File tools/build-release.ps1
#
# Then attach BOTH assets — the zip and a bare copy of module.json:
#   gh release create vX.Y.Z --title "vX.Y.Z - short phrase" --notes-file dist/RELEASE-NOTES.md `
#     dist/fvtt-mod-fxstudio.zip module.json
#
# ⚠ The notes are HAND-WRITTEN in dist/ (gitignored) for a public page. Never point gh at an
# internal document (NEXT-SESSION, BACKLOG, DESIGN) — they hold the working knowledge, not notes.

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$repo = Split-Path -Parent $PSScriptRoot

# THE CHECKS ARE A PRECONDITION OF THE BUILD. A release built from a tree that fails them is not a
# release. There is no skip flag on purpose: they take seconds.
Push-Location $repo
try {
  foreach ($check in @("check-imports", "check-layers", "check-legacy", "check-gates", "check-moments", "check-fx")) {
    Write-Output "gate: $check"
    & node (Join-Path $repo "tools/$check.mjs") | Select-Object -Last 1
    if ($LASTEXITCODE -ne 0) { throw "tools/$check.mjs failed - refusing to build a release from this tree" }
  }
} finally {
  Pop-Location
}

$manifest = Get-Content (Join-Path $repo "module.json") -Raw | ConvertFrom-Json
$version = $manifest.version
# The two version fields move together (the ritual): assert they did.
if ($manifest.download -notlike "*/v$version/*") { throw "module.json: version $version but download URL is $($manifest.download) - bump them together" }

# Exactly what ships. Directories are enumerated RECURSIVELY (Battle Flow lost a whole subdirectory
# for a month when its enumeration was not); the read-back below verifies every entry by name.
function Enumerate($dir) {
  $root = Join-Path $repo $dir
  if (-not (Test-Path $root)) { return @() }
  Get-ChildItem $root -Recurse -File | Sort-Object FullName |
    ForEach-Object { "$dir/" + ($_.FullName.Substring($root.Length + 1) -replace "\\", "/") }
}
# scripts/ (the code), styles/, and recipes/ — the corpus the module FETCHES at boot, with the
# GPL-3 stock's own licence and attribution (recipes/STOCK-LICENSE) riding beside it, as ruled.
$contents = @(Enumerate "scripts") + @(Enumerate "styles") + @(Enumerate "recipes") + @("module.json", "LICENSE", "README.md")
if ($contents -notcontains "scripts/fxstudio.js") { throw "scripts/fxstudio.js (the esmodules entry) is missing" }
if ($contents -notcontains "recipes/STOCK-LICENSE") { throw "recipes/STOCK-LICENSE is missing - the GPL-3 stock cannot ship without its licence" }

$outDir = Join-Path $repo "dist"
if (-not (Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir | Out-Null }
$zip = Join-Path $outDir "fvtt-mod-fxstudio.zip"
if (Test-Path $zip) { Remove-Item $zip -Force }

$fs = [System.IO.File]::Open($zip, [System.IO.FileMode]::Create)
$archive = New-Object System.IO.Compression.ZipArchive($fs, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($name in $contents) {
    $source = Join-Path $repo ($name -replace "/", "\")
    if (-not (Test-Path $source)) { throw "missing release file: $name" }
    [void][System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
      $archive, $source, $name, [System.IO.Compression.CompressionLevel]::Optimal)
  }
} finally {
  $archive.Dispose()
  $fs.Dispose()
}

# Read it back: the separators survived, nothing asked for is missing, and every relative import
# inside a packed script resolves to something ALSO in the archive.
$check = [System.IO.Compression.ZipFile]::OpenRead($zip)
try {
  $names = $check.Entries | ForEach-Object { $_.FullName }
  $bad = $names | Where-Object { $_ -like "*\*" }
  if ($bad) { throw "backslash separators in: $($bad -join ', ') - do not ship this" }
  $missing = $contents | Where-Object { $names -notcontains $_ }
  if ($missing) { throw "missing from archive: $($missing -join ', ')" }

  $entrySet = @{}
  foreach ($n in $names) { $entrySet[$n] = $true }
  $dangling = @()
  foreach ($n in ($names | Where-Object { $_ -like "*.js" })) {
    $dir = $n.Substring(0, $n.LastIndexOf("/"))
    $body = Get-Content (Join-Path $repo ($n -replace "/", "\")) -Raw
    foreach ($m in [regex]::Matches($body, "(?:from|import)\s+'(\.[^']+)'")) {
      $stack = New-Object System.Collections.ArrayList
      foreach ($part in (($dir + "/" + $m.Groups[1].Value) -split "/")) {
        if ($part -eq "." -or $part -eq "") { continue }
        elseif ($part -eq "..") { if ($stack.Count) { $stack.RemoveAt($stack.Count - 1) } }
        else { [void]$stack.Add($part) }
      }
      $target = $stack -join "/"
      if (-not $entrySet.ContainsKey($target)) { $dangling += "$n -> $target" }
    }
  }
  if ($dangling) { throw "imports that resolve to nothing in the archive: $($dangling -join '; ')" }
  Write-Output "fvtt-mod-fxstudio v$version -> $zip"
  Write-Output ("{0:N0} bytes, {1} entries, forward slashes verified, every import resolves inside the archive" -f (Get-Item $zip).Length, $names.Count)
} finally {
  $check.Dispose()
}
