# Coloriages à consigne : audit des objets et des silhouettes

5 septembre 2026. Six exercices `colorie`, cinq décors, 43 occurrences de cibles.
Cette revue complète l'audit textuel délégué à Terra medium. Elle ne concerne pas le coloriage
libre du chaudron, qui utilise un autre moteur et un masque raster indexé.

## Résultat

**Quatre exercices ont une inadéquation manifeste entre consigne, dessin et/ou masque.** Les
deux exercices de l'école montrent bien leurs objets, mais leur confort tactile reste à affiner.
Le passage des 152 parcours natifs ne doit plus être résumé comme une validation de ces objets.

| Exercice | Observation sur l'image réellement utilisée, en gris | Suite nécessaire |
|---|---|---|
| `foret-muette-08` — tapis | Six minuscules ornements floraux sont nommés « feuilles ». Le masque central ne recouvre qu'une partie du tapis. Les repères sont ambigus. | V2 en brouillon : tapis uni et six objets distincts. Après validation, refaire silhouettes, libellés, textes et voix ensemble. |
| `marais-jumeau-08` — brume | La scène montre des roseaux, un petit pont au fond, plusieurs cailloux et nénuphars. Ni barque, ni escargot, ni saule à la silhouette attendue n'y sont reconnaissables. Le masque du caillou tombe dans l'eau ; celui du nénuphar sur un caillou. | Reprendre le couple décor/contenu, puis les masques. Une correction de phrase ou un cercle d'aide ne suffit pas. Examiner d'abord les brouillons existants pour éviter une génération inutile. |
| `volcan-08` — forge | L'enclume est tout à gauche, le marteau en bas à gauche ; leurs masques sont sur la grande plateforme centrale vide. Pas de lanterne reconnaissable à l'endroit attendu. Les nombreux cristaux rendent « grand cristal » peu précis. | Reprendre les cibles et l'image ensemble ; caler les formes sur les objets réellement représentés et rendre les cristaux distincts sans s'appuyer sur leur couleur future. |
| `cite-des-histoires-10` — fresque | Le mur porte une lune, un oiseau, un livre, une plume et plusieurs rameaux. Les consignes attendent notamment une fleur, un arbre, un médaillon, une porte et le ciel. Les masques sont décalés ou sans objet correspondant. | Réécrire une scène de coloriage cohérente, ou adapter des cibles à cette fresque après validation. Ne pas rebaptiser arbitrairement un livre « arbre ». |
| `clairiere-01` — école | Maîtresse, porte, toit, banc et deux grandes couronnes d'arbres reconnaissables. Pas de manque équivalent au tapis. Le haut de la maîtresse reste petit ; la porte est fragmentée autour du personnage. | Garder le décor comme base. Mesurer et améliorer les vraies prises peintes ; ne pas remplacer leur contrôle par celui des cercles accessibles. « Les feuilles des arbres » désigne les grandes couronnes, pas des feuilles individuelles. |
| `clairiere-10` — école, mots outils | Même décor. Fenêtres, tableau, banc, porte, toit et maîtresse identifiables. Les deux fenêtres et le haut de la maîtresse sont petits. | Même reprise ciblée de confort ; pas besoin de générer un second décor pour cet exercice. |

## Preuves et limites

La commande `npm run qa:coloriages` reconstruit en environ deux secondes :

- `bac-a-sable/revue-coloriages-2026-09-05/index.html` : pour chaque exercice, image grise sans
  aide et mêmes pixels avec les vrais masques ; cliquer une consigne isole sa silhouette ;
- une capture par exercice, avec deux images de 512 px côte à côte ;
- `mesures.json` : libellés, positions, boîtes des vrais chemins, empreintes SHA-256 du SVG et
  du PNG, et verdict de reconnaissance explicitement non automatisé.

Le script suit `habillage.scene.fichier` (notamment `ecole-v2.svg`, pas l'ancien `ecole.svg`),
conserve le `viewBox` et le `preserveAspectRatio` du raster, puis attend le décodage des images
et les polices. Il ne touche ni aux contenus, ni aux profils, ni aux références de test.
Son succès signifie **rapport produit**, pas exercice validé. Lint ciblé : zéro erreur.

Les cinq PNG sont servis par `http://localhost:8080/api/contenu/assets/assets/decors/<nom>.png`
avec HTTP 200, MIME `image/png`, et une empreinte fichier identique à celle du disque. Ce n'est
donc pas un décor inventé par la planche ni une vieille capture. `MoteurColorie` charge le SVG
déclaré et `SceneSvg` lui applique la grisaille ; il ne remplace pas ces fonds par une variante.

Empreintes **fichier** observées :

| Décor | SHA-256 |
|---|---|
| brume | `c6963af174d5a16c9ff5ca3e375c6cf31b04498936e48e109c0521ce92fd6169` |
| forge | `c00c473e829690db08deb6fa49c7e8a83d9ed3a3c3785be6bf28a1e29cc56e2e` |
| fresque-murale | `974c802adb95864a0fb74fdbd494e6786259005023202639c7636723f8bcabd2` |
| ecole | `e60ef6da6177aea9b2426757f06d91d253e0e9c11d3061326a51a0d1ed132d0e` |
| tapis | `4a17b2c55121d2cacc46411e812e027842e7d1c3a98f4cfcc9d9905db67f8eea` |

Attention : les empreintes historiques `assets.lock.json` des trois premiers décors sont des
empreintes **des pixels RGB décodés**, non du fichier PNG. Recalculées, elles correspondent bien
(`23a041…`, `846208…`, `9ac15d…`). Aucune substitution de fichier non verrouillée n'est établie.

À largeur hypothétique de scène 720 px, 21 des 43 boîtes ont au moins un côté inférieur à
64 px ; les six ornements du tapis n'ont que 30–36 px de haut. Ce comptage sert à prioriser,
**ce n'est pas un nouveau seuil de validation** : boîte englobante, surface peinte, largeur
effective dans l'écran et reconnaissance sont quatre mesures distinctes.

## Pourquoi les tests n'ont pas suffi

L'oracle lisait les noms des régions et cherchait un pixel dans leur chemin SVG. Il prouvait que
ce pixel déclenche la réponse prévue ; un masque posé sur de l'eau pouvait donc réussir une
consigne demandant un caillou. L'audit de texte confirmait le même nom dans deux JSON, pas sa
présence dans l'image. Ces deux preuves se renforçaient seulement en apparence.

La porte mot/objet était déjà demandée dans `Docs/publication-decors-valides-2026-09-02.md`.
Une validation de décor d'ambiance ne valait pas validation de coloriage. L'état actuel ne
respecte pas cette séparation : il faut reprendre le raccordement, pas obtenir plus de tests
verts en rejouant le même oracle.

Avant intégration des remplacements : reconnaissance sans aide sur le gris, correspondance
consigne/silhouette examinée et attachée au couple d'empreintes, puis taps natifs et recoloration
dans les deux orientations. Tout remplacement de PNG ou de masque doit rouvrir cette revue.
Le parent valide les images et les textes ; les mesures et gestes restent scriptés.

## Statut de livraison

Une seule nouvelle génération dans cette demande : le tapis v2, non intégré. Aucun des quatre
coloriages défectueux n'est déclaré corrigé. Aucun contenu publié, masque ou voix changé dans
cet audit ; aucune publication distante. La campagne générale et ses autres attentes restent
dans `Docs/etat-courant-et-file.md`.
