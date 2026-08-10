@echo off
rem ---------------------------------------------------------------------------
rem  La Pierre des Mots - construction de l'APK Android autonome (hors ligne).
rem  Docs\addendum-portage-android.md, paragraphe 6quater (Lot 5).
rem
rem  Enchaine : construction du paquet partage, construction du client en mode
rem  autonome (dist-autonome\), synchronisation Capacitor, puis Gradle en mode
rem  debug. Le JDK 21 qu'exige @capacitor-community/sqlite est cherche dans
rem  outils\jdk-21\, jamais installe globalement (decision D9) ; local.properties
rem  (jamais versionne, propre a chaque machine) est regenere a chaque lancement.
rem
rem  ASCII pur, voir l'entete de demarrer.bat pour le motif.
rem ---------------------------------------------------------------------------

setlocal
cd /d "%~dp0"

echo.
echo   La Pierre des Mots - construction de l'APK
echo   -------------------------------------------
echo.

where node >nul 2>nul
if errorlevel 1 goto :pas_de_node

if not exist "node_modules\" goto :pas_installe

if not exist "outils\jdk-21\bin\java.exe" goto :pas_de_jdk
set "JAVA_HOME=%~dp0outils\jdk-21"

if defined ANDROID_HOME (
  set "SDK_ANDROID=%ANDROID_HOME%"
) else (
  set "SDK_ANDROID=%LOCALAPPDATA%\Android\Sdk"
)
if not exist "%SDK_ANDROID%\platform-tools\" goto :pas_de_sdk

if not exist "client\android\" goto :pas_de_projet_android
> "client\android\local.properties" echo sdk.dir=%SDK_ANDROID:\=\\%

echo   [1/3] Construction du paquet partage...
call npm run construire -w @pierre/partage
if errorlevel 1 goto :echec

echo.
echo   [2/3] Construction du client en mode autonome...
call npm run construire:autonome -w @pierre/client
if errorlevel 1 goto :echec

echo.
echo   [3/3] Synchronisation Capacitor et construction Gradle (peut prendre une
echo         a deux minutes la premiere fois)...
pushd "%~dp0client"
call npx cap sync android
if errorlevel 1 goto :echec_popd
popd

rem --- cd /d en chemin ABSOLU, et ".\gradlew.bat" (jamais le nom nu) : sur une
rem     machine ou "NoDefaultCurrentDirectoryInExePath" est pose (durcissement
rem     de securite, verifie present dans cet environnement de construction),
rem     cmd.exe ne cherche PLUS le repertoire courant pour un nom nu et rend
rem     "gradlew.bat n'est pas reconnu" - un chemin explicite reste toujours
rem     resolu, que la variable soit posee ou non.
cd /d "%~dp0client\android"
call .\gradlew.bat assembleDebug --console=plain
set "CODE_GRADLE=%ERRORLEVEL%"
cd /d "%~dp0"
if not "%CODE_GRADLE%"=="0" goto :echec

echo.
echo   APK construit :
echo   client\android\app\build\outputs\apk\debug\app-debug.apk
echo.
echo   Pour l'installer sur une tablette branchee en USB (debogage USB active
echo   dans les options developpeur) :
echo     "%SDK_ANDROID%\platform-tools\adb.exe" install -r client\android\app\build\outputs\apk\debug\app-debug.apk
echo.
exit /b 0

rem ---------------------------------------------------------------------------

:echec_popd
popd
:echec
echo.
echo   [!] La construction a echoue. Le detail est plus haut dans cette fenetre.
echo.
pause
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

:pas_de_jdk
echo   [X] Java 21 est introuvable dans outils\jdk-21\
echo       @capacitor-community/sqlite l'exige pour compiler la partie Android
echo       native ; le JDK 17 d'Android Studio ne suffit pas.
echo       Telecharger "Eclipse Temurin 21, JDK, Windows x64, .zip" sur
echo       https://adoptium.net et l'extraire dans outils\jdk-21\ (ce dossier
echo       doit contenir bin\java.exe directement, pas un sous-dossier de plus).
echo.
pause
exit /b 1

:pas_de_sdk
echo   [X] Le SDK Android est introuvable ("%SDK_ANDROID%").
echo       Installer Android Studio (https://developer.android.com/studio), qui
echo       installe le SDK au meme endroit ; ou poser la variable d'environnement
echo       ANDROID_HOME sur un SDK deja installe ailleurs.
echo.
pause
exit /b 1

:pas_de_projet_android
echo   [X] client\android\ n'existe pas dans cette copie du depot.
echo       Ce dossier est normalement suivi par git (contrairement a ses
echo       artefacts de build) : verifier que le depot est a jour, ou le
echo       recreer une fois avec, depuis client\ :  npx cap add android
echo.
pause
exit /b 1
