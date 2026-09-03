# Recette — galeries-12 / galeries-paroi-libre-01

Date : 2026-09-03

## Constat de routage

Le fichier `contenu/noeuds/galeries-12.json` conserve `galeries-paroi-libre-01` comme fiche de
compatibilité technique, avec `"progression": false`. L'état actuel du produit traite le
chaudron comme une activité libre du campement :
`client/src/routeur.tsx` navigue vers `/chaudron` sans appeler `demarrerNoeud`, et
`client/src/ecrans/EcranChaudron.tsx` n'émet ni tentative pédagogique ni récompense de nœud.
Le nœud ne doit donc pas être joué comme un exercice `libre` ni compté comme une récompense.
La fiche est retirée des sorties, de la carte, du catalogue parent et de leur dénominateur ; elle
reste seulement chargeable par `/chaudron`. L'API refuse explicitement toute tentative qui
revendique `galeries-12`, donc elle ne peut ni être journalisée ni déclencher une récompense.

## Vérifications ciblées

- `tests/composants/MoteurLibre.test.tsx` : le composant couvre le tap de couleur, le tap de
  zone, la répétition, les particules et l'état de fin de l'activité libre.
- `tests/composants/EcranChaudron.test.tsx` : couvre le bouton « J'ai fini », le maintien sur
  l'écran avant validation et la navigation de retour. L'activité n'est pas une réponse
  correcte et ne journalise donc pas de récompense pédagogique.
- Les couleurs et zones sont mélangées par l'aléa injecté ; les actions hors cible restent
  sans écran d'échec. Audio hors campagne ; aucun snapshot ni parcours tablette exécuté.

## Défaut rouge / correction minimale

Le test rouge de `tests/api/sortie-sur-disque.test.ts` a d'abord constaté l'absence de
`progression: false`. La correction ne modifie ni le geste libre ni son contenu : elle exclut la
fiche de compatibilité des candidats, de la carte et du catalogue, et interdit son écriture dans
`tentatives`.

## Verdict

**ACTIVITÉ LIBRE FONCTIONNELLE — FICHE DE COMPATIBILITÉ HORS PROGRESSION.** Tap, couleurs,
zones, particules et bouton de fin sont couverts par les suites ciblées. Audio hors campagne ;
le rendu tablette et les assets de production restent à valider.
