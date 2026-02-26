@echo off
chcp 65001 >nul
title 📦 roast-me-ai 打包工具

:: ============================================================
::  roast-me-ai 一键打包脚本
::  会同时生成：
::    - roast-me-ai-x.x.x-setup.exe   (NSIS 安装包，支持自定义目录)
::    - roast-me-ai-x.x.x-portable.exe (便携版，无需安装)
::  输出目录：PackageRelease\
:: ============================================================

setlocal enabledelayedexpansion

:: 切换到脚本所在目录（即项目根目录）
cd /d "%~dp0"

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║      roast-me-ai  一键打包工具           ║
echo  ║  输出: NSIS 安装包 + 便携版 EXE          ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ---------- 检查 Node.js ----------
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [错误] 未检测到 Node.js，请先安装 Node.js 后再运行此脚本。
    echo         下载地址: https://nodejs.org/
    pause
    exit /b 1
)

:: ---------- 检查 npm ----------
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo  [错误] 未检测到 npm，请检查 Node.js 安装是否完整。
    pause
    exit /b 1
)

:: ---------- 检查 package.json ----------
if not exist "package.json" (
    echo  [错误] 未找到 package.json，请确认在项目根目录中运行此脚本。
    pause
    exit /b 1
)

:: ---------- 读取版本号 ----------
for /f "tokens=2 delims=:, " %%v in ('findstr /i "\"version\"" package.json') do (
    set RAW_VER=%%v
)
set VERSION=%RAW_VER:"=%
echo  当前版本: v%VERSION%
echo.

:: ---------- 清理旧产物（可选）----------
set CLEAN_OLD=N
set /p CLEAN_OLD= 是否清理 PackageRelease 目录中的旧文件？[y/N]:
if /i "%CLEAN_OLD%"=="y" (
    echo.
    echo  [清理] 正在删除旧的打包文件...
    if exist "PackageRelease" (
        :: 只删除 exe / yml / blockmap，保留其他文件
        del /q "PackageRelease\*.exe" 2>nul
        del /q "PackageRelease\*.yml" 2>nul
        del /q "PackageRelease\*.blockmap" 2>nul
        echo  [清理] 完成。
    )
)

echo.
echo  [步骤 1/2] 检查依赖...
if not exist "node_modules" (
    echo  未找到 node_modules，正在安装依赖（npm install）...
    npm install
    if %errorlevel% neq 0 (
        echo.
        echo  [错误] 依赖安装失败，请检查网络或 npm 配置。
        pause
        exit /b 1
    )
    echo  [完成] 依赖安装成功。
) else (
    echo  [跳过] node_modules 已存在。
)

echo.
echo  [步骤 2/2] 开始打包 Windows 版本（NSIS 安装包 + 便携版）...
echo  这可能需要几分钟，请耐心等待...
echo.

npm run build:win

if %errorlevel% neq 0 (
    echo.
    echo  ══════════════════════════════════════════════
    echo  [失败] 打包过程中发生错误，请查看上方日志。
    echo  ══════════════════════════════════════════════
    pause
    exit /b 1
)

echo.
echo  ══════════════════════════════════════════════════════════
echo  [成功] 打包完成！输出文件位于 PackageRelease\ 目录：
echo.

:: 列出本次生成的 exe 文件
set FOUND=0
for %%f in ("PackageRelease\*.exe") do (
    echo      ✔  %%~nxf
    set FOUND=1
)

if "%FOUND%"=="0" (
    echo      (未检测到 exe 文件，请手动检查 PackageRelease 目录)
)

echo.
echo  ══════════════════════════════════════════════════════════
echo.

:: 询问是否打开输出目录
set OPEN_DIR=Y
set /p OPEN_DIR= 是否打开 PackageRelease 目录？[Y/n]:
if /i not "%OPEN_DIR%"=="n" (
    explorer "PackageRelease"
)

echo.
echo  脚本执行完毕，按任意键退出...
pause >nul
exit /b 0
