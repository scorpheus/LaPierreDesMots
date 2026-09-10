# Clôture de la campagne rouge du 10 septembre 2026

La passation de départ est conservée dans
`bac-a-sable/passation-campagne-rouge-2026-09-10.md`. Elle partait d'une campagne globale à
5 étapes rouges sur 15 et d'un arbre volontairement sale, composé des corrections et retours de
jeu du 9 septembre. Le présent lot réconcilie ces travaux sans restaurer ni écraser leurs fichiers.

## Corrections intégrées

- La dérivation du code parent fournit désormais à Web Crypto une copie portée par un
  `ArrayBuffer`, y compris lorsque le sel d'entrée repose sur un `SharedArrayBuffer`.
- Les plateaux Paires de seize cartes utilisent un gabarit PC compact fondé sur leur population.
  Les trois nœuds concernés tiennent à 1920 × 1080 et 1920 × 1200 sans réduire une cible sous
  144 px. Les réglages de lecture restent appliqués aux textes à déchiffrer sur PC.
- La recette autonome du Tri prépare son profil avant l'entrée dans le nœud.
- La simulation des récompenses est un vrai écran `dashboard`, avec une prise de retour de 64 px.
  Les boutons d'étoile et de région ouvrent chacun la fenêtre exacte attendue ; l'audit vérifie le
  titre, l'illustration, la fermeture et le retrait du dialogue avant de poursuivre.
- Les refus des moteurs restent stables, la correction parent du tracé distingue les deux sens,
  Assemble conserve son état et la remédiation pédagogique garde les acquis et les récompenses
  déjà obtenus. Les documents thématiques du 9 septembre décrivent séparément ces changements.
- Le rendu PC de la phrase, des paires et de la récompense tient au zoom navigateur de 100 %.
  Le fond raster remplace le double fond SVG du coloriage quand il existe.

## Références visuelles

Le parent a examiné la planche comparative
`bac-a-sable/verification-campagne-rouge/comparaison-visuelle.png` et a validé explicitement les
quatre divergences le 10 septembre 2026 : cour d'école, coloriage gris, coloriage presque terminé
et récompense. Seules ces quatre références ont changé. Les deux images de carte réécrites sans
différence par la commande globale `--maj` ont été immédiatement restaurées, puis les 13 captures
ont été comparées normalement avec la tolérance de 0,2 %.

## Défauts révélés par la première reprise globale

Une première campagne après le visa visuel a encore rendu rouge 2 parcours sur 914 et 1 contrôle
qualité sur 320. Ces rouges n'ont pas été masqués :

- la galerie de la visite parent attend maintenant son contenu asynchrone complet avant
  inventaire, et l'audit sait modifier un champ `type="search"` ;
- le cercle transparent réservé au clavier n'est plus confondu avec une prise tactile. Le vrai
  chemin dessiné reste mesuré par la composition et joué par le parcours tactile ; une vraie cible
  HTML de 20 px continue de faire mordre la sentinelle ;
- une image `loading="lazy"` hors écran, munie de dimensions réservées, ne bloque plus la mesure
  de géométrie. Les images visibles ou sans cadre restent attendues et le témoin d'image cassée
  continue d'être rejeté ;
- le repli SVG du coloriage emploie lui aussi `CercleAccessible`, afin de conserver 66 px pendant
  le chargement lent du dessin réel.

Les reprises discriminantes ont passé : visite parent, coloriage de la Cité sur téléphone,
contrôle du cercle clavier, coffre en téléphone portrait et témoin d'image paresseuse. Les familles
concernées ont ensuite passé 12/12 coloriages tactiles et 72/72 contrôles responsive.

## Preuve finale

`npm run qa:trompeurs` a analysé 297 fichiers et 2 316 cas : 0 bloquant, 93 avertissements pour un
plafond gelé à 93.

Le rapport faisant foi est `tests/rapports/RAPPORT.md`, écrit le
`2026-09-10T10:34:53.143Z` après `npm run verifier` : **15 étapes sur 15 sont vertes**, en
1 081,2 s. Il compte notamment :

- 2 736 tests unitaires, composants et API ;
- 655 validations de contenu ;
- 915 parcours et tests de robustesse E2E ;
- 13 comparaisons visuelles ;
- 321 contrôles de qualité ;
- 11 contrôles du bundle ;
- le rejeu inchangé des journaux et les contrôles QA finaux.

Les seuils de couverture par zone sont tous respectés. Aucun test n'est désactivé, aucune
assertion ni référence de rejeu n'a été assouplie, et aucune publication distante n'est effectuée
par ce lot.
