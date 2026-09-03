# Lot formulations CE1 — 3 septembre 2026

## Périmètre

Relecture des 76 fiches d'exercice (283 consignes). Les formulations directement affichées à
l'enfant ont été clarifiées sans modifier les gestes, les réponses attendues, les compétences ou
les critères internes du moteur. L'audio reste hors périmètre, conformément à l'arbitrage du parent.

## Corrections

- lucioles : la couleur ou le son est nommé dans la consigne, et les voyelles demandent d'abord de
  lire le mot puis de toucher le son qu'il contient ;
- sons de mots : « le même son que dans « chat » » remplace « le son de chat », y compris pour les
  variantes « aussi » et « pas » ;
- ordre : ajout de « pour construire la phrase » ;
- paires : « Trouve un autre mot et son image » remplace « Trouve aussi… » ;
- éclair : « le mot que tu viens de lire » ;
- écriture : « Trace la lettre pour écrire ce mot » ;
- pluriel : les deux mots sont explicitement cités (« amis » et « feuilles »).

## Garde

`tests/unitaires/formulations-ce1.test.ts` parcourt les consignes des 76 fiches et refuse les
formulations abstraites ou grammaticalement trompeuses bannies par ce lot. Vérification exécutée le
03/09/2026 : garde verte, puis `npm run test:contenu` vert (620 contrôles, 0 problème).

Les champs internes `critere` et les titres techniques conservent leur vocabulaire phonologique :
ils ne sont pas rendus comme consignes enfant et leur modification risquerait de changer le moteur.
