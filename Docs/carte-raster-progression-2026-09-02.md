# Carte raster — prises et grisaille

## Constats du retour parent

La carte affichait `contenu/assets/ouverture/pierre.png` (1536 × 1024), mais les six prises
gardaient les coordonnées de `carte-monde-v3.svg` (1200 × 800). Elles tombaient donc hors des
paysages correspondants. Surtout, `VoileGrisaille` n'était monté que lorsque le PNG échouait à se
charger : la carte normale ne pouvait jamais devenir grise.

Le retour parent suivant a aussi relevé deux faux territoires très lisibles au nord : un glacier
et une montagne verte avec lac. La variante `contenu/assets/decors/carte-six-regions.png` remplace
ces deux pôles par des collines boisées lointaines et brumeuses. Une seconde passe retire aussi
les deux routes de gemmes cyan et vertes qui menaient encore vers ces destinations supprimées.
Les six destinations restantes, leurs chemins et leurs ancres sont conservés ; l'illustration du
récit d'ouverture n'est pas modifiée.

## Ancres retenues

Les coordonnées suivantes sont dans le `viewBox` 1200 × 800 de `Parchemin`, après mesure du PNG :

| Région | Ancre | Repère visuel |
| --- | --- | --- |
| La Clairière | 600, 470 | Pierre lumineuse et pré central |
| Les Galeries | 990, 560 | Grotte de cristaux au sud-est |
| Le Marais Jumeau | 1040, 370 | Eaux et îlots à l'est |
| La Forêt Muette | 990, 150 | Bois violet au nord-est |
| Le Volcan | 165, 590 | Cône et coulée au sud-ouest |
| La Cité des Histoires | 160, 395 | Ruines et tours à l'ouest |

Ces ancres servent à la fois aux prises tactiles, aux sceaux et au départ de la révélation : il n'y
a plus de seconde table SVG susceptible de les décaler.

## Stratégie de grisaille et de recoloration

`CarteRasterProgression` dessine le même PNG deux fois, dans le même `viewBox` :

1. la couche de fond reçoit `feColorMatrix type="saturate" values="0"` : zéro saturation sur
   tous les pixels, y compris le halo de la Pierre ;
2. une seconde couche, en couleur, est découpée par un contour placé sur chacun des six paysages
   réels du raster ;
3. à 0 %, aucune seconde couche n'est rendue ; entre 0 et 100 %, un masque radial doux, né de
   l'ancre de la région, découvre une portion croissante ; à 100 %, le contour entier est rendu.

Les contours ne réemploient pas les formes du SVG historique : ils auraient de nouveau voilé ou
révélé le mauvais lieu. Le voile est strictement décoratif (`aria-hidden` et sans prise) ; les
prises restent au-dessus et gardent leur taille et leur comportement existants.
