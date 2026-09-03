# Recette — cite-des-histoires-02 / cite-des-histoires-cartes-paires-01

Date : 2026-09-03

## Périmètre

- Nœud : `cite-des-histoires-02`
- Exercice : `cite-des-histoires-cartes-paires-01`
- Moteur : `paires`
- Habillage : `cite.cartes`

Quatre consignes demandent huit paires : cartable, école, maîtresse, cahier, ami, matin, cour et
livre. Le contenu déclare 16 cartes, deux faces par paire, avec des phrases simples adaptées au
CE1 côté mot et un libellé côté image.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurPaires.test.tsx` : **PASS**, 7 tests.
- La suite couvre retournement/tap, appariement correct et refus sans état d’échec, mélange,
  aide de Gobi et progression logique jusqu’à la fin.
- Contrôle concret des faces : les 16 cartes ont `asset: null`, y compris les 8 faces `image`.
  Le composant affiche donc les libellés en clair, sans images réellement présentes.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**BLOQUÉ-ASSET** — logique validée, mais les huit faces image ne sont pas fournies (`asset: null`).
Récompense et rendu tablette ne sont pas recevables comme memory illustré tant que ces assets ne
sont pas produits. Aucun asset généré, aucun test rouge, aucune correction de code, snapshot,
compilation globale ou commit.
