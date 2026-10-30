# Tri : les mots éparpillés sur le décor, partout comme dans la Clairière — 12 oct. 2026

Origine : retours du parent, tableau E16 (galeries-04) et E25 (galeries-13) :

> « Les mots sont dans l'ordre et pas mélangés, alors qu'on a un autre exercice pareil ailleurs qui
> mélange tout dans la scène. » — « Les mots sont dans l'ordre, alignés et pas mélangés, il faut
> faire comme dans la Clairière. » Et : « faudrait quand même mutualiser ».

C'est **le même moteur** (`tri`) dans la Clairière et dans les Galeries. Trois causes, toutes dans
le moteur, aucune dans le contenu.

## 1. L'ordre du fichier à l'écran

Le réducteur mélange bien les mots (`etat.elements`, par `Alea`), mais l'écran rendait
`contenu.elements` : l'ordre du fichier, c'est-à-dire tous les mots du premier panier puis tous
ceux du second. Sur le décor, chaque mot a sa place et l'ordre ne se voit pas ; en grille, il donne
la réponse. Corrigé : l'écran rend `etat.elements` (`MoteurTri.tsx`). Preuve :
`tests/composants/MoteurTri-ordre.test.tsx`, rouge avant, vert après. Les autres moteurs qui
mélangent (`assemble`, `chrono`, `eclair`, `histoire`, `paires`, `phrase`, `place`) rendaient déjà
l'ordre de l'état (recensé par recherche, 12 oct.).

## 2. Les Galeries n'avaient pas de place pour leurs mots

Mesuré (sonde, 55 cas nœud × format) : les Galeries posent leurs grottes en **haut** du décor
(`zone` y 60→300 sur 600), la Clairière ses paniers en **bas**. Le moteur cherchait toujours la
place des mots **au-dessus** des réceptacles : 64 px dans les Galeries, où 8 ou 12 mots ne
tiennent pas (`horsBornes` 8/8 et 12/12) — repli en grille alignée. Corrigé : `bandeDesMots` prend
la plus haute des deux bandes libres, au-dessus ou au-dessous des réceptacles ; c'est la géométrie
qui décide, jamais le nom du décor. Les panneaux sont mesurés après rendu (un critère sur deux
lignes, des fentes qui s'enroulent : 204 à 243 px là où l'estimation en réservait 189).

## 3. Une transition de 1 ms faisait tout basculer en grille

`global.css` / `composants.css` posent `transition-duration: 1ms` sur tout élément quand le
mouvement est réduit ou les animations éteintes. Les positions posées en ligne glissaient alors
pendant 1 ms ; la mesure après rendu lisait la position d'avant, voyait un panneau hors du cadre,
et la scène basculait en grille (55 cas sur 55 sous mouvement réduit). Corrigé : la géométrie du
plateau de `tri` ne se transitionne jamais (`tri.css`).

## 4. Le semis

Quand les régions du décor alignent les mots (centroïdes trop serrés, ou ramenés sur le bord de la
bande), les mots sont **semés en quinconce** dans la bande (`client/src/moteurs/tri/semis.ts`) :
au plus ⌈n/3⌉ mots sur une même ligne, aucun chevauchement (recalculé, pas affirmé), aucun tirage
aléatoire (suite fixe du nombre d'or). La région que chaque mot rallume reste celle du décor.

## Preuves

- `tests/e2e/parcours-tri-eparpille.spec.ts` : à 5 formats, Clairière et Galeries sur le décor, au
  plus ⌈n/3⌉ mots alignés — **5 rouges avant** (même la Clairière tombait en grille dans le banc),
  5 verts après ; et, à 2 formats × 5 nœuds, **aucun mot restant ne bouge après un dépôt** (10 verts).
- Inchangés et verts : `MoteurTri*.test.tsx` (16), `parcours-tri-decor`, `parcours-tri-tactile`,
  `parcours-glisser-et-toucher`, `parcours-cadrage-decors`, `parcours-tactile-exhaustif` sur tri.

## Ce qui reste

Avec les anciens réglages de lecture de la tablette (corps 27, interligne 2), quelques cas restent
en grille faute de place réelle (mesuré : clairiere-03 et galeries-13 en 800×1100, volcan-02/10,
cite-08). Ils sont revenus aux défauts du jeu (corps 24, interligne 1,6) le 12 oct. ; à remesurer
si le parent agrandit le texte. En grille, les mots sont désormais au moins mélangés.

## 12 oct., suite — retours du parent

- E16 validé (« c'est bon »). E25 : les cases des trois premiers mots étaient jaunes — la fente
  « prochaine » de l'étape courante, reste de l'époque où tri montrait ses étapes. Retirée de tri
  (prop `restantes` du panneau, sélecteur `[data-moteur='tri'] … [data-prochaine='oui']` de
  `phrase/fentes.css`) ; `phrase` garde la sienne.
- Côté des mots, mesuré sur les 11 tri (800×1100 et 1920×940) : Galeries = réceptacles en haut,
  mots en bas ; tous les autres = mots en haut, réceptacles en bas. Question T22 au parent.

## 12 oct., décision du parent (T22) — les paniers en haut, partout

« J'aime bien les paniers en haut, avec les mots en dessous […] c'est plus lisible par rapport à ce
qui est demandé. » Fait dans le moteur (`panneauxReceptacles`, `bandeDesMots`) : la zone du
contenu ne donne plus que l'ordre gauche/droite des paniers, jamais leur hauteur ; tous sont sur
une rangée en haut du décor (répartis à intervalles égaux s'ils se recouvrent), les mots dessous.
En grille aussi (`order: -1` dans `tri.css`). Le côté « dessus/dessous » choisi par la géométrie
est retiré. Garde : `parcours-tri-eparpille` « les paniers en haut » (11 tri × 3 formats, 9 rouges
avant).

Le mot pris ne passe plus en gras : il s'élargissait, la grille se réarrangeait et jusqu'à 16
éléments bougeaient au moment où le doigt allait au panier — 2 dépôts tactiles sur 44 perdus
(`parcours-tactile-exhaustif`, tri ×3), 66 sur 66 après. Garde : « prendre un mot ne déplace ni
les mots ni les paniers » (800×1100, 1100×700, 640×360, grande police), rouge avant, vert après.
