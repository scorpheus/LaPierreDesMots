# Messages de refus sans déplacement du décor

Demande du parent : conserver les repères visuels lors d'une faute dans tous les exercices.
La place du retour doit être réservée avant la faute, avec les phrases existantes et la
typographie réellement rendue. Aucun contenu pédagogique ni règle d'acquisition ne change.

Plan du lot : l'orchestrateur possède le composant partagé et les moteurs ; l'agent
`syllabe_stable` possède uniquement `tests/e2e/parcours-refus-stables.spec.ts`.
L'orchestrateur seul lance les vérifications. Les tests sont ciblés sur la stabilité,
conformément à la demande de clôture économe du parent ; pas de nouvelle campagne générale.

Audit des 14 moteurs : trace et assemble réservent déjà les messages ; tri superpose son
retour avec une région d'annonce hors flux ; libre ne comporte aucun refus. À stabiliser :
attrape, chrono, éclair, grave, histoire, paires, phrase, le panneau visible de chemin,
ainsi que les rappels de sélection de colorie et place.

Inventaire avant écriture : 141 fichiers partage/src, 157 client/src, 25 serveur/src,
340 tests, 11 migrations, 76 exercices et 76 nœuds. Ces comptes de fichiers ne sont pas
les anciens comptes d'extensions du document de cadrage.

## Résultat

`MessageStable` superpose les dimensions de toutes les phrases de refus existantes avec
le texte visible. Le pseudo-texte de mesure est invisible et exclu de l'accessibilité ;
il hérite de la police et se replie selon la largeur réelle. Il ne duplique pas les
annonces. Histoire conserve sa zone même avant la première faute ; chemin réserve aussi
ses messages initiaux. Les deux rappels de sélection sont réservés de la même manière.

Six tests navigateur grave/histoire/phrase ont d'abord échoué sur leurs mesures de
géométrie, puis passé après correction. La famille totalise 24 cas réussis : 11 moteurs
sur téléphone et tablette, plus les deux contrôles assemble existants. Les deux cas tri
ont été retestés après avoir placé le panier dans le viewport avant la mesure : le
défilement automatique du tap n'est pas une modification de géométrie due à la faute.
Les mesures comparent les dimensions et positions effectives du dessin et des plateaux ;
les acquis, remplissages et objets placés restent exactement identiques après le refus.

228 tests de composants des moteurs passent, ainsi que TypeScript, lint ciblé et
construction de production. Le site local 8080 sert la nouvelle construction.
Aucune campagne complète relancée, aucun seuil ni référence visuelle modifié.
Journaux : `bac-a-sable/corrections-2026-09-09/refus-generaux-*.log`,
`refus-tri-cadre.log`, `messages-*.log`.
