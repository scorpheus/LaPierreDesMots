# Audit de fiabilité PWA — 14 septembre 2026

## Demande et organisation

Poursuivre la recherche des problèmes et leur correction. Le parent demande explicitement que
l'agent principal analyse et écrive le code, tandis qu'un sous-agent Luna léger exécute les tests
et les checks. Pour ce lot, cette instruction transfère à Luna le jeton unique de compilation et
de suites décrit historiquement dans AGENTS.md. Le plan de travail est conservé dans
`bac-a-sable/audit-2026-09-14-plan.md` ; les journaux sont sous
`bac-a-sable/audit-2026-09-14/`.

Pendant la campagne finale, la tâche « Comparer les deux sites »
(`01a09fb3-0d45-7c71-88fd-aa171cab86ab`) a repris le pilotage général à la demande du parent.
Passation envoyée : ce lot reste borné à la PWA ; aucune nouvelle campagne
exploratoire et aucune publication. Luna a terminé l'unique campagne et le jeton de tests est
rendu au pilotage à la clôture. Les nouveaux retours progression/recadrage/téléphone/PC/
superposition sont transmis à sa file de priorités, pas considérés résolus par ce lot.

État initial : `main` à `9946abf`, arbre propre ; 141 TS partage, 154 TS/TSX client, 25 TS serveur,
297 fichiers de test, 11 migrations, 76 exercices et 76 nœuds. Ces comptes remplacent les nombres
historiques pour ce lot. L'ancien rapport du 10 septembre à 11:03 UTC comportait un échec E2E
après une autre campagne complète verte : il ne constitue pas une preuve fraîche.

## Défauts et corrections

1. Le contrôle distant exigeait `<div id="root">`, alors que `client/index.html` et le montage
   React utilisent `racine`. Une publication correcte était rejetée après le déploiement. La
   recette emploie maintenant le vrai point de montage ; une page de maintenance HTTP 200 reste
   refusée.
2. Les lectures `caches.match` parcouraient tous les caches de l'origine. Un ancien cache ou un
   cache en cours d'installation pouvait fournir le HTML, un module ou une plage audio d'une
   autre version. Chaque lecture passe désormais par le cache de la version active.
3. Le préchargement n'avait aucune reprise. Une coupure réseau, une réponse 503 ou une coupure du
   corps annulait tout le nouveau noyau. Seule la ressource fautive est réessayée, jusqu'à trois
   essais ; les erreurs HTTP définitives comme 404 restent bloquantes dès le premier essai.
4. Une requête suspendue pouvait empêcher indéfiniment la fin de l'installation. Chaque essai
   dispose maintenant d'une expiration de 15 secondes couvrant en-têtes et corps. Ce délai
   technique reprend l'ordre de grandeur du port HTTP existant ; ce n'est pas une règle du jeu.
   Les deux reprises transitoires ont un recul de 250 puis 500 ms. Le noyau reste atomique :
   aucun fichier requis n'est omis pour rendre l'installation verte.
5. `Promise.all` rejetait au premier échec pendant que les autres écritures continuaient. Le
   nettoyage du cache incomplet pouvait ainsi courir en même temps que ces écritures. Le lot
   attend désormais toutes ses promesses avant le nettoyage ; l'ancien cache actif est conservé.
6. Le modèle du service worker était absent de l'empreinte de livraison. Corriger seulement le
   worker pouvait donc réutiliser le nom du cache actif, et son échec d'installation supprimer
   ce cache. Le code du modèle entre maintenant dans l'empreinte.
7. Une seconde finalisation incluait son précédent `version-build.json` dans les entrées, faisant
   dériver la version sans changement applicatif. Les deux fichiers générés — manifeste de
   version et worker finalisé — sont exclus des entrées. Deux finalisations produisent désormais
   le même identifiant et le même worker.

## Preuves ciblées

Avant les corrections fonctionnelles, les deux fonctions de livraison ont seulement été
exportées pour permettre leur exécution dans les tests. Les nouveaux scénarios ont rendu
**sept rouges sur dix-sept cas** : racine HTML incorrecte, empreinte insensible au worker, lecture
de l'ancien cache, absence de reprise réseau/503, requête suspendue et nettoyage prématuré.
Le journal `pwa-publication-discriminants-rouge.log` conserve ces erreurs.

Après correction, les dix-sept cas passent. Les tests exécutent le vrai fichier source du worker
dans un contexte JavaScript avec réseau et CacheStorage commandés ; ils couvrent aussi le refus
404, les corps interrompus, les plages audio et la conservation du cache d'une autre application.

Le build PWA ciblé passe. Deux finalisations consécutives ont rendu la version
`1eed001f8e91f46c` et le SHA-256 du worker
`decd750fcca8535c0b971cd2493f16a98073589c72314524c61e9193d00e9b84`.
TypeScript et lint passent ; les dix-huit avertissements de lint préexistants restent distincts
des erreurs bloquantes. La famille progression initiale passe 155 tests.

La recette navigateur `scripts/qa/verifier-cycle-pwa.mjs` sert le vrai worker sur une origine
locale isolée. Elle prépare une ancienne version, injecte un 503 dans la suivante, attend son
installation, ferme le client puis contrôle le remplacement naturel, le rechargement hors
connexion et la conservation exacte de témoins localStorage/OPFS et d'un cache tiers.
Deux exécutions indépendantes passent : `verifier-cycle-pwa-final.log` et
`verifier-cycle-pwa-final-rejeu.log`. Une première version de cette recette attendait mal un
prédicat asynchrone avec `waitForFunction` : le Playwright local testait la promesse, pas son
résultat. Le remplacement par `expect.poll` attend réellement `waiting.state === installed` ;
l'assertion des deux requêtes après le 503 n'a pas été assouplie.

La famille PWA complète passe **42 tests dans sept fichiers**. La recette du vrai livrable
`qa:pwa` passe aussi sur un profil isolé `profil-recette-audit-20260914`, avec deux tentatives
persistantes, reprise après fermeture, audio hors connexion, export/import, rejet atomique d'un
import invalide, refus du second onglet et zéro appel API/erreur de page
(`qa-pwa-profil-avec-serveur.log`). Le serveur de recette appartenant à Luna a été arrêté ensuite.

Ces preuves ont des périmètres distincts : le scénario de migration vérifie des témoins exacts
localStorage/OPFS ; la recette SQLite joue ensuite un vrai exercice et contrôle sa persistance.
Le profil SQLite neuf avait zéro tentative avant la mise à jour. Aucun de ces essais ne remplace
une migration de la base familiale réelle ni une session sur la tablette physique.

## Résultat global et clôture F0

Luna a exécuté **une seule** campagne `npm run verifier` : début le 14 septembre à
13:42:02 Europe/Paris, fin à 13:58:05, **code de sortie 0**. L'agent principal a lu le rapport
complet `tests/rapports/RAPPORT.md`, écrit le `2026-09-14T11:58:05.302Z` : **15 étapes sur 15
vertes**, en 962,5 secondes. Résultats :

- 2 745 tests unitaires, composants et API ;
- 655 validations de contenu et 76 contrôles de cohérence ;
- 915 parcours/robustesse, en 595,6 secondes ;
- 13 comparaisons visuelles, références inchangées ;
- 321 contrôles de qualité, en 269,5 secondes, et 11 contrôles du bundle ;
- rejeu et contrôles QA finaux verts, seuils de couverture par zone respectés.

Le rouge historique du dashboard ne s'est pas reproduit dans cette campagne. Les dix-huit
avertissements de lint préexistants demeurent ; aucune erreur de lint n'est masquée.
`git diff --check` rend 0. Les journaux et heures sont conservés dans `verifier-global.log`
et `verifier-global.meta.log`. Les deux étapes navigateur représentent l'essentiel des seize
minutes ; cette mesure ne constitue pas une promesse d'accélération des futures campagnes.

Les fichiers de code et de tests sont restés stables pendant la campagne. La tâche de pilotage
a modifié séparément `AGENTS.md` et `Docs/etat-courant-et-file.md` ; son document de comparaison
n'a pas été touché par ce lot. Aucune base personnelle, référence visuelle, donnée de contenu,
branche distante ou publication n'a été modifiée. Les corrections PWA restent locales, non
commitées. F0 est remis au pilotage avec ces preuves ; F1–F5 restent ouverts dans sa file unique.

## File restant ouverte

- La cause exacte de l'installation manquée dans le navigateur familial du 10 septembre n'avait
  pas été capturée dans un journal du worker. L'ancien bundle a été observé et l'autre navigateur
  affichait le bon bouton ; les défauts de reprise ci-dessus sont reproduits séparément.
- L'activation reste naturelle après fermeture des clients de l'ancienne version. Une interface
  parent indiquant installation, erreur et version en attente, avec activation explicitement
  demandée, reste à concevoir. Aucun `skipWaiting` automatique pendant une partie n'est ajouté.
- Une file durable de tentatives avant accusé de sauvegarde, l'arbitrage pédagogique trois/cinq
  exercices par forme et le visa de compréhension des illustrations restent des chantiers
  distincts déjà documentés. Les tests ne répondent pas à ces décisions à la place du parent.
- Aucun contrôle de ce lot ne garantit l'absence de tout défaut du jeu. Le résultat global doit
  être lu avec sa date et ses limites ; le site public restera inchangé sans publication dédiée.
