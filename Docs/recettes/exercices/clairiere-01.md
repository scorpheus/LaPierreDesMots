# Recette — clairiere-01 / clairiere-ecole-01

Date : 2026-09-02

## Périmètre

- Nœud : `clairiere-01`
- Exercice : `clairiere-ecole-01`
- Moteur : `colorie`
- Habillage : `clairiere.ecole`

Le contenu déclare 4 consignes et 9 cibles : pull de la maîtresse (bleu), quatre feuilles
(vert), deux chevelures de garçons (brun), puis porte (jaune) et toit (rouge). Le nuancier
autorisé contient huit couleurs.

## Vérifications exécutées

- `npm test -- --run tests/composants/MoteurColorie.test.tsx` : **PASS**, 26 tests.
  La suite couvre notamment le mélange de l’ordre des cibles, les gestes de choix de couleur
  puis peinture, l’aide, l’absence d’échec et la fin de partie.
- `npx playwright test tests/visuel/noeud-colorie.spec.ts --project=visuel` : **BLOQUÉ** avant
  exécution des 3 parcours. Playwright ne trouve pas
  `C:\Users\scorp\AppData\Local\ms-playwright\chromium_headless_shell-1234\chrome-headless-shell.exe`.

## Verdict

**BLOQUÉ-OUTIL** — le parcours navigateur réel n’a pas pu être joué. Consignes, aides, gestes,
comptage effectif des zones dans le DOM, absence de particules résiduelles, récompense et rendu
tablette restent à confirmer dès que le navigateur Playwright fourni au projet est disponible.

Aucun défaut fonctionnel n’a été reproduit ; aucun test rouge ni correction de code n’est donc
justifié dans cette recette. Aucun snapshot n’a été régénéré et aucune image n’a été générée.
