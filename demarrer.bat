@echo off
rem ---------------------------------------------------------------------------
rem  La Pierre des Mots - lancement pour jouer.
rem  Contrat technique v1 section 1.1, lot L-A. Decision D3 : HTTP simple,
rem  pas de certificat, pas de Docker.
rem
rem  Ce fichier est volontairement ecrit SANS ACCENTS et en ASCII pur : cmd.exe
rem  lit un .bat avec la page de code courante de la console, et un accent
rem  s'affiche alors en charabia sur une machine sur deux. Tous les messages
rem  soignes sont dans scripts\demarrer.mjs, que Node affiche correctement.
rem ---------------------------------------------------------------------------

setlocal
cd /d "%~dp0"

echo.
echo   La Pierre des Mots
echo   ------------------
echo.

rem --- 1. Node est-il la ?
where node >nul 2>nul
if errorlevel 1 goto :pas_de_node

rem --- 2. Les dependances sont-elles installees ?
if not exist "node_modules\" call :installer
if errorlevel 1 goto :installation_ratee

rem --- 3. Le reste se passe dans Node : compilation si besoin, serveur, IP LAN, QR.
node scripts\demarrer.mjs %*
if errorlevel 1 goto :lancement_rate

goto :fin

rem ---------------------------------------------------------------------------

:installer
echo   Premiere installation des dependances.
echo   Tout s'installe dans node_modules\, rien ailleurs sur la machine.
echo   Cela peut prendre une a deux minutes. A ne faire qu'une fois.
echo.
if exist "package-lock.json" goto :installer_ci
call npm install
exit /b %ERRORLEVEL%

:installer_ci
call npm ci
exit /b %ERRORLEVEL%

rem ---------------------------------------------------------------------------

:pas_de_node
echo.
echo   [X] Node.js est introuvable sur cette machine.
echo.
echo       La Pierre des Mots a besoin de Node 24 ou plus recent
echo       (le socle utilise node:sqlite, integre depuis Node 24).
echo.
echo       Telecharger la version LTS sur  https://nodejs.org
echo       puis relancer ce fichier. Il n'y a rien d'autre a installer.
echo.
pause
exit /b 1

:installation_ratee
echo.
echo   [X] L'installation des dependances a echoue.
echo.
echo       Verifier la connexion internet : c'est la seule etape qui en a besoin.
echo       Le jeu lui-meme fonctionne entierement hors-ligne.
echo.
pause
exit /b 1

:lancement_rate
echo.
echo   [X] Le lancement a echoue. Le detail est affiche au-dessus.
echo.
pause
exit /b 1

:fin
echo.
echo   Serveur arrete.
echo.
endlocal
exit /b 0
