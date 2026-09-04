@echo off
rem ---------------------------------------------------------------------------
rem  Publication GitHub Pages en deux temps.
rem
rem    publier-site.bat --preparer   : tests + build + commit LOCAL gh-pages
rem    publier-site.bat --publier    : push + Action Pages + recette distante
rem
rem  Le second mode ne doit etre lance qu apres l accord explicite du proprietaire.
rem  Pour jouer normalement sur ce PC, utiliser demarrer.bat.
rem ---------------------------------------------------------------------------

setlocal EnableDelayedExpansion
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto :pas_de_node
where git >nul 2>nul
if errorlevel 1 goto :pas_de_git
if not exist "node_modules\" goto :pas_installe

if "%~1"=="" (
  node scripts/publier-site.mjs --preparer
  set "PIERRE_CODE=!ERRORLEVEL!"
  echo.
  pause
  exit /b !PIERRE_CODE!
)

node scripts/publier-site.mjs %*
exit /b %ERRORLEVEL%

:pas_de_node
echo   [X] Node.js est introuvable.
exit /b 1

:pas_de_git
echo   [X] Git est introuvable.
exit /b 1

:pas_installe
echo   [X] Les dependances ne sont pas installees. Lancer d'abord npm ci.
exit /b 1
