# Proposition éditoriale — moteur histoire (2026-09-04)

Statut : **propositions non validées, non promues**. Aucun fichier de `contenu/exercices/` ni de
`contenu/habillages/` n’a été modifié. Les six brouillons associés sont dans
`contenu/brouillons/histoire-*.json`.

## Inventaire

Les 6 exercices du moteur `histoire` ont été recensés sur les 76 nœuds : `clairiere-09`,
`galeries-10`, `cite-des-histoires-01`, `cite-des-histoires-05`, `cite-des-histoires-11` et
`foret-muette-07`. Tous suivent la mécanique attendue (récit puis questions à choix), mais cinq
référencent dans leur texte des objets/personnages absents de l’image; le sixième (`galeries-10`)
référence cinq objets absents de la scène et demande en plus des couleurs qui ne portent plus la
compétence annoncée. C’est une divergence consigne/image, pas une erreur de moteur.

## Remplacements exacts proposés

| Nœud | Divergence constatée | Brouillon | Décision proposée |
|---|---|---|---|
| clairiere-09 | récit et questions parlent de lapin, pomme, tapis; l’habillage montre tente, feu, marmite, couverture, lune | `contenu/brouillons/histoire-clairiere-09.json` | remplacer le récit et c3–c5 par les éléments visibles; conserver phrases CE1 courtes |
| foret-muette-07 | récit parle de hibou, enfants, ours, livre; scène montre Plume, feu, arbres, lune | `contenu/brouillons/histoire-foret-veillee.json` | recentrer récit et questions sur Plume, feu et arbres; garder `flu.liaison` à vérifier |
| galeries-10 | récit parle de pot, bol, four, verre, sac; scène montre banc, cristaux, lampe, flaque; couleurs surchargent la lecture | `contenu/brouillons/histoire-galeries-echo.json` | remplacer récit et c2–c4/c7; recalculer les questions sourde/sonore après validation lexicale |
| cite-des-histoires-01 | pain, four, farine, sel, sac absents de la bibliothèque | `contenu/brouillons/histoire-cite-bibliotheque-01.json` | récit centré sur pupitre, livre, lampe, échelle, étagères |
| cite-des-histoires-11 | mot posé/dessin et personnages non représentés; inférence « ami » non étayée | `contenu/brouillons/histoire-cite-bibliotheque-02.json` | supprimer l’inférence « ami », revenir à pupitre/livre/étagère et questions littérales |
| cite-des-histoires-05 | question d’image demande une ombre de personnage, mais les silhouettes ne sont pas identifiables | `contenu/brouillons/histoire-cite-theatre-ombres.json` | demander drap, ombre, bougie et localisation; conserver `comp.image` sur éléments réellement visibles |

## Compréhension CE1 et ordre narratif

Les brouillons proposent une phrase par événement, un sujet explicite et des questions dans l’ordre
du récit. Le vrai/faux reste en première question lorsque le format est conservé, conformément à
D13; les questions de localisation et d’action suivent ensuite. Les distracteurs restent de même
nature et doivent être contrôlés par `estAuLexique` avant toute promotion. Les formes marquées dans
les brouillons (« marmite », « couverture », « pupitre », « étagère », etc.) doivent être validées
par le lexique CE1 et recevoir un clip audio avant mise en production.

## Ordre de validation parent

1. Valider l’alignement scène/récit de chaque brouillon.
2. Valider le lexique CE1 et l’ordre des questions.
3. Régénérer les clips audio et vérifier leur concordance avec les textes.
4. Promouvoir manuellement dans `contenu/exercices/` seulement après ces trois validations.

Les brouillons ne sont pas destinés à être chargés par l’application tant que le parent ne les a
pas relus.
