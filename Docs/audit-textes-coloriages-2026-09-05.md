# Audit textuel — six coloriages à consigne

Date : 5 septembre 2026.
Périmètre : les six exercices dont `jeu.moteur` vaut `colorie`, leurs métadonnées
d'habillage et le lexique CE1 local (`scripts/generer-phonologie.mjs`). Aucune image n'a
été inspectée dans cet audit. Une correspondance ci-dessous prouve seulement un lien de
données entre une phrase et un libellé de région ; elle ne prouve ni la reconnaissance de
l'objet dans le dessin, ni sa taille, ni son absence d'un autre endroit de la scène.

## Résultat par nœud

| Nœud / exercice | Consignes citées exactement | Preuve textuelle | Correction proposée | Limite de la preuve |
|---|---|---|---|---|
| `foret-muette-08` / `foret-muette-tapis-colorie-01` | « Colorie la feuille en haut à gauche en noir. », « Colorie la feuille en haut, au milieu, en violet. », « Colorie la feuille en haut à droite en vert. », « Colorie la feuille de gauche en rouge. », « Colorie la feuille du bas, au milieu, en jaune. », « Colorie la feuille de droite en orange. » | Les six phrases reprennent exactement les six libellés de régions de `foret.tapis`. Le titre et le commentaire appellent aussi ces régions des feuilles. | Ne pas corriger les phrases seules : la scène remplaçante doit d'abord fournir six objets distincts. Après validation, employer les noms de la proposition non publiée : « le chat », « le bol », « le sac », « le pot », « le ballon », « le banc », sans repère spatial. | Le retour parent et les documents de reprise décrivent des ornements floraux ambigus ; l'audit ne qualifie pas leur apparence. Les noms de remplacement viennent de `refonte-coloriage-tapis-2026-09-05.md`, une proposition non publiée, et ne doivent pas être intégrés avant l'image et les masques correspondants. |
| `clairiere-01` / `clairiere-ecole-01` | « Colorie les feuilles des arbres en vert. » | La consigne cible deux régions (`feuilles-arbre-1`, `feuilles-arbre-2`) et l'habillage déclare quatre libellés de feuillage. Cette cardinalité seule ne prouve pas que la phrase est ambiguë : les deux masques ciblés peuvent être les seuls grands feuillages pertinents. | Aucune correction textuelle établie. Vérifier sur le raster gris et les masques si « les feuilles des arbres » désigne sans hésitation les deux zones réellement actives. Ne proposer un repère que s'il est réellement visible dans la scène. | Les métadonnées ne donnent ni l'ordre perçu ni la taille des quatre feuillages. « Premier/deuxième arbre » serait un ordre ajouté, non justifié avant cette vérification. |
| `clairiere-10` / `clairiere-ecole-03-mots-outils` | « Le toit de l’école est rouge. », « Colorie la porte en bleu. », « Les fenêtres sont jaunes. », « Colorie le pull de la maîtresse en vert. », « Le banc est brun et le tableau est noir. » | Chaque nom renvoie à un libellé déclaré. Le pluriel « fenêtres » correspond précisément aux deux régions `fenetre-ecole-1` et `fenetre-ecole-2`; banc et tableau ont chacun une cible et une couleur. | Aucune correction textuelle nécessaire. Conserver les deux consignes affirmatives : elles sont courtes et la dernière présente deux associations explicites. | Les libellés attestent les objets, pas leur visibilité ni la séparation tactile des deux fenêtres. |
| `marais-jumeau-08` / `marais-jumeau-brume-colorie-01` | « Colorie le gros caillou au bord de l'eau en brun. », « Colorie le saule en noir. », « Colorie l'escargot en rose. », « Colorie le nénuphar en jaune. », « Colorie le ponton en rouge. », « Colorie la barque en orange. », « Le ciel du jour est bleu. » | Chaque nom recouvre un libellé de région : notamment `route` = « le ponton », `roue` = « l’escargot » et `barque-echouee` = « la barque échouée ». | Prévoir une passe lexicale avant publication : « saule », « escargot », « ponton », « barque » et « eau » ne sont pas acceptés par `estAuLexique` local. Sans ajout explicite au lexique, simplifier au moins c1 en « Colorie le gros caillou en brun. » ; les quatre autres noms doivent être soit inscrits comme mots cibles, soit remplacés après arbitrage pédagogique. | Le lexique local est une liste interne, non une échelle publiée ; son refus ne prouve pas qu'un enfant ne connaît pas le mot. Inversement, l'audit ne peut pas vérifier qu'un saule, un ponton ou une barque se reconnaît dans l'image. |
| `volcan-08` / `volcan-forge-colorie-01` | « Colorie le grand cristal en violet. », « Colorie la lanterne en jaune. », « Colorie le cristal de gauche en rose. » | `rideau` est libellé « le grand cristal violet », `tableau` « la lanterne » et `drapeau` « le cristal rose » : les trois associations objet/couleur sont déclarées. Le libellé du cristal rose ne porte toutefois pas « de gauche ». | Aucune correction textuelle établie. Vérifier sur le raster gris que le repère « de gauche » désigne un seul cristal sans dépendre de sa future couleur. Ne pas remplacer la formule par « cristal rose » : cette couleur n'est pas encore visible sur le rendu gris. Prévoir séparément l'arbitrage lexical pour « marteau », « enclume », « billot » et « lanterne », refusés par le lexique local. | Les identifiants techniques historiques (`rideau`, `tableau`, `drapeau`) ne constituent pas une preuve visuelle et ne doivent pas être lus comme des noms enfant. L'audit ignore la position réelle des cristaux. |
| `cite-des-histoires-10` / `cite-des-histoires-fresque-murale-colorie-01` | « Colorie la fleur en rouge. », « Colorie la feuille en vert. », « Colorie le médaillon en jaune. », « Colorie le pot en brun. », « Colorie le mur en rose. », « Colorie l'arbre en orange. », « Colorie la porte en violet. », « Le ciel du matin est bleu. » | Les cibles correspondent aux libellés `fleur`, `feuille`, `soleil` = « le médaillon », `pot`, `mur`, `arbre`, `porte`, `ciel`. Certains libellés sont plus précis : « la grande fleur blanche », « la grande feuille », « le pot de peinture brun », « la porte de droite ». | Pour réduire les risques de doublon dans la scène, aligner les noms sans imposer de couleur préalable : « Colorie la grande fleur en rouge. », « Colorie la grande feuille en vert. », « Colorie la porte de droite en violet. » Prévoir l'arbitrage lexical de « médaillon », refusé par le lexique local. | Le qualificatif « grande » ou « de droite » est attesté dans les métadonnées, pas dans une observation du raster ; son efficacité pédagogique doit être vérifiée sur l'image. |

## Point prioritaire : le tapis

La preuve textuelle confirme le problème au lieu de le résoudre : les six consignes et les six
libellés réemploient tous le même nom générique, « feuille », puis ne les distinguent que par
des positions. Elles ne disent jamais « sur le tapis » ; « en haut à gauche » peut donc se lire
par rapport à l'image entière ou au tapis. La correction de formulation seule — par exemple
« la feuille du tapis en haut à gauche » — répare ce référent spatial, mais pas la
reconnaissance signalée par le parent. Elle est insuffisante si les motifs ne sont pas des
feuilles reconnaissables.

Les analogues textuels déjà documentés sont utiles seulement comme brief de régénération :
`chat`, `bol`, `sac`, `pot`, `ballon`, `banc`. Ils offrent six noms singuliers, concrets et
sans repère relatif; la proposition non publiée les associe à une unique silhouette chacun.
Le nouveau titre peut rester « Le tapis de feuilles » si le tapis demeure le sujet central,
mais les six cibles ne devraient plus être nommées « feuilles » si la nouvelle scène ne les
représente pas comme telles.

## Couverture lexicale déclarée

Le contrat de test demande qu'aucun mot enfant ne soit hors de la liste CE1, sauf mot cible
déclaré (`annexe-T-strategie-de-test.md`, point 8). Lecture directe de `estAuLexique` :

- tapis : `centre` et `milieu` sont refusés ;
- forge : `marteau`, `enclume`, `billot`, `lanterne` sont refusés ;
- fresque : `médaillon` est refusé ;
- brume : `eau`, `saule`, `escargot`, `ponton`, `barque` sont refusés ;
- les deux exercices de l'école ne présentent pas de mot refusé parmi leurs noms et repères.

Ce constat réclame une décision éditoriale, pas une modification automatique : inscrire un mot
comme cible justifiée, le remplacer par un terme déjà couvert, ou compléter le lexique avec une
validation adulte. Il ne préjuge pas du vocabulaire réel de l'enfant.

## Décision recommandée au principal

1. Réserver le tapis à la régénération en cours : image, masques, libellés, textes et voix doivent
   changer ensemble après validation parentale.
2. Vérifier sur les rasters gris et les masques les deux hypothèses ouvertes : « les feuilles des
   arbres » de `clairiere-01` et « cristal de gauche » du volcan. Les métadonnées seules ne
   fondent aucune correction de texte.
3. Traiter les mots refusés par la porte lexicale avant toute publication, sans les ajouter au
   lexique par convenance.
4. Pour les autres formulations, faire confirmer sur l'image le caractère unique et visible de
   chaque objet avant de changer un mot : l'audit de données ne remplace pas cette inspection.
