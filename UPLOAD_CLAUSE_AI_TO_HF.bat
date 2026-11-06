@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where py >nul 2>nul
if errorlevel 1 (
  echo Python 3.10+ is required.
  pause
  exit /b 1
)
py -3 -m pip install --upgrade huggingface_hub datasets requests
py -3 -m pip install --upgrade huggingface_hub
echo.
echo Sign in to Hugging Face if you have not already:
hf auth login
echo.
echo Uploading the existing offline corpus ZIP...
py -3 datasets\clause-ai\importer\download_offline.py --workdir ClauseAI-Offline --skip-download --upload-to-hub
pause
