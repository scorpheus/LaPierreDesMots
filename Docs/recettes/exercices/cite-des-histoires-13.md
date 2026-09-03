# Recette — rang 75 / cite-des-histoires-13 / cite-des-histoires-pellicule-chrono-02

Date : 2026-09-03

## Périmètre

- Rang : `75`
- Nœud : `cite-des-histoires-13`
- Exercice : `cite-des-histoires-pellicule-chrono-02`
- Moteur : `chrono`
- Audio : explicitement hors campagne

L'enfant remet les vignettes de la pellicule dans la chronologie. Les noms et textes sont
français et adaptés CE1 ; les vignettes doivent être effectivement présentes, compréhensibles
et affichables sur tablette. L'aide Gobi indique la prochaine étape sans coût.

## Quatre preuves

1. **Identification et contenu** — le nœud de rang 75 référence l'exercice `chrono`, son
   habillage et les vignettes déclarées ; la chronologie attendue est portée par le contenu.
2. **Geste et mélange** — `tests/composants/MoteurChrono.test.tsx` couvre le tap et le chemin
   glisser-déposer ; le mélange est produit par l'aléa injecté et l'ordre n'est pas prévisible.
3. **Refus, aide et progression** — un ordre incorrect est refusé sans écran d'échec ni perte
   d'acquis ; l'aide est utile et gratuite, puis la fin valide la progression et la récompense.
4. **Résultat ciblé** — `npm test -- --run tests/composants/MoteurChrono.test.tsx` : **PASS**,
   suite ciblée. Aucun défaut rouge ni correction minimale n'a été reproduit. L'affichage réel
   des assets, la compréhension des vignettes, les zones tactiles et la lisibilité tablette
   restent à confirmer visuellement ; aucun snapshot n'a été lancé.

## Verdict

**FONCTIONNEL — À CONFIRMER TABLETTE/ASSETS.** Textes, noms, aide, chronologie, taps/glisser,
mélange, refus sans échec, progression et récompense sont couverts au niveau composant. Audio
hors campagne et non bloquant ; la livraison attend la validation visuelle et tactile.
