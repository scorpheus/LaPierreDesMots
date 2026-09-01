# Audit de reprise — 1er septembre 2026

## Verdict

Le projet est réel, structuré et constructible dans ses deux modes. Le serveur LAN, le client
React et le port Android autonome existent. L'APK de débogage se reconstruit depuis le dépôt.
L'architecture générale est saine et le socle métier est fortement testé.

Le dépôt n'est toutefois pas prêt à être déclaré « propre » ou livré sans réserve : la chaîne
officielle `npm run verifier` est rouge sur les parcours, le visuel et la qualité. Des régressions
d'interface touchent des règles destinées à protéger l'enfant. La documentation d'accueil était
également périmée avant cet audit.

## Périmètre mesuré

Mesures faites dans `C:\Users\scorp\Documents\Projets_Perso\LaPierreDesMots` :

| Élément | Mesure |
|---|---:|
| Sources TypeScript de `partage/src` | 140 |
| Sources TypeScript/TSX de `client/src` | 133 |
| Sources TypeScript de `serveur/src` | 25 |
| Fichiers de test | 192 |
| Migrations SQL | 10 |
| Exercices JSON validés | 76 |
| Nœuds JSON | 76 |
| Clips Opus dans `contenu/audio` | 713 |

État Git au début de l'audit : branche `main`, 65 commits devant `origin/main`, aucun fichier suivi
modifié, mais `AGENTS.md` et `.agents/` non suivis. Ces deux derniers éléments sont le contexte de
travail fourni pour la reprise et n'ont pas été supprimés.

## Architecture trouvée

### Mode LAN

- `demarrer.bat` lance le serveur Fastify et sert le client React sur le réseau local.
- SQLite est utilisé côté Node, avec 10 migrations.
- Le serveur expose les profils, contenus, tentatives, sorties, progression et fonctions parent.
- Le build de production passe.

### Mode Android autonome

- Capacitor 8 porte le client dans `client/android/`.
- `client/src/api/port-local.ts` remplace le port HTTP par des appels métier locaux.
- `@capacitor-community/sqlite` stocke les données sur l'appareil.
- Les contenus, SVG, référentiels et voix utiles sont embarqués par le build autonome.
- `construire-apk.bat` enchaîne build partagé, build autonome, synchronisation Capacitor et Gradle.

Preuve du 2026-09-01 : `construire-apk.bat` termine par `BUILD SUCCESSFUL` et produit
`client/android/app/build/outputs/apk/debug/app-debug.apk`. L'APK mesure 20 031 302 octets, porte
`com.lapierredesmots.app`, `versionCode=1`, `minSdk=24`, `targetSdk=36`. Le build autonome contient
557 fichiers pour 7 653 043 octets, dont 68 SVG et 473 clips Opus.

Limite de cette preuve : l'APK a été reconstruite, mais n'a pas été réinstallée sur une tablette
physique pendant cet audit. Le document de portage consigne une recette antérieure réussie sur
émulateur API 36 en mode avion.

## Résultats de la chaîne officielle

Commande exécutée : `npm run verifier`.

| Étape | Résultat |
|---|---|
| ESLint | vert, avec 21 avertissements |
| TypeScript | vert |
| Unitaires, composants, API | 2 144/2 144 verts |
| Validation des contenus | 608/608 verts |
| Build de test | vert |
| E2E | 17 échecs sur 476, 12 non exécutés |
| Visuel | 12 échecs sur 15 |
| Build de production | vert |
| Qualité | 9 échecs sur 247 au passage final (8 au premier passage) |
| Rejeu pédagogique | vert |
| Contrôles positifs de QA | vert |

Le contrôle de bundle, non atteint par la chaîne à cause du `&&` après `test:qualite`, a été lancé
séparément : vert, mais 249,5 Ko gzip pour un budget de 250 Ko. La marge de 0,5 Ko est trop faible
pour absorber une évolution ordinaire.

Le rapport détaillé généré fait foi : `tests/rapports/RAPPORT.md`.

## Défauts bloquants constatés

### Priorité 1 — règles enfant et accessibilité

1. La porte de la zone parent expose six gestes sans effet détectable.
2. La goutte du moteur `libre` mesure selon les états 63×63 px ou 54×116 px : au moins une
   dimension est sous le minimum de 64 px.
3. Le coffre contient une structure de liste invalide, classée `serious` par axe.
4. À corps de texte maximal, les moteurs `libre` et `place` font passer des cibles sous 64 px.
5. Cinq écrans `colorie` dépassent davantage la hauteur tablette que la dette déjà admise :
   772 à 834 px mesurés contre une borne historique de 730 px.

Plusieurs des 17 échecs E2E sont des cascades de la même goutte trop petite, car les invariants
globaux s'appliquent à tous les parcours. Ils ne représentent donc pas 17 causes indépendantes.
Le total de 17 s'est reproduit sur deux campagnes, mais pas leur composition exacte : le coffre a
été détecté comme geste mort seulement au second passage et l'un des deux timeouts du premier
passage a disparu. La campagne porte donc aussi une composante intermittente.

### Priorité 2 — parcours et état

- La cascade de progression ne franchit plus les trois paliers attendus.
- Les parcours de sortie des Galeries et de la Clairière n'annoncent pas toujours le nœud suivant
  attendu.
- Le moteur `trace` ne rend plus l'attribut d'axe confondu attendu par le contrat de parcours.
- Un à deux scénarios selon la campagne atteignent leur limite de 270 secondes en attendant les
  crochets de test ; il faut déterminer s'il s'agit d'une saturation de la campagne parallèle ou
  d'un écran qui ne monte pas.
- Le contrôle parent « aucune couleur d'alarme après un code faux » a échoué au second passage mais
  pas au premier. Ce neuvième rouge de qualité doit être isolé avant de conclure à une régression
  fonctionnelle stable.

### Priorité 3 — références visuelles

- 10 captures diffèrent de leur référence.
- 2 références n'existent pas (`decor-ecole-v2` et `carte-monde-v2`).
- Aucune référence n'a été modifiée pendant cet audit. Leur acceptation exige un jugement visuel
  du parent.

## Dépendances et sécurité

Au début de l'audit, `npm audit --omit=dev` signalait une vulnérabilité haute de traversée de
chemins dans `@fastify/static@8.3.0`. L'environnement de test utilisait aussi une version de
`happy-dom` touchée par une vulnérabilité critique.

Corrections appliquées et testées :

- `@fastify/static` 8.3.0 → 10.1.3 ;
- `happy-dom` 18.0.1 → 20.12.0 ;
- `nanoid` transitif 3.3.16 → 3.3.18.

Après correction, `npm audit --omit=dev` rend zéro vulnérabilité et les 2 144 tests
unitaires/API/composants restent verts.

Il reste trois alertes modérées uniquement dans la chaîne de développement Capacitor
`@capacitor/cli@8.5.1 → xcode → uuid`. `npm audit` ne propose qu'un `--force` qui ramènerait le CLI
à 8.4.3. Ce recul n'a pas été imposé sans test de compatibilité Android dédié.

## Propreté et maintenance

- Le README a été remis à jour pour décrire l'APK et les mesures actuelles.
- Les sorties de build Android et Vite sont correctement ignorées par Git.
- Aucun `TODO`, `FIXME`, `HACK` ou `XXX` n'a été trouvé hors dépendances et bac à sable.
- Aucun secret évident n'a été trouvé par recherche de marqueurs usuels ; cela ne remplace pas un
  scanner spécialisé d'historique Git.
- Les 21 avertissements ESLint sont une dette de propreté, pas des erreurs bloquantes.
- Les messages des 65 commits locaux antérieurs ne suivent pas la convention actuelle
  `ClasseOuPortée: phrase courte`.
- Les 65 commits locaux doivent être poussés ou sauvegardés sur un autre support avant tout gros
  chantier : `origin/main` ne contient pas l'état courant.

## Ordre recommandé de remise au vert

1. Corriger les trois causes transversales d'interface : goutte du moteur `libre`, structure de
   liste du coffre, gestes du code parent.
2. Corriger les cibles à corps 40 px et la hauteur des scènes `colorie` sans réduire les seuils.
3. Rejouer les scénarios ciblés de cascade, sortie et trace, puis la campagne E2E complète.
4. Faire examiner les 12 résultats visuels par le parent ; seulement ensuite créer ou mettre à
   jour les références acceptées.
5. Installer l'APK reconstruite sur la Galaxy Tab S10 FE, couper réellement Wi-Fi et données,
   créer un profil, jouer une sortie, fermer/réouvrir l'app et vérifier la persistance SQLite.
6. Restaurer une marge de bundle raisonnable avant d'ajouter une fonctionnalité.
7. Pousser les commits locaux vers une sauvegarde distante.
