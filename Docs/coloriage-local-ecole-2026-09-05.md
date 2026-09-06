# Coloriages locaux — École (`clairiere-01` et `clairiere-10`)

## Intégration finale par le principal — 5 septembre

Intégré pour essai local, image conservée. Le relevé du tableau ci-dessous était erroné :
il descendait sur les pieds et le sol. Le garde d'enveloppe existant l'a refusé, et une nouvelle
lecture du PNG a ramené le contour sur l'ardoise : `M126,188 L260,188 L268,278 L135,285 Z`.
Le test n'a pas été élargi. Les surfaces et centres du JSON sont recalculés sur ce tracé.
Les deux exercices sont joués par touchers natifs dans quatre formats ; la loupe est intégrée.
Preuves finales : `bac-a-sable/revue-coloriages-2026-09-05/clairiere-01.png` et `clairiere-10.png`.
Le reste de ce document est le rapport intermédiaire de l'agent, pas la mesure finale.

Ultime reprise : la comparaison de la scène peinte a invalidé aussi la porte (visage couvert)
et le banc (assise oubliée, terre incluse). Le principal a retracé ces deux objets depuis les
détails du PNG ; `tests/unitaires/coloriage-ecole-contours.test.ts` est rouge avant et vert après.
Le repère du banc, presque sur le bord inférieur du dossier, est désormais le pixel 300,660
dans l'assise. Il reste indépendant des centres calculés. Les anciens contours décrits ci-dessous
ne doivent plus servir de base de reprise.

Statut : **brouillon à relire avant promotion**. Le travail est strictement limité à
`contenu/brouillons/coloriages-locaux-2026-09-05/ecole/` ; aucun exercice, texte, identifiant,
image, moteur ou verrou n'a changé.

## Relevé

Le fond conservé est `contenu/assets/decors/ecole.png` (`1536 × 1024`, SHA-256
`e60ef6da6177aea9b2426757f06d91d253e0e9c11d3061326a51a0d1ed132d0e`). Les neuf cibles des
deux nœuds ont été observées sur ce raster : toit, porte, deux fenêtres, deux grands feuillages,
cardigan de la maîtresse, tableau et banc.

Les contours déjà exacts du toit, des fenêtres, du cardigan, du banc et des deux couronnes ont
été conservés. Deux frontières seulement ont été corrigées :

- `porte-ecole` ne couvre plus le couloir sombre à droite ; ses trois fragments suivent les
  panneaux bleus visibles autour de la maîtresse ;
- `tableau` suit désormais le quadrilatère de l'ardoise visible (`x 116..269`, `y 184..317`),
  au lieu d'un rectangle interne qui perdait ses bords bas et gauche.

Les surfaces et centres recalculés sont : porte `2 966` / `[401.75, 179.03125]`, tableau
`18 358.5` / `[191.8006645423101, 249.3700374939855]`. Les autres cibles gardent leur géométrie
déjà mesurée, car leurs contours correspondent au raster et aucune extension tactile artificielle
n'a été ajoutée.

`points-reperes.json` donne les neuf points intérieurs et extérieurs observés sur le PNG,
normalisés dans `[0,1]`. Le ratio raster est conservé par `preserveAspectRatio="xMidYMid meet"` :
leur contrôle tient compte du très léger décalage vertical du raster dans le viewBox `922 × 615`.

## Contrôle ciblé

Sans build ni suite globale : JSON lu avec succès ; 31 régions présentes ; zéro chemin ouvert,
région absente/non déclarée, divergence de surface ou centre hors région. Les neuf repères
intérieurs sont dans leur masque et les neuf repères extérieurs en sont hors.

La loupe prévue par le principal reste nécessaire pour le cardigan et les fenêtres : les masques
restent strictement bornés aux surfaces réellement peintes.
