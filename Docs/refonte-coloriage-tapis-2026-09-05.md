# Refonte du coloriage du tapis — proposition, non publiée

## Retour et diagnostic

Le parent réussit `foret-muette-08` uniquement grâce à l'aide qui entoure des ornements du tapis.
L'image nomme six « feuilles » alors qu'elle montre de petits motifs floraux ressemblants, au
milieu d'une forêt pleine de vraies feuilles. « En haut à gauche » peut désigner l'image entière
ou le tapis. Ce n'est pas une difficulté de lecture CE1 : c'est une ambiguïté de représentation.

Le parcours tactile savait sélectionner les pixels parce que son oracle lit les identifiants des
cibles. Il ne prouve donc pas leur reconnaissance sans oracle. La réussite mécanique de ce nœud
reste vraie, sa validation pédagogique est rouverte. Les autres lots continuent dans la file.

## Proposition à valider avant intégration

**La proposition v1 est refusée par le parent pour son style 3D/catalogue**, trop éloigné des
décors. Elle est conservée comme essai écarté, pas comme référence ni candidate à intégrer.
La v2 repart directement des deux décors approuvés `ecole.png` et `tapis.png` comme références
de trait et de matière, sans réutiliser la v1. Sortie :
`contenu/brouillons/coloriage-tapis-2026-09-05/tapis-objets-v2.png`. Elle attend la validation.

Conserver la forêt et le tapis, mais remplacer les six ornements par six objets uniques, grands
et séparés. Les consignes ne demandent plus d'interpréter un repère spatial ambigu.

| Ordre | Consigne proposée | Critère visuel sans couleur |
|---|---|---|
| 1 | Colorie le tapis en brun. | Un seul tapis uni, sans petits dessins |
| 2 | Colorie le chat en noir. | Un vrai chat entier, pas un motif imprimé |
| 3 | Colorie le bol en violet. | Bol large sans anse, distinct du pot |
| 4 | Colorie le sac en vert. | Sac à dos avec bretelles et rabat |
| 5 | Colorie le pot en rouge. | Pot de fleurs vide, haut et évasé |
| 6 | Colorie le ballon en jaune. | Gros ballon rond isolé |
| 7 | Colorie le banc en orange. | Banc complet avec assise, dossier et pieds |

Les sept couleurs et le nombre de gestes restent inchangés. Le travail de lecture des mots et
des couleurs est conservé ; plusieurs mots portent une finale muette (tapis, chat, pot, banc).
La couverture par le lexique local doit être mesurée avant publication des textes ; ce contrôle
n'équivaut pas à une certification pédagogique officielle.

## Critères de recette après validation

- Montrer la scène en gris à taille tablette, sans halo et sans nom superposé : chaque nom doit
  correspondre à un seul objet reconnaissable, sans lire les identifiants techniques.
- Le toucher et la recoloration suivent la silhouette réelle ; pas un cercle invisible ni un
  rectangle arbitraire. Les objets ne se recouvrent pas.
- Mesurer la taille des vraies régions peintes, distincte des commandes de repli au clavier.
- Refaire les sept masques, les libellés d'habillage et les voix concernés ensemble. L'ancienne
  géométrie du tapis ne peut pas servir au nouveau dessin.
- Rejouer les sept couleurs, le refus doux d'une mauvaise cible, l'aide seulement sur demande,
  les deux orientations et les réglages de lecture agrandis.
- Ne pas présenter ce nouvel asset comme intégré avant ces vérifications et l'accord du parent.

## Proposition v2 : style des décors existants

Source du générateur intégré :
`C:/Users/scorp/.codex/generated_images/01a05e88-9add-7841-bd8b-5df709b2e35b/exec-bc33c139-95fb-4536-820c-4436f32e3cb5.png`.
Copie de brouillon 1536 × 1024, SHA-256 du fichier :
`CD7C1200BD753FAB478C4880911EC7F63AA47DD898D96804C5FF27F87B558FC3`.
Le prompt exact est conservé dans
`contenu/brouillons/coloriage-tapis-2026-09-05/prompt-v2.txt`.

La comparaison `bac-a-sable/coloriage-tapis-2026-09-05/comparaison-gris-v2.png` présente deux
vignettes de 488 px, images décodées avant capture. Le tapis est uni ; chat, bol, pot, sac,
ballon et banc sont distinguables sans leur couleur. Le trait fin et les matières mates se
rapprochent des références, contrairement au volume 3D de la v1. **Jugement esthétique final au
parent.** Le ballon reste le plus petit objet ; sa cible tactile devra être mesurée dans le
vrai écran, pas déclarée conforme depuis cette vignette. Aucun masque n'est encore produit.

La v2 reste non publiée. L'audit parallèle des autres coloriages révèle trois autres scènes
dont le décor ne correspond pas à leurs cibles : voir `Docs/audit-visuel-coloriages-2026-09-05.md`.

## Archive : prompt et mesures de la v1 refusée

Outil : générateur intégré, nouvelle génération sans réutiliser les anciens pixels. Un seul
rendu demandé, aucune série exploratoire. Destination : brouillon du projet.

Sortie : `contenu/brouillons/coloriage-tapis-2026-09-05/tapis-objets-v1.png`, 1536 × 1024.
Inspection : sept sujets présents, entiers et séparés ; aucune minuscule cible imprimée.
La reconnaissance des sept objets est plus explicite, mais le rendu est plus volumétrique que
l'ancien décor : le parent reste juge de cette proposition. Aucun masque publié ne la désigne.

Empreinte SHA-256 du fichier :
`E431B426943668AA7685D5AF71096F28A9D64168942EE3BBC76E5CDD7959FFB3`.
La capture `bac-a-sable/coloriage-tapis-2026-09-05/comparaison-gris.png` montre les deux états,
chacun à 488 px de large, sans aide. Les sept phrases proposées sont confrontées à
`estAuLexique` : **aucun mot hors de la liste locale**. Cela ne vaut pas validation parentale.

Mesure du dessin actuellement publié : à largeur de scène 720 px, les six silhouettes des
ornements mesurent seulement **47,6–50,2 px de large et 30,3–35,7 px de haut**. Ces valeurs
excluent les cercles de repli clavier ; sur un téléphone elles sont encore réduites. Script et
sorties : `bac-a-sable/coloriage-tapis-2026-09-05/verifier-proposition.mjs` et `mesures.log`.

> Illustration de jeu pour enfant de sept ans, paysage 3:2, scène de coloriage dans une petite
> clairière. Cadrage rapproché en vue légèrement plongeante, sans horizon lointain : les objets
> jouables occupent presque toute l'image, la forêt reste une bordure discrète. Sept sujets
> exactement : un tapis brun uni au centre avec une grande surface libre ; en haut à gauche un
> banc orange en bois complet avec dossier ; en haut au milieu un petit chat noir entier et
> amical ; en haut à droite un gros sac à dos vert avec bretelles ; en bas à gauche un large bol
> violet vide sans anse ; en bas au milieu un pot de fleurs rouge vide, plus haut que large et
> nettement différent du bol ; en bas à droite un grand ballon jaune rond. Chaque objet entier,
> séparé de tous les autres par une bande de sol clair, sans se chevaucher ni empiéter sur le
> tapis. Tous très visibles et reconnaissables en niveaux de gris, silhouettes simples mais
> belles matières, pas de miniature, pas d'objet caché. Illustration numérique de livre
> d'aventure, dessin fin propre, volumes doux, matières lisibles, couleurs naturelles et nettes,
> lumière de jour neutre, végétation bleu-vert limitée aux bords. Pas de lavis, pas de taches de
> peinture, pas de filtre jaune ou sépia, pas de style vectoriel plat ou de gros contours cartoon.
> Aucun texte, aucune interface, aucun cercle, aucun numéro, aucun ornement sur le tapis, pas
> d'autre chat, bol, pot, ballon, banc ou sac, pas de personnages humains, pas de petits objets
> distracteurs. La scène doit rester immédiatement compréhensible à une largeur de 500 pixels.
