param([string]$PythonPath, [switch]$CPU)
$ErrorActionPreference = 'Stop'
$projectPath = Split-Path $PSScriptRoot -Parent
Set-Location -LiteralPath $projectPath
if (-not $PythonPath) {
  $bundledPython = Join-Path $env:USERPROFILE '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe'
  if (Test-Path -LiteralPath $bundledPython) { $PythonPath = $bundledPython }
  else { $PythonPath = 'python' }
}
& $PythonPath -c "import sys; assert (3,11) <= sys.version_info[:2] <= (3,13), 'Python 3.11~3.13 is required'"
if ($LASTEXITCODE -ne 0) { throw 'Python 3.11~3.13을 설치하거나 -PythonPath로 지정하세요.' }
& $PythonPath -m venv '.learning-venv'
if ($LASTEXITCODE -ne 0) { throw '가상환경 생성 실패' }
$learnerPython = Join-Path $projectPath '.learning-venv/Scripts/python.exe'
$wheelIndex = if ($CPU) {'https://download.pytorch.org/whl/cpu'} else {'https://download.pytorch.org/whl/cu128'}
& $learnerPython -m pip install 'torch==2.9.1' --index-url $wheelIndex
if ($LASTEXITCODE -ne 0) { throw 'PyTorch 설치 실패' }
& $learnerPython -m pip install -r (Join-Path $PSScriptRoot 'requirements.txt')
if ($LASTEXITCODE -ne 0) { throw '학습 라이브러리 설치 실패' }
& $learnerPython -c "import torch; print('GPU available:', torch.cuda.is_available()); print('PyTorch:', torch.__version__)"
Write-Host '설치 완료. START-LEARNING.cmd를 실행하세요. 자동 시작 등록은 하지 않았습니다.'
