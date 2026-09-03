# Recette — volcan-05 / volcan-coulee-chemin-01

Date : 2026-09-03

## Périmètre

- Nœud : `volcan-05`
- Exercice : `volcan-coulee-chemin-01`
- Moteur : `chemin`
- Habillage : `volcan.coulee`

Trois consignes CE1 demandent de marcher sur les mots contenant le son de « fille », puis ceux
qui ne l’ont pas, puis le son de « montagne ». Les trois embranchements comportent chacun trois
cases, avec départs et voisines déclarés ; les mots restent lisibles et les chemins sont disjoints.

## Défaut trouvé et correction

Le contenu annonçait `gph.rare.ill` alors que la troisième consigne travaille le son de montagne
(`gn`). Un test rouge a été ajouté dans `tests/unitaires/recette-volcan-05.test.ts` (échec constaté,
`ill` reçu au lieu de `gn`), puis la compétence interne a été corrigée au minimum en
`gph.rare.gn`.

## Vérifications exécutées

- Après correction : `npm test -- --run tests/unitaires/recette-volcan-05.test.ts tests/composants/MoteurChemin.test.tsx` : **PASS**, 8/8.
- Les tests moteur couvrent tap/chemin, tolérance des embranchements, refus sans état d’échec,
  aide de Gobi, progression et fin logique.
- Audio volontairement hors campagne : non vérifié et non bloquant.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. Récompense finale et rendu tablette
restent à confirmer dans l’application complète. Aucun asset, snapshot, compilation globale ou
commit.
