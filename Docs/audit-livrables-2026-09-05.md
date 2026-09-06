# Audit des livrables audio, PWA et Android — 5 septembre 2026

## Méthode et limite

Audit de fichiers et de scripts, sans build, test global, installation, publication ni accès au
site distant. Les nombres ci-dessous sont ceux présents dans l'arbre de travail le 5 septembre ;
ils ne prouvent pas que GitHub Pages ou une tablette ont reçu une nouvelle version.

**Lecture du bilan :** cet inventaire initial est conservé comme historique. La section
« Recette réelle et reconstruction » en fin de document le remplace pour l'état du lot.

## Audio de production

L'état local source est cohérent : `contenu/audio/` contient **889 Opus + un manifeste**
(7 214 557 octets). Les 673 entrées de `contenu/audio/manifeste.json` existent toutes, et leur
ensemble est exactement celui des 673 clips de `production/voix.lock.json`. Le verrou du
4 septembre à 21:34 UTC déclare 666 objets recensés, 368 clés de consigne couvertes, 0 refus et
le contrôle `faster-whisper/large-v3/cpu-int8`.

Il ne faut cependant pas confondre ce poste de production avec un clone : `.gitignore` ignore
tout `contenu/audio/`, et `git ls-files` ne contient que `production/voix.lock.json`. Le verrou
nomme les fichiers et leurs empreintes, mais ne contient aucun octet Opus. Un clone neuf peut donc
lancer le repli silencieux prévu par l'application, mais ne peut ni fabriquer ni livrer les voix
de production sans recopier `contenu/audio/` depuis le poste producteur ou exécuter la chaîne TTS.
Cette distinction doit rester explicite pour tout build à remettre à un enfant.

Deuxième mesure : 216 des 889 Opus (2 017 688 octets) ne sont plus référencés par le manifeste.
Ils sont ignorés par Git, mais le glob autonome `contenu/audio/**/*.opus` les embarque. Une
prochaine construction APK/PWA peut donc les réintroduire dans le paquet sans les rendre jouables.
La correction à prévoir est une garde qui échoue sur un Opus orphelin, suivie d'un nettoyage
contrôlé par le rendu des voix ; ne pas supprimer ces fichiers à la main pendant les campagnes.

## PWA : sortie locale et livraison publiée

La sortie locale `client/dist-pwa/` et le worktree `gh-pages` concordent sur la version
`9f8f443a14509441`, préparée depuis le commit source `cfb544fbc871` du 4 septembre à 20:08
(1 617 fichiers, 213 112 818 octets). La branche principale est désormais à `1d5a637`, soit quatre
commits plus loin. Cette sortie est donc historique, pas le livrable de l'état actuel.

Le décalage est également mesurable dans les voix : le manifeste PWA a 674 clips, alors que le
manifeste source courant en a 673. Il manque dans la PWA `mot/milieu` normal/syllabe et `mot/tapis`
normal/syllabe ; elle conserve à la place `galeries-frise-chrono-01/c4` normal, `mot/gland` normal/
syllabe et `mot/grande` normal/syllabe. Tous les fichiers référencés par chaque manifeste existent
dans leur propre sortie : c'est une obsolescence de livrable, non un lien brisé détectable par une
simple existence de fichier.

La chaîne de publication est saine sur ce point : `publier-site.bat --preparer` vérifie les six
polices locales, le manifeste audio et chaque clip avant la campagne puis le build. Elle est la
seule porte de livraison qui transforme l'absence d'audio ignoré en échec explicite. En revanche,
`npm run construire:pwa` ou `tester-pwa.bat` seuls peuvent encore produire/servir une PWA muette
sur un clone incomplet : ils ne lancent pas cette précondition.

## Android : APK et actifs embarqués

Le seul APK présent est `client/android/app/build/outputs/apk/debug/app-debug.apk` : 20 031 302
octets, daté du 10 août, `versionCode 1`, `versionName 1.0`. Il est antérieur aux livrables audio,
PWA et responsive actuels et ne doit pas être proposé comme APK de recette.

Les actifs Capacitor actuellement synchronisés (`client/android/app/src/main/assets/public/`) sont
datés du 1er septembre et contiennent 473 Opus, contre les 673 clips du manifeste de production
actuel. Cela établit que le prochain APK doit être reconstruit puis testé en mode avion ; il ne
s'agit pas seulement d'un doute fondé sur la date de l'APK.

`construire-apk.bat` enchaîne correctement build autonome, `cap sync` puis `assembleDebug`, mais
ne contrôle ni les polices ni `contenu/audio/` avant de construire. Comme les glob Vite acceptent
un répertoire audio vide, un clone neuf peut générer un APK techniquement réussi mais sans boutons
de voix. Correction applicative/outillage exacte à planifier : extraire la vérification non
mutante des artefacts locaux (polices, manifeste audio, tous les clips) dans une commande commune,
puis l'appeler avant `construire-apk.bat`, `npm run construire:pwa` et `tester-pwa.bat`. Le chemin
`publier-site.bat --preparer` la possède déjà, mais trop tard pour les deux autres chemins.

## Mémoire de projet et actions restantes

`Docs/etat-courant-et-file.md`, daté du 5 septembre, porte déjà la bonne décision : la PWA doit
être refaite et republiée après les modifications. `Docs/bilan-recette-exercices-2026-09-03.md`
dit au contraire que l'audio est hors verdict ; c'est un bilan historique, à étiqueter comme tel
ou à relier explicitement à l'état courant pour qu'il ne soit pas repris comme statut actuel.

Après la campagne qualité en cours, sans concurrence avec elle :

```powershell
# Recette locale PWA dans un profil persistant, puis contrôle manuel OPFS/hors-ligne.
.\tester-pwa.bat

# Prépare localement, relance l'unique vérification et reconstruit gh-pages. Aucun push.
.\publier-site.bat --preparer

# Après annonce exacte et accord explicite du propriétaire uniquement.
.\publier-site.bat --publier

# Reconstruit l'APK depuis les actifs courants, puis recette appareil en mode avion.
.\construire-apk.bat
```

La recette APK reste celle de l'addendum Android : installation, création/relecture de profil,
un exercice et absence de réseau réelle. La recette PWA reste celle du contrat GitHub Pages :
persistance OPFS, fermeture/réouverture, hors-ligne, route profonde, second onglet et
export/import. Aucune de ces preuves n'a été régénérée par cet audit.

## Garde commune de ressources locales

Le contrôle non mutant est désormais exporté par
`scripts/verifier-ressources-locales.mjs`. Son interface principale est
`verifierRessourcesLocales(racine)` ; son interface en ligne de commande est :

```powershell
node scripts/verifier-ressources-locales.mjs
```

L'orchestrateur l'a intégré aux commandes racine `construire:autonome`, `construire:pwa`, à
`construire-apk.bat` et à la chaîne `verifier`. La préparation GitHub Pages réemploie le même
module par `scripts/preparer-publication-pages.mjs` ; `scripts/publier-site.mjs` n'a pas été modifié.

Le succès exige simultanément :

- les six fichiers WOFF2 nommés par le contrat, présents et non vides ;
- un `contenu/audio/manifeste.json` et un `production/voix.lock.json` lisibles ;
- la même date de génération, le même moteur TTS et le même ensemble unique `(cle, rendu)` dans
  ces deux fichiers ;
- pour chaque clip, l'égalité exacte du locuteur, du fichier, de l'empreinte de texte, de la durée
  et du score QC entre manifeste et verrou ;
- un chemin `audio/**/*.opus` contenu sous `contenu/`, un fichier présent et non vide, et une
  taille sur disque égale au champ `octets` du manifeste ;
- aucun Opus présent sur disque mais absent du manifeste.

Le dernier critère a rendu visibles les **216 Opus orphelins mesurés**. L'arbitrage du 5 septembre
les conserve hors du glob embarqué dans une archive récupérable, sans suppression. Cette mutation
n'est possible qu'avec le drapeau explicite :

```powershell
node scripts/verifier-ressources-locales.mjs --archiver-orphelins
```

Sans ce drapeau, le vérificateur reste strictement non mutant. Avec lui, il exécute d'abord tout le
prévol des polices, du manifeste, du verrou et des clips référencés ; une anomalie autre qu'un
orphelin interdit tout déplacement. Il valide chaque source sous `contenu/audio/` et chaque
destination sous `bac-a-sable/archives-audio-2026-09-05/`, prépare toutes les destinations avant
le premier déplacement et refuse tout écrasement.

L'opération autorisée a déplacé **216 fichiers, 2 017 688 octets** vers
`bac-a-sable/archives-audio-2026-09-05/fichiers/contenu/audio/`. Le fichier
`bac-a-sable/archives-audio-2026-09-05/manifeste.json` en donne la liste complète avec chemin
source, chemin d'archive, taille et SHA-256. La vérification indépendante de l'archive mesure
216 destinations présentes, zéro source résiduelle, zéro empreinte ou taille divergente. Le
prévol qui suit est vert : 6 polices, 673 clips manifestés et 673 fichiers Opus.

La restauration est réversible fichier par fichier : vérifier que le chemin `source` est libre,
puis replacer le fichier porté par `destination` vers `source` et contrôler son SHA-256 d'après le
manifeste. L'archive vit dans `bac-a-sable/`, reste locale et n'entre ni dans Git ni dans un build.

Sur un clone neuf, l'échec nomme les ressources absentes et indique les deux voies de remise en
état : recopier `contenu/audio/` depuis le poste producteur ou relancer la chaîne voix, et lancer
`scripts/telecharger-polices.mjs` pour les polices. Il ne télécharge rien automatiquement : rendre
le clone auto-installable ou versionner ces binaires est hors du périmètre de cette garde et reste
une décision distincte.

## Recette réelle et reconstruction

Le 5 septembre, le jeu LAN a été reconstruit puis relancé sur `0.0.0.0:8080`, sans toucher aux
profils de `donnees/`. L'adresse LAN mesurée est `192.168.1.19`. Le build PWA corrigé
`a9623abbea875c03` contient 1 436 fichiers, 208 337 680 octets au total et 14 636 049 octets
préchargés. Aucun push ni changement GitHub n'a été effectué pendant ce lot.

La première vraie partie dans le build autonome a trouvé un défaut ignoré par la recette
historique limitée aux profils : après la réussite, les URL `monde/gobi-stades.json` et
`monde/regions.json` retombaient sur `/api/`. Les imports JSON comme objets ne créaient pas leurs
URL dans le dépôt autonome. Le nouveau test d'inventaire a d'abord rougi sur les cinq fichiers
du monde, puis passe après ajout du glob `monde/*.json`. Le contrôle des 339 visuels est conservé.

Recette persistante réussie sur la nouvelle version : un placement `clairiere-04` terminé par
des taps natifs, tentative réellement écrite dans SQLite, fermeture/réouverture avec journal et
progression identiques, refus du second onglet écrivain, export/import et refus atomique du
faux fichier, rechargement des profils hors ligne, route profonde avec recherche et fragment
conservés après rafraîchissement. Zéro requête `/api/`, zéro erreur de page. Deux anciennes
tentatives du même profil Chromium ont survécu au remplacement du build.

Le service worker ne force pas `skipWaiting` : le nouveau build installé attend la fermeture
des anciens onglets. Le test ferme et rouvre le contexte, vérifie le nom exact du nouveau
module JavaScript et compare le journal avant/après. Aucun effacement de cache ou d'OPFS ne
doit être utilisé pour simuler cette migration.

La recette est maintenant conservée dans `scripts/qa/recette-pwa-complete.mjs`, avec un pilote
de vrais gestes dans `scripts/qa/jouer-exercice-pwa.mjs`, et appelée par `npm run qa:pwa`.
Son profil Chromium est restreint à `bac-a-sable/profil-recette-*` ; elle ajoute un joueur QA
neuf par défaut et conserve les précédents pour vérifier les mises à jour. Elle ne remplace
pas la campagne des 76 exercices : son pilote de démarrage couvre placement, coloriage et tri.

### Dernier livrable PWA et correctifs autonomes

Cette mesure remplace celle du build `a9623abbea875c03` ci-dessus. Le dernier build local est
**`98306bf5aa6d0400`**, 1 436 fichiers, 208 337 688 octets et 14 636 057 octets préchargés.
Le module servi est `/LaPierreDesMots/assets/index-BLTOum6v.js`.

`qa:pwa` termine puis rejoue `clairiere-04` hors ligne, décode et joue réellement un clip Opus
de 1,7658 s, vérifie deux nouvelles tentatives persistantes et la conservation des cinq anciennes
tentatives du profil Chromium pendant la mise à jour. Fermeture, onglet concurrent, export/import,
refus atomique d'un faux import, route profonde et rafraîchissement passent ; zéro `/api/` et
zéro erreur de page. Journal : `bac-a-sable/qa-finition-2026-09-05/pwa-complete-final.log`.

Trois corrections sont couvertes séparément : les cinq JSON `monde/*.json` sont maintenant
indexés par URL en plus de leur import objet ; les moteurs `place` et `colorie` appliquent la
réécriture commune aux images internes de leurs SVG ; la recette attend le vrai SVG illustré,
pas seulement le moteur de repli qui le précède. Les deux tests des décors autonomes ont d'abord
échoué sur les anciennes URL, puis les 50 tests des deux moteurs sont devenus verts.

### APK reconstruite et recette native

- Livrable debug : `client/android/app/build/outputs/apk/debug/app-debug.apk`.
- Taille : **214 265 034 octets** ; version 1 / 1.0, signature debug locale, pas une release store.
- SHA-256 : `3109BFC1B3AA25ED878CF04AE5A7732CDDA9DA04E2BAC161544B1F322A5A43C6`.
- Ancien APK conservé : `bac-a-sable/qa-finition-2026-09-05/apk-avant-finition.apk`.
- Construction : `build-autonome.log`, `gradle-apk-final.log`, 126 tâches, succès en 11 s pour
  le dernier assemblage. Les 673 clips et ressources courantes sont synchronisés par Capacitor.

Le SDK Android préexistant et le JDK local `outils/jdk-21` ont été employés. La distribution
Gradle 8.14.3 et ses modules déjà disponibles ont été copiés sous `outils/gradle-recette/`, sans
installation globale ni nouvelle dépendance. Depuis `client/android`, avec `JAVA_HOME` pointant
sur le JDK du dépôt et `GRADLE_USER_HOME` sur `outils/gradle-recette/cache` :

```powershell
../../outils/gradle-recette/gradle-8.14.3/bin/gradle.bat assembleDebug --offline --no-daemon --max-workers=1 --console=plain -Dandroid.builder.sdkDownload=false
```

Le premier essai à quatre travailleurs a échoué sur le renommage d'une transformation de cache ;
la cause système n'est pas établie. Le second à un travailleur réussit sans effacer le cache.

L'APK est installée seulement dans `Medium_Phone_API_36`, émulateur lancé avec `-read-only`,
`-no-window`, `-no-snapshot`, `-no-audio`, port 5554. Wi-Fi et données mobiles coupés : un placement
et un tri sont terminés avec des touchers natifs ; les deux tentatives restent après arrêt et
relance de l'application. Aucune donnée de la tablette de l'enfant n'a été touchée. L'émulateur
isolé et son transfert de port de recette ont été arrêtés après les mesures ; 8080 reste actif.

La commande maintenue `npm run qa:apk` exige l'émulateur 5554 et contrôle `ro.kernel.qemu`.
Lancer au préalable un émulateur isolé avec l'APK courant, jamais le profil Android de la famille.
Elle crée un joueur QA neuf à chaque passage, conserve les précédents et rejoue un moteur de
démarrage. Sa dernière exécution passe sur le placement, avec une nouvelle tentative conservée
après relance : `recette-apk-maintenable.log`. Elle ne remplace pas la campagne des 76 moteurs.

Un défaut propre au rechargement JavaScript a été trouvé : le registre du wrapper
`SQLiteConnection` repartait vide alors que le plugin natif gardait sa connexion ouverte.
L'ouverture partage maintenant le wrapper et appelle `checkConnectionsConsistency()` avant
réutilisation/création. Les deux gardes dédiées ont échoué avant correction puis passent, sans
aucun appel à `deleteDatabase`. API employée :
[documentation du plugin SQLite](https://github.com/capacitor-community/sqlite/blob/master/docs/APIConnection.md).

**Limite de persistance explicite :** une requête SQL brute peut voir une tentative dans la
transaction encore ouverte. La recette passe donc par la lecture publique sérialisée avant
l'arrêt, puis compare après relance. Elle prouve la persistance **après commit**, pas la reprise
d'un arrêt forcé entre l'affichage du Bravo et ce commit. La mise en file durable avant écriture
reste à concevoir et tester ; ne pas masquer ce volet derrière le vert de la recette.

Aucune nouvelle version n'a été publiée sur GitHub. Les validations de contenu, d'animations et
la refonte pédagogique du tapis restent dans la file courante.
