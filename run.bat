@echo off
setlocal

cd /d "%~dp0"

if not exist "node_modules" (
  echo [Miro] Installing dependencies...
  call npm install
  if errorlevel 1 exit /b %errorlevel%
)

echo [Miro] Starting Next.js dev server...
call npm run dev
