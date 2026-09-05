# Production visuelle — vague du 2 septembre 2026

## Rectification des compagnons — 5 septembre 2026

Les portraits décrits plus bas comme Filou V3 et Bulle, Roc, Plume V2 ont été remplacés après que
le parent a identifié la planche réellement validée. La référence qui fait désormais foi est
`production/personnages/reference-compagnons-validee-2026-09-04.png` : Bulle y possède une
silhouette féminine et une longue chevelure d'eau ; Roc porte de la mousse et de petites plantes.
Les quatre PNG publiés sont des découpes exactes de cette planche, pas des régénérations. Les
anciens atlas animés ont été désactivés jusqu'à leur déclinaison depuis ces nouvelles canoniques.

## État de publication

Le générateur d'images intégré à Codex a produit cette vague à partir du campement V6. Le parent a
explicitement validé la nouvelle carte du monde, puis demandé de réaliser toute la suite proposée.
Les cinq tableaux sont donc publiés dans `contenu/assets/ouverture/` : `pierre.png`,
`grisaille.png`, `noms.png`, `habitants.png` et `appel.png`. Chaque image conserve un repli SVG ;
les cinq PNG sont également embarqués dans l’APK autonome. Le verrou consigne l’empreinte des
pixels des quatre nouvelles publications et laisse intacte l’entrée Pierre déjà validée.

Le 2 septembre, le parent avait retenu Filou V3 et les V2 de Bulle, Roc et Plume. Cette première
publication est désormais remplacée par la référence rectifiée du 5 septembre décrite en tête de
ce document.

La carte illustrée validée est le tableau `contenu/assets/ouverture/pierre.png`. Son sujet est la
carte complète — la Pierre au centre et les six régions qui en partent — et elle est également
servie par l'écran « La carte du monde » en raster. Le SVG historique ne reste qu'un repli local
si ce PNG est indisponible ; il ne doit plus recouvrir l'illustration validée.

Le parent a enfin validé les cinq décors. Ils sont publiés dans `contenu/assets/decors/` sous les
noms `ecole.png`, `tapis.png`, `brume.png`, `forge.png` et `fresque-murale.png`. Ils deviennent les
références visuelles canoniques de leurs scènes. Leur activation dans les coloriages reste soumise
à la porte mot/objet décrite dans `Docs/publication-decors-valides-2026-09-02.md` : une belle image
ne doit jamais rendre une consigne pédagogiquement fausse.

Les premiers essais de Filou sur fond sombre sont rejetés : le fond transparent demandé n'a pas
été produit et le contraste poussait le dessin vers un cartoon numérique. La V3 repart donc de la
V2 validable et ne renforce que modérément le pelage.

## Prompts finaux

Tous les tableaux et décors partagent ce socle : illustration jeunesse éditoriale française,
dessin organique précis, aplats mats légèrement texturés, contours bleu nuit doux, lumière naturelle
fraîche, paysage 3:2, aucun texte ni lettre, aucun cadre ni filigrane ; éviter filtre jaune, peinture
à l'huile, aquarelle floue, 3D, patchs de couleur, halo et vignettage. Les références sont le
campement V6 et la Pierre publiée.

Variantes d'ouverture :

- **Grisaille** : paysage dont les couleurs se retirent doucement depuis les bords ; fragments de
  la Pierre encore colorés au centre, image pleine d'espoir.
- **Noms** : enfant non genré vu de dos lisant un livre ; formes lumineuses abstraites, jamais des
  lettres, qui recolorent un pré, un arbre, un oiseau et une maison.
- **Habitants** : exactement Gobi, Filou, Bulle, Roc et Plume au campement, silhouettes et attributs
  distincts, accueillant l'enfant.
- **Appel** : Gobi tend la main à l'enfant vu de dos ; un sentier mène à la Clairière qu'un éclat
  rallume en couleurs.

Variantes de décors :

- **École** : école en bois bleu et pierre, maîtresse adulte reconnaissable, tableau vide, préau,
  banc, marelle sans chiffres, ballon, cartables, arbre et fleurs ; 25 à 35 formes séparées.
- **Tapis** : trois troncs différents, grandes feuilles d'automne séparées, glands, champignons,
  pierres et chemin vers une cabane.
- **Brume** : eau turquoise, saule, barque, ponton, nénuphars et roseaux ; deux nappes de brume
  horizontales qui ne cachent pas les objets.
- **Forge** : enclume sur billot, marteau, foyer sûr, seau, soufflet, pinces et cristaux ; objets
  largement espacés.
- **Fresque** : rue de pierre claire, grand mur avec trois scènes sans texte, échafaudages sûrs,
  pots, pinceaux, fanions, fenêtres et fleurs.

Prompt final de Filou : conserver presque à l'identique l'identité, la pose, les yeux simples, la
loupe et le foulard turquoise de la V2 ; rendre seulement le pelage environ 15 % plus soutenu, plus
orangé sable et un peu plus contrasté ; mêmes aplats mats et contours organiques ; personnage entier
centré sur fond blanc pur, sans halo, ombre, décor, texte, peinture, 3D ni esthétique Disney/Pixar.

Ce paragraphe décrivait les versions du 2 septembre désormais remplacées. Le contrat courant est
celui de la planche canonique rectifiée : Bulle a une silhouette féminine et une chevelure d'eau,
Roc porte de la mousse et des feuilles, Filou conserve sa loupe et Plume sa sacoche.

## Publication technique des compagnons

La référence validée possède un fond crème texturé. Chaque quadrant de 627 × 627 est découpé sans
redessin, puis détouré avec `scripts/images/detourer-fond-clair-connecte.mjs` : seul le fond clair
relié aux bords devient transparent, avec une transition alpha sur l’anticrénelage. Le cadrage
transparent conserve 24 px autour du sujet afin que le personnage reste grand et entier dans ses
cartes. La procédure repart directement de la planche suivie du quadrant :

```text
node scripts/images/detourer-fond-clair-connecte.mjs production/personnages/reference-compagnons-validee-2026-09-04.png contenu/assets/compagnons/filou.png haut-gauche
node scripts/images/detourer-fond-clair-connecte.mjs production/personnages/reference-compagnons-validee-2026-09-04.png contenu/assets/compagnons/bulle.png haut-droit
node scripts/images/detourer-fond-clair-connecte.mjs production/personnages/reference-compagnons-validee-2026-09-04.png contenu/assets/compagnons/roc.png bas-gauche
node scripts/images/detourer-fond-clair-connecte.mjs production/personnages/reference-compagnons-validee-2026-09-04.png contenu/assets/compagnons/plume.png bas-droit
```

Le test `assets-compagnons-raster.test.ts` bloque le retour d’un fond opaque, une sortie vide ou
une modification de dimensions et d’empreinte.

Le référentiel `contenu/monde/compagnons.json` porte désormais les PNG. `Compagnon.tsx` lit ce
chemin au lieu de redessiner une silhouette géométrique. Le même portrait est utilisé dans la tuile
et dans sa fiche ; avant la rencontre, `saturate(0)` conserve la Grisaille prévue par la v2.

Les portraits ne sont pas ajoutés à l’écran des profils : cet endroit représente l’enfant, pas le
compagnon qu’il rencontrera plus tard. Les mélanger rendrait l’identité du joueur ambiguë.
