@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  echo Python 3.10+ is required. Install it from https://www.python.org/downloads/
  pause
  exit /b 1
)
py -3 -m pip install --upgrade pip
py -3 -m pip install datasets huggingface_hub requests
if errorlevel 1 (
  echo Dependency installation failed.
  pause
  exit /b 1
)
py -3 datasets\clause-ai\importer\download_offline.py --records-per-source 1000000
if errorlevel 1 (
  echo Download or merge failed. See the error above.
  pause
  exit /b 1
)
echo.
echo Done. Your offline archive is in ClauseAI-Offline\ClauseAI-Offline-Data.zip
pause
