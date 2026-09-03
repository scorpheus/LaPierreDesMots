# Production visuelle — vague du 2 septembre 2026

## État de publication

Le générateur d'images intégré à Codex a produit cette vague à partir du campement V6. Le parent a
explicitement validé la nouvelle carte du monde, puis demandé de réaliser toute la suite proposée.
Les cinq tableaux sont donc publiés dans `contenu/assets/ouverture/` : `pierre.png`,
`grisaille.png`, `noms.png`, `habitants.png` et `appel.png`. Chaque image conserve un repli SVG ;
les cinq PNG sont également embarqués dans l’APK autonome. Le verrou consigne l’empreinte des
pixels des quatre nouvelles publications et laisse intacte l’entrée Pierre déjà validée.

Le parent a ensuite validé Filou V3 — le compromis plus soutenu entre les deux propositions — et
les V2 de Bulle, Roc et Plume. Ils sont publiés dans `contenu/assets/compagnons/`.

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

Les trois autres compagnons reprennent le même contrat de personnage entier sur fond blanc : Bulle,
ondine bleu lagon avec son livre ; Roc, golem gris chaud moussu avec burin et tablier bleu pétrole ;
Plume, oiseau bleu à poitrine crème avec sacoche. Leur V2 impose de petits yeux noirs mats, une
bouche simple, aucune proportion chibi et trois valeurs maximum par couleur. Les V1 aux grands yeux
restent rejetées ; les V2 ont été validées et publiées le 2 septembre 2026.

## Publication technique des compagnons

Les sources validées avaient un fond blanc opaque. Elles ont été détourées mécaniquement avec
`scripts/images/detourer-fond-blanc.mjs` : seul le fond clair connecté aux bords devient transparent,
avec une transition alpha sur l’anticrénelage. Les quatre sorties restent à leur définition native
de 1086 × 1448. Le test `assets-compagnons-raster.test.ts` bloque le retour d’un fond opaque, une
sortie vide ou une modification de dimensions.

Le référentiel `contenu/monde/compagnons.json` porte désormais les PNG. `Compagnon.tsx` lit ce
chemin au lieu de redessiner une silhouette géométrique. Le même portrait est utilisé dans la tuile
et dans sa fiche ; avant la rencontre, `saturate(0)` conserve la Grisaille prévue par la v2.

Les portraits ne sont pas ajoutés à l’écran des profils : cet endroit représente l’enfant, pas le
compagnon qu’il rencontrera plus tard. Les mélanger rendrait l’identité du joueur ambiguë.
