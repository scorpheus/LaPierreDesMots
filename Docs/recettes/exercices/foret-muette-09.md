# Recette — foret-muette-09 / foret-muette-feuilles-attrape-02

Date : 2026-09-03

## Périmètre

- Nœud : `foret-muette-09`
- Exercice : `foret-muette-feuilles-attrape-02`
- Moteur : `attrape`
- Habillage : déclaré par l'exercice
- Audio : **hors campagne**

Le contenu propose cinq étapes : mots contenant `s`, puis reprise, une consigne sur les mots
amis et feuilles, puis les mots « mots » et « arbres ». Les formulations sont courtes et
compatibles CE1 ; l'aide Gobi est déclarée avec guidage progressif.

## Quatre preuves

1. **Identification** — `contenu/noeuds/foret-muette-09.json` relie le nœud à
   `contenu/exercices/foret-muette/feuilles-attrape-02.json` et au moteur `attrape`.
2. **Geste** — `tests/composants/MoteurAttrape.test.tsx` couvre le tap d'une cible et le
   double-tap ; les boutons-cibles sont donc directement activables au doigt. Le mélange est
   déterministe grâce à l'aléa injecté dans le harnais.
3. **Parcours complet** — le réducteur conserve les acquis, permet d'atteindre les cinq fins
   d'étape, déclenche la réussite/récompense et ne rend jamais d'écran d'échec ; un refus reste
   une réponse réessayable sans perte d'acquis. L'aide est gratuite et progressive.
4. **Résultat ciblé** — `npm test -- --run tests/composants/MoteurAttrape.test.tsx` : **PASS**,
   7 tests (schéma, habillage, bonne/mauvaise réponse, aide, double-tap, réécoute). Aucun
   défaut rouge ni correction minimale n'a été reproduit.

## Limites

Audio explicitement hors campagne. Aucun parcours navigateur, rendu tablette, snapshot ou
asset n'a été lancé.

## Verdict

**FONCTIONNEL — À CONFIRMER TABLETTE / BLOQUÉ-ASSET si le décor de feuilles reste un
blockout.** Les textes CE1, l'aide, les taps, le mélange, les refus sans échec et la fin
réussie sont couverts au niveau composant ; la livraison attend la validation tactile et du
décor de production.
