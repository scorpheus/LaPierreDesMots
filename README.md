# La Pierre des Mots

Application de lecture pour un enfant de 7 ans (CE1). Un monde gris que l'enfant rallume : chaque
mini-jeu réussi recolorie une portion de décor — c'est simultanément la barre de progression, la
récompense et la justification narrative.

Deux modes sont livrés : un site servi sur le réseau domestique depuis un PC Windows, et une APK
Android autonome qui embarque l'application, la base et les contenus. Les deux fonctionnent
**entièrement hors ligne**. Aucun compte, aucun serveur distant, aucune donnée qui sort de la
maison.

---

## Jouer : double-cliquer sur `demarrer.bat`

**C'est la seule chose à savoir.** `demarrer.bat` est à la racine du dossier ; il vérifie Node,
installe ce qui manque au premier lancement, compile, démarre le serveur et affiche l'adresse à
ouvrir sur la tablette. Pour arrêter : `arreter.bat`, juste à côté.

> Cette section est en tête **volontairement**, et un test le vérifie
> (`tests/unitaires/lancement-decouvrable.test.ts`). Le lanceur était auparavant nommé pour la
> première fois après trois commandes d'installation : un parent qui ouvre ce fichier pour faire
> jouer son enfant tombait sur `git clone` avant de tomber sur le double-clic.

---

## Installer, en trois commandes

À ne faire qu'une fois, et seulement si le dossier vient d'être cloné — `demarrer.bat` sait
s'installer tout seul.

```
git clone <url-du-depot> LaPierreDesMots
cd LaPierreDesMots
npm ci
```

C'est tout. **Rien ne s'installe hors de ce dossier** (décision D9) : les dépendances vont dans
`node_modules/`, les éventuels outils tiers dans `outils/bin/`, le venv Python dans `.venv/`, la
base de données dans `donnees/`. Aucun `npm install -g`, aucun `pip install` global, jamais.

Prérequis, un seul : **Node.js 24.13 ou plus récent** ([nodejs.org](https://nodejs.org)). Le socle
utilise `node:sqlite`, intégré à Node depuis la version 24 — il n'y a donc pas de base de données à
installer non plus.

Une quatrième commande, facultative, prépare les outils annexes (venv Python d'ingestion, binaires
tiers). Elle ne sert pas à jouer :

```
npm run preparer
```

## Le détail du lancement, et l'adresse de la tablette

`demarrer.bat` vérifie Node, installe les dépendances si c'est le premier lancement, compile ce
qui doit l'être, démarre le serveur en HTTP (décision D3 : pas de certificat à installer sur la
tablette) et affiche l'adresse à ouvrir, avec son QR :

```
    Sur ce PC        http://localhost:8080
    Sur la tablette  http://192.168.1.42:8080
```

Sur la tablette, ouvrir cette adresse — ou scanner le QR. Si la connexion ne passe pas, le script
affiche la ligne exacte à coller dans une console administrateur pour ouvrir le port dans le
pare-feu Windows.

Pour arrêter : **`arreter.bat`**, ou `Ctrl+C` dans la fenêtre du serveur.

## Jouer sans PC : construire l'APK Android

Double-cliquer sur **`construire-apk.bat`**. Le script construit le client autonome, synchronise
Capacitor puis produit :

```
client\android\app\build\outputs\apk\debug\app-debug.apk
```

Le SDK Android doit être installé par Android Studio. Le JDK 21 nécessaire à la construction reste
dans `outils/jdk-21/` : rien n'est installé globalement. L'APK actuelle est une version de
débogage destinée à l'installation manuelle dans le foyer ; une version `release` signée n'est pas
encore configurée. L'architecture et la recette hors ligne sont détaillées dans
`Docs/addendum-portage-android.md`.

## Vérifier

Double-cliquer sur **`verifier.bat`** : la chaîne complète s'exécute et le rapport consolidé
s'ouvre.

En ligne de commande, les sept commandes de la stratégie de test :

| Commande | Ce qu'elle couvre |
|---|---|
| `npm run test` | Unitaires, composants et API — sans watch |
| `npm run test:contenu` | Validation de tout `contenu/exercices/**/*.json` |
| `npm run test:e2e` | Parcours complet et robustesse (« cassecou », « singe ») |
| `npm run test:visuel` | Captures de référence (`--maj` pour les régénérer) |
| `npm run test:qualite` | Accessibilité, cibles ≥ 64 px, budget de bundle |
| `npm run test:rejeu` | Rejeu des journaux de référence |
| `npm run verifier` | Tout, un seul code de sortie, rapport consolidé |

Chaque commande écrit un rapport machine dans `tests/rapports/*.json` et un résumé lisible dans
`tests/rapports/RAPPORT.md`. **C'est le rapport qui fait foi, jamais la sortie brute.**

Avant le premier `npm run test:e2e`, une fois : `npx playwright install chromium`.

Développement : `npm run dev` (serveur qui se recharge + Vite), `npm run lint`,
`npm run typescript`.

## Ce que contient cette version

**Chiffres remesurés le 2026-09-01 lors de la reprise du dépôt** — le détail et les commandes sont
consignés dans `Docs/audit-reprise-2026-09-01.md`.

- **Six régions**, **76 nœuds** et **76 exercices** validés par les schémas de contenu.
- **14 moteurs de jeu** présents dans le client et couverts par les tests.
- **713 clips de voix pré-rendus**, hors ligne, en Opus. Le bundle Android autonome en embarque
  473, soit les clips réellement référencés par les contenus et écrans livrés.
- **13 écrans**, tous parcourus par la QA, tous avec une sortie.
- **Le campement** et ses 30 points d'interaction gratuits, l'étagère des formes à cases vides
  visibles, Gobi et ses **10 stades** d'évolution irréversible, **25 formes** de graphème.
- **La séquence d'ouverture** en 5 tableaux, offerte et jamais imposée : partir en sortie reste
  à **un seul tap** depuis l'ouverture de l'application (D46).
- **L'espace du parent** : suivi, galerie de tous les exercices lançables sans rien journaliser,
  relecture des contenus, exports, réglages.
- **Un serveur** Fastify, base SQLite, **10 migrations** numérotées.
- **Une APK Android autonome** par Capacitor et SQLite natif, construite depuis le même métier et
  les mêmes contenus que le serveur LAN.
- **La chaîne de test complète** — unitaires, composants, API, parcours, robustesse, visuel,
  accessibilité.

### Ce qui reste à terminer ou à valider

- **La chaîne complète de QA est rouge** au 2026-09-01 : parcours E2E, références visuelles et
  qualité tablette/accessibilité. Les défauts et les priorités sont détaillés dans
  `Docs/audit-reprise-2026-09-01.md`. Les 2 références visuelles absentes et les 10 divergences ne
  seront pas acceptées sans validation visuelle d'un adulte.
- **L'APK `release` signée** n'est pas configurée. Le build actuel produit une APK de débogage,
  suffisante pour l'installation manuelle dans le foyer.
- **Les cursives** : l'enfant sort du CP et lit du script. Le référentiel de ductus porte déjà le
  champ `casse` ; les ajouter n'ajoutera pas une ligne de code, seulement des données.
- **Le clonage d'une voix de la famille** — les voix sont entièrement synthétiques (D41).

## L'espace du parent, et son code à quatre chiffres

L'espace du parent — le suivi, la galerie de tous les exercices, la relecture des contenus, les
exports — se trouve **en pied de l'écran d'accueil**, sous les joueurs. Il est protégé par un code
à quatre chiffres, et il n'apparaît nulle part dans le monde de l'enfant.

**Le code se choisit, il ne se pose pas tout seul.**

1. **Au tout premier passage**, l'écran demande de *choisir* le code du foyer. Les quatre chiffres
   sont montrés **en clair** pendant la saisie : ce n'est pas encore une serrure, il n'y a rien à
   cacher, et un code mal tapé qu'on n'aurait pas vu enfermerait le parent dehors.
   **Note-le quelque part** — personne ne peut le retrouver à ta place.
2. **Ensuite**, le même écran demande simplement de l'entrer, en pastilles masquées.
3. **Pour en changer** : entrer l'ancien, puis choisir le nouveau. On ne remplace jamais un code
   sans la preuve qu'on connaît le précédent.
4. **Cinq codes faux** ferment l'espace un quart d'heure. L'écran dit *quand* il rouvre, jamais
   que c'est faux — un enfant peut tomber là par hasard, il ne doit rien y trouver d'inquiétant.

**Si le code est oublié**, il n'y a pas de récupération par courriel : le jeu est hors ligne et ne
connaît personne. Le foyer garde la main sur ses données, et c'est un choix, pas un oubli. La
remise à zéro est une opération d'administration, faite sur le PC qui héberge le jeu :

```
sqlite3 donnees/pierre.db "DELETE FROM code_parent;"
```

Au démarrage suivant, l'espace du parent redemande de choisir un code, comme au premier jour.
**Rien d'autre n'est perdu** : ni les profils, ni la progression, ni le journal des tentatives.

**Ce qui se joue depuis la galerie du parent n'entre jamais dans le suivi de l'enfant.** Un adulte
peut essayer les vingt exercices d'affilée sans fausser une seule statistique.

## Les règles qui ne se négocient pas

Elles protègent l'enfant, pas le code.

- **Aucun écran d'échec, jamais.** Pas de vies, pas de défaite, pas de score négatif. Un acquis
  n'est jamais repris. Toute session se termine sur une réussite.
- **L'aide de Gobi ne coûte rien** et n'est jamais présentée comme un échec : elle change seulement
  le nombre d'étoiles. C'est l'enfant qui choisit sa difficulté.
- **Aucune consigne n'existe uniquement à l'écrit.** Tout est audible en un tap, réécoutable sans
  limite et sans coût.
- **Le décor s'agite, le texte jamais.** Dès qu'il y a du déchiffrage : fond parchemin, police
  Andika, aucune animation dans le champ de lecture.
- **Aucun contenu n'atteint l'enfant sans relecture d'un parent.** Ce qui est produit par un agent
  passe par `contenu/brouillons/`.
- **Aucun `Math.random`, aucun `Date.now`, aucun `new Date()`** hors de `Alea` et `Horloge` — règle
  ESLint à l'appui, parce que tout le rejeu des tests en dépend.

## Où lire la suite

Tout est dans `Docs/`, en français.

| Fichier | Portée |
|---|---|
| `la-pierre-des-mots-specs-v2.md` | Référence : univers, game design, pédagogie, direction artistique, socle |
| `annexe-T-strategie-de-test.md` | Testabilité, six niveaux de test, définition de « terminé » |
| `annexe-P-production-et-agent.md` | Production des images et des voix |
| `addendum-animation-et-brief-de-reprise.md` | Animation, ordre de démarrage |
| `addendum-portage-android.md` | Architecture et construction de l'APK autonome |
| `contrat-technique-v1.md` | Le contrat gelé de cette version : arborescence, interfaces, propriétaire de chaque fichier |
| `journal-des-decisions.md` | Les décisions prises, et leur motif |
| `audit-reprise-2026-09-01.md` | État mesuré lors de la reprise, risques et ordre de remise au vert |

Sur un point technique, l'ordre de préséance est : v2, puis annexe P, puis addendum — le plus
récent gagne. Sur un point de conception ou de pédagogie, la v2 fait foi.

## Licence

Projet familial, non distribué.
