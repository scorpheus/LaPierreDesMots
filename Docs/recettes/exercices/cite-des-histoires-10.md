# Recette — rang 72 / cite-des-histoires-10 / cite-des-histoires-fresque-murale-colorie-01

Date : 2026-09-03

## Périmètre

- Rang : `72`
- Nœud : `cite-des-histoires-10`
- Exercice : `cite-des-histoires-fresque-murale-colorie-01`
- Moteur : `colorie`
- Audio : explicitement hors campagne

L'exercice propose des consignes françaises CE1 pour colorier les régions d'une fresque
murale. Chaque région et sa couleur sont déclarées dans le contenu ; le choix de couleur et
le tap sur la région doivent être compréhensibles sur tablette. L'aide Gobi indique la cible
utilement et reste gratuite.

## Quatre preuves

1. **Identification et contenu** — le nœud de rang 72 référence l'exercice `colorie` et son
   habillage ; les régions et couleurs proviennent du contenu déclaré et sont rendues par
   l'asset de fresque.
2. **Geste et choix** — `tests/composants/MoteurColorie.test.tsx` couvre le choix de couleur
   puis le tap sur la région, avec ordre des cibles mélangé par l'aléa injecté. Les régions
   sont des zones tactiles accessibles.
3. **Refus, aide et fin** — une couleur inadéquate est refusée sans écran d'échec ni reprise
   d'un acquis ; l'aide est utile et gratuite, toutes les régions peuvent être peintes et le
   flux final déclenche progression et récompense.
4. **Résultat ciblé** — `npm test -- --run tests/composants/MoteurColorie.test.tsx` : **PASS**,
   suite ciblée. Aucun défaut rouge ni correction minimale n'a été reproduit. L'asset réellement
   rendu, les régions fermées, la lisibilité et la taille tactile tablette restent à confirmer
   visuellement ; aucun snapshot n'a été lancé.

## Verdict

**FONCTIONNEL — À CONFIRMER TABLETTE/ASSET.** Texte, régions, couleurs, taps, choix mélangés,
refus sans échec, aide, progression et récompense sont couverts au niveau composant. Audio
hors campagne et non bloquant ; la livraison attend la validation visuelle de la fresque et
des zones tactiles sur tablette.
