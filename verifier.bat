@echo off
rem ---------------------------------------------------------------------------
rem  La Pierre des Mots - verification complete, hors ligne de commande.
rem  Contrat technique v1 section 1.1 et section 8.2, lot L-A.
rem
rem  Enchaine tout (lint, typescript, tests, e2e, visuel, qualite, rejeu) et
rem  ouvre le rapport consolide. AUCUNE etape n'interrompt les suivantes :
rem  on voit tous ses defauts d'un coup, pas seulement le premier.
rem
rem  Le rapport fait foi, pas la sortie brute de cette fenetre.
rem
rem  ASCII pur, voir l'entete de demarrer.bat pour le motif.
rem ---------------------------------------------------------------------------

setlocal
cd /d "%~dp0"

set "RAPPORT=tests\rapports\RAPPORT.md"

echo.
echo   La Pierre des Mots - verification
echo   ---------------------------------
echo.

where node >nul 2>nul
if errorlevel 1 goto :pas_de_node

if not exist "node_modules\" goto :pas_installe

call npm run verifier
set "CODE_VERIF=%ERRORLEVEL%"

echo.
if not exist "%RAPPORT%" goto :pas_de_rapport

echo   Ouverture du rapport : %RAPPORT%
start "" "%RAPPORT%"

if not "%CODE_VERIF%"=="0" goto :en_echec

echo.
echo   Tout est vert.
echo.
exit /b 0

rem ---------------------------------------------------------------------------

:en_echec
echo.
echo   [!] Au moins une etape a echoue. Le detail est dans le rapport
echo       qui vient de s'ouvrir - c'est lui qui fait foi.
echo.
exit /b %CODE_VERIF%

:pas_de_rapport
echo   [X] La verification n'a pas produit %RAPPORT%.
echo       C'est anormal : meme en echec, la chaine doit ecrire son rapport.
echo.
exit /b 1

:pas_de_node
echo   [X] Node.js est introuvable. Telecharger la version LTS sur https://nodejs.org
echo.
pause
exit /b 1

:pas_installe
echo   [X] Les dependances ne sont pas installees.
echo       Lancer d'abord demarrer.bat, ou la commande :  npm ci
echo.
pause
exit /b 1
