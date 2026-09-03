# Recette — foret-muette-10 / foret-muette-bestiaire-paires-02

Date : 2026-09-03

## Périmètre

- Nœud : `foret-muette-10`
- Exercice : `foret-muette-bestiaire-paires-02`
- Moteur : `paires`
- Habillage : `foret.bestiaire`

Trois consignes demandent six paires : ours, hibou, arbre, enfants, oiseaux et étoiles. Le
contenu déclare 12 cartes (une face mot et une face image par paire), toutes avec `asset: null`.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurPaires.test.tsx` : **PASS**, 7 tests.
- La suite couvre retournement/tap, appariement correct et refus, mélange Alea, aide de Gobi,
  absence d’état d’échec et progression de toutes les paires jusqu’à la fin.
- Contrôle concret des faces : les faces « image » n’ont aucun asset déclaré. Le composant
  affiche donc leur libellé en clair (repli documenté dans `MoteurPaires.tsx`) ; aucune image
  d’ours, hibou, etc. n’est effectivement rendue.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**BLOQUÉ-ASSET** — logique de paires validée, mais les six faces image demandées ne disposent
d’aucun asset (`asset: null`). Récompense et rendu tablette ne sont pas recevables comme memory
illustré tant que ces assets ne sont pas fournis. Aucun asset généré ni correction de code, et
aucun test rouge ajouté puisque le défaut est un manque de production d’asset.
