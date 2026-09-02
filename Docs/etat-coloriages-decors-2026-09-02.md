# État des cinq coloriages illustrés — 2 septembre 2026

## Résultat de la vague autonome

Cinq compositions neuves sont conservées dans `contenu/brouillons/coloriages-decors/`. Elles ne
sont ni publiées, ni référencées par un habillage livré : leur activation attend la validation
visuelle du parent, conformément à la porte humaine de la chaîne d’assets.

| Scène | Candidat retenu | SHA-256 du fichier | Lecture visuelle |
|---|---|---|---|
| École | `ecole-v1.png` | `D7A8156C4F4DB1CAF4A2D8DE12DAD7E7D3DE2B57A64A175B0C673FDA71D8DDAB` | maîtresse, quatre enfants, quatre arbres, deux fenêtres, porte, toit, ballon et banc présents |
| Tapis | `tapis-v1.png` | `B66D2D0C203C0465E51054EB1BECF7B2C549051FC8CE4A23DD118DF8CE06F895` | nid, chat, rat, arbre entier et feuilles isolées présents |
| Brume | `brume-v1.png` | `B7C460940D941068A8D78965D558483C80755850B66EF01E0E2682482E912916` | caillou, mouche agrandie, souris, poule, roue, chemin et ciel présents |
| Forge | `forge-v2.png` | `1CC0FC1A2084C6757C72817073646DC6EAA1BBB4D9169A8567C68D2D3A99D948` | les deux faux oiseaux de V1 sont retirés ; un oiseau unique et un chapeau lisible restent |
| Fresque | `fresque-v1.png` | `32E6D574F984718A5E4FD14F40FA851940F485310A66995FCC8748E99067C8BD` | les huit cibles sont présentes ; les pots de peinture demandent une vérification d’ambiguïté au doigt |

`forge-v1.png` reste archivée comme essai rejeté, sans être candidate à la publication. Les
images font toutes 1 536 × 1 024 pixels, soit le rapport 3:2 de la tablette en paysage.

## Mesure mécanique avant dérivation

Le pipeline `scripts/coloriages/pipeline.mjs` a été exécuté sans SVG dans
`bac-a-sable/coloriages-decors/`, seuil d’encre 200 et aire minimale 16. Ces nombres décrivent la
segmentation brute ; ils ne sont pas le nombre de cibles que verra l’enfant.

| Candidat | pixels d’encre | régions fermées | composantes ouvertes | boîtes ≥ 77 × 77 px source |
|---|---:|---:|---:|---:|
| École V1 | 129 595 | 352 | 5 | 22 |
| Tapis V1 | 126 234 | 288 | 11 | 13 |
| Brume V1 | 198 102 | 830 | 82 | 12 |
| Forge V2 | 185 881 | 584 | 43 | 37 |
| Fresque V1 | 249 415 | 1 665 | 103 | 17 |

Conclusion : les grandes zones nécessaires existent, mais l’anticrénelage et les détails internes
créent beaucoup de poussière. Comme pour le chaudron, la publication devra construire un masque
à **45 identifiants sémantiques seulement**, jamais exposer automatiquement toutes les
composantes détectées. La Fresque est la plus coûteuse à détourer ; Brume demande de contrôler en
premier la petite mouche.

## Corrections de cohérence déjà faites

Les nuanciers des quatre habillages Tapis, Brume, Forge et Fresque ne contenaient pas toutes les
couleurs réellement proposées par leur exercice. Ils sont désormais synchronisés, et
`tests/unitaires/nuanciers-coloriage-coherents.test.ts` empêche le défaut de revenir sur n’importe
quel coloriage livré.

Le jeu de placement de l’école emploie maintenant l’illustration `assets/decors/ecole.png` déjà
validée comme fond. Les trois zones actives restent des polygones SVG rendus au-dessus : l’image
n’est pas utilisée pour décider où tombe le doigt. Le générateur `scripts/dessiner-decors.mjs`
reproduit ce montage, afin qu’une régénération ne rétablisse pas le blockout.

Les cinq petits dessins SVG déjà jugés simples mais fonctionnels ont été promus vers
`contenu/assets/objets/`, verrouillés dans `production/assets.lock.json` et sont désormais
réellement affichés dans la réserve puis sur le décor. Un contrôle de contenu refuse dorénavant
toute référence `asset` vers un fichier absent ; auparavant ces cinq chemins étaient déclarés
sans fichier livré.

Une piste raster plus illustrée est conservée dans `contenu/brouillons/assets/objets-raster/` :
soleil, ballon, oiseau et parapluie ont un fond alpha exploitable. Les trois essais de poisson ont
été rejetés (halo pour le premier, damier de transparence peint dans les pixels pour les deux
suivants). Aucun de ces essais raster n’est publié : le SVG fiable reste préférable à un faux fond
transparent.

## Portes encore fermées

1. Validation visuelle parent des cinq candidats, en particulier l’unicité du pot de la Fresque
   et la lisibilité de la mouche de Brume.
2. Arbitrage éditorial de « Le feu est très chaud. », qui exige aujourd’hui `orange` sans nommer
   cette couleur.
3. Arbitrage pédagogique des groupes « garçons » et « filles » de l’école ; l’image ne doit pas
   demander à l’enfant de déduire le genre d’une coiffure.
4. Après ces accords seulement : sélection des 45 composantes, masque RGB indexé, fond gris,
   trait transparent, empreinte des pixels décodés, verrou d’assets, branchement et captures de
   référence.

Les prompts bruts de cette première exploration existent dans l’historique de génération mais
n’avaient pas encore de journal sur disque. Ils ne sont donc pas présentés comme reproductibles.
Au prochain rendu accepté, le prompt exact, la référence, l’empreinte de pixels et l’identifiant
de génération devront entrer dans `production/assets.lock.json` avant publication.
