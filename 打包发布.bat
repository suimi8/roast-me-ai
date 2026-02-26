@echo off
title roast-me-ai Build + Release

:: ============================================================
::  roast-me-ai - Build + Auto Publish GitHub Release
::  Steps:
::    1. Check env (Node.js / GitHub CLI)
::    2. npm run build:win  ->  setup.exe + portable.exe
::    3. Create GitHub Release  (tag = v<version>)
::    4. Upload exe files to Release
:: ============================================================

setlocal enabledelayedexpansion

cd /d "%~dp0"

echo.
echo  ================================================
echo      roast-me-ai  Build + GitHub Release
echo  ================================================
echo.

:: -------------------------------------------------
::  Read version from package.json
:: -------------------------------------------------
for /f "tokens=2 delims=:, " %%v in ('findstr /i "\"version\"" package.json') do (
    set RAW_VER=%%v
)
set VERSION=%RAW_VER:"=%
set TAG=v%VERSION%
echo  Version : %TAG%
echo  GitHub  : https://github.com/suimi8/roast-me-ai
echo.

:: -------------------------------------------------
::  Check Node.js
:: -------------------------------------------------
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERROR] Node.js not found. Please install: https://nodejs.org/
    pause & exit /b 1
)
echo  [OK] Node.js found
echo.

:: -------------------------------------------------
::  Check / Install GitHub CLI
:: -------------------------------------------------
where gh >nul 2>&1
if %errorlevel% neq 0 (
    echo  [INFO] GitHub CLI not found. Installing via winget...
    echo.
    winget install --id GitHub.cli -e --silent
    if %errorlevel% neq 0 (
        echo.
        echo  [ERROR] GitHub CLI install failed.
        echo         Please install manually: https://cli.github.com/
        pause & exit /b 1
    )
    echo.
    echo  [OK] GitHub CLI installed.
    echo  [INFO] Please close this window and run the script again.
    pause & exit /b 0
)
echo  [OK] GitHub CLI found
echo.

:: -------------------------------------------------
::  Check GitHub login
:: -------------------------------------------------
gh auth status >nul 2>&1
if %errorlevel% neq 0 (
    echo  ================================================
    echo  [AUTH] Not logged in. Opening browser for login...
    echo  ================================================
    echo.
    gh auth login --web -h github.com
    :: gh auth login --web sometimes returns non-zero even on success.
    :: Re-verify with gh auth status instead of trusting the exit code.
    gh auth status >nul 2>&1
    if %errorlevel% neq 0 (
        echo  [ERROR] GitHub login failed. Please run 'gh auth login' manually.
        pause & exit /b 1
    )
    echo  [OK] GitHub login successful.
    echo.
) else (
    echo  [OK] GitHub already logged in
    echo.
)

:: -------------------------------------------------
::  Clean old artifacts (optional)
:: -------------------------------------------------
set CLEAN_OLD=N
set /p CLEAN_OLD=Clean old exe files in PackageRelease? [y/N]:
echo.
if /i "%CLEAN_OLD%"=="y" (
    if exist "PackageRelease" (
        del /q "PackageRelease\*.exe" 2>nul
        del /q "PackageRelease\*.yml" 2>nul
        del /q "PackageRelease\*.blockmap" 2>nul
        echo  [OK] Cleaned.
        echo.
    )
)

:: -------------------------------------------------
::  Install dependencies if needed
:: -------------------------------------------------
if not exist "node_modules" (
    echo  [Step 1/3] Installing npm dependencies...
    npm install
    if %errorlevel% neq 0 (
        echo  [ERROR] npm install failed.
        pause & exit /b 1
    )
    echo  [OK] Dependencies installed.
    echo.
) else (
    echo  [Step 1/3] node_modules exists, skipping install.
    echo.
)

:: -------------------------------------------------
::  Build Windows packages
:: -------------------------------------------------
echo  [Step 2/3] Building Windows packages (NSIS + Portable)...
echo  This may take a few minutes...
echo.

npm run build:win

if %errorlevel% neq 0 (
    echo.
    echo  ================================================
    echo  [FAILED] Build error. Check logs above.
    echo  ================================================
    pause & exit /b 1
)

echo.
echo  [OK] Build complete. Collecting files...

set EXE_LIST=
set FOUND=0
for %%f in ("PackageRelease\*.exe") do (
    set EXE_LIST=!EXE_LIST! "%%f"
    echo      + %%~nxf
    set FOUND=1
)

if "%FOUND%"=="0" (
    echo  [ERROR] No exe found in PackageRelease. Build may have failed.
    pause & exit /b 1
)
echo.

:: -------------------------------------------------
::  Publish GitHub Release
:: -------------------------------------------------
echo  [Step 3/3] Publishing GitHub Release %TAG%...
echo.

gh release view %TAG% >nul 2>&1
if %errorlevel% equ 0 (
    echo  [INFO] Release %TAG% already exists.
    set OVERWRITE=N
    set /p OVERWRITE=Delete existing release and re-publish? [y/N]:
    echo.
    if /i "!OVERWRITE!"=="y" (
        echo  Deleting old release %TAG%...
        gh release delete %TAG% --yes --cleanup-tag
        echo  [OK] Old release deleted.
        echo.
    ) else (
        echo  [INFO] Keeping existing release. Uploading files only...
        goto :upload
    )
)

:: Input release notes
set RELEASE_NOTES=
set /p RELEASE_NOTES=Enter release notes (press Enter to skip):
echo.

if "%RELEASE_NOTES%"=="" (
    set RELEASE_NOTES=roast-me-ai %TAG%
)

echo  Creating release %TAG%...
gh release create %TAG% ^
    --title "roast-me-ai %TAG%" ^
    --notes "%RELEASE_NOTES%" ^
    --repo suimi8/roast-me-ai

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Failed to create release. Check network and GitHub permissions.
    pause & exit /b 1
)

:upload
echo.
echo  Uploading exe files...
gh release upload %TAG% %EXE_LIST% ^
    --repo suimi8/roast-me-ai ^
    --clobber

if %errorlevel% neq 0 (
    echo.
    echo  [ERROR] Upload failed. Check network and retry.
    pause & exit /b 1
)

:: -------------------------------------------------
::  Done
:: -------------------------------------------------
echo.
echo  ================================================
echo  [SUCCESS] Release published!
echo.
echo    https://github.com/suimi8/roast-me-ai/releases/tag/%TAG%
echo.
echo  ================================================
echo.

set OPEN_PAGE=Y
set /p OPEN_PAGE=Open release page in browser? [Y/n]:
if /i not "%OPEN_PAGE%"=="n" (
    start "" "https://github.com/suimi8/roast-me-ai/releases/tag/%TAG%"
)

echo.
echo  Done. Press any key to exit...
pause >nul
exit /b 0
