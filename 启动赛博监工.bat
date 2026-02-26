@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo    😈 Roast Me AI - 赛博监工启动中...
echo ========================================
echo.
npm run dev
pause
