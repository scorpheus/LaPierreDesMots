# Publication du 9 septembre 2026

Le propriétaire demande le push des commits existants et du site. Il exclut explicitement le chantier non commité de progression et de récompenses.

La validation porte sur `b42f972`, dans le worktree isolé `bac-a-sable/publication-sources`. Aucun fichier du chantier en cours n'a été commité. Le premier push a été interrompu pendant son crochet de validation, car celui-ci utilisait le dossier de travail modifié.

`publier-site.bat --preparer` a exécuté la campagne complète : 869 parcours navigateur, 320 cas de qualité, compilation et rejeu réussis. Trois captures divergent : cour d'école, coloriage initial gris, coloriage à une cible de la fin. Les références n'ont pas été modifiées. Ces trois cas étaient déjà rouges dans le rapport local du 7 septembre.

La copie isolée manquait aussi de brouillons utilisés par les tests. Leur copie et le remplacement de la jonction audio par des fichiers locaux ont permis la réussite des 93 cas ciblés et du contrôle de contenu. Trois suites échouaient au chargement à cause des fins de ligne CRLF des scripts avec shebang ; la normalisation LF, sans différence de contenu Git, permet la réussite de leurs 39 cas. La famille complète n'a pas été relancée après ces corrections d'environnement : le rapport global reste rouge et conserve sa première mesure.

Preuves : `bac-a-sable/publication-sources/tests/rapports/RAPPORT.md`, `bac-a-sable/publication-sources/bac-a-sable/preparation-publication.log`, `reprise-tests-publication.log`, `reprise-imports-publication.log` et `reprise-contenu-publication.log` dans ce dernier dossier.

À ce stade, aucun push n'a abouti et aucun site n'a été publié. Une demande d'arbitrage porte sur le push des seuls commits malgré le crochet rouge. Le site reste bloqué par la validation. Le worktree `gh-pages` a été remis à son emplacement initial.

## Arbitrage et publication effective

Le propriétaire a ensuite explicitement demandé de publier les derniers ajouts commités malgré les écarts de validation, sauf défaut faisant planter le site. Cet accord autorise le contournement ponctuel des crochets ; il ne transforme pas le rapport rouge en rapport vert.

- Les 142 commits de `main` ont été poussés jusqu'à `b42f97264d87f1db45a46f93ecf4df103c93ad7b`.
- La PWA a été construite depuis ce commit dans la copie isolée, sans le chantier progression/récompenses.
- Deux recettes PWA locales réussissent : exercice tactile, reprise après fermeture, hors connexion avec audio, sauvegarde et import atomique, second onglet refusé, zéro requête API et zéro erreur de page. La seconde recette conserve deux tentatives existantes.
- Le commit publié sur `gh-pages` est `586c370242362ef5302b9b774e9fc0db98206dd9`, version `02a2145cafab9e3c`.
- L'Action GitHub Pages [34357636041](https://github.com/scorpheus/LaPierreDesMots/actions/runs/34357636041) réussit. Le site public sert cette version ; le module JavaScript correspond au build local, le service worker et le manifeste répondent et les 298 visuels sont accessibles.

Le vérificateur distant existant cherche littéralement `<div id="root">`, alors que le HTML publié et l'application utilisent `racine`. Son erreur sur la racine React est une fausse alerte. Un contrôle séparé dans `bac-a-sable/publication-sources/bac-a-sable/verifier-publication-https.mjs` vérifie le véritable élément, la version, le module et tous les visuels ; il réussit. Le script applicatif de publication n'a pas été modifié.

Le site est [accessible ici](https://scorpheus.github.io/LaPierreDesMots/). Les preuves complémentaires restent dans le bac à sable de publication ; les modifications du chantier en cours restent non commitées.

Contrôles HTTPS supplémentaires : les 1 211 URL du préchargement répondent toutes sans erreur HTTP ; Chromium affiche les profils sans erreur JavaScript et un contexte neuf confirme l'activation du service worker (`diagnostic-cache-https.log`). La recette complète dans le profil persistant HTTPS est restée sans résultat final, y compris après une reprise conservant ce profil ; elle a été interrompue. Ne pas la déclarer verte, ni assimiler l'activation du cache à une preuve complète de reprise hors connexion sur la tablette. Les deux recettes complètes locales restent les preuves fonctionnelles disponibles.

Les processus de recette de cette publication ont été arrêtés. Le worktree `gh-pages` et son fichier d'état ont été remis à leur emplacement habituel sous le bac à sable principal. Aucun changement de source ni aucune référence visuelle n'a été commité pendant cette publication.
