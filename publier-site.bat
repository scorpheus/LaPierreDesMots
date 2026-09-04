@echo off
rem ---------------------------------------------------------------------------
rem  Verifie, construit et prepare un commit LOCAL sur la branche gh-pages.
rem  REGLE DURE : ce script ne pousse rien et ne configure jamais GitHub Pages.
rem ---------------------------------------------------------------------------

setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 goto :pas_de_node
where git >nul 2>nul
if errorlevel 1 goto :pas_de_git
if not exist "node_modules\" goto :pas_installe

git diff --quiet
if errorlevel 1 goto :depot_sale
git diff --cached --quiet
if errorlevel 1 goto :depot_sale
for /f "delims=" %%F in ('git ls-files --others --exclude-standard') do goto :depot_sale

echo.
echo   La Pierre des Mots - preparation locale de GitHub Pages
echo   --------------------------------------------------------
echo   Pour lancer le jeu habituel sur ce PC : demarrer.bat
echo.
echo   [1/3] Verification complete du depot...
call npm run verifier
if errorlevel 1 goto :echec

echo.
echo   [2/3] Construction PWA locale, avec les voix et polices de ce PC...
call npm run construire:pwa
if errorlevel 1 goto :echec

echo.
echo   [3/3] Preparation du commit local gh-pages...
call node scripts/preparer-publication-pages.mjs --branche
if errorlevel 1 goto :echec

echo.
echo   [OK] Rien n'a ete envoye a GitHub.
echo.
echo   Avant tout push, annoncer au proprietaire que la commande modifiera
echo   la branche distante gh-pages et declenchera le deploiement Pages.
echo.
echo   Commande exacte, a executer seulement apres son accord explicite :
echo.
echo     git -C bac-a-sable/publication-gh-pages push origin gh-pages:gh-pages
echo.
pause
exit /b 0

:depot_sale
echo.
echo   [X] Le depot porte des changements suivis ou non suivis.
echo       Committer ou ranger le travail avant de preparer une publication.
echo       Les artefacts ignores (audio, polices, dist-pwa) sont autorises.
echo.
pause
exit /b 1

:echec
echo.
echo   [!] La preparation a echoue. Aucun push GitHub n'a ete execute.
echo.
pause
exit /b 1

:pas_de_node
echo   [X] Node.js est introuvable.
pause
exit /b 1

:pas_de_git
echo   [X] Git est introuvable.
pause
exit /b 1

:pas_installe
echo   [X] Les dependances ne sont pas installees. Lancer d'abord npm ci.
pause
exit /b 1
