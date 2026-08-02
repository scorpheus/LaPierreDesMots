@echo off
rem ---------------------------------------------------------------------------
rem  La Pierre des Mots - arret du serveur.
rem  Contrat technique v1 section 1.1, lot L-A.
rem
rem  Le PID est depose par scripts\demarrer.mjs dans donnees\serveur.pid.
rem  Ce fichier ne tue QUE ce PID-la : jamais "tous les node.exe", ce qui
rem  couperait aussi ComfyUI, llama.cpp ou n'importe quel autre outil en cours.
rem
rem  ASCII pur, voir l'entete de demarrer.bat pour le motif.
rem ---------------------------------------------------------------------------

setlocal
cd /d "%~dp0"

set "FICHIER_PID=donnees\serveur.pid"

if not exist "%FICHIER_PID%" goto :pas_de_pid

set "PID="
for /f "usebackq tokens=1 delims= " %%P in ("%FICHIER_PID%") do set "PID=%%P"

if "%PID%"=="" goto :pid_illisible

echo.
echo   Arret du serveur (PID %PID%)...

tasklist /FI "PID eq %PID%" 2>nul | find "%PID%" >nul
if errorlevel 1 goto :deja_arrete

taskkill /PID %PID% /T /F >nul 2>nul
if errorlevel 1 goto :arret_rate

del "%FICHIER_PID%" >nul 2>nul
echo   Serveur arrete.
echo.
echo   Pour rejouer : double-cliquer sur demarrer.bat
echo.
exit /b 0

rem ---------------------------------------------------------------------------

:pas_de_pid
echo.
echo   Aucun serveur en cours : %FICHIER_PID% n'existe pas.
echo   Rien a arreter.
echo.
echo   Pour lancer le jeu : double-cliquer sur demarrer.bat
echo.
exit /b 0

:pid_illisible
echo.
echo   [X] %FICHIER_PID% existe mais ne contient pas de PID lisible.
echo       Le fichier va etre supprime ; relancer demarrer.bat si besoin.
echo.
del "%FICHIER_PID%" >nul 2>nul
exit /b 1

:deja_arrete
echo   Le processus %PID% n'existe plus - le serveur etait deja arrete.
del "%FICHIER_PID%" >nul 2>nul
echo.
echo   Pour relancer le jeu : double-cliquer sur demarrer.bat
echo.
exit /b 0

:arret_rate
echo.
echo   [X] Impossible d'arreter le processus %PID%.
echo       Il appartient peut-etre a une autre session Windows.
echo       Fermer la fenetre du serveur, ou utiliser le Gestionnaire des taches.
echo.
echo       Ensuite, pour rejouer : double-cliquer sur demarrer.bat
echo.
exit /b 1
