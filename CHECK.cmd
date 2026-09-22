@echo off
setlocal
cd /d "%~dp0"
call wrangler.cmd deploy --dry-run --keep-vars
set "CHECK_RESULT=%ERRORLEVEL%"
pause
exit /b %CHECK_RESULT%
