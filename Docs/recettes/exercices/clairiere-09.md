# Recette — clairiere-09 / clairiere-veillee-histoire-01

Date : 2026-09-02

## Périmètre

- Nœud : `clairiere-09`
- Exercice : `clairiere-veillee-histoire-01`
- Moteur : `histoire`
- Habillage : `clairiere.veillee`

Le récit « La veillée dans la cabane » comporte huit phrases courtes et cinq questions,
avec deux choix mélangés par question. Les textes de questions, le récit et les choix sont
audibles via les contrôles de l'écran ; l'aide Gobi est déclarée (`relire-consigne`,
`souffle-syllabe`, `montre-cible`).

## Quatre preuves

1. **Contenu et texte** — `contenu/exercices/clairiere/veillee-histoire-01.json` déclare
   les cinq questions, leurs réponses et dix options ; `contenu/noeuds/clairiere-09.json`
   relie précisément l'exercice au nœud.
2. **Geste et mélange** — `tests/composants/MoteurHistoire.test.tsx` monte le vrai composant
   contrôlé et valide le choix par tap (`data-option`), avec ordre déterministe par `alea`
   injecté. Le double-tap est couvert et gratuit.
3. **Réussite sans échec** — la suite couvre bonne/mauvaise réponse, aide et réécoute ; le
   réducteur conserve les acquis, avance les cinq questions et ne rend jamais d'écran
   `data-etat="echec"`. La récompense est déclenchée à la fin par le flux de réussite.
4. **Résultat ciblé** — `npm test -- --run tests/composants/MoteurHistoire.test.tsx` : **PASS**,
   7 tests. Aucun test rouge ni défaut nécessitant une correction minimale n'a été reproduit.

## Limites de recette

Le rendu tablette réel, les captures et l'audio produit ne sont pas vérifiés ici : aucun
parcours Playwright, snapshot ou asset n'a été lancé.

## Verdict

**FONCTIONNEL — À CONFIRMER TABLETTE / BLOQUÉ-ASSET si le SVG de la veillée reste un
blockout.** Le récit, les cinq questions, les taps, le mélange injecté, l'aide, l'absence
d'échec et la fin réussie sont couverts au niveau composant ; la livraison attend la validation
du décor de production et du rendu sur tablette.
