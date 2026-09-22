# Réalisation de la réhabilitation

Contrat partagé du 14 septembre 2026. Le parent a demandé de démarrer et d'aller jusqu'au bout.
Il confirme que seuls l'orchestrateur et ses sous-agents travaillent sur le dépôt.
Les choix produit sont fixés dans [le plan](plan-rehabilitation-site.md), sections 3 et 10.
La première présentation au parent doit couvrir l'ensemble reconstruit ; aucun visa de prototype.

## Base et conservation

- Base Git : `9946abf`. Branche de réalisation : `codex/rehabilitation-interface`.
- Référence avant écritures : `bac-a-sable/rehabilitation-2026-09-14/reference-initiale/`.
  Copies des fichiers modifiés/non suivis avec SHA-256 vérifiés, diff binaire et commit d'origine.
- Assets et sauvegardes restent en place. Le lot PWA F0 est inclus dans la référence.
- Aucun commit, push ou installation par les sous-agents. Un seul détenteur des builds/suites :
  l'orchestrateur. Les sous-agents livrent leurs changements et le cas ciblé à vérifier.

## Responsabilités de la première vague

| Responsable | Fichiers possédés | Résultat |
|---|---|---|
| Monde | `client/src/ecrans/EcranCarte.tsx`, nouveaux composants `client/src/monde/carte/`, `client/src/styles/carte.css` | Monde immersif, vue région distincte, étape conseillée et lieux acquis revisitables, contrats et progression préservés |
| Campement | `client/src/ecrans/EcranCampement.tsx`, `EcranCoffre.tsx`, `EcranProfils.tsx`, nouveaux composants `client/src/monde/campement/`, styles `campement.css`, `collections.css`, `profils.css` | Entrée immersive, objets interactifs, départ/reprise, collections et profils cohérents |
| Activités | `client/src/ecrans/EcranNoeud.tsx`, `EcranRecompense.tsx`, `EcranChaudron.tsx`, nouveaux composants `client/src/composants/activite/`, styles `activites.css`, `recompenses.css` | Hôte lisible, scène bornée selon l'espace, commandes accessibles, récompense et jeu libre cohérents |
| Orchestrateur | `global.css`, `Application.tsx`, `routeur.tsx`, état/navigation, écrans et composants parent, PWA/sauvegarde, tests, documentation | Socle commun nettoyé, entrée campement, persistance/reprise, intégration et contrôles réels |

Les noms de fichiers d'écran dans le tableau sont relatifs à `client/src/ecrans/` lorsqu'abrégés.
Un besoin hors propriété se signale, sans écrire dans le fichier d'un autre.

Après livraison initiale du campement, le même sous-agent reçoit les fichiers parent :
`EcranDashboard.tsx`, `EcranCodeParent.tsx`, `EcranGalerieParent.tsx`, `EcranReglagesLecture.tsx`,
`EcranOuverture.tsx`, ainsi que `styles/parent.css` et `styles/ouverture.css`.
L'orchestrateur conserve routeur, sauvegardes, logique, tests et styles globaux.

## Contrat d'intégration

- React/TypeScript et services existants. Aucune bibliothèque nouvelle, migration de framework
  ou changement de règle pédagogique. Lire le fichier pertinent, pas l'historique du projet.
- Réutiliser les assets et textes/audio déjà validés. Pas de contenu généré ni changement de
  palette, identifiants d'assets, références visuelles/rejeu ou sauvegarde familiale.
- Chaque écran importe sa feuille spécialisée. `global.css` sera réduit par l'orchestrateur
  au socle commun et aux styles fonctionnels partagés : ne pas y ajouter de correctifs.
- Une seule composition par écran avec dispositions adaptées portrait/paysage, pas deux écrans
  dupliqués. Garder des classes de famille explicites et stables ; retirer les styles inline
  de structure devenus inutiles. Les styles dynamiques (géométrie des objets, palette) restent locaux.
- Préserver les points d'entrée, propriétés injectées des tests, noms accessibles et prises
  `data-*` quand leur sens reste vrai. Ne pas conserver un attribut qui ment au rendu.
- Garder les fonctions réelles : audio, Gobi, navigation, aide gratuite, objets, collections,
  réglages, contenus, seuils de progression. Aucun écran décoratif avec actions factices.
- Réponse du sous-agent : fichiers, comportement concret, hypothèses/contrats à surveiller,
  tests ciblés recommandés. Pas de build/test concurrent et pas de rapport volumineux.

## État et preuves

R0 : référence locale vérifiée. R1–R3 : écrans intégrés, qualification en cours. Les captures,
logs et mesures vont dans `bac-a-sable/rehabilitation-2026-09-14/`.

| Écran ou famille | Construction active | Preuve acquise le 14 septembre ; reste à qualifier |
|---|---|---|
| Profils | `profils.css`, entrée au campement | 11 tests composants ; en-têtes validés dans la matrice de 12 formats |
| Campement et coffre | `campement.css`, `collections.css`, géométrie illustrée conservée | 23 tests campement, parcours réel téléphone et tablette ; en-têtes validés |
| Monde et région | `carte/`, `carte.css`, parchemin et chemin | 22 tests carte ; parcours réel et revisite ; revue navigateur PC, tablette et téléphone |
| Les 14 moteurs | `EnteteActivite`, `CadreSceneActivite`, `activites.css`, `moteurs.css` | 28 contrôles de composition/rotation et lecture agrandie réussis |
| Coloriages | Plateau de hauteur naturelle, même dessin/masques/loupe | 25 tests de repères au doigt sur 4 formats, déplacement loupe et noir rendu réussis |
| Récompense | `DetailEtoiles`, `recompenses.css` | 30 composants, 6 cas sauvegarde ; 9 cas du dernier geste, 15 cas de file durable |
| Parent et introduction | `parent.css`, `ouverture.css` | Migration intégrée ; exploration des 16 cas et 21 tests de navigation réussis |
| PWA | Cache F0 conservé, même port SQLite | Nouvelle recette du livrable intégré encore à exécuter |

Logs ciblés : `parcours-5.log` (2/2), `composition-moteurs-1.log` (28/28),
`coloriages-reperes-1.log` (25/25), `sauvegarde-tests-1.log` (66/66).
Ces contrôles ne valent pas campagne complète : celle-ci reste à lancer après gel de l'intégration.

La reprise durable conserve une réussite avant transport et attend l'ACK avant tout crédit local.
Une génération du profil (migration 012, zéro pour l'existant, incrément atomique au reset)
empêche une ancienne tentative différée de ressusciter des acquis effacés. Les deux ports la
contrôlent dans la transaction avant recherche d'idempotence. L'import suspend la file avant
remplacement ; un import interrompu reste signalé à l'espace parent, sans rejeu ambigu.
La tentative terminée est conservée synchroniquement au dernier geste, avant le calcul SHA
asynchrone et avant l'écran de récompense. Une erreur de stockage reste visible et réessayable.
L'accusé doit correspondre à l'identité et au résultat conservés avant retrait de la file.
Après un reset, l'hôte relit la génération réelle du profil avant tout nouveau départ.

La revue responsive a supprimé les causes communes de débordement : ligne vide dans la grille
compacte du campement, double contrainte de hauteur sur coloriage/placement, largeur minimale
des grilles du parent imposée par un long chemin de fichier. Les 14 moteurs passent leur famille
de composition ; les 89 écrans passent les trois lots tablette portrait/paysage. Le premier lot
téléphone passe après correction du parent ; les autres lots seront couverts par la campagne finale.
Les mesures sont celles de Chromium aux dimensions d'appareils, pas une qualification physique
de la Galaxy Tab familiale. Aucun asset, masque de coloriage ou seuil de test n'a été remplacé.

### Campagne finale engagée à 16 h le 14 septembre

`verification-finale-1.log` : 2 806/2 806 tests passent, aucun ignoré ; lint, TypeScript,
contenus, ressources, cohérence et ancrages QA passent. Le nouveau raccord de réinitialisation
passe aussi ses 32 contrôles ciblés (`reset-integration-2.log`). La campagne navigateur continue.
L'audit des 75 activités a isolé un défaut : sur PC 1920 × 1080 et tablette 1920 × 1200,
les six coloriages dimensionnent encore le dessin par la largeur, ce qui repousse palette/Gobi
sous la fenêtre. Correctif limité au cadre des grands formats à intégrer après cette campagne,
puis rejouer cet audit et la famille coloriage/loupe ; ne pas modifier ses assertions.
Les captures historiques de carte peuvent diverger avec la reconstruction : références conservées,
différences à examiner ; elles ne seront pas remplacées automatiquement pour annoncer un vert.

La revue de la première tranche et la migration des autres écrans restent internes ; le parent
voit la version complète à la clôture, avec les preuves et les limites qui subsistent.

## Livraison anticipée demandée par le parent — 14 septembre, 16 h 10

Le parent demande de rendre la main et de livrer immédiatement. La campagne complète a été
interrompue volontairement pendant l'E2E ; aucun processus Vitest/Playwright de cette campagne
ne reste actif. Aucun correctif supplémentaire non vérifié n'a été ajouté après ce signal.

- Livrable construit : `client/dist-pwa`, version `77456385be2f7f38`,
  module `assets/index-DjLnezI-.js`. Build réussi (`livraison-locale.log`).
- Consultation locale : `http://127.0.0.1:4196/LaPierreDesMots/` ; serveur de recette conservé.
  Après arrêt du serveur, `tester-pwa.bat` reconstruit puis sert sur le port habituel 4175.
- Sources sur `codex/rehabilitation-interface`, modifications non commitées ; référence initiale
  toujours conservée. Aucun push/publication, aucun changement de données familiales.
- Qualification complète **non acquise** : le défaut grand écran des six coloriages décrit
  ci-dessus reste à corriger. La recette PWA finale, les comparaisons visuelles et la fin des suites
  E2E/qualité/rejeu restent à exécuter. Ne pas présenter le rapport partiel comme une campagne verte.
- Reprise directe : corriger le dimensionnement vertical du coloriage, contrôler les 75 activités
  aux deux grands formats et les repères/loupe, puis finir les preuves manquantes. Les 2 806 tests
  passés n'ont pas à être relancés pour simplement prendre connaissance du lot.

## Publication demandée après livraison — 14 septembre 2026

À la demande explicite du parent, Luna a publié cette version anticipée sans reprendre le chantier
de finition. Sources commitées : `0477867cccee3e8a77f2b750961dc86516c6ae2e` ; branche publiée
`gh-pages` : `74dc513f3484340b2c23f35cb3c4529dd2fd670b`. Les hooks de commit lint,
tests unitaires/composants/API et tests trompeurs passent.

GitHub Pages : action `34854401493` réussie, état `built`. La recette de livraison HTTPS valide
racine, version, worker, manifeste, icône et 297 visuels. L'orchestrateur a relu directement
`https://scorpheus.github.io/LaPierreDesMots/version-build.json` : version `77456385be2f7f38`.
Le site est en ligne sur `https://scorpheus.github.io/LaPierreDesMots/`.

L'état de publication sous `bac-a-sable/publication-gh-pages-etat.json` indique explicitement
« publication anticipée avec recette incomplète ». Cela ne clôt ni la campagne navigateur ni
le défaut de dimensionnement des six coloriages. Les limites de la livraison restent applicables.

## Nettoyage et qualification — 22 septembre 2026

Demande du parent : examiner les tests rouges, distinguer attentes périmées et défauts du site,
corriger puis qualifier le dépôt. Le rapport initial du 20 septembre comptait 26 échecs E2E,
7 différences visuelles et un dépassement du budget LAN (251,8 Kio gzip pour 250 autorisés).
Les changements de coloriage grand écran et les notes de publication présents avant cette
intervention sont conservés ; aucun asset, contenu publié ou journal familial n'est remplacé.

Corrections intégrées :

- Les tests d'entrée et d'introduction suivent le campement prévu par la réhabilitation.
  Le choix du compagnon expose à nouveau le code stable de la région, séparé de son libellé.
- Le tracé conserve sa consigne unique et son bouton audio après chaque trait réussi.
  La disparition de cette consigne déplaçait réellement l'ardoise ; le test vérifie les deux effets.
- Les paires restent accessibles après rotation ; récompenses, assemblage, coloriage libre et
  choix éclair disposent de leur espace utile. Les choix éclair évitent la commande « Revoir ».
- Le test de refus de gravure mesure après mise en vue de la prise, comme celui du tri ;
  l'audit parent attend la décision effective de la porte avant d'inventorier les commandes.
- Les écrans parent secondaires se chargent à la demande ; les contrats partagés sont séparés
  du module d'entrée pour éviter une dépendance circulaire au démarrage. Les JSON monde et
  référentiels le sont également : le document des compagnons créait sinon un cycle propre à la PWA.
  Le mode test monte
  ses crochets avant React sans suspendre l'évaluation du module racine.
- Les déclarations inutilisées et le typage trop large des recettes sont nettoyés.
- Le contour du parchemin laisse désormais entier le cartouche de la Clairière. Le nouveau
  contrôle des six cartouches échouait précisément sur celui-ci avant correction, sur PC et téléphone.
- L'audit des commandes du tableau de bord est réparti en trois lots disjoints : plusieurs
  centaines de commandes dépassaient les 270 secondes du cas monolithique. Toutes les cibles
  restent contrôlées et les amorces sont recherchées dans l'inventaire complet ; un test unitaire
  vérifie notamment l'amorçage depuis un autre lot. Aucun délai ni seuil n'est assoupli.

Les reproductions et contrôles ciblés sont conservés sous `bac-a-sable/nettoyage-tests/`.
Première campagne intégrée terminée : rapport `2026-09-22T07:26:16.215Z`, code 1,
2 806 tests de logique/composants/API et 321 contrôles de qualité réussis ; 916/917 parcours
réussis, seul l'audit parent dépasse sa durée ; 7/13 captures divergent. Les autres étapes passent,
dont le rejeu, les contrôles positifs et le budget LAN : **240,5 Kio gzip sur 250**, contre 251,8.
La campagne finale (`verification-finale.log`, rapport initial `2026-09-22T08:02:11.086Z`, code 1)
valide les **2 807 tests de logique/composants/API et les 921 parcours**, sans échec. La qualité
rencontre une seule erreur de chargement avant démarrage : Chromium refuse
`/assets/referentiels-CC0QweYY.js` avec `net::ERR_NO_BUFFER_SPACE` dans le cas de rotation de
placement. Le contrôle identique passe ensuite (2,9 s), puis **toute la suite qualité passe :
321/321, aucun ignoré ni instable**, code 0, 326 010 ms, départ `2026-09-22T08:04:45.0790263Z`.
Aucune modification de code, d'assertion ou de délai entre ces exécutions.

Le rapport consolidé `tests/rapports/RAPPORT.md`, daté `2026-09-22T08:23:15.253Z`, indique
explicitement cette reprise et la comparaison après visa parent : **15/15 étapes vertes**.
Les 13 tests visuels passent, code 0, sans création automatique de référence.
Le rapport de la campagne initiale est
conservé dans `bac-a-sable/nettoyage-tests/RAPPORT-campagne-finale.md` ; le consolidateur contrôle
le code de sortie, les rapports frais, les 321 cas sans exclusion et le budget avant de remplacer
le verdict de qualité. Charge initiale finale : **242,1 Kio gzip / 250**, aucun crochet de test
dans le build de production. Q8 confirme ses huit contrôles positifs et aucune dette nommée.
La PWA locale **66e0bee4f2f07a39** passe sa recette complète : `recette-pwa-3.log`, code 0.
Vrais gestes sur `clairiere-03`, audio hors connexion, deux tentatives persistantes, reprise
identique après fermeture, export/import, refus atomique d'import invalide, protection du second
onglet et route profonde rechargée ; zéro requête `/api`, zéro erreur de page. Le profil isolé
`bac-a-sable/profil-recette-nettoyage-2026-09-22` est conservé. L'essai initial bloqué par un cycle
d'import est corrigé ; son ancien worker a été renouvelé par mise à jour puis fermeture normale
des onglets, sans effacement de caches ni d'OPFS. La recette supplémentaire
`parent-pwa-hors-connexion.log` valide les trois écrans différés (suivi, galerie et visite) hors réseau.
Une nouvelle finalisation conserve la version `66e0bee4f2f07a39` et l'empreinte du worker.

Revue parent présentée : `bac-a-sable/nettoyage-tests/revue-visuelle/index.html`, servie localement
sur `http://127.0.0.1:4198/`. Le parent approuve la carte avec boutons en dessous et les récompenses :
les quatre références correspondantes sont remplacées par les captures présentées. Suite à son
retour, les comparaisons école/coloriage affichent les dimensions et la même échelle, sans
étirement. Le dessin est inchangé, seul le cadre diffère. Le parent valide ensuite l'ensemble :
les trois dernières références sont remplacées uniquement par les captures présentées.
La comparaison finale est conservée dans `bac-a-sable/nettoyage-tests/visuel-apres-visa.log` :
13 réussites, aucune référence absente, aucune création automatique. Le lot de nettoyage est clos localement.
Aucun commit, push ou déploiement dans cette intervention.
