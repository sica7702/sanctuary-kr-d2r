@echo off
setlocal
cd /d "%~dp0"
where wrangler.cmd >nul 2>nul
if errorlevel 1 (
  echo Wrangler is not installed. Run: npm.cmd install -g wrangler
  pause
  exit /b 1
)
echo Sanctuary v136: tests, backup, additive DB migration, then deployment.
echo Existing data and secrets are retained. Validated AI may automate review.
choice /M "Proceed with this production deployment"
if errorlevel 2 exit /b 0
call npm.cmd test
if errorlevel 1 goto failed
call wrangler.cmd deploy --dry-run --keep-vars
if errorlevel 1 goto failed
set "BACKUP_FILE=backup-before-v136-%RANDOM%-%RANDOM%.sql"
if exist "%BACKUP_FILE%" goto failed
call wrangler.cmd d1 export sanctuary-d2r-db --remote --output "%BACKUP_FILE%"
if errorlevel 1 goto failed
call wrangler.cmd d1 execute sanctuary-d2r-db --remote --file migrations\0136_neural_learning.sql
if errorlevel 1 goto failed
call wrangler.cmd deploy --keep-vars
if errorlevel 1 goto failed
echo Deployment complete. Read the guide, then run SETUP-LEARNING.cmd.
pause
exit /b 0
:failed
echo Stopped after an error. Do not continue until the error is resolved.
pause
exit /b 1
