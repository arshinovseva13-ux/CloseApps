param([string]$Target = (Join-Path $HOME ".claude/skills"))
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
New-Item -ItemType Directory -Force -Path $Target | Out-Null
Get-ChildItem $Root -Directory | ForEach-Object { $src=$_.FullName; if (Test-Path (Join-Path $src "SKILL.md")) { $dst=Join-Path $Target $_.Name; New-Item -ItemType Directory -Force -Path $dst | Out-Null; Copy-Item (Join-Path $src "SKILL.md") $dst -Force; if (Test-Path (Join-Path $src "TESTS.md")) { Copy-Item (Join-Path $src "TESTS.md") $dst -Force } } }
Write-Host "Installed skills to $Target"
