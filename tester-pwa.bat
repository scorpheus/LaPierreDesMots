@echo off
rem ---------------------------------------------------------------------------
rem  Construit puis sert la PWA sous le meme sous-chemin que GitHub Pages.
rem  Le serveur reste au premier plan ; Ctrl+C l'arrete.
rem ---------------------------------------------------------------------------

setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto :pas_de_node
if not exist "node_modules\" goto :pas_installe

echo.
echo   [1/2] Construction locale de la PWA...
echo   Pour lancer le jeu habituel sur ce PC : demarrer.bat
call npm run construire:pwa
if errorlevel 1 goto :echec

echo.
echo   [2/2] Serveur de recette GitHub Pages...
call npm run servir:pwa
if errorlevel 1 goto :echec
exit /b 0

:echec
echo.
echo   [!] La recette PWA a echoue. Le detail est plus haut.
pause
exit /b 1

:pas_de_node
echo   [X] Node.js est introuvable.
pause
exit /b 1

:pas_installe
echo   [X] Les dependances ne sont pas installees. Lancer d'abord npm ci.
pause
exit /b 1
