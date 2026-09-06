# Recette des six coloriages — essai local du 5 septembre

Mandat : terminer les reprises de coloriage pour essai sur le serveur local, pas publier sur
GitHub ni reconstruire l'APK. Contrat : `lot-coloriages-jouables-locaux-2026-09-05.md`.
Base `1d5a637` et travail antérieur conservés. Les images restent soumises au jugement du parent
en situation ; la réussite technique n'est pas un visa esthétique ou une certification CE1.

## Ce qui est intégré

| Exercice | Image et objets | Reprise |
|---|---|---|
| `foret-muette-08` | Tapis v2 validé : tapis, chat, bol, sac, pot, ballon, banc | Sept vrais objets à la place des ornements ambigus ; phrases, voix et silhouettes ensemble |
| `clairiere-01` | École conservée, six cibles | Porte affinée, loupe pour le haut de la maîtresse |
| `clairiere-10` | Même école, sept cibles | Ardoise retracée sur ses pixels ; loupe pour les fenêtres et la porte |
| `marais-jumeau-08` | Nouveau décor couleur, sept objets | Caillou, tronc du saule, escargot, nénuphar, ponton, barque, ciel ; contours resserrés après revue |
| `volcan-08` | Nouvelle forge couleur, huit objets | Outils réellement présents ; contours corrigés, cristal de gauche précisé |
| `cite-des-histoires-10` | Réemploi du décor couleur, huit objets | Montagne, tente, rond, portes, arbre, pierre et ciel correctement nommés et retracés |

Quatre images versionnées dans les scènes, dont **deux générations nouvelles** dans ce lot
(Marais et forge) ; le tapis v2 était déjà produit et la fresque est réemployée. Cinq SVG publiés,
six exercices, **43 occurrences de cibles**. Le coloriage libre du chaudron est un autre moteur
et n'a pas été remplacé par ce chantier.

La loupe « Voir en grand » agrandit toute l'image, ne connaît pas la réponse et n'ajoute aucun
cercle initial. Glisser déplace la vue, toucher peint ; revenir à « Voir tout » conserve l'étape.
Le noir utilise désormais `multiply` : `color` conservait la luminosité du gris et ne produisait
pas un vrai noir. Le blanc utilise `screen`, les autres couleurs gardent leur mélange dédié.

## Preuves ciblées

- **50 tests de repères** : inventaire exhaustif des six fiches, empreintes des images, ratio
  sans rognage, points intérieurs et extérieurs observés sur le PNG indépendamment des masques.
  Les anciens masques ont échoué avant promotion. Déplacer une cible dans le sol ne satisfait
  plus la recette simplement parce que son centroïde est cliquable.
- **10 tests de composants** pour couleurs neutres et loupe. Le test de luminosité navigateur
  a été volontairement confronté à `multiply → color` : rouge constaté (53,53 au lieu de moins
  de 40,2), puis code restauré. Aucun test ni seuil modifié pour accepter cette mutation.
- **26 parcours ciblés verts en 12,6 s** après le dernier recalage de l'ardoise : six coloriages
  dans quatre formats CSS `720×1017`, `1080×670`, `390×700`, `844×340`, soit 172 réponses natives ;
  un parcours loupe/pan/tap/pixels et la recette tapis avec profil de lecture agrandi.
- Le nouveau cadre a d'abord coupé une cible sur téléphone et paysage : ces tests l'ont refusé.
  La grille intermédiaire a été corrigée avec `minmax(0,1fr)`, sans agrandir les masques.
- Les tests historiques qui exigeaient encore des « feuilles » ont été raccordés aux objets
  de remplacement demandés. Le test d'écart-type autour d'un centroïde ne prouvait que la texture,
  et trois variantes ne portaient aucune assertion : remplacé par les repères indépendants pour
  chaque scène. Aucun `skip`, aucune tolérance augmentée, aucune référence de capture remplacée.
- Le garde existant du tableau a trouvé un débordement. L'ardoise a été relue sur le PNG et
  retracée en `M126,188 L260,188 L268,278 L135,285 Z`, sans élargir l'enveloppe du test.
- La revue finale du dessin partiellement rempli a encore trouvé deux défauts de l'école :
  porte sur le visage, banc sans assise et débordant sur la terre. **Trois nouveaux tests ont
  d'abord échoué**, puis les deux silhouettes ont été retracées depuis les détails du PNG.
  `coloriage-ecole-contours.test.ts` verrouille le visage exclu, la porte incluse, l'assise
  incluse et la terre exclue. Le précédent point du banc était à moins d'un pixel de son bord :
  remplacé par un point observé au milieu de l'assise (pixel 300,660), pas par un centroïde.
  Après cette dernière retouche : **82 contrôles ciblés verts**, puis **26 parcours verts en
  12,5 s** et nouvelle capture partiellement coloriée inspectée. Les campagnes générales
  chiffrées plus bas précèdent cette ultime retouche de deux contours, sans changement moteur.

Captures du vrai jeu : `bac-a-sable/coloriages-locaux-2026-09-05/*-tablette-debut.png`.
Les fichiers `*-tablette-fini.png` montrent la récompense, **pas** le dessin colorié complet.
Revue des silhouettes finales : `bac-a-sable/revue-coloriages-2026-09-05/index.html`.
Cette commande de revue produit des preuves ; son code zéro ne veut pas dire « validé visuellement ».
Les anciennes planches des agents ont été amendées dans leurs rapports lorsqu'elles divergeaient.

## Voix, ressources, conservation

Trois passes incrémentales Piper + contrôle Whisper local ont rendu 8, puis 14, puis 3 clips :
**25 rendus**, pas de régénération de tout le catalogue. État final : **671 clips / 671 Opus**,
368 consignes sur 368 couvertes, zéro refus. Prévol : **6 polices et 671 clips présents**.
Les 27 anciens clips non référencés sont archivés, sans suppression, dans
`bac-a-sable/archives-audio-coloriages-2026-09-05/`, avec manifeste et empreintes.
L'archive antérieure de 216 clips est conservée séparément.

Les quatre anciens décors sont conservés dans `contenu/assets/decors/archives-2026-09-05/`.
Le registre `production/coloriages/archives-decors-2026-09-05.json` nomme leurs successeurs.
Le test conserve les empreintes de pixels des originaux approuvés et vérifie l'embarquement
des successeurs. Les scripts historiques ne recréent pas les nouvelles silhouettes : ne pas
relancer l'ancien générateur de décors pour retoucher ces cinq scènes.

Sources, prompts exacts disponibles et empreintes : `production/assets.lock.json` et
`production/coloriages/consignes-locales-2026-09-05.json`. Les paramètres non exposés par le
générateur restent `null`, jamais inventés. Les brouillons sont conservés, pas effacés pour
faire taire le registre. Procédure réutilisable : `.agents/skills/verifier-coloriages/SKILL.md`.

## Recette globale, sans faux visa

`npm run verifier` exécuté entièrement en **830,5 s**, rapport lu : initialement cinq portes
rouges (ressources orphelines, anciennes attentes des dessins, parcours tapis historique,
contenu en attente parent, trois captures différentes). Les raccords ont été traités ensuite.
Ce premier rapport n'est pas réécrit manuellement pour le présenter comme vert.

- Dernière suite unitaires/composants/API : **2540/2541**, une seule erreur subsiste dans
  `chronologies-pedagogiques.test.ts` : carte « mouche » au lieu d'« abeille », en attente parent.
  JSON distinct : `bac-a-sable/coloriages-locaux-2026-09-05/unitaires-apres-raccord.json`.
- Lint et TypeScript passent ; le lint conserve des avertissements antérieurs de constantes
  inutilisées. Validation du contenu : **655 contrôles, zéro problème**.
- Qualité/accessibilité/composition : **318/318**, budget de bundle et rejeu verts pendant
  la campagne complète. Le dernier changement après elle ne concerne que l'ardoise et les
  raccords de ressources/tests, pas la composition CSS.
- Les **704 parcours passent en 7,3 minutes** après le raccord de l'ancien test du tapis :
  aucun cas ignoré/non exécuté. Le bilan compte 34 613 relevés et 7 751 gestes observés,
  avec les contrôles volontairement fautifs de la sentinelle. Il s'agit bien de la campagne
  complète, pas d'une extrapolation des 26 ciblés.
- **Trois différences de captures conservées** : cour d'école, coloriage gris, coloriage
  partiellement rempli. Pas de mise à jour automatique des références sans accord.
  Comparaison relue : ajout de la loupe, scène réduite pour rester entière, porte et banc
  réellement recalés. La nouvelle vue coloriée préserve maintenant le visage. Le contrôle
  visuel reste rouge tant que le parent n'a pas accepté les nouvelles références.
- **Onze corrections textuelles dans quatre autres fiches** restent proposées au parent
  (`audit-pedagogique-2026-09-05.md`) ; `qa:coherence` demeure rouge. Ce mandat de coloriage
  n'est pas une validation silencieuse des propositions antérieures sans rapport avec lui.

La précision des silhouettes est manuelle, pas une segmentation pixel parfaite. Les petites
cibles restantes sont signalées (école, portes/arbre/pierre de fresque, escargot/nénuphar,
lanterne) et disposent de la loupe. Le lexique local incomplet signale notamment « pierre »,
« tente », « eau » et plusieurs outils ; il n'a pas été étendu automatiquement. L'accessibilité
visuelle des objets et la facilité de lecture de ces noms sont deux validations différentes.

## Serveur et reprise

Production reconstruite puis serveur 8080 redémarré, sans réinitialisation de profil.
Adresse LAN mesurée : **http://192.168.1.19:8080/**. Le HTML distant est identique au build
`client/dist`, entrée `/assets/index--kTUajy7.js`. Les six paquets sont relus par HTTP LAN,
avec vérification SHA-256 des SVG et PNG réellement servis. Preuve :
`bac-a-sable/coloriages-locaux-2026-09-05/serveur-verifie.json`.
Recharger la page déjà ouverte sur tablette pour vider l'ancien état React en mémoire.

Pas de publication GitHub ni d'APK dans ce lot. Les quatre atlas animés des compagnons restent
des brouillons à valider, sans remplacement implicite. Le travail est local et non commité :
la porte globale de contenu et le crochet unitaire restent rouges ; aucun crochet contourné.
Les pièces jointes du parent et les autres changements du chantier antérieur sont préservés.
