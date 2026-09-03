# Recette — foret-muette-06 / foret-muette-buee-grave-01

Date : 2026-09-02

## Périmètre

- Nœud : `foret-muette-06`
- Exercice : `foret-muette-buee-grave-01`
- Moteur : `grave`
- Habillage : `foret.buee`
- Audio : **hors campagne** (non vérifié ici)

Le contenu propose six consignes courtes et répétées (« Grave la lettre pour écrire ce mot »),
avec un mot CE1 et une lettre-cible à tracer dans la buée. L'aide Gobi déclare un guidage
visuel ; la consigne et le mot restent lisibles sans animation du champ de lecture.

## Quatre preuves

1. **Identification et contenu** — `contenu/noeuds/foret-muette-06.json` relie précisément
   le nœud à `contenu/exercices/foret-muette/buee-grave-01.json`, moteur `grave` et habillage
   `foret.buee`.
2. **Geste réalisable** — `tests/composants/MoteurGrave.test.tsx` monte le composant contrôlé
   et couvre le tap de la cible ; le moteur reçoit ensuite les points de tracé/gravure et
   valide l'ordre attendu. Le refus reste une réponse animée, jamais un écran d'échec.
3. **Aide, mélange et réussite** — l'aide visuelle est couverte, l'aléa injecté mélange les
   cibles, les doubles actions restent gratuites, les six étapes peuvent se terminer et le
   flux de réussite déclenche la récompense sans reprendre un acquis.
4. **Résultat ciblé** — `npm test -- --run tests/composants/MoteurGrave.test.tsx` : **PASS**,
   7 tests. Aucun test rouge ni défaut nécessitant une correction minimale n'a été reproduit.

## Limites

Le tracé sur tablette, le rendu tactile réel et le décor final n'ont pas été capturés ; aucun
snapshot, parcours navigateur ni audio n'a été lancé dans cette campagne. L'audio est
explicitement hors périmètre.

## Verdict

**FONCTIONNEL — À CONFIRMER TRACÉ TABLETTE / BLOQUÉ-ASSET si le décor de buée reste un
blockout.** Le texte CE1, l'aide, le geste de gravure, les refus sans échec et la fin réussie
sont couverts au niveau composant ; la livraison attend une validation tactile réelle et le
décor de production.
