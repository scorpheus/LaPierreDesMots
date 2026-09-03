# Recette — marais-jumeau-05 / marais-jumeau-coquillages-paires-01

Date : 2026-09-03

## Périmètre

- Nœud : `marais-jumeau-05`
- Exercice : `marais-jumeau-coquillages-paires-01`
- Moteur : `paires`
- Habillage : `marais.coquillages`

Trois consignes demandent six paires : lapin, matin, jardin, sapin, main et pain. Le contenu
déclare bien 12 cartes, deux faces par paire, toutes les paires étant disjointes et mélangées par
le moteur. Cependant les 12 cartes ont `asset: null`, y compris les six faces `image`.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurPaires.test.tsx` : **PASS**, 7 tests.
- La suite couvre retournement/tap, appariement, mélange, aide de Gobi, refus sans état d’échec et
  progression logique jusqu’à la fin.
- Contrôle concret des faces : aucune image ni chemin d’asset n’est fourni ; le composant affiche
  les libellés textuels en repli.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**BLOQUÉ-ASSET** — la logique est valide, mais les six faces image ne sont pas réellement
présentes (`asset: null`). Récompense et rendu tablette ne sont pas recevables comme memory
illustré tant que les assets ne sont pas produits. Aucun asset généré, aucun test rouge, aucune
correction de code, snapshot, compilation globale ou commit.
