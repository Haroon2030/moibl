@echo off
chcp 65001 >nul
set DJANGO_ENV=development
set PYTHONUTF8=1
set PYTHONDONTWRITEBYTECODE=1
"%~dp0.venv\Scripts\python.exe" "%~dp0api\manage.py" runserver 127.0.0.1:8010
