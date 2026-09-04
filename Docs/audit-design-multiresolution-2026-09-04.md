# Audit de design multirésolution — 4 septembre 2026

Ce document consolide la campagne visuelle lancée après le premier lot responsive. Il distingue
deux propriétés qui avaient été confondues : **rester utilisable sans rognage** et **présenter une
composition réellement adaptée**. Le premier lot prouvait surtout la première ; cette campagne
mesure la seconde.

## Couverture réellement observée

- 76 exercices ouverts par leur recette QA sur 6 cadres CSS : `360×640`, `640×360`, `720×1017`,
  `1017×640`, `800×600`, `1920×1080` — **456 rendus stabilisés**.
- 13 états persistants de la coque sur les mêmes 6 cadres — **78 rendus stabilisés**.
- La fiche modale du coffre sur les 6 cadres — **6 rendus supplémentaires**.
- Total de la campagne : **540 états-formats observés**.
- Stabilisation : `document.fonts.ready`, fin de chargement ou d'erreur des images, décodage des
  images valides, puis deux `requestAnimationFrame`.

Les captures et rapports ligne par ligne restent dans
`bac-a-sable/audit-design-multiresolution/`. Les conclusions ci-dessous, qui commandent la suite,
sont conservées ici parce que `bac-a-sable/` n'est pas versionné.

## Défauts prioritaires

### P0 corrigé — les six coloriages perdaient presque toute leur scène en paysage téléphone

L'audit visuel avait signalé `clairiere-01`, `clairiere-10` et `marais-jumeau-08`. La garde
automatique ajoutée ensuite a montré que les six nœuds `colorie` étaient touchés : leur scène
tombait uniformément à **56 px de haut** dans `640×360`. Le gabarit commun place désormais scène
et palette en deux colonnes sous 520 px de hauteur ; la scène conserve au moins 160 px de haut et
200 px de large, tandis que les godets gardent 64 px. Une capture réelle de `clairiere-01` mesure
environ 313×208 px après correction.

### P1 — la coque est techniquement responsive, mais plusieurs écrans ne sont pas composés

- **Campement — corrigé, validation parent requise** : le mode téléphone transformait l'image de
  1586×992 en plateau fixe de 640 px à faire défiler dans un écran de 360 px. Le décor entier garde
  maintenant son rapport natif sans scrollbar interne. En paysage court, la navigation tient sur
  une ligne et la hauteur disponible borne la scène : à `640×360`, le campement complet occupe
  environ 396×248 px sous l'en-tête au lieu d'être coupé. Les prises restent à 64 px conformément
  à R16.
- **Carte** : en paysage téléphone, le panneau « Où veux-tu aller ? » domine la carte et possède
  son propre scroll. La carte doit rester le héros sur au moins 50 à 60 % de la largeur ; la page
  doit porter le seul scroll.
- **Récompense — corrigée, validation visuelle à refaire** : l'action de continuation était sous
  le pli à `360×640`, `640×360` et `800×600`. Elle suit maintenant immédiatement la scène de
  victoire ; sous 700 px de largeur ou de hauteur, Gobi, le titre et les étoiles adoptent un
  gabarit compact sans réduire les cibles de 64 px. Les explications restent après l'action.
- **Réglages de lecture — corrigés, validation parent requise** : l'en-tête emploie maintenant
  une typographie fluide et garde ses deux commandes sur la même ligne compacte ; les cartes
  réduisent uniquement leurs marges sur petit écran.
- **Dashboard et galerie parent — corrigés** : en-têtes et onglets se recomposent à 360 px, les
  cartes et tableaux suivent la largeur disponible et l'écran racine ne crée plus de sous-scroll.
- **Fiche du coffre — corrigée, validation parent requise** : le focus de la sortie faisait
  défiler la modale jusqu'en bas dès son ouverture, donc coupait le titre. Le focus utilise
  désormais `preventScroll`; en paysage court, titre, objet, explication et sortie tiennent
  ensemble sans sacrifier la cible de 64 px.

### P1 — les gabarits de moteurs ont des défauts communs

- `eclair` — corrigé, validation visuelle à refaire : l'aide et la progression occupaient deux
  calques absolus au même sommet. Ils partagent désormais une bande structurée ; le téléphone
  conserve le rang d'étape et une commande courte « Voir/Revoir » de 64 px.
- `tri` — corrigé : règle, éléments et bacs restent visibles ensemble sur petits écrans.
- `assemble`, `grave`, `trace`, `chemin`, `histoire` — corrigés sur les captures ciblées téléphone :
  les assemblages et mots sont centrés, les règles variables sont isolées et aucun cartouche ne
  recouvre désormais les choix.
- Les grands écrans étirent trop certains exercices et diluent leur hiérarchie.

La correction doit se faire **par moteur partagé**, jamais par 76 exceptions locales.

### P1 — dette artistique et éditoriale encore visible

- Les PNG déjà produits sont désormais raccordés automatiquement aux scènes régionales : 47
  correspondances existent, tandis que le SVG conserve les zones interactives et sert de repli.
  Quatre décors encore absents sont préparés pour une validation parent en un seul lot.
- L'inventaire mécanique ne trouve aucun chemin image cassé. Les 249 champs `asset: null` sont à
  trier par famille : certains moteurs demandent volontairement du texte, les vrais besoins
  picturaux doivent être mutualisés plutôt que générés un par un.
- 6 nœuds parlent d'« images » alors que le contenu visible est constitué de phrases ; une consigne
  d'appariement décrit également une mécanique différente de celle rendue.

## Contrat de composition pour la suite

1. Trois régimes explicites : portrait compact, paysage compact, confort/tablette-bureau ; des
   valeurs fluides relient les trois, sans supposer un appareil précis.
2. Un seul scroll principal. Un scroll interne n'est permis que pour une longue liste adulte et
   doit être visuellement annoncé.
3. Le contenu héros (carte, campement, dessin de l'exercice, récompense) passe avant l'en-tête et
   les panneaux secondaires.
4. Une cible enfant reste à 64 px. La masse visuelle du bouton peut être réduite sans réduire sa
   surface tactile.
5. Toute capture de validation attend polices, chargement **et décodage** des images avant de juger
   la mise en page.
6. Les gardes automatiques ajoutent des assertions de composition : rapport du héros, absence de
   sous-scroll, première action visible et part du viewport occupée — pas seulement absence de
   rognage.

## Ordre d'implantation

1. Campement et carte : les deux hubs qui donnent l'impression générale du jeu — première
   correction implantée, validation parent encore requise.
2. Gabarit `colorie` P0 — corrigé ; puis `eclair` et `tri`.
3. Récompense, réglages, fiche coffre et outils parent.
4. Autres gabarits de moteurs — passe téléphone implantée ; validation tablette réelle à faire.
5. Valider les quatre nouveaux fonds puis promouvoir uniquement ceux acceptés ; auditer ensuite
   les familles d'objets réellement picturales.
6. Nouvelle campagne complète sur les 540 états-formats, puis test parent sur téléphone et tablette.
