# Recette — foret-muette-01 / foret-muette-feuilles-attrape-01

Date : 2026-09-02

## Périmètre

- Nœud : `foret-muette-01`
- Exercice : `foret-muette-feuilles-attrape-01`
- Moteur : `attrape`
- Habillage : `foret.feuilles`

Quatre consignes travaillent la dernière lettre (`t`, `d`, `s`, `x`) : 9 mots à attraper
(chat, lit, rat, grand, pied, tapis, souris, noix, doux) et 2 intrus (robe, lune). Le texte est
adapté CE1. Les quatre clés audio exactes `.../c1` à `.../c4` sont présentes dans
`production/voix.lock.json`, malgré `audio: null` dans le contenu.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurAttrape.test.tsx tests/unitaires/consignes-audibles.test.ts` :
  **PASS**, 11 tests (7 composant, 4 audio).
- Les tests ciblés couvrent les gestes de tap, le mélange de rendu, réponses correctes et refus,
  l’absence d’écran d’échec, l’aide de Gobi et la progression du moteur. Le manifeste confirme
  l’audibilité des consignes.

## Verdict

**RECETTE LOGIQUE PASS — PARCOURS VISUEL RÉEL NON EXÉCUTÉ**. Le tap et les refus sont couverts par
le composant contrôlé ; récompense finale et rendu tablette restent à confirmer dans le parcours
complet. Aucun défaut reproduit ; aucun test rouge ni correction de code. Aucun asset, snapshot,
compilation globale ou commit.
