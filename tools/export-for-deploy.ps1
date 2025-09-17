param(
  [string]$OutDir = "deploy-export"
)

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location (Join-Path $root "..")

New-Item -Force -ItemType Directory $OutDir | Out-Null

# AI
$aiOut = Join-Path $OutDir "ai"
New-Item -Force -ItemType Directory $aiOut | Out-Null
Copy-Item -Recurse -Force backend\ai\* $aiOut
Copy-Item backend\ai\DEPLOY.md $aiOut -Force

# API
$apiOut = Join-Path $OutDir "api"
New-Item -Force -ItemType Directory $apiOut | Out-Null
Copy-Item -Recurse -Force backend\api\* $apiOut
Copy-Item backend\api\DEPLOY.md $apiOut -Force

# Frontend
$feOut = Join-Path $OutDir "frontend"
New-Item -Force -ItemType Directory $feOut | Out-Null
Copy-Item -Recurse -Force frontend\* $feOut
Copy-Item frontend\DEPLOY.md $feOut -Force

Write-Host "Export complete: $OutDir\{ai,api,frontend}"
