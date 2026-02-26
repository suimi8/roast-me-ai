@echo off
title roast-me-ai Build + Release

setlocal enabledelayedexpansion

cd /d "%~dp0"

set GH="C:\Program Files\GitHub CLI\gh.exe"

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
echo  Repo    : https://github.com/suimi8/roast-me-ai
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

:: -------------------------------------------------
::  Check GitHub CLI
:: -------------------------------------------------
if not exist %GH% (
    where gh >nul 2>&1
    if %errorlevel% neq 0 (
        echo  [INFO] GitHub CLI not found. Installing via winget...
        winget install --id GitHub.cli -e --silent
        echo  [INFO] Please close and reopen this window, then run again.
        pause & exit /b 0
    )
    set GH=gh
)
echo  [OK] GitHub CLI found
echo.

:: -------------------------------------------------
::  Check GitHub login
:: -------------------------------------------------
%GH% auth status >nul 2>&1
if %errorlevel% neq 0 (
    echo  ================================================
    echo  [AUTH] Not logged in. Opening browser for login...
    echo  ================================================
    echo.
    %GH% auth login --web -h github.com
    %GH% auth status >nul 2>&1
    if %errorlevel% neq 0 (
        echo  [ERROR] GitHub login failed. Run 'gh auth login' manually.
        pause & exit /b 1
    )
)
echo  [OK] GitHub logged in
echo.

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
    echo  [Step 1/3] node_modules OK, skipping install.
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
echo  [OK] Build complete. Verifying output files...

set SETUP_EXE=
set PORTABLE_EXE=
for %%f in ("PackageRelease\*-setup.exe") do set SETUP_EXE=%%~ff
for %%f in ("PackageRelease\*-portable.exe") do set PORTABLE_EXE=%%~ff

if "%SETUP_EXE%"=="" (
    echo  [ERROR] setup.exe not found in PackageRelease.
    pause & exit /b 1
)
if "%PORTABLE_EXE%"=="" (
    echo  [ERROR] portable.exe not found in PackageRelease.
    pause & exit /b 1
)

echo      + %SETUP_EXE%
echo      + %PORTABLE_EXE%
echo.

:: -------------------------------------------------
::  Publish GitHub Release
:: -------------------------------------------------
echo  [Step 3/3] Publishing GitHub Release %TAG%...
echo.

%GH% release view %TAG% --repo suimi8/roast-me-ai >nul 2>&1
if %errorlevel% equ 0 (
    echo  [INFO] Release %TAG% already exists.
    set OVERWRITE=N
    set /p OVERWRITE=Delete and re-publish? [y/N]:
    echo.
    if /i "!OVERWRITE!"=="y" (
        echo  Deleting old release %TAG%...
        %GH% release delete %TAG% --yes --cleanup-tag --repo suimi8/roast-me-ai
        echo  [OK] Old release deleted.
        echo.
    ) else (
        echo  [INFO] Uploading to existing release...
        goto :upload
    )
)

:: Input release notes
set RELEASE_NOTES=roast-me-ai %TAG%
set /p RELEASE_NOTES=Enter release notes (Enter to use default):
echo.

echo  Creating release %TAG%...
%GH% release create %TAG% ^
    --title "roast-me-ai %TAG%" ^
    --notes "%RELEASE_NOTES%" ^
    --repo suimi8/roast-me-ai

if %errorlevel% neq 0 (
    echo  [ERROR] Failed to create release.
    pause & exit /b 1
)
echo  [OK] Release created.
echo.

:upload
echo  Uploading setup installer...
%GH% release upload %TAG% "%SETUP_EXE%" --repo suimi8/roast-me-ai --clobber
if %errorlevel% neq 0 (
    echo  [ERROR] Failed to upload setup.exe
    pause & exit /b 1
)
echo  [OK] setup.exe uploaded.

echo  Uploading portable executable...
%GH% release upload %TAG% "%PORTABLE_EXE%" --repo suimi8/roast-me-ai --clobber
if %errorlevel% neq 0 (
    echo  [ERROR] Failed to upload portable.exe
    pause & exit /b 1
)
echo  [OK] portable.exe uploaded.

:: -------------------------------------------------
::  Done
:: -------------------------------------------------
echo.
echo  ================================================
echo  [SUCCESS] Both files uploaded to GitHub Release!
echo.
echo    %TAG% : setup + portable
echo    https://github.com/suimi8/roast-me-ai/releases/tag/%TAG%
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
