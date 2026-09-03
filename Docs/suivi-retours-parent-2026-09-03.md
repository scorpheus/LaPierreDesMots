# Suivi consolidé des retours parent — 3 septembre 2026

Cette note remplace le suivi implicite par conversation. Elle couvre tous les retours de jeu reçus
jusqu'au lot des lucioles. L'audio reste volontairement hors périmètre.

## Corrigé et couvert par une recette courte

| Retour observé | État actuel | Preuve ciblée |
|---|---|---|
| Code parent ancien inconnu et pavé bloqué après quatre chiffres | récupération des anciens foyers, mode de définition explicite et bouton « Effacer » utilisable | `recuperation-code-parent.test.ts`, `EcranCodeParent.test.tsx` |
| École : cinq choix pour trois consignes, mais seulement trois dépôts | les cinq choix restent volontairement présents comme trois réponses et deux intrus ; les trois zones du décor sont toutes atteignables | `MoteurPlace.test.tsx`, `place-validation.test.ts` |
| Maîtresse sans visage | l'illustration `ecole.png` publiée montre désormais un visage complet | empreinte d'asset et recette du décor Clairière |
| Aide de Gobi qui répète la consigne | l'aide donne une stratégie distincte et ne concatène plus la phrase | `aide-de-gobi.test.ts` |
| Tri des couleurs refusant rose, vert ou bleu | toutes les couleurs sémantiques sont acceptées ; les mots qui ne sont pas des couleurs vont dans l'autre panier | `MoteurTri.test.tsx`, recette tactile dédiée |
| Tri des voyelles refusant `rat` pendant l'étape du `a` | tout mot visible déposé dans son bon panier est accepté immédiatement, même s'il figurait dans un lot ultérieur ; les étapes déjà satisfaites sont ensuite sautées sans écran mort | `MoteurTri.test.tsx` sur le contenu réel `paniers-voyelles-01` |
| Tri : changement de cible discret et message qui rétrécit l'image | consigne-cadre stable, cartouche d'étape avec critère et panier, refus en superposition sans reprendre de hauteur au décor | `MoteurTri.test.tsx` |
| Décor coupé selon la hauteur | cadrage `contain` et plateaux compacts sur les moteurs concernés | recettes 1920×1080 et 1280×720 |
| Lune décrite ronde alors que l'image montre un croissant | consigne et réponse alignées sur le croissant | garde de contenu |
| Éclair : « Montre-moi le mot » confondu avec les réponses, décor qui rétrécit et bonne réponse toujours au milieu | commande jaune dédiée au-dessus de l'illustration, mot séparé au centre, dimensions conservées et réponses brassées | `MoteurEclair.test.tsx`, recette Galeries |
| Mot incomplet minuscule dans « Trace la lettre » | repère central d'au moins 48 px, séparé du clavier | `MoteurGrave.test.tsx`, recette Galeries |
| Particules qui restent après un exercice | nettoyage à la sortie du nœud, à l'entrée/sortie de la récompense et avant l'exercice suivant | `EcranNoeud.test.tsx`, `EcranRecompense.test.tsx` |
| Chaudron compté comme exercice | route libre dédiée, hors progression, sans récompense pédagogique | recette chaudron et validation du catalogue |
| `/noeud` sans exercice lisible | écran explicite avec retour vers la carte, sans chargement infini | `EcranNoeud.test.tsx` |
| « fini » affiché après 6 exercices sur 13 | le texte distingue maintenant la sortie terminée de la région qui continue | `EcranRecompense.test.tsx` |
| Cadeau ou nouvelle zone annoncés sans résultat visible | annonce seulement si un asset concret est remis ou si une région passe réellement de fermée à ouverte | `CascadeRecompense`, `EcranRecompense.test.tsx` |
| Coffre : petites vignettes, nom masqué, cercle parasite, fiche instable | cases de 80–88 px, fiche centrée, dessin de 144 px, aucun cercle décoratif, progression restante réelle | `EcranCoffre.test.tsx`, recette Chromium coffre |
| Lucioles avec une phrase entière dans chaque cible | chaque cible affiche seulement `bleu`, `vert`, `rouge`, etc. dans une luciole lumineuse lisible ; le décor de la luciole dérive doucement mais son mot reste immobile | `lucioles-affichage.test.ts`, `MoteurEclair.test.tsx` |
| Éclair : cible déjà donnée dans la consigne et changement de mot discret | la barre haute garde désormais une consigne-cadre stable ; le mot n'est visible que dans la carte de lecture, puis le plateau annonce clairement la nouvelle étape sans révéler la réponse | `MoteurEclair.test.tsx`, `EcranNoeud.test.tsx` |
| Chemin : liens gris invisibles et ancienne case encore présentée comme un choix | les départs et cases déjà consommés sont neutralisés, seuls les prolongements jouables gardent leur halo jaune, les traits actifs sont renforcés et Gobi montre la prochaine case en bleu | `MoteurChemin.test.tsx` |
| Consignes difficiles pour un enfant de sept ans | 76 fiches et 283 consignes relues ; formulations récurrentes simplifiées sans changer le geste | `formulations-ce1.test.ts`, `test:contenu` |
| Carte avec destinations ou routes fantômes | six destinations seulement et marqueurs recalés sur les régions nommées | `EcranCarte.test.tsx`, garde carte de la QA rapide |
| Carte entièrement grise au départ | la grisaille reste le langage de progression ; les zones se colorent depuis le journal, sans promettre une zone non ouverte | tests carte et rejeu ciblés |
| Phrase et mots à construire tassés à gauche | modèle, fentes et retours sont centrés dans leur espace de lecture | `MoteurPhrase.test.tsx` |
| Syllabes à assembler tassées à gauche | la construction du mot et toutes les syllabes sont centrées sous l'image avec une largeur responsive | `MoteurAssemble.test.tsx` |
| Mur des noms sans réaction visible | instruction explicite, sélection visible et rappel du nom gravé ; le geste fonctionne sans audio | `MurDesNoms.test.tsx` |
| Fin de sortie partielle sans moyen de continuer | « Continuer [la région] » est l'action principale et ouvre directement le premier exercice inédit | `EcranRecompense.test.tsx`, `reprise.test.ts` |
| Fin de région complète confondue avec une simple sortie | titre de victoire « région rallumée », rappel de tous les exercices terminés, aucun bouton Continuer/Rejouer et retour carte mis en avant | `EcranRecompense.test.tsx` |
| Retour dans une région qui repropose des exercices déjà finis | le serveur et le mode autonome transmettent le journal au sélecteur ; une sortie privilégie les inédits et garantit même le dernier restant | `selecteur.test.ts` |
| Déblocage suivant invisible sur la carte | la carte annonce que la prochaine région s'ouvre à la fin de la région courante et compte les exercices restants | `EcranCarte.test.tsx` |
| Coffre encore entièrement technique | une illustration raster du coffre accueille désormais l'enfant ; les six fiches d'Éclats gardent enfin leur silhouette régionale | `EcranCoffre.test.tsx`, `production/assets.lock.json` |
| Changement de règle presque invisible entre deux étapes | les 14 moteurs suivent désormais la même hiérarchie : règle générale stable dans la barre haute, étape ou cible courante dans un cartouche proche du geste | 130 tests composants ciblés et campagne Chromium des 75 nœuds |
| Images d'histoire alignées à gauche et de hauteurs différentes | les cartes sont regroupées au centre, partagent le même bord supérieur et la même hauteur ; leur cartouche est placé dans la marge pour ne plus masquer la troisième carte | `MoteurChrono.test.tsx`, captures 1920×1080 et 1920×1200 |
| QA longue relancée pour chaque retouche | boucle courte par moteur conservée ; une campagne visuelle dédiée ouvre les 75 nœuds en 27 secondes et produit 150 captures hors références | `parcours-audit-75-noeuds.spec.ts`, `bac-a-sable/audit-75-noeuds/mesures.json` |
| Un moteur testé ne prouvait pas ses variantes de contenu | la campagne joue désormais chacun des 75 nœuds jusqu'à la récompense, recalcule le geste juste après chaque transition, borne les boucles et détecte toute stagnation | `parcours-campagne-gestes-75.spec.ts`, 75/75 verts, 585 étapes et 1 033 actions |
| Coloriages hors école : objets demandés absents ou masques décalés | les quatre scènes utilisent leurs vrais rasters ; consignes, régions, centroïdes et zones tactiles sont alignés sur les objets visibles | `coloriages-raster-cibles.test.ts`, `MoteurColorie.test.tsx`, `test:contenu` |

## Encore à faire — dette visuelle réelle

- Le coffre est maintenant utilisable, lisible et possède une illustration raster d'accueil. Ses
  25 formes de Gobi, ses 6 Éclats et ses 6 objets individuels restent toutefois des dessins
  techniques à remplacer au fur et à mesure de leur validation.
- Les cinq coloriages pédagogiques utilisent maintenant leurs beaux décors raster avec des masques
  indexés cohérents. Le chaudron libre utilise lui aussi un raster dédié ; sa finition reste une
  activité libre distincte et ne compte jamais comme exercice de progression.
- Plusieurs scènes ont reçu un beau fond raster, mais les éléments interactifs posés dessus restent
  parfois des pictogrammes ou des SVG. La mécanique est testée ; la finition artistique n'est pas
  terminée.
- Les 76 recettes prouvent la présence des gestes et du contenu, pas encore une validation esthétique
  humaine de chaque étape. Les nouvelles images doivent être revues en contexte, par petites séries
  de captures, avant de remplacer les références visuelles.
- Les animations avancées du campement demandent des calques détourés et des sprites partageant les
  ancres du fond V5. Le feu et le papillon actuels sont conservés, mais le reste du décor ne possède
  pas encore les micro-interactions illustrées prévues.
- La hiérarchie règle stable / cible courante est implantée dans les 14 moteurs. La campagne
  visuelle couvre les 75 nœuds pédagogiques aux deux résolutions sans débordement ni cartouche
  absent. La campagne gestuelle termine désormais 75/75 nœuds : 585 étapes, 914 actions correctes
  et 119 refus contrôlés, sans stagnation ni écran d'échec. La jouabilité de toutes les étapes est
  donc prouvée ; le jugement artistique final reste celui du parent.
- La géographie de la carte reste à arbitrer. L'ordre pédagogique des six régions est bon, mais la
  première région occupe visuellement le centre. La recommandation consignée dans
  `bac-a-sable/audit-carte-narrative-2026-09-03.md` est de placer la Clairière en périphérie et de
  réserver le centre à la Pierre finale, sans créer de septième région.

## Boucle de validation retenue

La boucle courte devient la boucle normale : garde de contenu, tests du moteur touché, deux recettes
Chromium à la résolution concernée, puis `qa:rapide`. La campagne complète ne tourne qu'à la fin
d'un lot transversal ou avant livraison. Cela évite de payer plusieurs minutes pour chaque retouche
CSS tout en gardant une preuve observable sur le défaut corrigé.

## État de la vérification globale après ce lot

La vérification globale finale a duré 431 secondes. La qualité Chromium repasse entièrement au vert : 249/249 recettes, dont les 89 écrans à la
résolution tablette, le chaudron, le coffre, les 75 nœuds et les corps de lecture jusqu'à 40 px.
Les 519 parcours E2E, le lint, TypeScript, les 620 contrôles de contenu, le rejeu, la construction
et le budget du bundle sont également verts. La cascade montre de nouveau ses trois paliers. Les références de la carte déjà validée par le
parent ont été actualisées. Quatre références visuelles restent volontairement divergentes : les
trois états du nouveau coloriage de l'école et la récompense remaniée. Elles ne seront remplacées
qu'après validation humaine. La vérification globale conserve par ailleurs les cinq échecs audio
explicitement mis hors périmètre par le parent.

## Asset raster ajouté pendant cette passe

`contenu/assets/coffre/coffre-ouvert-v1.png` a été produit en une génération puis une retouche
ciblée par le générateur intégré, à partir du campement V6 comme référence de style. Le damier que
le générateur avait peint a été converti en véritable canal alpha avec ffmpeg. Le prompt, les deux
étapes, les dimensions et l'empreinte du fichier publié sont conservés dans
`production/assets.lock.json`.
