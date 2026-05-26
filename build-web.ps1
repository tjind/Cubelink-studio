# build-web.ps1 - Copy web assets to dist/ for Capacitor build
$ErrorActionPreference = "Stop"
$dist = "dist"

# 1) Clean dist/
if (Test-Path $dist) { Remove-Item -Recurse -Force $dist }
New-Item -ItemType Directory -Path $dist | Out-Null

# 2) Files & folders to copy
$items = @(
  "index.html", "manifest.json", "sw.js",
  "icon-192.png", "icon-512.png", "icon-maskable-512.png", "apple-touch-icon.png",
  "css", "js", "libs", "models"
)

foreach ($item in $items) {
  if (Test-Path $item) {
    Copy-Item -Path $item -Destination $dist -Recurse -Force
    Write-Host "✓ Copied: $item"
  } else {
    Write-Host "⚠ Skipped (not found): $item" -ForegroundColor Yellow
  }
}

Write-Host "`n✅ Build complete. Output: $dist/" -ForegroundColor Green
