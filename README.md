# La Pierre des Mots

Application de lecture pour un enfant de 7 ans (CE1). Un monde gris que l'enfant rallume : chaque
mini-jeu réussi recolorie une portion de décor — c'est simultanément la barre de progression, la
récompense et la justification narrative.

Servie en local sur le réseau domestique depuis un PC Windows, jouée sur tablette,
**entièrement hors-ligne**. Aucun compte, aucun serveur distant, aucune donnée qui sort de la
maison.

---

## Installer, en trois commandes

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

## Jouer

Double-cliquer sur **`demarrer.bat`**.

Le script vérifie Node, installe les dépendances si c'est le premier lancement, compile ce qui
doit l'être, démarre le serveur en HTTP (décision D3 : pas de certificat à installer sur la
tablette) et affiche l'adresse à ouvrir, avec son QR :

```
    Sur ce PC        http://localhost:8080
    Sur la tablette  http://192.168.1.42:8080
```

Sur la tablette, ouvrir cette adresse — ou scanner le QR. Si la connexion ne passe pas, le script
affiche la ligne exacte à coller dans une console administrateur pour ouvrir le port dans le
pare-feu Windows.

Pour arrêter : **`arreter.bat`**, ou `Ctrl+C` dans la fenêtre du serveur.

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

La v1 est une **tranche verticale mince** : peu de surface, mais de bout en bout, du fichier JSON
jusqu'au pixel colorié sur la tablette.

- **Un nœud jouable** — la cour de l'école, dans la région de la Clairière.
- **Un moteur** — `colorie` : Gobi énonce une consigne, l'enfant tape une région du dessin avec la
  couleur demandée, la couleur s'écoule dans la forme.
- **Quatre écrans** — choix du profil, carte, nœud, récompense.
- **Un serveur** Fastify avec sa base SQLite : profils, journal des tentatives, progression.
- **La chaîne de test complète** — unitaires, composants, API, parcours, robustesse, visuel,
  accessibilité.

Ce qui **n'y est pas encore**, et c'est délibéré : l'audio (les consignes existent à l'écrit, le
bouton « écouter » est câblé mais muet), la carte des six régions, le modèle pédagogique adaptatif,
les cinq autres régions.

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
| `contrat-technique-v1.md` | Le contrat gelé de cette version : arborescence, interfaces, propriétaire de chaque fichier |
| `journal-des-decisions.md` | Les décisions prises, et leur motif |

Sur un point technique, l'ordre de préséance est : v2, puis annexe P, puis addendum — le plus
récent gagne. Sur un point de conception ou de pédagogie, la v2 fait foi.

## Licence

Projet familial, non distribué.
