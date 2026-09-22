$ErrorActionPreference = 'Stop'
$projectPath = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectPath
$learnerPython = Join-Path $projectPath '.learning-venv/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $learnerPython)) { throw '먼저 SETUP-LEARNING.cmd를 실행하세요.' }
$siteUrl = Read-Host '사이트 주소 (https://로 시작하는 주소)'
& $learnerPython (Join-Path $PSScriptRoot 'runner.py') --site $siteUrl
if ($LASTEXITCODE -ne 0) { throw '학습 실행기 종료: 위 오류를 확인하세요.' }
